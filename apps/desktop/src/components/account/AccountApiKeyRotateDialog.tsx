import { createPortal } from "react-dom";
import { Icon } from "@/components/UI";

interface AccountApiKeyRotateDialogProps {
  preview: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function AccountApiKeyRotateDialog({
  preview,
  busy,
  onConfirm,
  onClose
}: AccountApiKeyRotateDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/30 p-md backdrop-blur-sm dialog-backdrop-in">
      <div
        className="dialog-pop-in flex w-[min(440px,calc(100vw-2rem))] flex-col gap-md rounded-md border border-hairline bg-surface-container-lowest p-lg shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-rotate-title"
      >
        <header className="flex items-center gap-sm text-error">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-error-container/25">
            <Icon name="error" className="text-[22px] text-error" />
          </div>
          <h3 id="api-key-rotate-title" className="font-display text-headline-md text-on-surface">
            轮换 API 调用密钥？
          </h3>
        </header>

        <div className="text-body-sm leading-relaxed text-on-surface-variant">
          <p className="font-semibold text-on-surface">
            您正在轮换 OpenAI 兼容接口的调用凭证{" "}
            <span className="rounded bg-primary-container/15 px-xs py-[2px] font-mono text-primary">
              {preview}
            </span>
            。
          </p>
          <div className="mt-sm flex flex-col gap-xs rounded-sm border border-error/10 bg-error-container/10 p-sm text-error">
            <span className="flex items-center gap-xs text-[13px] font-bold">重要后果告知：</span>
            <ul className="flex list-disc flex-col gap-xs pl-md text-[12px] text-on-surface-variant">
              <li>当前 API 调用密钥将<strong>立刻失效</strong>；</li>
              <li>ChatBox、Cherry Studio 或脚本客户端需要替换为新密钥后才能继续访问；</li>
              <li>新密钥仅在轮换成功后展示一次，请务必立刻复制保存。</li>
            </ul>
          </div>
        </div>

        <footer className="mt-xs flex shrink-0 items-center justify-end gap-sm border-t border-hairline/60 pt-md">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full border border-hairline px-md py-xs text-label-md font-label-md text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-95 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-xs rounded-full border border-error/25 bg-error-container px-md py-xs text-label-md font-label-md text-on-error-container transition-all duration-200 hover:bg-error-container/80 active:scale-95 disabled:opacity-50"
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
