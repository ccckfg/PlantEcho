import type { CareProfile } from "@dyn/shared";

export type CareProfileDraft = {
  soil: { min: string; max: string };
  light: { minLux: string; maxLux: string };
  temperature: { minC: string; maxC: string };
  humidity: { min: string; max: string };
};

export type CareProfileFieldId =
  | "soil.min"
  | "soil.max"
  | "light.minLux"
  | "light.maxLux"
  | "temperature.minC"
  | "temperature.maxC"
  | "humidity.min"
  | "humidity.max";

export type CareProfileValidation = {
  valid: boolean;
  profile: CareProfile | null;
  fieldErrors: Partial<Record<CareProfileFieldId, string>>;
  message: string;
};

export const emptyCareProfileDraft = (): CareProfileDraft => ({
  soil: { min: "", max: "" },
  light: { minLux: "", maxLux: "" },
  temperature: { minC: "", maxC: "" },
  humidity: { min: "", max: "" }
});

export const draftFromCareProfile = (profile: CareProfile): CareProfileDraft => ({
  soil: { min: String(profile.soil.min), max: String(profile.soil.max) },
  light: { minLux: String(profile.light.minLux), maxLux: String(profile.light.maxLux) },
  temperature: { minC: String(profile.temperature.minC), maxC: String(profile.temperature.maxC) },
  humidity: { min: String(profile.humidity.min), max: String(profile.humidity.max) }
});

const readNumber = (
  value: string,
  field: CareProfileFieldId,
  fieldErrors: Partial<Record<CareProfileFieldId, string>>
): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    fieldErrors[field] = "请填写数值";
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    fieldErrors[field] = "请输入有效数字";
    return null;
  }
  return parsed;
};

const setRangeError = (
  fieldErrors: Partial<Record<CareProfileFieldId, string>>,
  minField: CareProfileFieldId,
  maxField: CareProfileFieldId,
  message = "下限必须小于上限"
) => {
  fieldErrors[minField] = fieldErrors[minField] ?? message;
  fieldErrors[maxField] = fieldErrors[maxField] ?? message;
};

const validatePercent = (
  value: number | null,
  field: CareProfileFieldId,
  fieldErrors: Partial<Record<CareProfileFieldId, string>>
) => {
  if (value === null) return;
  if (value < 0 || value > 100) {
    fieldErrors[field] = "请输入 0-100";
  }
};

const validateNonNegative = (
  value: number | null,
  field: CareProfileFieldId,
  fieldErrors: Partial<Record<CareProfileFieldId, string>>
) => {
  if (value === null) return;
  if (value < 0) {
    fieldErrors[field] = "不能小于 0";
  }
};

export const validateCareProfileDraft = (draft: CareProfileDraft): CareProfileValidation => {
  const fieldErrors: Partial<Record<CareProfileFieldId, string>> = {};
  const soilMin = readNumber(draft.soil.min, "soil.min", fieldErrors);
  const soilMax = readNumber(draft.soil.max, "soil.max", fieldErrors);
  const lightMin = readNumber(draft.light.minLux, "light.minLux", fieldErrors);
  const lightMax = readNumber(draft.light.maxLux, "light.maxLux", fieldErrors);
  const tempMin = readNumber(draft.temperature.minC, "temperature.minC", fieldErrors);
  const tempMax = readNumber(draft.temperature.maxC, "temperature.maxC", fieldErrors);
  const humidityMin = readNumber(draft.humidity.min, "humidity.min", fieldErrors);
  const humidityMax = readNumber(draft.humidity.max, "humidity.max", fieldErrors);

  validatePercent(soilMin, "soil.min", fieldErrors);
  validatePercent(soilMax, "soil.max", fieldErrors);
  validatePercent(humidityMin, "humidity.min", fieldErrors);
  validatePercent(humidityMax, "humidity.max", fieldErrors);
  validateNonNegative(lightMin, "light.minLux", fieldErrors);
  validateNonNegative(lightMax, "light.maxLux", fieldErrors);

  if (soilMin !== null && soilMax !== null && soilMin >= soilMax) {
    setRangeError(fieldErrors, "soil.min", "soil.max");
  }
  if (lightMin !== null && lightMax !== null && lightMin >= lightMax) {
    setRangeError(fieldErrors, "light.minLux", "light.maxLux");
  }
  if (tempMin !== null && tempMax !== null && tempMin >= tempMax) {
    setRangeError(fieldErrors, "temperature.minC", "temperature.maxC");
  }
  if (humidityMin !== null && humidityMax !== null && humidityMin >= humidityMax) {
    setRangeError(fieldErrors, "humidity.min", "humidity.max");
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    profile: valid
      ? {
          soil: { min: soilMin as number, max: soilMax as number },
          light: { minLux: lightMin as number, maxLux: lightMax as number },
          temperature: { minC: tempMin as number, maxC: tempMax as number },
          humidity: { min: humidityMin as number, max: humidityMax as number }
        }
      : null,
    fieldErrors,
    message: valid ? "" : "请修正红色标记的养护参数。"
  };
};
