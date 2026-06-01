import { apiUrl, buildApiHeaders, getApiConnection } from "./api";

export const SYNC_EVENT_NAME = "dyn:sync";

export type SyncResource =
  | "plants"
  | "readings"
  | "status"
  | "messages"
  | "memories"
  | "understandings"
  | "photos"
  | "devices";

export interface SyncEvent {
  id: number;
  type: `${SyncResource}.changed`;
  resource: SyncResource;
  plantId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncFilter {
  plantId?: string;
  resources?: SyncResource[];
}

const lastEventStorageKey = (): string => {
  const baseUrl = getApiConnection()?.baseUrl ?? "default";
  return `dyn.sync.lastEventId.v1:${baseUrl}`;
};

export const readLastSyncEventId = (): number => {
  const value = window.localStorage.getItem(lastEventStorageKey());
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const saveLastSyncEventId = (id: number): void => {
  window.localStorage.setItem(lastEventStorageKey(), String(id));
};

export const dispatchSyncEvent = (event: SyncEvent): void => {
  window.dispatchEvent(new CustomEvent<SyncEvent>(SYNC_EVENT_NAME, { detail: event }));
};

export const matchesSyncFilter = (event: SyncEvent, filter: SyncFilter): boolean => {
  if (filter.resources?.length && !filter.resources.includes(event.resource)) return false;
  if (filter.plantId && event.plantId && event.plantId !== filter.plantId) return false;
  return true;
};

const frameData = (frame: string): Array<{ event: string; data: string }> => {
  const lines = frame.split(/\r?\n/);
  const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
  return lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => ({ event, data: line.slice(5).trim() }));
};

export async function streamSyncEvents(signal: AbortSignal): Promise<void> {
  const since = readLastSyncEventId();
  const res = await fetch(apiUrl(`/api/v1/sync/stream?since=${since}`), {
    headers: buildApiHeaders(),
    signal
  });
  if (!res.ok) throw new Error(`Sync stream failed: ${res.status} ${await res.text()}`);
  if (!res.body) throw new Error("Sync stream response body is empty");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const item of frameData(frame)) {
        if (item.event !== "sync") continue;
        const event = JSON.parse(item.data) as SyncEvent;
        saveLastSyncEventId(event.id);
        dispatchSyncEvent(event);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}
