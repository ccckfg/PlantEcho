import { createPortal } from "react-dom";
import type { DeviceRecord } from "@dyn/shared";
import { Icon } from "@/components/UI";

export function RotateConfirmDialog({
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
            您正在轮换设备{" "}
            <span className="font-mono text-primary bg-primary-container/15 px-xs py-[2px] rounded">
              {device.name}
            </span>{" "}
            的接入凭证。
          </p>
          <div className="mt-sm p-sm rounded-sm bg-error-container/10 border border-error/10 text-error flex flex-col gap-xs">
            <span className="font-bold flex items-center gap-xs text-[13px]">
              重要后果告知：
            </span>
            <ul className="list-disc pl-md flex flex-col gap-xs text-[12px] text-on-surface-variant">
              <li>当前的接入密钥将<strong>立刻失效</strong>；</li>
              <li>
                物理硬件（如 ESP32 芯片）在重新烧录/配置新密钥前，将
                <strong>无法向系统推送任何传感器读数</strong>，且状态会显示为离线；
              </li>
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
            <Icon
              name={busy ? "progress_activity" : "key"}
              className={busy ? "animate-spin text-[16px]" : "text-[16px]"}
            />
            确认轮换
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
