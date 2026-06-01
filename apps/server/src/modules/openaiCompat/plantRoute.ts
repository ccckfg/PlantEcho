import { env } from "../../config/env.js";
import { getPlant, listPlants } from "../plants/plantRepository.js";
import { contentToText } from "./format.js";
import type { OpenAiChatMessage } from "./schema.js";

export interface PlantRoute {
  plantId: string;
  plantName: string;
  requestedName: string | null;
  matched: boolean;
  source: "tag" | "default";
}

const tagPattern = /<\s*(?:植物名|plant_name)\s*>\s*([^<]{1,100})\s*<\s*\/\s*(?:植物名|plant_name)\s*>/iu;
const allTagsPattern = /<\s*(?:植物名|plant_name)\s*>\s*[^<]{1,100}\s*<\s*\/\s*(?:植物名|plant_name)\s*>/giu;

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export const extractPlantNameTag = (text: string): string | null => {
  const match = tagPattern.exec(text);
  return match?.[1]?.trim() || null;
};

export const stripPlantNameTags = (text: string): string =>
  text.replace(allTagsPattern, " ").replace(/[ \t]{2,}/g, " ").trim();

export const requestedPlantNameFromMessages = (
  messages: OpenAiChatMessage[]
): string | null => {
  for (const message of messages) {
    const tag = extractPlantNameTag(contentToText(message.content));
    if (tag) return tag;
  }
  return null;
};

export const resolvePlantRoute = (messages: OpenAiChatMessage[]): PlantRoute => {
  const requestedName = requestedPlantNameFromMessages(messages);
  const plants = listPlants();
  const fallback = getPlant(env.DEFAULT_PLANT_ID) ?? plants[0] ?? null;

  if (requestedName) {
    const normalized = normalizeName(requestedName);
    const matched = plants.find(
      (plant) => normalizeName(plant.name) === normalized || normalizeName(plant.id) === normalized
    );
    if (matched) {
      return {
        plantId: matched.id,
        plantName: matched.name,
        requestedName,
        matched: true,
        source: "tag"
      };
    }
  }

  return {
    plantId: fallback?.id ?? env.DEFAULT_PLANT_ID,
    plantName: fallback?.name ?? env.DEFAULT_PLANT_ID,
    requestedName,
    matched: false,
    source: "default"
  };
};
