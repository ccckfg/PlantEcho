import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { api, mediaUrl } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { SensorStatusBadge } from "@/components/SensorStatusBadge";
import { Card, Chip, Empty, Icon, ProgressBar } from "@/components/UI";
import { PlantAvatarEditor } from "@/components/plants/PlantAvatarEditor";
import { PlantCareProfileSection } from "@/components/plants/PlantCareProfileSection";
import { PlantNameEditor } from "@/components/plants/PlantNameEditor";
import { deriveStatus, MOOD_PRESETS } from "@/lib/mood";
import { formatTime, plantImage, relativeTime, useNow } from "@/lib/format";
import { getSensorConnection } from "@/lib/sensorStatus";

export function MobilePlantDetailPage() {
  const { plantId } = useParams<{ plantId: string }>();
  if (!plantId) return null;

  const detailRefresh = useSyncRefresh({ plantId, resources: ["plants", "status"] });
  const readingsRefresh = useSyncRefresh({ plantId, resources: ["readings"] });
  const [localRefresh, setLocalRefresh] = useState(0);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const detail = useAsync(() => api.getPlant(plantId), [plantId, detailRefresh, localRefresh]);
  const reading = useAsync(() => api.latestReading(plantId), [plantId, readingsRefresh]);
  const recent = useAsync(() => api.listReadings(plantId, 12), [plantId, readingsRefresh]);
  const now = useNow(SENSOR_STATUS_REFRESH_MS);

  if (detail.loading) {
    return (
      <div className="px-margin-mobile py-lg">
        <div className="mb-md h-8 w-1/2 animate-pulse rounded bg-surface-container" />
        <div className="h-56 animate-pulse rounded-md bg-surface-container" />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <div className="flex h-full items-center justify-center px-margin-mobile">
        <Empty icon="cloud_off" title="无法加载植物" description={detail.error ?? ""} />
      </div>
    );
  }

  const plant = detail.data.plant;
  const latestReading = reading.data?.latest;
  const sensorConnection = getSensorConnection(latestReading, now);
  const status = deriveStatus(latestReading, plant.careProfile, now);
  const moodMeta = MOOD_PRESETS[status.mood];
  const avatarSrc = mediaUrl(plant.avatarUrl ?? plantImage(plant.id));

  return (
    <div className="flex flex-col gap-md px-margin-mobile py-md pb-xxl">
      <Link
        to="/"
        className="group -ml-sm inline-flex items-center gap-xs self-start rounded-full px-sm py-xs font-label-md text-label-md text-on-surface-variant transition-all duration-200 ease-standard hover:bg-secondary-container/30 hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        返回温室
      </Link>

      <div className="group relative overflow-hidden rounded-md surface-card bg-surface-container-lowest">
        <img src={avatarSrc} alt={plant.name} className="h-44 w-full object-cover" />
        <button
          type="button"
          onClick={() => setEditingAvatar(true)}
          className="absolute bottom-md right-md inline-flex items-center gap-xs rounded-full bg-surface-container-lowest/90 px-md py-sm text-label-md font-label-md text-primary shadow-leaf backdrop-blur-sm transition-all hover:bg-primary-container active:scale-[0.97]"
        >
          <Icon name="photo_camera" className="text-[18px]" />
          头像
        </button>
      </div>

      <Card className="flex flex-col gap-md">
        <div className="flex flex-wrap items-center gap-sm">
          <Chip tone="tertiary">{plant.species}</Chip>
          {plant.location ? <Chip icon="place">{plant.location}</Chip> : null}
          <Chip
            icon={moodMeta.icon}
            tone={status.mood === "thirsty" ? "error" : status.mood === "sunny" ? "tertiary" : "secondary"}
          >
            {moodMeta.label}
          </Chip>
        </div>
        <div className="flex flex-col gap-xs">
          <PlantNameEditor plant={plant} onUpdated={() => setLocalRefresh((v) => v + 1)} />
          <p className="font-body text-body-md text-on-surface-variant">{status.caption}</p>
        </div>
        <div className="grid grid-cols-3 gap-sm">
          <ProgressBar label="水分" icon="water_drop" value={status.hydration} />
          <ProgressBar label="光照" icon="light_mode" value={status.light} />
          <ProgressBar label="湿度" icon="air" value={status.humidity} />
        </div>
        <div className="flex flex-wrap gap-sm pt-xs">
          <Link
            to={`/chat/${plant.id}`}
            className="group flex flex-1 items-center justify-center gap-sm rounded-full bg-primary px-lg py-sm font-label-md text-label-md text-on-primary shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint active:scale-[0.98]"
          >
            <Icon name="forum" /> 聊聊近况
          </Link>
          <Link
            to={`/journal/${plant.id}`}
            className="group flex flex-1 items-center justify-center gap-sm rounded-full bg-surface-container-lowest px-lg py-sm font-label-md text-label-md text-primary ring-1 ring-outline-variant transition-all duration-200 ease-standard hover:bg-secondary-container/30 active:scale-[0.98]"
          >
            <Icon name="menu_book" /> 成长日记
          </Link>
        </div>
      </Card>

      <Card>
        <div className="mb-md flex items-center justify-between gap-md">
          <h3 className="font-display text-headline-md text-primary">最新读数</h3>
          <SensorStatusBadge connection={sensorConnection} />
        </div>
        {latestReading && sensorConnection.state === "offline" ? (
          <div className="mb-md flex items-start gap-sm rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
            <Icon name="sensors_off" filled className="shrink-0" />
            <span>{sensorConnection.detail}。下方显示的是最后一次成功上报的数据。</span>
          </div>
        ) : null}
        {latestReading ? (
          <div className="grid grid-cols-2 gap-sm text-on-surface">
            <ReadingTile
              icon="water_drop"
              label="土壤湿度"
              value={
                latestReading.soilPercent != null
                  ? `${Math.round(latestReading.soilPercent)}%`
                  : latestReading.soilRaw != null
                    ? `${latestReading.soilRaw}`
                    : "—"
              }
            />
            <ReadingTile
              icon="thermostat"
              label="气温"
              value={latestReading.airTempC != null ? `${latestReading.airTempC.toFixed(1)}°C` : "—"}
            />
            <ReadingTile
              icon="air"
              label="空气湿度"
              value={
                latestReading.airHumidityPercent != null
                  ? `${Math.round(latestReading.airHumidityPercent)}%`
                  : "—"
              }
            />
            <ReadingTile
              icon="light_mode"
              label="光照"
              value={latestReading.lightLux != null ? `${Math.round(latestReading.lightLux)} lx` : "—"}
            />
          </div>
        ) : (
          <Empty
            icon="sensors_off"
            title="暂无读数"
            description="ESP32 还没有上传数据，可以运行 npm run simulate 试试。"
          />
        )}
        {latestReading ? (
          <p className="mt-md text-label-sm text-on-surface-variant">
            更新于 {relativeTime(latestReading.capturedAt)}
          </p>
        ) : null}
      </Card>

      <Card>
        <h3 className="mb-md font-display text-headline-md text-primary">读数历史</h3>
        {recent.data && recent.data.readings.length > 0 ? (
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 rounded-t bg-gradient-to-b from-surface-container-lowest to-transparent" />
            <ul className="scroll-area flex max-h-72 flex-col gap-sm overflow-y-auto py-1 pr-sm">
              {recent.data.readings.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-md bg-surface-container-low/80 px-md py-sm text-on-surface ring-1 ring-surface-container-highest/30"
                >
                  <span className="font-label-md text-label-md">
                    {formatTime(row.capturedAt) || row.capturedAt}
                  </span>
                  <span className="text-label-sm text-on-surface-variant tabular-nums">
                    {row.soilPercent != null ? `土壤 ${Math.round(row.soilPercent)}%` : "—"}
                    {row.airTempC != null ? ` · ${row.airTempC.toFixed(1)}°C` : ""}
                    {row.lightLux != null ? ` · ${Math.round(row.lightLux)}lx` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 rounded-b bg-gradient-to-t from-surface-container-lowest to-transparent" />
          </div>
        ) : (
          <Empty icon="schedule" title="还没有历史" />
        )}
      </Card>

      <PlantCareProfileSection plant={plant} onUpdated={() => setLocalRefresh((v) => v + 1)} />
      {editingAvatar ? (
        <PlantAvatarEditor
          plant={plant}
          onClose={() => setEditingAvatar(false)}
          onUpdated={() => setLocalRefresh((v) => v + 1)}
        />
      ) : null}
    </div>
  );
}

function ReadingTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs rounded-md bg-surface-container-low/80 p-md ring-1 ring-surface-container-highest/40">
      <div className="flex items-center gap-xs text-label-sm font-label-sm text-on-surface-variant">
        <Icon name={icon} className="text-[18px] text-primary" /> {label}
      </div>
      <span className="font-display text-headline-md text-primary tabular-nums">{value}</span>
    </div>
  );
}
