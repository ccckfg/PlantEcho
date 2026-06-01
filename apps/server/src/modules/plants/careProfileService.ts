import {
  careProfileSchema,
  type CareProfile,
  type CareProfileSuggestion,
  type SuggestCareProfileInput
} from "@dyn/shared";
import { defaultCareProfile } from "../../config/careProfiles.js";
import { completeJson, isLlmConfigured } from "../llm/client.js";

interface LlmCareProfileResponse {
  careProfile: CareProfile;
  notes?: string[];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const rounded = (value: number): number => Math.round(value);

const normalizeProfile = (profile: CareProfile): CareProfile => {
  const next: CareProfile = {
    soil: {
      min: clamp(rounded(profile.soil.min), 5, 90),
      max: clamp(rounded(profile.soil.max), 10, 95)
    },
    light: {
      minLux: clamp(rounded(profile.light.minLux), 50, 50000),
      maxLux: clamp(rounded(profile.light.maxLux), 100, 100000)
    },
    temperature: {
      minC: clamp(rounded(profile.temperature.minC), 0, 40),
      maxC: clamp(rounded(profile.temperature.maxC), 5, 45)
    },
    humidity: {
      min: clamp(rounded(profile.humidity.min), 10, 95),
      max: clamp(rounded(profile.humidity.max), 15, 100)
    }
  };
  if (next.soil.min >= next.soil.max) next.soil.max = clamp(next.soil.min + 10, 10, 95);
  if (next.light.minLux >= next.light.maxLux) next.light.maxLux = clamp(next.light.minLux + 500, 100, 100000);
  if (next.temperature.minC >= next.temperature.maxC) {
    next.temperature.maxC = clamp(next.temperature.minC + 5, 5, 45);
  }
  if (next.humidity.min >= next.humidity.max) next.humidity.max = clamp(next.humidity.min + 10, 15, 100);
  return careProfileSchema.parse(next);
};

const templateForSpecies = (species: string): { profile: CareProfile; notes: string[]; source: "template" | "default" } => {
  const key = species.toLowerCase();
  if (/多肉|succulent|仙人掌|cactus/.test(key)) {
    return {
      source: "template",
      profile: {
        soil: { min: 15, max: 45 },
        light: { minLux: 5000, maxLux: 45000 },
        temperature: { minC: 10, maxC: 32 },
        humidity: { min: 25, max: 65 }
      },
      notes: ["按多肉/仙人掌类模板生成：偏耐旱、偏喜强光，避免长期高湿。"]
    };
  }
  if (/绿萝|pothos|epipremnum/.test(key)) {
    return {
      source: "template",
      profile: defaultCareProfile,
      notes: ["按绿萝模板生成：保持中等土壤湿度，避免强直射。"]
    };
  }
  if (/蕨|fern/.test(key)) {
    return {
      source: "template",
      profile: {
        soil: { min: 45, max: 80 },
        light: { minLux: 500, maxLux: 8000 },
        temperature: { minC: 15, maxC: 28 },
        humidity: { min: 55, max: 90 }
      },
      notes: ["按蕨类模板生成：更偏好湿润空气和散射光。"]
    };
  }
  return {
    source: "default",
    profile: defaultCareProfile,
    notes: ["未匹配到专用品种模板，使用通用室内观叶植物参数。"]
  };
};

const buildPrompt = (input: SuggestCareProfileInput): string => [
  "你是室内植物养护参数助手。请为一株植物生成传感器阈值 careProfile。",
  "只返回 JSON，不要 Markdown。JSON 形状：",
  '{"careProfile":{"soil":{"min":35,"max":75},"light":{"minLux":800,"maxLux":15000},"temperature":{"minC":15,"maxC":30},"humidity":{"min":40,"max":80}},"notes":["一句理由"]}',
  "约束：soil/humidity 是百分比；light 是 lux；temperature 是摄氏度；所有 min 必须小于 max；给保守范围，不要极端值。",
  `植物名：${input.name?.trim() || "未命名"}`,
  `品种：${input.species.trim()}`,
  `位置：${input.location?.trim() || "未提供"}`
].join("\n");

export const suggestCareProfile = async (
  input: SuggestCareProfileInput
): Promise<CareProfileSuggestion> => {
  if (isLlmConfigured()) {
    try {
      const generated = await completeJson<LlmCareProfileResponse>(
        [
          {
            role: "system",
            content: "你只输出可解析 JSON。不要编造传感器读数，只给植物养护阈值建议。"
          },
          { role: "user", content: buildPrompt(input) }
        ],
        { temperature: 0.2 }
      );
      if (generated?.careProfile) {
        return {
          careProfile: normalizeProfile(generated.careProfile),
          source: "llm",
          notes: generated.notes?.slice(0, 3) ?? ["LLM 根据品种生成，建议认领前人工确认。"],
          usedLlm: true
        };
      }
    } catch {
      // Fall through to deterministic templates when the LLM is unavailable or returns invalid JSON.
    }
  }

  const fallback = templateForSpecies(input.species);
  return {
    careProfile: normalizeProfile(fallback.profile),
    source: fallback.source,
    notes: fallback.notes,
    usedLlm: false
  };
};
