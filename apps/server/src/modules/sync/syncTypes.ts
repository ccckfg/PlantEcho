export const syncResources = {
  plants: "plants",
  readings: "readings",
  status: "status",
  messages: "messages",
  memories: "memories",
  understandings: "understandings",
  photos: "photos",
  devices: "devices",
  care_records: "care_records"
} as const;

export type SyncResource = (typeof syncResources)[keyof typeof syncResources];
export type SyncEventType = `${SyncResource}.changed`;

export interface SyncEvent {
  id: number;
  type: SyncEventType;
  resource: SyncResource;
  plantId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CreateSyncEventInput {
  type: SyncEventType;
  plantId?: string | null;
  payload?: Record<string, unknown>;
}

export const resourceFromType = (type: SyncEventType): SyncResource => {
  return type.split(".")[0] as SyncResource;
};
