import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PlantSummary } from "@dyn/shared";
import { Icon } from "@/components/UI";

interface PlantDeleteConfirmDialogProps {
  plant: PlantSummary;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function PlantDeleteConfirmDialog({
  plant,
  busy,
  onConfirm,
  onClose
}: PlantDeleteConfirmDialogProps) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [busy, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/30 p-md backdrop-blur-sm dialog-backdrop-in">
      <div
        className="dialog-pop-in flex w-[min(440px,calc(100vw-2rem))] flex-col gap-md rounded-md border border-hairline bg-surface-container-lowest p-lg shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plant-delete-title"
      >
        <header className="flex items-center gap-sm">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error-container/25 text-error">
            <Icon name="delete" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <h3 id="plant-delete-title" className="font-display text-headline-md text-on-surface">
              让它先离开温室？
            </h3>
            <p className="mt-1 truncate text-label-sm font-label-sm text-on-surface-variant">
              {plant.name} 会从当前列表里隐藏。
            </p>
          </div>
        </header>

        <div className="rounded-md border border-error/10 bg-error-container/10 px-md py-sm text-body-sm leading-relaxed text-on-surface-variant">
          <p>
            删除后会回到温室首页，并出现 5 秒撤销提示。撤销前，请先不要关闭应用窗口。
          </p>
        </div>

        <footer className="mt-xs flex items-center justify-end gap-sm border-t border-hairline/60 pt-md">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full border border-hairline px-md py-xs font-label-md text-label-md text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-95 disabled:opacity-50"
          >
            先留着
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full border border-error/25 bg-error-container px-md py-xs font-label-md text-label-md text-on-error-container transition-all duration-200 hover:bg-error-container/80 active:scale-95 disabled:opacity-50"
          >
            <Icon
              name={busy ? "progress_activity" : "delete"}
              className={busy ? "animate-spin text-[16px]" : "text-[16px]"}
            />
            确认删除
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
