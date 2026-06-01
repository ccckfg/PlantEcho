import type { KeyboardEvent } from "react";
import type { PlantSummary } from "@dyn/shared";
import { mediaUrl } from "@/lib/api";
import { plantImage } from "@/lib/format";

interface PlantSwitcherProps {
  plants: PlantSummary[];
  activeId: string;
  ariaLabel: string;
  onSwitch: (nextId: string) => void;
  className?: string;
  size?: "compact" | "wide";
}

export function PlantSwitcher({
  plants,
  activeId,
  ariaLabel,
  onSwitch,
  className = "",
  size = "compact"
}: PlantSwitcherProps) {
  const activeIndex = Math.max(0, plants.findIndex((plant) => plant.id === activeId));
  const avatarSize = size === "wide" ? "h-7 w-7" : "h-6 w-6";
  const labelWidth = size === "wide" ? "max-w-[7rem]" : "max-w-[6rem]";
  const itemPadding = size === "wide" ? "px-md py-xs text-label-md" : "px-sm py-xs text-label-sm";

  const switchTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(plants.length - 1, nextIndex));
    const next = plants[clamped];
    if (next && next.id !== activeId) onSwitch(next.id);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      switchTo(activeIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      switchTo(activeIndex + 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKey}
      className={`flex gap-xs overflow-x-auto scroll-area px-xs pt-xs pb-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl ${className}`}
    >
      {plants.map((plant, index) => {
        const isActive = plant.id === activeId;
        return (
          <button
            key={plant.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => switchTo(index)}
            className={`group shrink-0 inline-flex items-center gap-xs rounded-full ${itemPadding} font-label-sm transition-all duration-300 ease-emphasized active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isActive
                ? "bg-secondary-container/70 text-on-secondary-container ring-1 ring-secondary-fixed shadow-[0_1px_2px_rgba(45,90,39,0.06),0_4px_12px_rgba(45,90,39,0.08)]"
                : "bg-surface-container-lowest/70 ring-1 ring-surface-container-highest/55 text-on-surface-variant hover:bg-secondary-container/30 hover:text-primary hover:ring-secondary-fixed-dim"
            }`}
          >
            <span
              className={`relative ${avatarSize} rounded-full overflow-hidden ring-2 transition-all duration-300 ${
                isActive ? "ring-secondary-fixed-dim/70" : "ring-surface-container-highest/40"
              }`}
            >
              <img
                src={mediaUrl(plant.avatarUrl ?? plantImage(plant.id))}
                alt=""
                className="h-full w-full object-cover transition-transform duration-500 ease-emphasized group-hover:scale-105"
                loading="lazy"
              />
            </span>
            <span className={`truncate ${labelWidth}`}>{plant.name}</span>
          </button>
        );
      })}
    </div>
  );
}
