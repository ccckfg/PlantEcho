import { relationshipStages } from "@dyn/shared";
import { z } from "zod";

const closureBoundarySchema = z.object({
  end_turn: z.number().int().nonnegative(),
  old_theme: z.string(),
  new_theme: z.string(),
  reason: z.string()
});

export const episodeClosureOutputSchema = z.record(z.array(closureBoundarySchema));

export const episodeMemoryBlockSchema = z.object({
  should_store: z.boolean().optional(),
  date: z.string().default(""),
  time: z.string().default(""),
  location: z.string().default(""),
  participants: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  importance: z.number().finite().default(3),
  title: z.string().default(""),
  content: z.string().default("")
});

const understandingItemSchema = z.object({
  subject: z.string(),
  keywords: z.array(z.string()).default([]),
  content: z.string()
});

const understandingUpdateSchema = z.object({
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  content: z.string().optional()
});

const relationshipPatchSchema = z.object({
  stage: z.enum(relationshipStages).optional(),
  summary: z.string().optional()
});

export const understandingPatchOutputSchema = z.object({
  add: z.array(understandingItemSchema).default([]),
  update: z.record(understandingUpdateSchema).default({}),
  relationship_patch: relationshipPatchSchema.optional()
});

export type EpisodeClosureOutput = z.infer<typeof episodeClosureOutputSchema>;
export type EpisodeMemoryBlock = z.infer<typeof episodeMemoryBlockSchema>;
export type UnderstandingPatchOutput = z.infer<typeof understandingPatchOutputSchema>;
