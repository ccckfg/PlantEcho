import { useEffect, useMemo, useState } from "react";
import type { DeviceRecord, PlantSummary } from "@dyn/shared";
import { Icon } from "@/components/UI";
import { useToast } from "@/components/Toast";
import { SENSOR_OFFLINE_AFTER_MS, SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { deviceApi, type DeviceClaimResult } from "@/lib/deviceApi";
import { ClaimedKey } from "./DeviceClaimFields";
import { DeviceBulkActions } from "./DeviceBulkActions";

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
  const [busyId, setBusyId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rotated, setRotated] = useState<DeviceClaimResult | null>(null);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), SENSOR_STATUS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const handleRotate = async (deviceId: string) => {
    if (rotatingId) return;
    setRotatingId(deviceId);
    setError("");
    try {
      const result = await deviceApi.rotateDeviceKey(deviceId);
      setRotated(result);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "轮换密钥失败");
    } finally {
      setRotatingId("");
    }
  };

  const toggleSelected = (deviceId: string) => {
    setSelectedIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId]
    );
  };

  const changeStatus = async (deviceId: string, enabled: boolean) => {
    if (busyId) return;
    setBusyId(deviceId);
    setError("");
    try {
      await deviceApi.updateDevice(deviceId, { status: enabled ? "active" : "disabled" });
      onChanged();
      if (!enabled) {
        toast.show({
          title: "设备已暂时安静下来",
          description: "它会保留绑定，但不会继续写入新读数。",
          tone: "warning",
          action: {
            label: "撤销",
            onClick: () => void changeStatus(deviceId, true)
          }
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "设备状态没有保存下来");
    } finally {
      setBusyId("");
    }
  };

  const deleteOne = async (deviceId: string) => {
    if (busyId) return;
    setBusyId(deviceId);
    setError("");
    try {
      await deviceApi.deleteDevice(deviceId);
      setSelectedIds((current) => current.filter((id) => id !== deviceId));
      onChanged();
      toast.show({
        title: "设备已从列表移走",
        description: "历史读数仍被保留，需要的话可以立刻撤销。",
        tone: "warning",
        action: {
          label: "撤销",
          onClick: async () => {
            await deviceApi.updateDevice(deviceId, { status: "active" });
            onChanged();
          }
        }
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除设备失败");
    } finally {
      setBusyId("");
    }
  };

  const handleBulk = async (action: "enable" | "disable" | "delete") => {
    if (!selectedIds.length || bulkBusy) return;
    const ids = selectedIds;
    setBulkBusy(true);
    setError("");
    try {
      await deviceApi.bulkDevices({ deviceIds: ids, action });
      setSelectedIds([]);
      onChanged();
      if (action !== "enable") {
        toast.show({
          title: action === "delete" ? "这些设备已从列表移走" : "这些设备已暂时安静下来",
          description: "需要的话可以立刻撤销这次批量调整。",
          tone: "warning",
          action: {
            label: "撤销",
            onClick: async () => {
              await deviceApi.bulkDevices({ deviceIds: ids, action: "enable" });
              onChanged();
            }
          }
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "批量管理没有完成");
    } finally {
      setBulkBusy(false);
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
      <DeviceBulkActions
        devices={devices}
        selectedIds={selectedIds}
        busy={bulkBusy}
        onSelectAll={() => setSelectedIds(devices.map((device) => device.id))}
        onClear={() => setSelectedIds([])}
        onAction={handleBulk}
      />
      <div className="flex flex-col gap-sm">
        {devices.map((device) => {
          const online = isDeviceOnline(device.lastSeenAt, now);
          const disabled = device.status === "disabled";
          return (
            <article
              key={device.id}
              className="flex flex-col gap-sm rounded-md border border-surface-container-highest bg-surface px-md py-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="flex min-w-0 gap-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(device.id)}
                  onChange={() => toggleSelected(device.id)}
                  className="mt-1 h-4 w-4 accent-primary"
                  aria-label={`选择 ${device.name}`}
                />
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
                  {disabled ? (
                    <span className="rounded-full bg-tertiary-fixed/60 px-xs py-[2px] text-label-sm font-label-sm text-on-tertiary-fixed-variant">
                      已停用
                    </span>
                  ) : null}
                </div>
                <p className="mt-xs truncate text-body-sm text-on-surface-variant">
                  {device.id} · {plantNameById.get(device.plantId) ?? device.plantId}
                </p>
                <p className="mt-xs text-label-sm font-label-sm text-on-surface-variant">
                  最后在线：{formatTime(device.lastSeenAt)}
                  {online ? <span className="ml-xs text-primary">在线</span> : null}
                </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-xs">
                <button
                  type="button"
                  onClick={() => changeStatus(device.id, disabled)}
                  disabled={Boolean(busyId)}
                  className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container disabled:opacity-50"
                >
                  <Icon name={busyId === device.id ? "progress_activity" : disabled ? "play_circle" : "pause_circle"} />
                  {disabled ? "启用" : "停用"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(device.id)}
                  disabled={Boolean(rotatingId)}
                  className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container disabled:opacity-50"
                >
                  <Icon name={rotatingId === device.id ? "progress_activity" : "key"} />
                  {rotatingId === device.id ? "生成中" : "轮换密钥"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteOne(device.id)}
                  disabled={Boolean(busyId)}
                  className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container disabled:opacity-50"
                >
                  <Icon name={busyId === device.id ? "progress_activity" : "delete"} />
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
