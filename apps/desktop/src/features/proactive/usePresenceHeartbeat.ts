import { useEffect } from "react";
import { proactivePresenceHeartbeatMs } from "@/config/proactive";
import type { BackendConnection } from "@/lib/connection";
import { proactiveApi } from "@/lib/proactiveApi";

export const usePresenceHeartbeat = (connection: BackendConnection | null): void => {
  useEffect(() => {
    if (!connection) return;
    const reportVisibility = () => {
      void proactiveApi.heartbeat(document.visibilityState === "visible").catch(() => undefined);
    };
    const heartbeat = () => {
      if (document.visibilityState === "visible") reportVisibility();
    };
    reportVisibility();
    const timer = window.setInterval(heartbeat, proactivePresenceHeartbeatMs);
    document.addEventListener("visibilitychange", reportVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", reportVisibility);
    };
  }, [connection?.baseUrl, connection?.token, connection?.user.id]);
};
