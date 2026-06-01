import { EventEmitter } from "node:events";
import type { CreateSyncEventInput, SyncEvent } from "./syncTypes.js";
import { createSyncEvent } from "./syncRepository.js";

const syncEmitter = new EventEmitter();

export const publishSyncEvent = (input: CreateSyncEventInput): SyncEvent => {
  const event = createSyncEvent(input);
  syncEmitter.emit("sync", event);
  return event;
};

export const onSyncEvent = (handler: (event: SyncEvent) => void): (() => void) => {
  syncEmitter.on("sync", handler);
  return () => syncEmitter.off("sync", handler);
};
