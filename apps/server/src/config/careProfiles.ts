import type { CareProfile } from "@dyn/shared";

export const defaultCareProfile: CareProfile = {
  soil: { min: 35, max: 75 },
  light: { minLux: 800, maxLux: 15000 },
  temperature: { minC: 15, maxC: 30 },
  humidity: { min: 40, max: 80 }
};
