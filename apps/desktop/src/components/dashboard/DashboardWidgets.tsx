import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlantSummary } from "@dyn/shared";
import type { ReadingState, WeatherNowResult } from "@/lib/api";
import { api, mediaUrl } from "@/lib/api";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { plantImage } from "@/lib/format";
import { deriveStatus, MOOD_BUBBLES, MOOD_PRESETS } from "@/lib/mood";
import { Chip, Icon } from "@/components/UI";

export function WeatherPill({
  state
}: {
  state: { data: WeatherNowResult | null; loading: boolean; error: string | null };
}) {
  const weather = state.data?.weather;
  const icon = weather?.text.includes("雨")
    ? "rainy"
    : weather?.text.includes("云")
      ? "partly_cloudy_day"
      : weather?.text.includes("阴")
        ? "cloud"
        : "wb_sunny";
  const temperature = weather?.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : "—";
  const label = state.loading
    ? "读取天气"
    : state.error
      ? "天气不可用"
      : state.data?.configured === false
        ? "未配置天气"
        : weather?.text ?? "实时天气";

  return (
    <div className="flex items-center gap-md bg-surface-container-lowest py-sm px-lg rounded-full shadow-leaf ring-1 ring-surface-container-highest/50 shrink-0 transition-all duration-300 ease-standard hover:shadow-soft hover:-translate-y-0.5">
      <Icon
        name={icon}
        filled
        className="text-[#F59E0B] transition-transform duration-700 ease-emphasized hover:rotate-12"
        size={32}
      />
      <div className="flex flex-col leading-none">
        <span className="font-display text-headline-md text-primary tabular-nums">{temperature}</span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">{label}</span>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {[0, 1, 2].map((item) => (
        <div key={item} className="bg-surface-container-lowest rounded-md p-lg shadow-leaf ring-1 ring-surface-container-highest/40">
          <div className="w-full h-48 rounded-md bg-surface-container animate-pulse mb-md" />
          <div className="h-6 w-1/2 rounded bg-surface-container animate-pulse mb-xs" />
          <div className="h-4 w-1/3 rounded bg-surface-container animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function PlantCard({ plant, now, index }: { plant: PlantSummary; now: Date; index: number }) {
  const [reading, setReading] = useState<ReadingState | null>(null);
  const [hover, setHover] = useState(false);
  const readingRefresh = useSyncRefresh({
    plantId: plant.id,
    resources: ["readings", "status"]
  });

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
  const tone = status.highlightTone;
  const avatarSrc = mediaUrl(plant.avatarUrl ?? plantImage(plant.id));
  const captionStyle =
    tone === "error"
      ? "text-error font-semibold"
      : tone === "tertiary"
        ? "text-tertiary"
        : "text-on-surface-variant";

  return (
    <Link
      to={`/plant/${encodeURIComponent(plant.id)}`}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-md stagger-in"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <article className="surface-card surface-card-hover relative rounded-md p-md md:p-lg flex flex-col gap-md group">
        <div
          className={`absolute -top-3 -right-3 bg-surface-container-lowest ring-1 ring-secondary-fixed-dim/60 px-md py-sm rounded-2xl rounded-br-sm shadow-soft z-10 max-w-[180px] transition-all duration-300 ease-emphasized ${
            hover ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <p className="font-label-sm text-label-sm text-on-surface-variant italic leading-relaxed">
            "{MOOD_BUBBLES[status.mood]}"
          </p>
        </div>
        <div className="w-full h-52 md:h-48 rounded-md overflow-hidden bg-surface-container relative">
          <img
            src={avatarSrc}
            alt={plant.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-emphasized group-hover:scale-[1.06]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent pointer-events-none"
          />
          <div className="absolute top-sm left-sm">
            <Chip
              icon={moodMeta.icon}
              tone={
                status.mood === "thirsty"
                  ? "error"
                  : status.mood === "sunny"
                    ? "tertiary"
                    : "secondary"
              }
            >
              {moodMeta.label}
            </Chip>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-start gap-sm mb-xs">
            <h4 className="font-display text-headline-md text-primary truncate">{plant.name}</h4>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low/80 px-sm py-xs rounded-full shrink-0">
              {plant.species}
            </span>
          </div>
          <div className={`flex items-center gap-sm font-body text-body-md mt-sm ${captionStyle}`}>
            <Icon
              name={status.highlightIcon}
              filled={tone === "error"}
              className={
                tone === "error"
                  ? "text-error"
                  : tone === "tertiary"
                    ? "text-tertiary-container"
                    : "text-primary"
              }
            />
            <span className="leading-relaxed">{status.caption}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
