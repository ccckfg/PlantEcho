import { memoryConfig } from "../../../config/memory.js";
import { llmPhases } from "../../../config/llmRouting.js";
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
import {
  applyRelationshipPatch,
  hasMeaningfulRelationshipPatch
} from "../../state/stateService.js";
import { sanitizeStateText } from "../../state/statePolicy.js";

export const closedTurnsFromLlm = (
  closures: EpisodeClosureOutput | null,
  plantName: string,
  currentTurn: number
): number[] => {
  if (!closures) return [];
  const boundaries = closures[plantName] ?? closures[Object.keys(closures)[0] ?? ""] ?? [];
  return [...new Set(boundaries
    .map((boundary) => boundary.end_turn)
    .filter((turn) => Number.isInteger(turn) && turn >= 0 && turn < currentTurn))]
    .sort((a, b) => a - b);
};

const createEpisode = async (
  plantId: string,
  plantName: string,
  untilTurn: number
): Promise<boolean> => {
  const drafts = await getDraftsUntilTurn(plantId, untilTurn);
  if (!drafts.length) return false;
  const firstTurn = Math.min(...drafts.map((draft) => draft.turn));
  const messages = await messagesInTurnRange(plantId, firstTurn, untilTurn);
  const rawDialogue = renderHistory(messages, plantName);
  const payload = buildEpisodePayload(plantName, drafts, rawDialogue);
  const llmReady = isLlmConfigured({ phase: llmPhases.memoryEpisode });
  const generated = llmReady ? await generateEpisodeMemory(payload) : null;
  const block = generated;
  if (block?.should_store === false) {
    await markDraftsConsumed(drafts.map((draft) => draft.id));
    return false;
  }
  if (!block) {
    if (llmReady) throw new Error("Episode memory generation returned empty content");
    return false;
  }
  const content = sanitizeStateText(block.content, memoryConfig.episodeContentMaxChars);
  const title = sanitizeStateText(block.title, memoryConfig.episodeTitleMaxChars);
  if (block?.content?.trim() && !content) {
    await markDraftsConsumed(drafts.map((draft) => draft.id));
    return false;
  }
  if (!content) {
    if (llmReady) throw new Error("Episode memory generation returned invalid content");
    return false;
  }

  const episode = await addEpisodeMemory({
    plantId,
    date: block.date || isoDatePart(nowIso()),
    time: block.time || isoTimePart(nowIso()),
    location: block.location ?? "",
    participants: block.participants || "主人",
    title: title || "一段新的记忆",
    content,
    keywords: (block.keywords ?? [])
      .map((item) => sanitizeStateText(item, memoryConfig.memoryKeywordMaxChars))
      .filter((item): item is string => Boolean(item)),
    importance: Math.max(1, Math.min(5, Number(block.importance) || 3)),
    sourceType: "llm:episode",
    rawDialogue,
    rawPayload: {
      draftIds: drafts.map((draft) => draft.id),
      draftTurns: drafts.map((draft) => draft.turn)
    }
  });
  await createIntentionFromEpisode(episode);
  await markDraftsConsumed(drafts.map((draft) => draft.id));
  await publishSyncEvent({
    type: "memories.changed",
    plantId,
    payload: { memoryId: episode.id }
  });
  const understandingChanged = await patchEpisodeUnderstanding(plantId, episode.id);
  if (understandingChanged) {
    await publishSyncEvent({
      type: "understandings.changed",
      plantId,
      payload: { memoryId: episode.id }
    });
  }
  return true;
};

const patchEpisodeUnderstanding = async (plantId: string, episodeId: string): Promise<boolean> => {
  const understandings = await listUnderstandings(plantId);
  const episode = await getEpisodeMemory(episodeId);
  if (!episode) return false;
  const payload = buildUnderstandingPayload(understandings, episode);
  const patch = await patchUnderstandings(payload).catch(() => null);
  if (!patch) return false;

  let changed = false;
  for (const item of patch.add ?? []) {
    const subject = sanitizeStateText(item.subject, memoryConfig.understandingFieldMaxChars);
    const content = sanitizeStateText(item.content, memoryConfig.understandingFieldMaxChars);
    if (!subject || !content) continue;
    await upsertUnderstanding({
      plantId,
      subject,
      content,
      keywords: (item.keywords ?? [])
        .map((keyword) => sanitizeStateText(keyword, memoryConfig.memoryKeywordMaxChars))
        .filter((keyword): keyword is string => Boolean(keyword)),
      linkedMemories: [episode.id],
      history: [{ memoryId: episode.id, date: episode.date, title: episode.title, content }]
    });
    changed = true;
  }
  for (const [rawId, fields] of Object.entries(patch.update ?? {})) {
    const id = resolveUnderstandingId(rawId, understandings);
    if (!id) continue;
    const existing = understandings.find((u) => u.id === id);
    if (!existing) continue;
    const content = sanitizeStateText(
      fields.content ?? existing.content,
      memoryConfig.understandingFieldMaxChars
    );
    const subject = sanitizeStateText(
      fields.subject ?? existing.subject,
      memoryConfig.understandingFieldMaxChars
    );
    if (!content || !subject) continue;
    const contentChanged = content !== existing.content;
    await upsertUnderstanding({
      id,
      plantId,
      subject,
      content,
      keywords: (fields.keywords ?? existing.keywords)
        .map((keyword) => sanitizeStateText(keyword, memoryConfig.memoryKeywordMaxChars))
        .filter((keyword): keyword is string => Boolean(keyword)),
      linkedMemories: [...new Set([...existing.linkedMemories, episode.id])],
      history: contentChanged
        ? [...existing.history, { memoryId: episode.id, date: episode.date, title: episode.title, content }]
        : existing.history
    });
    changed = true;
  }
  if (hasMeaningfulRelationshipPatch(patch.relationship_patch) && (changed || episode.importance >= 4)) {
    const relationship = await applyRelationshipPatch(plantId, episode.id, patch.relationship_patch!);
    if (relationship.changed) {
      await createIntentionFromUnderstanding(
        plantId,
        episode.id,
        relationship.state.summary
      );
      changed = true;
    }
  }
  return changed;
};

export const runConsolidationPipeline = async (
  plantId: string,
  plantName: string,
  currentTurn: number,
  closeCurrentTopic = false
): Promise<void> => {
  const drafts = await getDraftsUntilTurn(plantId, currentTurn);
  if (!drafts.length) return;
  const earliest = Math.min(...drafts.map((draft) => draft.turn));
  const startTurn = Math.max(earliest, currentTurn - memoryConfig.closureDetectionTurnLimit + 1);
  const history = renderHistory(await messagesInTurnRange(plantId, startTurn, currentTurn), plantName);
  const closures = !closeCurrentTopic &&
    history &&
    isLlmConfigured({ phase: llmPhases.memoryClosure })
    ? await detectClosures(history)
    : null;
  const closedTurns = closeCurrentTopic
    ? [currentTurn]
    : closedTurnsFromLlm(closures, plantName, currentTurn);
  for (const untilTurn of closedTurns) {
    await createEpisode(plantId, plantName, untilTurn);
  }
};
