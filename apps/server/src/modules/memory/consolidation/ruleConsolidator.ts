import { memoryConfig } from "../../../config/memory.js";
import { compact } from "../../../shared/text.js";
import { startOfRecentWindow } from "../../../shared/time.js";
import type { PlantHealthSummary, SensorReading } from "../../readings/types.js";
import {
  addMemoryDraft,
  getOpenDrafts,
  hasRecentMemory
} from "../repositories/memoryRepository.js";

export const rememberSensorIssues = (
  plantId: string,
  turn: number,
  reading: SensorReading,
  summary: PlantHealthSummary
): void => {
  const openDrafts = getOpenDrafts(plantId, 50);
  for (const issue of summary.issues.filter((item) => item.severity !== "info")) {
    const sourceType = `sensor:${issue.code}`;
    const duplicated = openDrafts.some((draft) => draft.metadata.sourceType === sourceType);
    const recentlyRemembered = hasRecentMemory(
      plantId,
      sourceType,
      startOfRecentWindow(memoryConfig.duplicateEventWindowHours)
    );
    if (duplicated || recentlyRemembered) {
      continue;
    }
    const text = `${issue.label}：${issue.detail}。当时读数为 ${summary.facts.join("，")}。`;
    addMemoryDraft(plantId, turn, text, {
      sourceType,
      readingId: reading.id,
      capturedAt: reading.capturedAt,
      forceClose: true,
      facts: summary.facts,
      importanceHint: issue.severity === "critical" ? 5 : 4
    });
  }
};

export const rememberUserMessage = (plantId: string, turn: number, content: string): void => {
  const cleaned = compact(content);
  if (!cleaned) return;
  addMemoryDraft(plantId, turn, `主人说：${cleaned}`, {
    sourceType: "interaction:user_message"
  });
};
