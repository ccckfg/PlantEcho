import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { Card, Chip, Empty, Icon } from "@/components/UI";
import { PlantSwitcher } from "@/components/plants/PlantSwitcher";
import { StatCard } from "@/components/journal/JournalStats";
import { TimelineItem } from "@/components/journal/TimelineItem";

export function JournalPage() {
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
      <div className="max-w-[1000px] mx-auto px-margin-desktop py-xxl animate-pulse">
        <div className="h-12 w-1/3 bg-surface-container rounded mb-xl" />
        <div className="grid grid-cols-3 gap-md mb-xxl">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-surface-container rounded-md" />
          ))}
        </div>
        <div className="h-64 bg-surface-container rounded-md" />
      </div>
    );
  }
  if (!targetId || plants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty
          icon="menu_book"
          title="还没有植物日记"
          description="先到温室添加一株植物，回来这里就能看到它的成长。"
        />
      </div>
    );
  }
  return (
    <JournalContent
      plantId={targetId}
      plants={plants}
      onSwitch={(nextId) => navigate(`/journal/${encodeURIComponent(nextId)}`)}
    />
  );
}

function JournalContent({
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
  const understandings = useAsync(
    () => api.listUnderstandings(plantId),
    [plantId, understandingsRefresh]
  );

  const story = useMemo(() => {
    const list = memories.data?.memories ?? [];
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [memories.data]);
  const milestones = useMemo(() => story.filter((memory) => memory.isMilestone), [story]);

  const summary = plant.data?.plant;
  const totalDays = useMemo(() => {
    if (!story.length) return 0;
    const oldest = story[story.length - 1];
    const start = new Date(oldest.createdAt).getTime();
    if (Number.isNaN(start)) return 0;
    return Math.max(1, Math.round((Date.now() - start) / (1000 * 60 * 60 * 24)));
  }, [story]);

  return (
    <div className="max-w-[1000px] mx-auto w-full px-margin-desktop py-xxl pb-[120px]">
      {plants.length > 1 ? (
        <PlantSwitcher
          plants={plants}
          activeId={plantId}
          ariaLabel="切换植物日记"
          onSwitch={onSwitch}
          className="mb-xl gap-sm pb-sm"
          size="wide"
        />
      ) : null}
      <div key={`journal-${plantId}`} className="plant-swap-in">
      <header className="mb-xxl flex flex-col gap-md">
        <div className="flex items-center gap-sm flex-wrap">
          <Chip tone="tertiary">{summary?.species ?? "未知品种"}</Chip>
          {plant.data?.state.inner.concern ? (
            <Chip
              icon="water_drop"
              tone={statusNeedsAttention(plant.data.state.inner.concern) ? "error" : "muted"}
            >
              {plant.data.state.inner.concern}
            </Chip>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-lg">
          <h1 className="font-display text-headline-xl text-on-surface leading-tight">
            {summary?.name ?? "未命名植物"} 的成长旅程
          </h1>
          <Link
            to={`/chat/${plantId}`}
            className="group shrink-0 inline-flex items-center gap-xs px-lg py-sm rounded-full ring-1 ring-secondary-fixed-dim text-primary font-label-md text-label-md whitespace-nowrap transition-all duration-200 ease-standard hover:bg-secondary-container/40 hover:ring-secondary-fixed active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="forum" className="text-[18px] transition-transform duration-300 ease-emphasized group-hover:scale-110" />
            去聊天
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-md mb-xxl">
        <StatCard icon="straighten" label="累计记忆" value={`${story.length}`} suffix="条" delay={0} />
        <StatCard
          icon="energy_savings_leaf"
          label="稳定认知"
          value={`${understandings.data?.understandings.length ?? 0}`}
          suffix="项"
          delay={80}
        />
        <StatCard icon="calendar_month" label="相伴天数" value={`${totalDays}`} suffix="天" delay={160} />
      </section>

      <section className="max-w-3xl">
        <h2 className="font-display text-headline-lg text-on-surface mb-lg">成长里程碑</h2>
        {memories.loading && !memories.data ? (
          <Card>
            <div className="animate-pulse h-40" />
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
          <div className="flex flex-col gap-xl">
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

      {understandings.data && understandings.data.understandings.length > 0 ? (
        <section className="mt-xxl max-w-3xl">
          <h2 className="font-display text-headline-lg text-on-surface mb-lg">长期认知</h2>
          <div className="flex flex-col gap-md">
            {understandings.data.understandings.map((u) => (
              <Card key={u.id} className="!p-md">
                <div className="flex items-start gap-md">
                  <div className="w-9 h-9 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                    <Icon name="psychiatry" className="text-[20px]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-label-md text-label-md text-secondary mb-xs">
                      {u.subject || "通用认知"}
                    </p>
                    <p className="font-body text-body-md text-on-surface">{u.content || "—"}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      </div>
    </div>
  );
}

function statusNeedsAttention(text: string): boolean {
  return /偏干|缺水|偏湿|过强|过弱|不舒适|异常|low|high|out/i.test(text);
}
