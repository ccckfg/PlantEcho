export const llmPhases = {
  chatReply: "chat.reply",
  chatReminderTool: "chat.reminder-tool",
  statusTags: "status.tags",
  proactiveIntention: "proactive.intention",
  proactiveEvent: "proactive.event",
  memoryClosure: "memory.closure",
  memoryEpisode: "memory.episode",
  memoryUnderstanding: "memory.understanding",
  plantCareProfile: "plant.care-profile"
} as const;

export type LlmTier = "primary" | "secondary";

const secondaryPhases = new Set<string>([
  llmPhases.memoryClosure,
  llmPhases.memoryEpisode,
  llmPhases.plantCareProfile
]);

export const llmTierForPhase = (phase?: string): LlmTier =>
  phase && secondaryPhases.has(phase) ? "secondary" : "primary";

export const resolvedLlmTierForPhase = (
  phase: string | undefined,
  secondaryModelId: string
): LlmTier =>
  llmTierForPhase(phase) === "secondary" && secondaryModelId.trim()
    ? "secondary"
    : "primary";
