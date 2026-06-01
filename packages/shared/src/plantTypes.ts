import { z } from "zod";

export const careProfileSchema = z.object({
  soil: z.object({ min: z.number(), max: z.number() }),
  light: z.object({ minLux: z.number(), maxLux: z.number() }),
  temperature: z.object({ minC: z.number(), maxC: z.number() }),
  humidity: z.object({ min: z.number(), max: z.number() })
}).superRefine((profile, ctx) => {
  if (profile.soil.min >= profile.soil.max) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["soil"], message: "soil.min must be less than soil.max" });
  }
  if (profile.light.minLux >= profile.light.maxLux) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["light"], message: "light.minLux must be less than light.maxLux" });
  }
  if (profile.temperature.minC >= profile.temperature.maxC) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["temperature"],
      message: "temperature.minC must be less than temperature.maxC"
    });
  }
  if (profile.humidity.min >= profile.humidity.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["humidity"],
      message: "humidity.min must be less than humidity.max"
    });
  }
});

export type CareProfile = z.infer<typeof careProfileSchema>;

export const suggestCareProfileSchema = z.object({
  name: z.string().trim().optional(),
  species: z.string().trim().min(1),
  location: z.string().trim().optional()
});

export type SuggestCareProfileInput = z.infer<typeof suggestCareProfileSchema>;

export const PLANT_NAME_MAX_LENGTH = 40;
export const plantNameSchema = z.string().trim().min(1).max(PLANT_NAME_MAX_LENGTH);

export interface CareProfileSuggestion {
  careProfile: CareProfile;
  source: "llm" | "template" | "default";
  notes: string[];
  usedLlm: boolean;
}

export interface PlantSummary {
  id: string;
  name: string;
  species: string;
  location: string;
  avatarUrl: string | null;
  careProfile: CareProfile;
}

export interface DeviceRecord {
  id: string;
  plantId: string;
  name: string;
  hasApiKey: boolean;
  status: "active" | "disabled" | "deleted";
  lastSeenAt: string | null;
  disabledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface PendingDevice {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
  latestPayload: Record<string, unknown>;
  rssi: number | null;
  claimStatus: "pending" | "claimed" | "ignored";
}

export const claimDeviceSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existingPlant"),
    plantId: z.string().min(1),
    deviceName: z.string().min(1).optional()
  }),
  z.object({
    mode: z.literal("newPlant"),
    plant: z.object({
      name: plantNameSchema,
      species: z.string().min(1),
      location: z.string().optional(),
      avatarUrl: z.string().url().nullable().optional(),
      personaProfileId: z.string().optional(),
      careProfile: careProfileSchema.optional()
    }),
    deviceName: z.string().min(1).optional()
  })
]);

export type ClaimDeviceInput = z.infer<typeof claimDeviceSchema>;

export interface PlantStatus {
  plantId: string;
  mood: string;
  relationship: string;
  focus: string;
  lastSummary: string;
  updatedAt: string;
}

export interface PlantHealthIssue {
  code: string;
  severity: "info" | "warning" | "critical";
  label: string;
  detail: string;
}

export interface PlantHealthSummary {
  overall: "healthy" | "watch" | "risk";
  mood: string;
  issues: PlantHealthIssue[];
  facts: string[];
  advice: string;
}

export interface EpisodeMemory {
  id: string;
  plantId: string;
  date: string;
  time: string;
  location: string;
  participants: string;
  title: string;
  content: string;
  keywords: string[];
  importance: number;
  sourceType: string;
  rawDialogue: string;
  rawPayload: Record<string, unknown>;
  lastRecalledAt: string;
  createdAt: string;
  isMilestone?: boolean;
  milestoneReason?: string;
}

export interface MemoryCitation {
  id: string;
  title: string;
  date: string;
  relevance: number;
}

export interface UnderstandingHistoryEntry {
  memoryId: string;
  date: string;
  title: string;
  content: string;
}

export interface Understanding {
  id: string;
  plantId: string;
  subject: string;
  content: string;
  keywords: string[];
  linkedMemories: string[];
  history: UnderstandingHistoryEntry[];
  updatedAt: string;
}
