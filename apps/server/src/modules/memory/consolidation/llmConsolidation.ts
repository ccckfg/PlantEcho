import { isoDatePart, isoTimePart, nowIso } from "../../../shared/time.js";
import { messagesInTurnRange } from "../../chat/messageRepository.js";
import { isLlmConfigured } from "../../llm/client.js";
import { publishSyncEvent } from "../../sync/syncBus.js";
import {
  addEpisodeMemory,
  getEpisodeMemory,
  getDraftsUntilTurn,
  getOpenDrafts,
  listUnderstandings,
  markDraftsConsumed,
  upsertUnderstanding
} from "../repositories/memoryRepository.js";
import type { EpisodeClosureOutput, EpisodeMemoryBlock } from "./agentgalFlow.js";
import { detectClosures, generateEpisodeMemory, patchUnderstandings } from "./agentgalFlow.js";
import {
  buildEpisodePayload,
  buildUnderstandingPayload,
  renderHistory,
  resolveUnderstandingId
} from "./consolidationInputs.js";

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

const forcedClosedTurn = (plantId: string): number | null => {
  const forced = getOpenDrafts(plantId, 100).filter((draft) => draft.metadata.forceClose === true);
  if (!forced.length) return null;
  return Math.max(...forced.map((draft) => draft.turn));
};

const fallbackSensorBlock = (draftText: string): EpisodeMemoryBlock => {
  const now = nowIso();
  const title = draftText.split("：")[0] || "传感器异常";
  return {
    date: isoDatePart(now),
    time: isoTimePart(now),
    location: "",
    participants: "植物、传感器",
    keywords: [title, "传感器"],
    importance: 2,
    title,
    content: draftText
  };
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
  const allForced = drafts.every((draft) => draft.metadata.forceClose === true);
  const generated = llmReady && !allForced ? await generateEpisodeMemory(payload) : null;
  const block = generated ?? (allForced ? fallbackSensorBlock(drafts.map((draft) => draft.text).join("\n")) : null);
  if (!block?.content?.trim()) {
    if (llmReady && !allForced) throw new Error("Episode memory generation returned empty content");
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
    sourceType: generated ? "llm:episode" : "rule:closed_sensor_episode",
    rawDialogue,
    rawPayload: {
      draftIds: drafts.map((draft) => draft.id),
      draftTurns: drafts.map((draft) => draft.turn)
    }
  });
  markDraftsConsumed(drafts.map((draft) => draft.id));
  publishSyncEvent({
    type: "memories.changed",
    plantId,
    payload: { memoryId: episode.id }
  });
  const understandingChanged = generated
    ? await patchEpisodeUnderstanding(plantId, episode.id)
    : false;
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
  return changed;
};

export const runConsolidationPipeline = async (
  plantId: string,
  plantName: string,
  currentTurn: number
): Promise<void> => {
  const drafts = getOpenDrafts(plantId, 100);
  if (!drafts.length) return;
  const earliest = Math.min(...drafts.map((draft) => draft.turn));
  const history = renderHistory(messagesInTurnRange(plantId, earliest), plantName);
  const forcedTurn = forcedClosedTurn(plantId);
  const closures = forcedTurn === null && history && isLlmConfigured()
    ? await detectClosures(history)
    : null;
  const llmTurn = closedTurnFromLlm(closures, plantName, currentTurn);
  const untilTurn = Math.max(llmTurn ?? -1, forcedTurn ?? -1);
  if (untilTurn < 0) return;
  await createEpisode(plantId, plantName, untilTurn);
};
