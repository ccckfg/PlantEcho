import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { Card, Empty, Icon } from "@/components/UI";
import { PlantSwitcher } from "@/components/plants/PlantSwitcher";
import { CareRecordPanel } from "@/components/journal/CareRecordPanel";
import { TimelineItem } from "@/components/journal/TimelineItem";

export function MobileJournalPage() {
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
      <div className="animate-pulse px-margin-mobile py-lg">
        <div className="mb-lg h-8 w-1/2 rounded bg-surface-container" />
        <div className="mb-xl grid grid-cols-3 gap-sm">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-md bg-surface-container" />
          ))}
        </div>
        <div className="h-56 rounded-md bg-surface-container" />
      </div>
    );
  }
  if (!targetId || plants.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-margin-mobile">
        <Empty
          icon="menu_book"
          title="还没有植物日记"
          description="先到温室添加一株植物，回来这里就能看到它的成长。"
        />
      </div>
    );
  }
  return (
    <MobileJournalContent
      plantId={targetId}
      plants={plants}
      onSwitch={(nextId) => navigate(`/journal/${encodeURIComponent(nextId)}`)}
    />
  );
}

function MobileJournalContent({
  plantId,
  plants,
  onSwitch
}: {
  plantId: string;
  plants: PlantSummary[];
  onSwitch: (nextId: string) => void;
}) {
  const plantRefresh = useSyncRefresh({ plantId, resources: ["plants"] });
  const memoriesRefresh = useSyncRefresh({ plantId, resources: ["memories"] });
  const understandingsRefresh = useSyncRefresh({ plantId, resources: ["understandings"] });
  const plant = useAsync(() => api.getPlant(plantId), [plantId, plantRefresh]);
  const memories = useAsync(() => api.listMemories(plantId), [plantId, memoriesRefresh]);
  const understandings = useAsync(() => api.listUnderstandings(plantId), [plantId, understandingsRefresh]);

  const story = useMemo(() => {
    const list = memories.data?.memories ?? [];
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [memories.data]);
  const milestones = useMemo(() => story.filter((memory) => memory.isMilestone), [story]);

  const summary = plant.data?.plant;
  const totalDays = useMemo(() => {
    if (!story.length) return 0;
    const start = new Date(story[story.length - 1].createdAt).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(1, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24)));
  }, [story]);

  return (
    <div className="flex flex-col px-margin-mobile py-md pb-xxl">
      {plants.length > 1 ? (
        <PlantSwitcher
          plants={plants}
          activeId={plantId}
          ariaLabel="切换植物日记"
          onSwitch={onSwitch}
          className="mb-md"
          size="wide"
        />
      ) : null}
      <div key={`journal-${plantId}`} className="plant-swap-in flex flex-col gap-lg">
        <header className="flex flex-col gap-sm">
          <h1 className="font-display text-headline-lg-mobile text-on-surface leading-tight">
            {summary?.name ?? "未命名植物"} 的成长旅程
          </h1>
          <Link
            to={`/chat/${plantId}`}
            className="group inline-flex items-center gap-xs self-start rounded-full px-lg py-sm font-label-md text-label-md text-primary ring-1 ring-secondary-fixed-dim transition-all duration-200 ease-standard hover:bg-secondary-container/40 active:scale-[0.98]"
          >
            <Icon name="forum" className="text-[18px]" />
            去聊天
          </Link>
        </header>

        <section className="flex items-center justify-around rounded-full bg-secondary-container/20 py-sm px-md border border-secondary-fixed-dim/20 text-on-surface select-none">
          <div className="flex items-center gap-xs">
            <Icon name="straighten" className="text-secondary text-[16px]" />
            <span className="font-label-sm text-[12px] text-on-surface-variant">记忆</span>
            <span className="font-display text-[13px] font-bold text-primary ml-xs">{story.length}条</span>
          </div>
          <div className="h-3 w-[1px] bg-outline-variant/40" />
          <div className="flex items-center gap-xs">
            <Icon name="energy_savings_leaf" className="text-secondary text-[16px]" />
            <span className="font-label-sm text-[12px] text-on-surface-variant">认知</span>
            <span className="font-display text-[13px] font-bold text-primary ml-xs">{understandings.data?.understandings.length ?? 0}项</span>
          </div>
          <div className="h-3 w-[1px] bg-outline-variant/40" />
          <div className="flex items-center gap-xs">
            <Icon name="calendar_month" className="text-secondary text-[16px]" />
            <span className="font-label-sm text-[12px] text-on-surface-variant">相伴</span>
            <span className="font-display text-[13px] font-bold text-primary ml-xs">{totalDays}天</span>
          </div>
        </section>

        <section>
          <CareRecordPanel plantId={plantId} plantName={summary?.name ?? "它"} variant="mobile" />
        </section>

        <section>
          <h2 className="mb-md font-display text-headline-sm text-on-surface">成长里程碑</h2>
          {memories.loading && !memories.data ? (
            <Card>
              <div className="h-32 animate-pulse" />
            </Card>
          ) : milestones.length === 0 ? (
            <Card>
              <Empty
                icon="bedtime"
                title="它的回忆还在攒着"
                description={
                  story.length
                    ? `已经有 ${story.length} 条小记忆，等出现重要时刻就会汇成里程碑。`
                    : "当它经历开花、第一次浇水、状态转折这样的重要时刻，会落到这里。"
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-lg">
              {milestones.map((memory, idx) => (
                <TimelineItem
                  key={memory.id}
                  plantId={plantId}
                  plantName={summary?.name ?? "它"}
                  memory={memory}
                  tone={idx === 0 ? "newest" : idx === milestones.length - 1 ? "oldest" : "mid"}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


