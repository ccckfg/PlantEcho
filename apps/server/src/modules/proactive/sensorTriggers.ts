import { proactiveConfig } from "../../config/proactive.js";
import { getPlant } from "../plants/plantRepository.js";
import { getPlantReadingState } from "../readings/readingService.js";
import { getSensorTrust } from "../readings/sensorTrust.js";
import type { PlantHealthIssue } from "../readings/types.js";
import type { ProactiveEventInput, ProactiveEventType } from "./types.js";

const typeByIssue: Record<string, ProactiveEventType> = {
  soil_low: "sensor.soil_low",
  soil_high: "sensor.soil_high",
  sensor_offline: "sensor.offline"
};

const titleByIssue: Record<string, string> = {
  soil_low: "我有点渴了",
  soil_high: "土壤现在偏湿",
  sensor_offline: "我收不到传感器了"
};

const chooseIssue = (issues: PlantHealthIssue[]): PlantHealthIssue | null => {
  return issues.find((issue) => issue.code === "soil_low")
    ?? issues.find((issue) => issue.severity === "critical")
    ?? issues[0]
    ?? null;
};

export const buildSensorEvent = (plantId: string): ProactiveEventInput | null => {
  if (!proactiveConfig.enabled) return null;
  const plant = getPlant(plantId);
  if (!plant) return null;
  if (!getSensorTrust(plantId).trusted) return null;
  const state = getPlantReadingState(plantId);
  const issue = chooseIssue(state.health.issues);
  if (!issue) return null;
  const type = typeByIssue[issue.code] ?? "sensor.environment";
  const title = titleByIssue[issue.code] ?? issue.label;
  const readingFacts = state.health.facts.length ? state.health.facts : ["暂无传感器读数"];
  return {
    plantId,
    type,
    key: `${type}:${issue.code}`,
    severity: issue.severity === "critical" ? "critical" : "warning",
    content: `${title}。现在的读数是：${readingFacts.join("，")}。${issue.detail}。`,
    facts: [
      `标题：${title}`,
      `问题：${issue.label}`,
      `详情：${issue.detail}`,
      ...readingFacts.map((fact) => `读数：${fact}`)
    ],
    payload: { issue, latestReadingId: state.latest?.id ?? null },
    cooldownMs:
      issue.code === "sensor_offline"
        ? proactiveConfig.offlineSensorCooldownMs
        : proactiveConfig.sensorCooldownMs
  };
};
