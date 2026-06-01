import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { Empty } from "@/components/UI";
import { ChatScreen } from "@/components/chat/ChatScreen";

export function ChatPage() {
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
    return <ChatSkeleton />;
  }
  if (plantsState.error && !plantsState.data) {
    return (
      <div className="h-full flex items-center justify-center px-margin-desktop">
        <Empty
          icon="cloud_off"
          title="还没有可以聊天的植物"
          description={plantsState.error ?? "先到温室接进一株植物，再回来这里。"}
        />
      </div>
    );
  }
  if (plants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center px-margin-desktop">
        <Empty
          icon="potted_plant"
          title="还没有可以聊天的植物"
          description="先到温室接进一株植物，再回来这里。"
        />
      </div>
    );
  }

  if (!targetId) return null;
  return (
    <ChatScreen
      key={targetId}
      plantId={targetId}
      plants={plants}
      onSwitch={(nextId) => navigate(`/chat/${encodeURIComponent(nextId)}`)}
    />
  );
}

function ChatSkeleton() {
  return (
    <div className="h-full flex gap-xl p-xl">
      <div className="w-80 bg-surface-container-low rounded-md animate-pulse" />
      <div className="flex-1 bg-surface-container-low rounded-md animate-pulse" />
    </div>
  );
}
