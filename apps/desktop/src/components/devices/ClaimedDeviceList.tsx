import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { DeviceRecord, PlantSummary } from "@dyn/shared";
import { Icon, Chip } from "@/components/UI";
import { useToast } from "@/components/Toast";
import { SENSOR_OFFLINE_AFTER_MS, SENSOR_STATUS_REFRESH_MS } from "@/config/sensors";
import { deviceApi, type DeviceClaimResult } from "@/lib/deviceApi";
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
  const [busyId, setBusyId] = useState("");
  const [confirmRotateDevice, setConfirmRotateDevice] = useState<DeviceRecord | null>(null);
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
      <div className="mt-lg rounded-md border border-dashed border-outline-variant p-lg text-body-sm text-on-surface-variant text-center bg-surface/30">
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
          const disabled = device.status === "disabled";
          return (
            <article
              key={device.id}
              className="surface-card rounded-md p-md border border-hairline shadow-leaf flex flex-col gap-sm md:flex-row md:items-center md:justify-between group hover:border-primary-container/20 transition-all duration-320 hover:shadow-soft"
            >
              <div className="flex items-start gap-md min-w-0">
                {/* 状态图标配备圆形环境背景小框 */}
                <div className={`grid h-10 w-10 place-items-center rounded-full shrink-0 transition-all duration-320 ${
                  online 
                    ? "bg-primary-container/20 text-primary scale-105" 
                    : "bg-surface-container-high/60 text-on-surface-variant"
                }`}>
                  <Icon name={online ? "sensors" : "sensors_off"} className="text-[20px]" />
                </div>
                
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-xs">
                    <h3 className="truncate text-title-sm font-title-sm text-on-surface">
                      {device.name}
                    </h3>
                    {online ? (
                      <Chip tone="primary" icon="verified">在线</Chip>
                    ) : null}
                    {disabled ? (
                      <Chip tone="muted" icon="schedule">已停用</Chip>
                    ) : null}
                  </div>
                  <p className="mt-xs truncate text-body-sm text-on-surface-variant flex items-center gap-xs">
                    <span className="font-mono text-[12px] bg-surface-container-low/60 px-xs py-[1px] rounded" title={device.id}>
                      ID: {device.id.slice(0, 8)}...
                    </span>
                    <span>·</span>
                    <Chip tone="secondary" icon="eco">
                      {plantNameById.get(device.plantId) ?? device.plantId}
                    </Chip>
                  </p>
                  <p className="mt-xs text-label-sm font-label-sm text-on-surface-variant/80">
                    最后在线：{formatTime(device.lastSeenAt)}
                  </p>
                </div>
              </div>

              {/* 优雅的操作按钮流与行内轮换确认 */}
              <div className="flex flex-wrap justify-end gap-xs shrink-0 self-end md:self-center">
                {/* 1. 停用 / 启用按钮 */}
                <button
                  type="button"
                  onClick={() => changeStatus(device.id, disabled)}
                  disabled={Boolean(busyId)}
                  className={`inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md transition-all duration-200 disabled:opacity-50 active:scale-95 ${
                    disabled 
                      ? "bg-primary-container text-on-primary-container hover:bg-primary/10" 
                      : "border border-hairline text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <Icon name={busyId === device.id ? "progress_activity" : disabled ? "play_circle" : "pause_circle"} className={busyId === device.id ? "animate-spin text-[16px]" : "text-[16px]"} />
                  {disabled ? "启用" : "停用"}
                </button>

                {/* 2. 轮换密钥按钮 (触发二次确认弹窗) */}
                <button
                  type="button"
                  onClick={() => setConfirmRotateDevice(device)}
                  disabled={Boolean(rotatingId)}
                  className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md border border-hairline text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all duration-200 disabled:opacity-50"
                >
                  <Icon name={rotatingId === device.id ? "progress_activity" : "key"} className={rotatingId === device.id ? "animate-spin text-[16px]" : "text-[16px]"} />
                  轮换密钥
                </button>

                {/* 3. 删除按钮 (红色警告警告) */}
                <button
                  type="button"
                  onClick={() => deleteOne(device.id)}
                  disabled={Boolean(busyId)}
                  className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md border border-hairline text-error hover:bg-error-container/20 hover:border-error/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
                >
                  <Icon name={busyId === device.id ? "progress_activity" : "delete"} className={busyId === device.id ? "animate-spin text-[16px]" : "text-[16px]"} />
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* 轮换密钥二次确认模态小弹窗 */}
      {confirmRotateDevice ? (
        <RotateConfirmDialog
          device={confirmRotateDevice}
          busy={rotatingId === confirmRotateDevice.id}
          onConfirm={() => {
            void handleRotate(confirmRotateDevice.id);
            setConfirmRotateDevice(null);
          }}
          onClose={() => setConfirmRotateDevice(null)}
        />
      ) : null}
    </div>
  );
}

// 二次确认对话框组件
function RotateConfirmDialog({
  device,
  busy,
  onConfirm,
  onClose
}: {
  device: DeviceRecord;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md dialog-backdrop-in bg-inverse-surface/30 backdrop-blur-sm">
      <div className="dialog-pop-in w-[min(440px,calc(100vw-2rem))] rounded-md bg-surface-container-lowest border border-hairline shadow-modal p-lg flex flex-col gap-md">
        <header className="flex items-center gap-sm text-error">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-error-container/25 shrink-0">
            <Icon name="error" className="text-[22px] text-error" />
          </div>
          <h3 className="text-headline-md font-display text-on-surface">轮换设备密钥？</h3>
        </header>

        <div className="text-body-sm text-on-surface-variant leading-relaxed">
          <p className="font-semibold text-on-surface">
            您正在轮换设备 <span className="font-mono text-primary bg-primary-container/15 px-xs py-[2px] rounded">{device.name}</span> 的接入凭证。
          </p>
          <div className="mt-sm p-sm rounded-sm bg-error-container/10 border border-error/10 text-error flex flex-col gap-xs">
            <span className="font-bold flex items-center gap-xs text-[13px]">
              ⚠️ 重要后果告知：
            </span>
            <ul className="list-disc pl-md flex flex-col gap-xs text-[12px] text-on-surface-variant">
              <li>当前的接入密钥将<strong>立刻失效</strong>；</li>
              <li>物理硬件（如 ESP32 芯片）在重新烧录/配置新密钥前，将<strong>无法向系统推送任何传感器读数</strong>，且状态会显示为离线；</li>
              <li>此操作<strong>不可撤销</strong>，新密钥仅在轮换成功后展示一次，请务必妥善记录。</li>
            </ul>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-sm border-t border-hairline/60 pt-md mt-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md border border-hairline text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md bg-error-container text-on-error-container border border-error/25 hover:bg-error-container/80 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            <Icon name={busy ? "progress_activity" : "key"} className={busy ? "animate-spin text-[16px]" : "text-[16px]"} />
            确认轮换
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
