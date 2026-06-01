import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { api } from "@/lib/api";
import { useNow } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { useToast } from "@/components/Toast";
import { Card, Icon, Empty } from "@/components/UI";
import { DashboardSkeleton, PlantCard, WeatherPill } from "@/components/dashboard/DashboardWidgets";
import { PlantReflectionCard } from "@/components/plants/PlantReflectionCard";

const GREETINGS = [
  { range: [5, 11], text: "早安" },
  { range: [11, 14], text: "午安" },
  { range: [14, 18], text: "下午好" },
  { range: [18, 23], text: "晚上好" }
] as const;

function greetingNow(): string {
  const hour = new Date().getHours();
  return GREETINGS.find(({ range }) => hour >= range[0] && hour < range[1])?.text ?? "夜深了";
}

function todayLabel(): string {
  const now = new Date();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${weekdays[now.getDay()]}`;
}

export function MobileDashboardPage() {
  const plantsRefresh = useSyncRefresh({ resources: ["plants"] });
  const plantsState = useAsync(() => api.listPlants(), [plantsRefresh]);
  const weatherState = useAsync(() => api.weatherNow(), []);
  const now = useNow(SENSOR_STATUS_REFRESH_MS);
  const [recordingWater, setRecordingWater] = useState(false);
  const pendingTimerRef = useRef<number | null>(null);
  const toast = useToast();
  const firstPlant = plantsState.data?.plants[0] ?? null;

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    };
  }, []);

  const recordWatering = () => {
    if (!firstPlant || recordingWater) return;
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    let cancelled = false;
    toast.show({
      title: `已为 ${firstPlant.name} 准备记录浇水`,
      description: "5 秒内可以撤销。",
      tone: "success",
      durationMs: 5000,
      action: {
        label: "撤销",
        onClick: () => {
          cancelled = true;
          if (pendingTimerRef.current) {
            window.clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
        }
      }
    });
    pendingTimerRef.current = window.setTimeout(async () => {
      pendingTimerRef.current = null;
      if (cancelled) return;
      setRecordingWater(true);
      try {
        await api.chat(firstPlant.id, "记录一下：已浇水");
        toast.show({ title: `${firstPlant.name} 已收到这杯水`, tone: "success", durationMs: 3000 });
      } catch (error) {
        toast.show({
          title: "我们没能把浇水记下来",
          description: error instanceof Error ? error.message : "网络可能开了点小差，要不要再试一次？",
          tone: "warning",
          durationMs: 6000
        });
      } finally {
        setRecordingWater(false);
      }
    }, 5000);
  };

  return (
    <div className="flex flex-col gap-lg px-margin-mobile py-md pb-xxl">
      <header className="flex flex-col gap-sm">
        <div className="inline-flex items-center gap-xs self-start rounded-full bg-secondary-container/40 px-md py-xs text-label-sm font-label-sm text-on-secondary-container ring-1 ring-secondary-fixed-dim/45">
          <Icon name="eco" className="text-[14px] text-secondary" />
          {greetingNow()}，{todayLabel()}
        </div>
        <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
          {plantsState.data?.plants.length
            ? `今天，有 ${plantsState.data.plants.length} 株植物在等你看一眼。`
            : "把第一株植物接进来，让这里慢慢热闹起来。"}
        </p>
        <WeatherPill state={weatherState} />
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={recordWatering}
            disabled={!firstPlant || recordingWater}
            className="group flex flex-1 items-center justify-center gap-sm rounded-full bg-surface-container-lowest px-lg py-md font-label-md text-label-md text-primary ring-1 ring-outline-variant transition-all duration-200 ease-standard hover:bg-secondary-container/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon
              name={recordingWater ? "progress_activity" : "water_drop"}
              className={`text-[18px] ${recordingWater ? "animate-spin" : ""}`}
            />
            {recordingWater ? "正在记下来…" : "一键浇水"}
          </button>
          <Link
            to="/album?upload=1"
            className="group flex flex-1 items-center justify-center gap-sm rounded-full bg-surface-container-lowest px-lg py-md font-label-md text-label-md text-primary ring-1 ring-outline-variant transition-all duration-200 ease-standard hover:bg-secondary-container/30 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="photo_camera" className="text-[18px]" />
            为它拍一张
          </Link>
        </div>
        {firstPlant ? <PlantReflectionCard /> : null}
      </header>

      <section>
        <div className="mb-md flex items-center justify-between">
          <h3 className="font-display text-headline-md text-primary">概览</h3>
          <Link
            to="/journal"
            className="group flex items-center gap-xs font-label-md text-label-md text-secondary transition-colors duration-200 hover:text-primary"
          >
            查看全部
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>

        {plantsState.loading ? (
          <DashboardSkeleton />
        ) : plantsState.error ? (
          <Card>
            <Empty
              icon="cloud_off"
              title="我们暂时联系不上后端"
              description="要不要稍后再试一次？dev:server 启动后会立刻好起来。"
            />
          </Card>
        ) : plantsState.data && plantsState.data.plants.length > 0 ? (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {plantsState.data.plants.map((plant, idx) => (
              <PlantCard key={plant.id} plant={plant} now={now} index={idx} />
            ))}
          </div>
        ) : (
          <Card>
            <Empty
              icon="potted_plant"
              title="你的花园还很安静"
              description="先连一台 ESP32 设备，让第一片叶子抵达这里。"
            />
          </Card>
        )}
      </section>
    </div>
  );
}
