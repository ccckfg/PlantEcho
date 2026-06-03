import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PendingDevice } from "@dyn/shared";
import { Icon } from "@/components/UI";

interface PendingDeviceIgnoreDialogProps {
  device: PendingDevice;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function PendingDeviceIgnoreDialog({
  device,
  busy,
  onConfirm,
  onClose
}: PendingDeviceIgnoreDialogProps) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/30 p-md backdrop-blur-sm dialog-backdrop-in">
      <div
        className="dialog-pop-in flex w-[min(420px,calc(100vw-2rem))] flex-col gap-md rounded-md border border-hairline bg-surface-container-lowest p-lg shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-device-ignore-title"
      >
        <header className="flex items-center gap-sm">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tertiary-fixed/30 text-tertiary">
            <Icon name="visibility_off" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <h3 id="pending-device-ignore-title" className="font-display text-headline-md text-on-surface">
              先不认领这个设备？
            </h3>
            <p className="mt-1 truncate font-mono text-[12px] text-on-surface-variant">
              {device.id}
            </p>
          </div>
        </header>

        <div className="rounded-md border border-tertiary-fixed-dim/40 bg-tertiary-fixed/15 px-md py-sm text-body-sm leading-relaxed text-on-surface-variant">
          <p>
            忽略后，它会从待认领列表里离开。设备再次上报读数时，仍可以重新出现在这里。
          </p>
        </div>

        <footer className="mt-xs flex items-center justify-end gap-sm border-t border-hairline/60 pt-md">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full border border-hairline px-md py-xs font-label-md text-label-md text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-95 disabled:opacity-50"
          >
            继续看看
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full border border-tertiary-fixed-dim/50 bg-tertiary-fixed px-md py-xs font-label-md text-label-md text-on-tertiary-fixed-variant transition-all duration-200 hover:bg-tertiary-fixed/80 active:scale-95 disabled:opacity-50"
          >
            <Icon
              name={busy ? "progress_activity" : "visibility_off"}
              className={busy ? "animate-spin text-[16px]" : "text-[16px]"}
            />
            确认忽略
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
