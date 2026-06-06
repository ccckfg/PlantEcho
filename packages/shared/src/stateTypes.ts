import type { CareProfile, PlantHealthIssue } from "./plantTypes.js";

export type SensorConnectionState = "online" | "offline";

export interface PhysicalState {
  connection: SensorConnectionState;
  reading: {
    soilRaw: number | null;
    soilPercent: number | null;
    airTempC: number | null;
    airHumidityPercent: number | null;
    lightLux: number | null;
    rssi: number | null;
    batteryMv: number | null;
  } | null;
  careProfile: CareProfile;
  overall: "healthy" | "watch" | "risk";
  mood: string;
  issues: PlantHealthIssue[];
  facts: string[];
  advice: string;
  lastReadingAt: string | null;
}

export interface InnerState {
  plantId: string;
  mood: string;
  concern: string;
  thought: string;
  sourceTurn: number | null;
  updatedAt: string;
}

export const relationshipStages = ["初识", "熟悉", "信任", "亲近", "相伴"] as const;
export type RelationshipStage = (typeof relationshipStages)[number];

export interface RelationshipState {
  plantId: string;
  stage: RelationshipStage;
  summary: string;
  evidenceMemoryIds: string[];
  updatedAt: string;
}

export type PlantIntentionKind =
  | "follow_up"
  | "continue_topic"
  | "acknowledge_milestone";
export type PlantIntentionStatus = "pending" | "completed" | "dismissed" | "expired";

export interface PlantIntention {
  id: string;
  plantId: string;
  kind: PlantIntentionKind;
  content: string;
  sourceType: "user" | "inner" | "episode" | "understanding";
  sourceId: string | null;
  priority: 1 | 2 | 3;
  status: PlantIntentionStatus;
  notBefore: string | null;
  expiresAt: string | null;
  lastConsideredAt: string | null;
  consideredCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LayeredPlantState {
  physical: PhysicalState;
  inner: InnerState;
  relationship: RelationshipState;
  intentions: PlantIntention[];
}
