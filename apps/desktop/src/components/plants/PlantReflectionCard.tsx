import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { Icon } from "@/components/UI";

const FALLBACK_REFLECTION = "慢一点也没关系，叶子会替时间记得。";
const ROUTE_PLANT_PATTERN = /^\/(?:plant|chat|journal)\/([^/?#]+)/;

const routePlantId = (pathname: string): string | null => {
  const match = pathname.match(ROUTE_PLANT_PATTERN);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const choosePlantId = (pathname: string, plants: PlantSummary[] | undefined): string | null => {
  return routePlantId(pathname) ?? plants?.[0]?.id ?? null;
};

export function PlantReflectionCard() {
  const location = useLocation();
  const plantsRefresh = useSyncRefresh({ resources: ["plants"] });
  const plants = useAsync(() => api.listPlants(), [plantsRefresh]);
  const plantId = useMemo(
    () => choosePlantId(location.pathname, plants.data?.plants),
    [location.pathname, plants.data]
  );
  const reflectionRefresh = useSyncRefresh(
    {
      plantId: plantId ?? undefined,
      resources: ["memories"]
    }
  );
  const reflection = useAsync(
    () =>
      plantId
        ? api.getPlantReflection(plantId)
        : Promise.resolve({
            reflection: { text: FALLBACK_REFLECTION, usedLlm: false, basis: [] }
          }),
    [plantId, reflectionRefresh]
  );
  const text = reflection.data?.reflection.text || FALLBACK_REFLECTION;

  return (
    <div className="group/reflection relative shrink-0 overflow-hidden rounded-md px-md py-md bg-gradient-to-br from-secondary-container/45 via-surface-container-lowest/70 to-surface-container-low/40 ring-1 ring-secondary-fixed-dim/30 shadow-[0_1px_2px_rgba(45,90,39,0.04),0_10px_22px_-14px_rgba(45,90,39,0.16)] transition-shadow duration-420 ease-emphasized">
      {/* 角落柔光 — 营造空间层次 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-7 -top-9 h-20 w-20 rounded-full bg-primary-fixed/35 blur-2xl transition-transform duration-700 ease-emphasized group-hover/reflection:scale-110"
      />
      {/* 顶部高光描边 — 让卡片有被照亮的厚度感 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-container-lowest/80 to-transparent"
      />
      <div className="relative flex items-start gap-sm">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-secondary-container/70 text-secondary ring-1 ring-secondary-fixed-dim/40 transition-transform duration-420 ease-emphasized group-hover/reflection:-rotate-6">
          <Icon name="eco" filled className="text-[14px]" />
        </span>
        <p className="side-reflection-text">{text}</p>
      </div>
    </div>
  );
}
