import type { CareProfile, PlantIntention } from "@dyn/shared";
import { intentionConfig } from "../../config/intentions.js";
import { proactiveConfig } from "../../config/proactive.js";
import {
  createIntention,
  dismissPendingIntentionsBySourcePrefix
} from "../intentions/intentionRepository.js";
import type { SensorReading } from "../readings/types.js";
import { mutateBodyState } from "./bodyStateRepository.js";

interface MetricObservation {
  metric: string;
  value: number;
  unit: string;
  low?: { limit: number; code: string; label: string };
  high?: { limit: number; code: string; label: string };
}

export interface BodyTriggerOptions {
  alpha: number;
  persistenceMs: number;
  maxGapMs: number;
  expiryMs: number;
}

const defaultOptions: BodyTriggerOptions = {
  alpha: proactiveConfig.bodyEwmaAlpha,
  persistenceMs: proactiveConfig.bodyPersistenceMs,
  maxGapMs: proactiveConfig.bodyMaxGapMs,
  expiryMs: proactiveConfig.bodyIntentionExpiryMs
};

const metricObservations = (
  reading: SensorReading,
  profile: CareProfile
): MetricObservation[] => {
  const observations: Array<MetricObservation | null> = [
    reading.soilPercent === null ? null : {
      metric: "soil_percent",
      value: reading.soilPercent,
      unit: "%",
      low: { limit: profile.soil.min, code: "soil_low", label: "土壤偏干" },
      high: { limit: profile.soil.max, code: "soil_high", label: "土壤偏湿" }
    },
    reading.airTempC === null ? null : {
      metric: "air_temp_c",
      value: reading.airTempC,
      unit: "°C",
      low: { limit: profile.temperature.minC, code: "temperature_low", label: "温度偏低" },
      high: { limit: profile.temperature.maxC, code: "temperature_high", label: "温度偏高" }
    },
    reading.airHumidityPercent === null ? null : {
      metric: "air_humidity_percent",
      value: reading.airHumidityPercent,
      unit: "%",
      low: { limit: profile.humidity.min, code: "humidity_low", label: "空气偏干" }
    }
  ];
  return observations.filter((item): item is MetricObservation => item !== null);
};

const conditionFor = (observation: MetricObservation, value: number) => {
  if (observation.low && value < observation.low.limit) return observation.low;
  if (observation.high && value > observation.high.limit) return observation.high;
  return null;
};

const evidenceText = (
  observation: MetricObservation,
  condition: NonNullable<MetricObservation["low"]>,
  ewma: number,
  durationMs: number
): string => {
  const hours = Math.max(1, Math.floor(durationMs / 3_600_000));
  return [
    `${condition.label}已持续约 ${hours} 小时`,
    `平滑值 ${ewma.toFixed(1)}${observation.unit}，界限 ${condition.limit}${observation.unit}`,
    "这是持续身体状态而非单次波动，可在合适时机用自身感受轻轻提起"
  ].join("；").slice(0, intentionConfig.contentMaxChars);
};

export const observeBodyReading = async (
  plantId: string,
  reading: SensorReading,
  profile: CareProfile,
  options: BodyTriggerOptions = defaultOptions
): Promise<PlantIntention[]> => {
  const observedMs = Date.parse(reading.capturedAt);
  if (!Number.isFinite(observedMs)) return [];
  const observedAt = new Date(observedMs).toISOString();
  const created: PlantIntention[] = [];

  for (const observation of metricObservations(reading, profile)) {
    const state = await mutateBodyState(plantId, observation.metric, (current) => {
      const lastMs = current ? Date.parse(current.lastObservedAt) : Number.NaN;
      if (current && observedMs <= lastMs) return null;
      const continuous = Boolean(current) && observedMs - lastMs <= options.maxGapMs;
      const ewmaValue = continuous
        ? options.alpha * observation.value + (1 - options.alpha) * current!.ewmaValue
        : observation.value;
      const condition = conditionFor(observation, ewmaValue);
      const sameEpisode = Boolean(
        continuous && condition && current?.conditionCode === condition.code && current.abnormalSince
      );
      return {
        ewmaValue,
        conditionCode: condition?.code ?? null,
        abnormalSince: condition ? (sameEpisode ? current!.abnormalSince : observedAt) : null,
        lastObservedAt: observedAt
      };
    });
    if (!state || state.lastObservedAt !== observedAt) continue;
    const condition = state.conditionCode && state.abnormalSince
      ? conditionFor(observation, state.ewmaValue)
      : null;
    const durationMs = state.abnormalSince
      ? observedMs - Date.parse(state.abnormalSince)
      : 0;
    const sourceId = condition && state.abnormalSince && durationMs >= options.persistenceMs
      ? `body:${observation.metric}:${condition.code}:${state.abnormalSince}`
      : null;
    await dismissPendingIntentionsBySourcePrefix(
      plantId,
      "sensor",
      `body:${observation.metric}:`,
      sourceId
    );
    if (!condition || !sourceId) continue;
    created.push(await createIntention({
      plantId,
      kind: "body_feeling",
      content: evidenceText(observation, condition, state.ewmaValue, durationMs),
      sourceType: "sensor",
      sourceId,
      priority: 1,
      notBefore: null,
      expiresAt: new Date(observedMs + options.expiryMs).toISOString()
    }));
  }
  return created;
};
