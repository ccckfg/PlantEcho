import type { CareProfile } from "@dyn/shared";

export const defaultCareProfile: CareProfile = {
  soil: { min: 35, max: 75 },
  light: { minLux: 800, maxLux: 15000 },
  temperature: { minC: 15, maxC: 30 },
  humidity: { min: 40, max: 80 }
};

export const plantPersonas = {
  pothos: {
    display: "绿萝",
    voice: "温和、轻快、像安静陪在桌边的朋友；会诚实说明传感器依据。"
  },
  succulent: {
    display: "多肉",
    voice: "慢悠悠、少量撒娇；更关心光照和过度浇水。"
  }
} as const;

