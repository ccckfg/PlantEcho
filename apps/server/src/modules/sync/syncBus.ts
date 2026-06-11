import { EventEmitter } from "node:events";
import type { CreateSyncEventInput, SyncEvent } from "./syncTypes.js";
import { createSyncEvent } from "./syncRepository.js";

const syncEmitter = new EventEmitter();

export const publishSyncEvent = async (input: CreateSyncEventInput): Promise<SyncEvent> => {
  const event = await createSyncEvent(input);
  syncEmitter.emit("sync", event);
  return event;
};

export const onSyncEvent = (handler: (event: SyncEvent) => void): (() => void) => {
  syncEmitter.on("sync", handler);
  return () => syncEmitter.off("sync", handler);
};
