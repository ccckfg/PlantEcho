import type { Talkativeness } from "@/config/proactive";
import { request } from "./api";

export interface ProactiveSettings {
  talkativeness: Talkativeness;
  dailyCapacity: number;
}

export const proactiveApi = {
  heartbeat: (visible: boolean) => request<{ online: boolean; userId: string; seenAt: string }>(
    "/api/v1/proactive/presence",
    { method: "POST", body: JSON.stringify({ visible }) }
  ),
  getSettings: () => request<ProactiveSettings>("/api/v1/proactive/settings"),
  updateSettings: (talkativeness: Talkativeness) => request<ProactiveSettings>(
    "/api/v1/proactive/settings",
    {
      method: "PUT",
      body: JSON.stringify({ talkativeness })
    }
  )
};
