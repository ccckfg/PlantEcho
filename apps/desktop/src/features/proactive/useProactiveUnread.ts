import { useEffect, useState } from "react";
import {
  PROACTIVE_UNREAD_EVENT,
  markProactiveRead,
  readProactiveUnread
} from "./proactiveUnreadStore";

const useUnreadPlantIds = (): Set<string> => {
  const [unread, setUnread] = useState(readProactiveUnread);

  useEffect(() => {
    const refresh = () => setUnread(readProactiveUnread());
    window.addEventListener(PROACTIVE_UNREAD_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROACTIVE_UNREAD_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return unread;
};

export const useProactiveUnread = (plantId: string): boolean =>
  useUnreadPlantIds().has(plantId);

export const useProactiveUnreadCount = (): number => useUnreadPlantIds().size;

export const useMarkProactiveRead = (plantId: string, refreshVersion: number): void => {
  useEffect(() => {
    markProactiveRead(plantId);
  }, [plantId, refreshVersion]);
};
