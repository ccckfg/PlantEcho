import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { Empty } from "@/components/UI";
import { MobileChatScreen } from "./MobileChatScreen";

export function MobileChatPage() {
  const { plantId } = useParams<{ plantId?: string }>();
  const navigate = useNavigate();
  const plantsRefresh = useSyncRefresh({ resources: ["plants"] });
  const plantsState = useAsync(() => api.listPlants(), [plantsRefresh]);
  const plants = plantsState.data?.plants ?? [];

  const targetId = useMemo(() => {
    if (plantId && plants.some((p) => p.id === plantId)) return plantId;
    return plants[0]?.id ?? null;
  }, [plantId, plants]);

  if (plantsState.loading && !plantsState.data) {
    return (
      <div className="flex h-full flex-col gap-md p-md">
        <div className="h-16 animate-pulse rounded-md bg-surface-container-low" />
        <div className="flex-1 animate-pulse rounded-md bg-surface-container-low" />
      </div>
    );
  }
  if ((plantsState.error && !plantsState.data) || plants.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-margin-mobile">
        <Empty
          icon={plantsState.error ? "cloud_off" : "potted_plant"}
          title="还没有可以聊天的植物"
          description={plantsState.error ?? "先到温室接进一株植物，再回来这里。"}
        />
      </div>
    );
  }

  if (!targetId) return null;
  return (
    <MobileChatScreen
      key={targetId}
      plantId={targetId}
      plants={plants}
      onSwitch={(nextId) => navigate(`/chat/${encodeURIComponent(nextId)}`)}
    />
  );
}
