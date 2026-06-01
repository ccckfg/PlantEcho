import { useEffect, useMemo, useState } from "react";
import {
  matchesSyncFilter,
  SYNC_EVENT_NAME,
  type SyncEvent,
  type SyncFilter
} from "@/lib/syncEvents";

export function useSyncRefresh(filter: SyncFilter): number {
  const [version, setVersion] = useState(0);
  const resourcesKey = useMemo(() => filter.resources?.join("|") ?? "", [filter.resources]);

  useEffect(() => {
    const listener = (event: Event) => {
      const syncEvent = (event as CustomEvent<SyncEvent>).detail;
      if (matchesSyncFilter(syncEvent, filter)) setVersion((value) => value + 1);
    };
    window.addEventListener(SYNC_EVENT_NAME, listener);
    return () => window.removeEventListener(SYNC_EVENT_NAME, listener);
  }, [filter.plantId, resourcesKey]);

  return version;
}
