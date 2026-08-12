import { useEffect } from "react";
import type { BackendConnection } from "@/lib/connection";
import { SYNC_EVENT_NAME, type SyncEvent } from "@/lib/syncEvents";
import { markProactiveUnread } from "./proactiveUnreadStore";

const maybeNotifyReminder = (event: SyncEvent): void => {
  if (event.payload.eventType !== "reminder.due") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("PlantEcho 提醒", {
    body: "你有一条约定好的提醒，打开对话看看吧。",
    tag: `plant-reminder:${event.payload.messageId ?? event.id}`
  });
};

export const useProactiveInbox = (connection: BackendConnection | null): void => {
  useEffect(() => {
    if (!connection) return;
    const listener = (rawEvent: Event) => {
      const event = (rawEvent as CustomEvent<SyncEvent>).detail;
      if (
        event.type !== "messages.changed" ||
        event.payload.proactive !== true ||
        !event.plantId
      ) return;
      markProactiveUnread(event.plantId);
      maybeNotifyReminder(event);
    };
    window.addEventListener(SYNC_EVENT_NAME, listener);
    return () => window.removeEventListener(SYNC_EVENT_NAME, listener);
  }, [connection?.baseUrl, connection?.user.id]);
};
