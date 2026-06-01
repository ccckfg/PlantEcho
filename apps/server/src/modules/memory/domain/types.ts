export type {
  EpisodeMemory,
  Understanding,
  UnderstandingHistoryEntry
} from "@dyn/shared";

export interface MemoryDraft {
  id: number;
  plantId: string;
  turn: number;
  text: string;
  metadata: Record<string, unknown>;
  consumedAt: string | null;
  createdAt: string;
}

export interface ConsolidationState {
  plantId: string;
  active: boolean;
  pendingTurn: number | null;
  lastCompletedTurn: number;
  lastError: string;
  updatedAt: string;
}
