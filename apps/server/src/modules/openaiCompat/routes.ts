import type { FastifyInstance, FastifyReply } from "fastify";
import { chatWithPlant, streamChatWithPlant } from "../chat/chatService.js";
import { OpenAiCompatError, openAiErrorBody, sendOpenAiError } from "./errors.js";
import {
  buildChatCompletion,
  buildStreamChunk,
  buildUsageChunk,
  createCompletionId,
  lastUserText
} from "./format.js";
import { listCompatModels, resolvePlantRoute } from "./plantRoute.js";
import { openAiChatRequestSchema } from "./schema.js";
import { assertChatDependencies } from "../chat/chatRequirements.js";

export const registerOpenAiCompatRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/v1/models", async () => ({
    object: "list",
    data: await listCompatModels()
  }));

  app.get("/v1/models/:model", async (request, reply) => {
    const { model } = request.params as { model: string };
    const found = (await listCompatModels()).find((item) => item.id === model);
    if (!found) {
      return reply
        .status(404)
        .send(openAiErrorBody(`Model '${model}' does not exist`, "invalid_request_error", "model", "model_not_found"));
    }
    return found;
  });

  app.post("/v1/chat/completions", async (request, reply) => {
    try {
      const body = openAiChatRequestSchema.parse(request.body);
      const rawPrompt = lastUserText(body.messages);
      if (!rawPrompt) {
        throw new OpenAiCompatError("No user message text found", 400, "invalid_request_error", "messages");
      }
      const prompt = rawPrompt;
      if (body.n && body.n !== 1) {
        throw new OpenAiCompatError("Only n=1 is supported", 400, "invalid_request_error", "n", "unsupported_parameter");
      }
      if (body.tools?.length || body.tool_choice) {
        throw new OpenAiCompatError(
          "Tool calling is not supported by this PlantEcho endpoint",
          400,
          "invalid_request_error",
          "tools",
          "unsupported_parameter"
        );
      }

      const id = createCompletionId();
      const created = Math.floor(Date.now() / 1000);
      if (!body.model) {
        throw new OpenAiCompatError("Model is required. Use one of /v1/models.", 400, "invalid_request_error", "model", "model_required");
      }
      const plantRoute = await resolvePlantRoute(body.model);
      if (!plantRoute) {
        throw new OpenAiCompatError(`Model '${body.model}' does not exist`, 404, "invalid_request_error", "model", "model_not_found");
      }
      const model = body.model.trim();
      if (body.stream) {
        return await writeStreamingCompletion({
          reply,
          id,
          created,
          model,
          plantId: plantRoute.plantId,
          prompt,
          temperature: body.temperature,
          origin: request.headers.origin ?? "*",
          includeUsage: Boolean(body.stream_options?.include_usage)
        });
      }

      const result = await chatWithPlant(plantRoute.plantId, prompt, {
        temperature: body.temperature,
        visibleTo: [],
        publishMessagesChanged: false
      });
      return reply.send(buildChatCompletion({ id, created, model, prompt, result, plantRoute }));
    } catch (error) {
      return sendOpenAiError(reply, error);
    }
  });
};

const writeStreamingCompletion = async (input: {
  reply: FastifyReply;
  id: string;
  created: number;
  model: string;
  plantId: string;
  prompt: string;
  temperature?: number;
  origin: string;
  includeUsage: boolean;
}) => {
  const { reply, id, created, model, plantId, prompt, temperature, origin, includeUsage } = input;
  assertChatDependencies({ temperature });
  reply.hijack();
  reply.raw.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
    "access-control-allow-origin": origin,
    vary: "Origin"
  });

  const writeData = (data: unknown): void => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let completion = "";
  try {
    writeData(buildStreamChunk({ id, created, model, delta: { role: "assistant", content: "" } }));
    for await (const event of streamChatWithPlant(plantId, prompt, {
      temperature,
      visibleTo: [],
      publishMessagesChanged: false
    })) {
      if (event.type === "delta") {
        completion += event.delta;
        writeData(buildStreamChunk({ id, created, model, delta: { content: event.delta } }));
      }
    }
    writeData(buildStreamChunk({ id, created, model, finishReason: "stop" }));
    if (includeUsage) {
      writeData(buildUsageChunk({ id, created, model, prompt, completion }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stream failed";
    writeData(openAiErrorBody(message, "server_error", null, "stream_error"));
  } finally {
    reply.raw.write("data: [DONE]\n\n");
    reply.raw.end();
  }
};
