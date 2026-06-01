import { useEffect } from "react";
import type { BackendConnection } from "@/lib/connection";
import { streamSyncEvents } from "@/lib/syncEvents";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export function useSyncStream(connection: BackendConnection | null): void {
  useEffect(() => {
    if (!connection) return;
    const controller = new AbortController();
    let stopped = false;

    const run = async () => {
      while (!stopped) {
        try {
          await streamSyncEvents(controller.signal);
        } catch (error) {
          if (controller.signal.aborted) return;
          console.warn("[sync] stream reconnecting", error);
        }
        await sleep(1500);
      }
    };

    void run();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [connection?.baseUrl, connection?.token]);
}
