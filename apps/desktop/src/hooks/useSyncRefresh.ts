import { useEffect, useMemo, useRef, useState } from "react";
import {
  matchesSyncFilter,
  SYNC_EVENT_NAME,
  type SyncEvent,
  type SyncFilter
} from "@/lib/syncEvents";

interface SyncRefreshOptions {
  throttleMs?: number;
}

export function useSyncRefresh(
  filter: SyncFilter,
  options: SyncRefreshOptions = {}
): number {
  const [version, setVersion] = useState(0);
  const lastRefreshAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const resourcesKey = useMemo(() => filter.resources?.join("|") ?? "", [filter.resources]);
  const throttleMs = options.throttleMs ?? 0;

  useEffect(() => {
    lastRefreshAtRef.current = 0;
    const bump = () => {
      lastRefreshAtRef.current = Date.now();
      setVersion((value) => value + 1);
    };
    const listener = (event: Event) => {
      const syncEvent = (event as CustomEvent<SyncEvent>).detail;
      if (!matchesSyncFilter(syncEvent, filter)) return;
      if (throttleMs <= 0) {
        bump();
        return;
      }
      const elapsed = Date.now() - lastRefreshAtRef.current;
      if (elapsed >= throttleMs) {
        bump();
        return;
      }
      if (timerRef.current !== null) return;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        bump();
      }, throttleMs - elapsed);
    };
    window.addEventListener(SYNC_EVENT_NAME, listener);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, listener);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [filter.plantId, resourcesKey, throttleMs]);

  return version;
}
