import { proactiveConfig } from "../../config/proactive.js";

const liveConnections = new Map<string, number>();
const visibleUntil = new Map<string, number>();

export const markUserOnline = (userId: string): (() => void) => {
  liveConnections.set(userId, (liveConnections.get(userId) ?? 0) + 1);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    const next = (liveConnections.get(userId) ?? 1) - 1;
    if (next <= 0) {
      liveConnections.delete(userId);
      visibleUntil.delete(userId);
    } else {
      liveConnections.set(userId, next);
    }
  };
};

export const noteUserVisibility = (
  userId: string,
  visible: boolean,
  now = Date.now()
): void => {
  if (!visible) {
    visibleUntil.delete(userId);
    return;
  }
  visibleUntil.set(userId, now + proactiveConfig.visibleHeartbeatTtlMs);
};

export const isUserStronglyPresent = (userId: string, now = Date.now()): boolean =>
  (liveConnections.get(userId) ?? 0) > 0 &&
  (visibleUntil.get(userId) ?? 0) > now;
