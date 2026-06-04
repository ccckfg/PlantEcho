import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import "./PlantStatusTagChips.css";

interface PlantStatusTagChipsProps {
  plantId: string;
  primaryLabel: string;
}

const fallbackTags = (primaryLabel: string): string[] => {
  if (primaryLabel === "离线") return ["待感知", "安静等"];
  if (primaryLabel === "口渴") return ["想喝水", "根在等"];
  if (primaryLabel === "日光浴中") return ["向光中", "晒太阳"];
  if (primaryLabel === "开心") return ["状态好", "舒展中"];
  return ["稳定", "慢生长"];
};

const isDuplicateMood = (tag: string, primaryLabel: string): boolean => {
  if (tag === primaryLabel) return true;
  if (primaryLabel === "离线") return /离线|断开|信号|传感器/.test(tag);
  if (primaryLabel === "口渴") return /口渴|缺水|喝水/.test(tag);
  return false;
};

const uniqueTags = (tags: string[], primaryLabel: string): string[] => {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag && !isDuplicateMood(tag, primaryLabel) && !seen.has(tag) && seen.add(tag))
    .slice(0, 2);
};

function SmoothStatusChip({ tag, index }: { tag: string; index: number }) {
  const [shown, setShown] = useState(tag);
  const [phase, setPhase] = useState<"steady" | "leaving" | "entering">("steady");
  const chars = Math.max(2, Math.min(4, Math.max(shown.length, tag.length)));

  useEffect(() => {
    if (tag === shown) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setShown(tag);
      setPhase("steady");
      return;
    }

    setPhase("leaving");
    const swapTimer = window.setTimeout(() => {
      setShown(tag);
      setPhase("entering");
    }, 130);
    const settleTimer = window.setTimeout(() => setPhase("steady"), 460);
    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [tag, shown]);

  return (
    <span
      className={`status-tag-chip status-tag-chip--${phase}`}
      style={{ "--status-tag-chars": chars, "--status-tag-delay": `${index * 35}ms` } as CSSProperties}
    >
      <span className="status-tag-chip__inner">
        <span className="status-tag-chip__dot" aria-hidden />
        <span>{shown}</span>
      </span>
    </span>
  );
}

export function PlantStatusTagChips({ plantId, primaryLabel }: PlantStatusTagChipsProps) {
  const refresh = useSyncRefresh(
    { plantId, resources: ["readings", "status", "memories"] },
    { throttleMs: SENSOR_STATUS_REFRESH_MS }
  );
  const state = useAsync(() => api.getPlantStatusTags(plantId), [plantId, refresh]);
  const tags = useMemo(() => {
    const fallback = fallbackTags(primaryLabel);
    return uniqueTags([...(state.data?.tags.tags ?? []), ...fallback], primaryLabel);
  }, [primaryLabel, state.data]);

  return (
    <>
      {tags.map((tag, index) => (
        <SmoothStatusChip key={index} tag={tag} index={index} />
      ))}
    </>
  );
}
