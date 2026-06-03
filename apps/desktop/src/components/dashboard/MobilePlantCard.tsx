import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import type { ReadingState } from "@/lib/api";
import { api, mediaUrl } from "@/lib/api";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { plantImage } from "@/lib/format";
import { deriveStatus, MOOD_PRESETS } from "@/lib/mood";
import { Icon } from "@/components/UI";

/**
 * 移动端横向植物卡 —— 参考 stitch 设计稿：左侧方形缩略图，右侧名称 + 状态徽标、
 * 位置/品种次要信息、心情标签与细水分条。比桌面竖向大卡更紧凑，适配窄屏。
 */
export function MobilePlantCard({
  plant,
  now,
  index
}: {
  plant: PlantSummary;
  now: Date;
  index: number;
}) {
  const [reading, setReading] = useState<ReadingState | null>(null);
  const readingRefresh = useSyncRefresh({ plantId: plant.id, resources: ["readings", "status"] });

  useEffect(() => {
    let cancelled = false;
    api
      .latestReading(plant.id)
      .then((result) => {
        if (!cancelled) setReading(result);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [plant.id, readingRefresh]);

  const status = deriveStatus(reading?.latest, plant.careProfile, now);
  const moodMeta = MOOD_PRESETS[status.mood];
  const needsWater = status.highlightTone === "error";
  const avatarSrc = mediaUrl(plant.avatarUrl ?? plantImage(plant.id));
  const hydration = Math.round(status.hydration);

  return (
    <Link
      to={`/plant/${encodeURIComponent(plant.id)}`}
      className="stagger-in surface-card surface-card-hover flex items-center gap-md rounded-md p-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-container">
        <img
          src={avatarSrc}
          alt={plant.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-[2px] flex items-start justify-between gap-sm">
          <h4 className="truncate font-display text-body-md font-semibold text-on-surface">{plant.name}</h4>
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
              needsWater
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-container text-on-secondary-container"
            }`}
          >
            <Icon name={needsWater ? "water_drop" : "check"} filled className="text-[14px]" />
          </span>
        </div>

        <p className="mb-xs truncate font-body text-label-sm text-on-surface-variant">
          {[plant.location, plant.species].filter(Boolean).join(" · ") || "尚未设置位置"}
        </p>

        <div className="mb-xs flex flex-wrap gap-xs">
          <span className={`rounded-full px-sm py-[2px] text-label-xs font-label-sm ${moodMeta.classes}`}>
            {moodMeta.label}
          </span>
        </div>

        {status.mood === "offline" ? (
          <p className="font-body text-label-xs text-on-surface-variant">等待传感器</p>
        ) : (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-emphasized ${
                  needsWater ? "bg-error" : "bg-primary"
                }`}
                style={{ width: `${hydration}%` }}
              />
            </div>
            <p className={`mt-[2px] text-right text-label-xs font-label-sm ${needsWater ? "text-error" : "text-primary"}`}>
              水分 {hydration}%
            </p>
          </>
        )}
      </div>
    </Link>
  );
}
