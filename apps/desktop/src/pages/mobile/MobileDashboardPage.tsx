import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { api } from "@/lib/api";
import { logCareRecord } from "@/lib/careActions";
import { useNow } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { useToast } from "@/components/Toast";
import { Card, Icon, Empty } from "@/components/UI";
import { DashboardSkeleton } from "@/components/dashboard/DashboardWidgets";
import { MobilePlantCard } from "@/components/dashboard/MobilePlantCard";
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
        await Promise.all([
          api.chat(firstPlant.id, "记录一下：已浇水"),
          logCareRecord(firstPlant.id, "water", "dashboard")
        ]);
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

  // 本地极简天气状态处理
  const weather = weatherState.data?.weather;
  const weatherIcon = weather?.text.includes("雨")
    ? "rainy"
    : weather?.text.includes("云")
      ? "partly_cloudy_day"
      : weather?.text.includes("阴")
        ? "cloud"
        : "wb_sunny";
  const temp = weather?.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : "—";
  const weatherLabel = weatherState.loading
    ? "读取中"
    : weatherState.error
      ? "天气不可用"
      : weatherState.data?.configured === false
        ? "未配置"
        : weather?.text ?? "实时天气";

  return (
    <div className="flex flex-col gap-md px-md py-sm pb-xl">
      <header className="flex flex-col gap-sm">
        {/* 一体化温室控制卡片 (Greenhouse Hub) */}
        <div className="flex flex-col gap-sm rounded-xl bg-gradient-to-br from-surface-container-lowest to-surface p-md border border-hairline shadow-leaf relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* 上半部：问候语、指示与微天气 */}
          <div className="flex items-center justify-between gap-md min-w-0">
            <div className="flex flex-col gap-[2px] min-w-0">
              <div className="inline-flex items-center gap-xs self-start rounded-full bg-secondary-container/40 px-[10px] py-[3px] text-[11px] font-label-sm text-on-secondary-container ring-1 ring-secondary-fixed-dim/30">
                <Icon name="eco" className="text-[11px] text-secondary" />
                {greetingNow()}
              </div>
              <p className="font-body text-body-sm font-semibold text-on-surface leading-tight mt-[4px]">
                {plantsState.data?.plants.length
                  ? `今天，有 ${plantsState.data.plants.length} 株植物在等您`
                  : "探索您的私人温室花园"}
              </p>
              <span className="text-[11px] text-on-surface-variant font-mono">{todayLabel()}</span>
            </div>

            {/* 本地渲染的高颜值超微天气胶囊 */}
            <div className="flex items-center gap-xs bg-surface-container-low/50 py-[4px] px-sm rounded-full border border-hairline shrink-0 select-none">
              <Icon
                name={weatherIcon}
                filled
                className="text-[#F59E0B] text-[16px]"
              />
              <div className="flex flex-col leading-none">
                <span className="text-[12px] font-bold tabular-nums text-on-surface">{temp}</span>
                <span className="text-[9px] text-on-surface-variant font-label-sm">{weatherLabel}</span>
              </div>
            </div>
          </div>

          {/* 下半部：一键浇水与为它拍一张（圆角统一为 rounded-md 且与控制中心完美契合） */}
          <div className="border-t border-hairline/80 pt-md mt-xs flex gap-sm">
            <button
              type="button"
              onClick={recordWatering}
              disabled={!firstPlant || recordingWater}
              className="group flex flex-1 items-center justify-center gap-xs rounded-full bg-surface-container-low/60 hover:bg-secondary-container/30 px-sm py-[7px] font-label-sm text-[12px] text-primary border border-hairline transition-all duration-200 ease-standard active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name={recordingWater ? "progress_activity" : "water_drop"}
                className={`text-[14px] text-primary transition-transform duration-300 group-hover:scale-110 ${recordingWater ? "animate-spin" : ""}`}
              />
              {recordingWater ? "正在记录…" : "一键浇水"}
            </button>
            <Link
              to="/album?upload=1"
              className="group flex flex-1 items-center justify-center gap-xs rounded-full bg-surface-container-low/60 hover:bg-secondary-container/30 px-sm py-[7px] font-label-sm text-[12px] text-primary border border-hairline transition-all duration-200 ease-standard active:scale-[0.98]"
            >
              <Icon name="photo_camera" className="text-[14px] text-primary transition-transform duration-300 group-hover:scale-110" />
              为它拍一张
            </Link>
          </div>
        </div>

        {/* 植物格言卡片，交由父容器 gap 统一控制上下留白 */}
        {firstPlant ? <PlantReflectionCard /> : null}
      </header>

      <section>
        <div className="mb-md flex items-center justify-between">
          <h3 className="font-display text-headline-sm text-primary">概览</h3>
          <Link
            to="/journal"
            className="group flex items-center gap-xs font-label-md text-label-md text-secondary transition-colors duration-200 hover:text-primary"
          >
            查看全部
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>

        {plantsState.loading && !plantsState.data ? (
          <DashboardSkeleton />
        ) : plantsState.error ? (
          <Card>
            <Empty
              icon="cloud_off"
              title="我们暂时联系不上后端"
              description="要要不要稍后再试一次？dev:server 启动后会立刻好起来。"
            />
          </Card>
        ) : plantsState.data && plantsState.data.plants.length > 0 ? (
          <div className="flex flex-col gap-sm">
            {plantsState.data.plants.map((plant, idx) => (
              <MobilePlantCard key={plant.id} plant={plant} now={now} index={idx} />
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
        ) as unknown as React.ReactNode}
      </section>
    </div>
  );
}
