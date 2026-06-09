import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { sendError } from "../../shared/http.js";
import { chatWithPlant, streamChatWithPlant, type ChatStreamEvent } from "./chatService.js";
import { recentVisibleMessages } from "./messageRepository.js";
import { assertChatDependencies } from "./chatRequirements.js";

const chatSchema = z.object({
  content: z.string().min(1),
  timezone: z.string().trim().max(100).optional()
});

export const registerChatRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post("/api/v1/plants/:plantId/chat", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      const { content, timezone } = chatSchema.parse(request.body);
      return await chatWithPlant(plantId, content, { timezone });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/v1/plants/:plantId/chat/stream", async (request, reply) => {
    try {
      const { plantId } = request.params as { plantId: string };
      const { content, timezone } = chatSchema.parse(request.body);
      assertChatDependencies();
      reply.hijack();
      const origin = request.headers.origin ?? "*";
      reply.raw.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
        "access-control-allow-origin": origin,
        vary: "Origin"
      });

      const write = (event: ChatStreamEvent["type"] | "error", data: unknown): void => {
        reply.raw.write(`event: ${event}\n`);
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      try {
        for await (const event of streamChatWithPlant(plantId, content, { timezone })) {
          const { type, ...data } = event;
          write(type, data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        write("error", { message });
      } finally {
        reply.raw.end();
      }
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/v1/plants/:plantId/messages", async (request) => {
    const { plantId } = request.params as { plantId: string };
    return { messages: recentVisibleMessages(plantId, 80) };
  });
};
