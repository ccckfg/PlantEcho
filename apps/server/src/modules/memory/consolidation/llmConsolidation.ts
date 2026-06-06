import { memoryConfig } from "../../../config/memory.js";
import { isoDatePart, isoTimePart, nowIso } from "../../../shared/time.js";
import { messagesInTurnRange } from "../../chat/messageRepository.js";
import { isLlmConfigured } from "../../llm/client.js";
import { publishSyncEvent } from "../../sync/syncBus.js";
import {
  addEpisodeMemory,
  getEpisodeMemory,
  getDraftsUntilTurn,
  listUnderstandings,
  markDraftsConsumed,
  upsertUnderstanding
} from "../repositories/memoryRepository.js";
import type { EpisodeClosureOutput } from "./agentgalFlow.js";
import { detectClosures, generateEpisodeMemory, patchUnderstandings } from "./agentgalFlow.js";
import {
  buildEpisodePayload,
  buildUnderstandingPayload,
  renderHistory,
  resolveUnderstandingId
} from "./consolidationInputs.js";
import {
  createIntentionFromEpisode,
  createIntentionFromUnderstanding
} from "../../intentions/intentionService.js";
import { applyRelationshipPatch } from "../../state/stateService.js";

const closedTurnFromLlm = (
  closures: EpisodeClosureOutput | null,
  plantName: string,
  currentTurn: number
): number | null => {
  if (!closures) return null;
  const boundaries = closures[plantName] ?? closures[Object.keys(closures)[0] ?? ""] ?? [];
  const turns = boundaries
    .map((boundary) => boundary.end_turn)
    .filter((turn) => turn < currentTurn);
  return turns.length ? Math.max(...turns) : null;
};

const createEpisode = async (
  plantId: string,
  plantName: string,
  untilTurn: number
): Promise<boolean> => {
  const drafts = getDraftsUntilTurn(plantId, untilTurn);
  if (!drafts.length) return false;
  const firstTurn = Math.min(...drafts.map((draft) => draft.turn));
  const messages = messagesInTurnRange(plantId, firstTurn, untilTurn);
  const rawDialogue = renderHistory(messages, plantName);
  const payload = buildEpisodePayload(plantName, drafts, rawDialogue);
  const llmReady = isLlmConfigured();
  const generated = llmReady ? await generateEpisodeMemory(payload) : null;
  const block = generated;
  if (block?.should_store === false) {
    markDraftsConsumed(drafts.map((draft) => draft.id));
    return false;
  }
  if (!block?.content?.trim()) {
    if (llmReady) throw new Error("Episode memory generation returned empty content");
    return false;
  }

  const episode = addEpisodeMemory({
    plantId,
    date: block.date || isoDatePart(nowIso()),
    time: block.time || isoTimePart(nowIso()),
    location: block.location ?? "",
    participants: block.participants || "主人",
    title: block.title || "一段新的记忆",
    content: block.content,
    keywords: block.keywords ?? [],
    importance: Math.max(1, Math.min(5, Number(block.importance) || 3)),
    sourceType: "llm:episode",
    rawDialogue,
    rawPayload: {
      draftIds: drafts.map((draft) => draft.id),
      draftTurns: drafts.map((draft) => draft.turn)
    }
  });
  createIntentionFromEpisode(episode);
  markDraftsConsumed(drafts.map((draft) => draft.id));
  publishSyncEvent({
    type: "memories.changed",
    plantId,
    payload: { memoryId: episode.id }
  });
  const understandingChanged = await patchEpisodeUnderstanding(plantId, episode.id);
  if (understandingChanged) {
    publishSyncEvent({
      type: "understandings.changed",
      plantId,
      payload: { memoryId: episode.id }
    });
  }
  return true;
};

const patchEpisodeUnderstanding = async (plantId: string, episodeId: string): Promise<boolean> => {
  const understandings = listUnderstandings(plantId);
  const episode = getEpisodeMemory(episodeId);
  if (!episode) return false;
  const payload = buildUnderstandingPayload(understandings, episode);
  const patch = await patchUnderstandings(payload).catch(() => null);
  if (!patch) return false;

  let changed = false;
  for (const item of patch.add ?? []) {
    if (!item.content?.trim()) continue;
    upsertUnderstanding({
      plantId,
      subject: item.subject,
      content: item.content,
      keywords: item.keywords ?? [],
      linkedMemories: [episode.id],
      history: [{ memoryId: episode.id, date: episode.date, title: episode.title, content: item.content }]
    });
    changed = true;
  }
  for (const [rawId, fields] of Object.entries(patch.update ?? {})) {
    const id = resolveUnderstandingId(rawId, understandings);
    if (!id) continue;
    const existing = understandings.find((u) => u.id === id);
    if (!existing) continue;
    const content = fields.content ?? existing.content;
    if (!content.trim()) continue;
    const contentChanged = content !== existing.content;
    upsertUnderstanding({
      id,
      plantId,
      subject: fields.subject ?? existing.subject,
      content,
      keywords: fields.keywords ?? existing.keywords,
      linkedMemories: [...new Set([...existing.linkedMemories, episode.id])],
      history: contentChanged
        ? [...existing.history, { memoryId: episode.id, date: episode.date, title: episode.title, content }]
        : existing.history
    });
    changed = true;
  }
  if (patch.relationship_patch && (changed || episode.importance >= 4)) {
    applyRelationshipPatch(plantId, episode.id, patch.relationship_patch);
    createIntentionFromUnderstanding(
      plantId,
      episode.id,
      patch.relationship_patch.summary ?? ""
    );
    changed = true;
  }
  return changed;
};

export const runConsolidationPipeline = async (
  plantId: string,
  plantName: string,
  currentTurn: number,
  closeCurrentTopic = false
): Promise<void> => {
  const drafts = getDraftsUntilTurn(plantId, currentTurn);
  if (!drafts.length) return;
  const earliest = Math.min(...drafts.map((draft) => draft.turn));
  const startTurn = Math.max(earliest, currentTurn - memoryConfig.closureDetectionTurnLimit + 1);
  const history = renderHistory(messagesInTurnRange(plantId, startTurn, currentTurn), plantName);
  const closures = !closeCurrentTopic && history && isLlmConfigured()
    ? await detectClosures(history)
    : null;
  const llmTurn = closedTurnFromLlm(closures, plantName, currentTurn);
  const untilTurn = closeCurrentTopic ? currentTurn : llmTurn ?? -1;
  if (untilTurn < 0) return;
  await createEpisode(plantId, plantName, untilTurn);
};
