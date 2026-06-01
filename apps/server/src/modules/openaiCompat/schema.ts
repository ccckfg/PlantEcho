import { z } from "zod";

const textContentPartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
    input_text: z.string().optional()
  })
  .passthrough();

const messageContentSchema = z.union([
  z.string(),
  z.null(),
  z.array(textContentPartSchema)
]);

export const openAiChatRequestSchema = z
  .object({
    model: z.string().min(1).optional(),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["system", "developer", "user", "assistant", "tool", "function"]),
            content: messageContentSchema.optional()
          })
          .passthrough()
      )
      .min(1),
    stream: z.boolean().optional().default(false),
    stream_options: z
      .object({
        include_usage: z.boolean().optional().default(false)
      })
      .passthrough()
      .optional(),
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    max_tokens: z.number().int().positive().optional(),
    max_completion_tokens: z.number().int().positive().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    n: z.number().int().positive().optional(),
    tools: z.array(z.unknown()).optional(),
    tool_choice: z.unknown().optional(),
    response_format: z.unknown().optional(),
    user: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .passthrough();

export type OpenAiChatRequest = z.infer<typeof openAiChatRequestSchema>;
export type OpenAiChatMessage = OpenAiChatRequest["messages"][number];
