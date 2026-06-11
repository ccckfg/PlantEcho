import { statusTagConfig } from "../../config/statusTags.js";
import { llmPhases } from "../../config/llmRouting.js";
import { completeJson } from "../llm/client.js";
import { getLayeredPlantState } from "../state/stateService.js";
import { getPlant } from "./plantRepository.js";
import {
  getStoredPlantStatusTags,
  upsertPlantStatusTags,
  type StoredPlantStatusTags
} from "./plantStatusTagRepository.js";
import { buildStatusTagPrompt, statusTagSystemPrompt } from "./plantStatusTagPrompt.js";
import { sanitizeStatusTags } from "./plantStatusTagPolicy.js";

export interface PlantStatusTags {
  primary: {
    key: "online" | "offline";
    label: "在线" | "离线";
    source: "rule";
  };
  secondary: {
    tags: string[];
    source: "llm" | "none";
    sourceTurn: number | null;
    updatedAt: string | null;
    expiresAt: string | null;
  };
}

type StatusTagOutput = {
  tags?: unknown[];
};

const expiresAt = (stored: StoredPlantStatusTags): string =>
  new Date(Date.parse(stored.updatedAt) + statusTagConfig.secondaryTtlMs).toISOString();

const isFresh = (stored: StoredPlantStatusTags): boolean => {
  const updatedAt = Date.parse(stored.updatedAt);
  return !Number.isNaN(updatedAt) && Date.now() - updatedAt < statusTagConfig.secondaryTtlMs;
};

const primaryFromConnection = (connection: "online" | "offline"): PlantStatusTags["primary"] => ({
  key: connection,
  label: connection === "online" ? "在线" : "离线",
  source: "rule"
});

const secondaryFromStored = (stored: StoredPlantStatusTags): PlantStatusTags["secondary"] => ({
  tags: sanitizeStatusTags(stored.tags),
  source: stored.tags.length ? "llm" : "none",
  sourceTurn: stored.sourceTurn,
  updatedAt: stored.updatedAt,
  expiresAt: expiresAt(stored)
});

const emptySecondary = (): PlantStatusTags["secondary"] => ({
  tags: [],
  source: "none",
  sourceTurn: null,
  updatedAt: null,
  expiresAt: null
});

const generateSecondaryTags = async (
  plantId: string,
  primaryLabel: string,
  sourceTurn: number | null
): Promise<StoredPlantStatusTags | null> => {
  const plant = await getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const state = await getLayeredPlantState(plantId);
  const output = await completeJson<StatusTagOutput>([
    { role: "system", content: statusTagSystemPrompt },
    { role: "user", content: buildStatusTagPrompt(plant, state, primaryLabel) }
  ], { phase: llmPhases.statusTags, temperature: 0.4 }).catch(() => null);
  if (!output) return null;
  const tags = sanitizeStatusTags(output.tags ?? [], primaryLabel);
  return upsertPlantStatusTags(plantId, tags, sourceTurn);
};

export const savePlantStatusTagsFromChat = async (
  plantId: string,
  sourceTurn: number,
  tags: string[]
): Promise<StoredPlantStatusTags> => {
  const state = await getLayeredPlantState(plantId);
  const primary = primaryFromConnection(state.physical.connection);
  return upsertPlantStatusTags(plantId, sanitizeStatusTags(tags, primary.label), sourceTurn);
};

export const getPlantStatusTags = async (plantId: string): Promise<PlantStatusTags> => {
  const plant = await getPlant(plantId);
  if (!plant) throw new Error(`Plant ${plantId} not found`);
  const state = await getLayeredPlantState(plantId);
  const primary = primaryFromConnection(state.physical.connection);
  const stored = await getStoredPlantStatusTags(plantId);
  if (stored && isFresh(stored)) {
    return { primary, secondary: secondaryFromStored(stored) };
  }
  const regenerated = await generateSecondaryTags(plantId, primary.label, null);
  return { primary, secondary: regenerated ? secondaryFromStored(regenerated) : emptySecondary() };
};
