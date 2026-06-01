import { useState } from "react";
import { createPortal } from "react-dom";
import type { DeviceRecord, PendingDevice, PlantSummary } from "@dyn/shared";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { api } from "@/lib/api";
import { deviceApi, type DeviceClaimResult } from "@/lib/deviceApi";
import { useAsync } from "@/lib/useAsync";
import { Icon } from "@/components/UI";
import { ClaimedDeviceList } from "./ClaimedDeviceList";
import { ClaimedKey } from "./DeviceClaimFields";
import { PendingDeviceClaimForm } from "./PendingDeviceClaimForm";

type DeviceTab = "pending" | "claimed";

export function PendingDeviceWidget() {
  const refresh = useSyncRefresh({ resources: ["devices", "plants"] });
  const [localRefresh, setLocalRefresh] = useState(0);
  const pending = useAsync(() => deviceApi.listPendingDevices(), [refresh, localRefresh]);
  const claimed = useAsync(() => deviceApi.listDevices(), [refresh, localRefresh]);
  const plants = useAsync(() => api.listPlants(), [refresh, localRefresh]);
  const [open, setOpen] = useState(false);

  const count = pending.data?.devices.length ?? 0;
  const triggerRefresh = () => setLocalRefresh((value) => value + 1);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group inline-flex items-center gap-xs rounded-full px-md py-xs text-label-sm font-label-sm transition-all duration-200 ease-standard active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 ${
          count > 0
            ? "bg-primary-container text-on-primary-container hover:bg-secondary-container shadow-leaf"
            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
        }`}
      >
        <Icon
          name="sensors"
          className={`text-[16px] transition-transform duration-300 ease-emphasized group-hover:scale-110 ${
            count > 0 ? "animate-pulse" : ""
          }`}
        />
        {count > 0 ? `新设备 ${count}` : "设备"}
      </button>
      {open ? (
        <DeviceClaimDialog
          devices={pending.data?.devices ?? []}
          claimedDevices={claimed.data?.devices ?? []}
          plants={plants.data?.plants ?? []}
          loading={pending.loading || claimed.loading || plants.loading}
          error={pending.error || claimed.error || plants.error}
          onChanged={triggerRefresh}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function DeviceClaimDialog({
  devices,
  claimedDevices,
  plants,
  loading,
  error,
  onChanged,
  onClose
}: {
  devices: PendingDevice[];
  claimedDevices: DeviceRecord[];
  plants: PlantSummary[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DeviceTab>(() => (devices.length ? "pending" : "claimed"));
  const [claimResult, setClaimResult] = useState<DeviceClaimResult | null>(null);
  const deviceApiKey = claimResult?.deviceApiKey ?? "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-md sm:p-lg dialog-backdrop-in bg-inverse-surface/30 backdrop-blur-sm">
      <section className="dialog-pop-in flex h-[min(760px,calc(100vh-2rem))] w-[min(920px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal">
        <div className="shrink-0 border-b border-surface-container-highest/50 px-lg py-md sm:px-xl sm:py-lg">
          <div className="flex items-start justify-between gap-md">
            <div className="min-w-0">
              <h2 className="font-display text-headline-lg text-on-surface">设备管理</h2>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                {deviceApiKey ? "密钥已生成" : "认领新设备或管理已绑定设备"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-primary active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="关闭"
            >
              <Icon name="close" className="transition-transform duration-300 ease-emphasized hover:rotate-90" />
            </button>
          </div>

          <div className="mt-md flex rounded-full bg-surface-container p-xs">
            {[
              { key: "pending", label: `待认领 ${devices.length}` },
              { key: "claimed", label: `已绑定 ${claimedDevices.length}` }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key as DeviceTab)}
                className={`flex-1 rounded-full px-md py-sm text-label-md font-label-md transition-all duration-300 ease-emphasized ${
                  tab === item.key
                    ? "bg-primary text-on-primary shadow-leaf"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md sm:px-xl sm:py-lg scroll-area">
          {error ? (
            <p className="mb-md rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
              {error}
            </p>
          ) : null}

          {deviceApiKey ? (
            <ClaimedKey
              apiKey={deviceApiKey}
              deliveredToDevice={claimResult?.deliveredToDevice}
              onDone={onClose}
            />
          ) : tab === "claimed" ? (
            <ClaimedDeviceList
              devices={claimedDevices}
              plants={plants}
              loading={loading}
              onChanged={onChanged}
            />
          ) : devices.length === 0 ? (
            <div className="rounded-md border border-dashed border-outline-variant p-lg text-body-sm text-on-surface-variant">
              暂时没有待认领设备。ESP32 首次上传读数后会出现在这里。
            </div>
          ) : (
            <PendingDeviceClaimForm
              devices={devices}
              plants={plants}
              loading={loading}
              onClaimed={setClaimResult}
              onChanged={onChanged}
              onClose={onClose}
            />
          )}
          <div className="h-xs" />
        </div>
      </section>
    </div>,
    document.body
  );
}
