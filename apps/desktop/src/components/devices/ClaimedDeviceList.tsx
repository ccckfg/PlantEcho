import { useEffect, useMemo, useState } from "react";
import type { DeviceRecord, PlantSummary } from "@dyn/shared";
import { Icon } from "@/components/UI";
import { SENSOR_OFFLINE_AFTER_MS, SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { api, type DeviceClaimResult } from "@/lib/api";
import { ClaimedKey } from "./DeviceClaimFields";

const formatTime = (value: string | null): string => {
  if (!value) return "尚未上报";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const isDeviceOnline = (lastSeenAt: string | null, now: number): boolean => {
  if (!lastSeenAt) return false;
  const lastSeenMs = Date.parse(lastSeenAt);
  return !Number.isNaN(lastSeenMs) && now - lastSeenMs <= SENSOR_OFFLINE_AFTER_MS;
};

export function ClaimedDeviceList({
  devices,
  plants,
  loading,
  onChanged
}: {
  devices: DeviceRecord[];
  plants: PlantSummary[];
  loading: boolean;
  onChanged: () => void;
}) {
  const plantNameById = useMemo(
    () => new Map(plants.map((plant) => [plant.id, plant.name])),
    [plants]
  );
  const [now, setNow] = useState(() => Date.now());
  const [rotatingId, setRotatingId] = useState("");
  const [rotated, setRotated] = useState<DeviceClaimResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), SENSOR_STATUS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const handleRotate = async (deviceId: string) => {
    if (rotatingId) return;
    setRotatingId(deviceId);
    setError("");
    try {
      const result = await api.rotateDeviceKey(deviceId);
      setRotated(result);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "轮换密钥失败");
    } finally {
      setRotatingId("");
    }
  };

  if (rotated) {
    return (
      <div className="mt-lg">
        <p className="mb-sm text-body-sm text-on-surface-variant">
          {rotated.device.name} 的新密钥只显示这一次。
        </p>
        <ClaimedKey
          apiKey={rotated.deviceApiKey}
          deliveredToDevice={rotated.deliveredToDevice}
          onDone={() => setRotated(null)}
        />
      </div>
    );
  }

  if (loading) {
    return <p className="mt-lg text-body-sm text-on-surface-variant">设备列表加载中...</p>;
  }

  if (devices.length === 0) {
    return (
      <div className="mt-lg rounded-md border border-dashed border-outline-variant p-lg text-body-sm text-on-surface-variant">
        还没有已绑定设备。
      </div>
    );
  }

  return (
    <div className="mt-lg flex flex-col gap-md">
      {error ? (
        <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-sm">
        {devices.map((device) => {
          const online = isDeviceOnline(device.lastSeenAt, now);
          return (
            <article
              key={device.id}
              className="flex flex-col gap-sm rounded-md border border-surface-container-highest bg-surface px-md py-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-xs">
                  <span
                    className={
                      online
                        ? "device-live-signal text-primary"
                        : "grid h-5 w-5 place-items-center text-on-surface-variant"
                    }
                    aria-label={online ? "设备在线" : "设备未在线"}
                    title={online ? "设备在线" : "设备未在线"}
                  >
                    <Icon
                      name={online ? "sensors" : "sensors_off"}
                      className="text-[18px]"
                    />
                  </span>
                  <h3 className="truncate text-title-sm font-title-sm text-on-surface">
                    {device.name}
                  </h3>
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                  {device.id} · {plantNameById.get(device.plantId) ?? device.plantId}
                </p>
                <p className="mt-xs text-label-sm font-label-sm text-on-surface-variant">
                  最后在线：{formatTime(device.lastSeenAt)}
                  {online ? <span className="ml-xs text-primary">在线</span> : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRotate(device.id)}
                disabled={Boolean(rotatingId)}
                className="inline-flex items-center justify-center gap-sm rounded-full border border-outline-variant px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container disabled:opacity-50"
              >
                <Icon name={rotatingId === device.id ? "progress_activity" : "key"} />
                {rotatingId === device.id ? "生成中" : "轮换密钥"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
