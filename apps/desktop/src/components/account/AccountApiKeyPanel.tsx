import { useEffect, useState } from "react";
import type { AuthApiKeyInfo } from "@dyn/shared";
import { Icon } from "@/components/UI";
import { authApi } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
import { AccountApiKeyRotateDialog } from "./AccountApiKeyRotateDialog";

interface AccountApiKeyPanelProps {
  connection: BackendConnection;
  onError: (message: string) => void;
}

export function AccountApiKeyPanel({ connection, onError }: AccountApiKeyPanelProps) {
  const [apiKey, setApiKey] = useState<AuthApiKeyInfo | null>(null);
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingRotate, setConfirmingRotate] = useState(false);

  const loadApiKey = async () => {
    setLoading(true);
    onError("");
    try {
      setApiKey((await authApi.getApiKey(connection.baseUrl, connection.token)).apiKey);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "API 调用密钥状态暂时没有回来。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApiKey();
  }, [connection.token]);

  const saveApiKeyResult = (result: { apiKey: AuthApiKeyInfo; key: string }) => {
    setApiKey(result.apiKey);
    setApiKeySecret(result.key);
    setCopied(false);
  };

  const generateApiKey = async () => {
    if (busy) return;
    setBusy(true);
    onError("");
    try {
      saveApiKeyResult(await authApi.generateApiKey(connection.baseUrl, connection.token));
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "API 调用密钥没有生成成功。");
    } finally {
      setBusy(false);
    }
  };

  const rotateApiKey = async (): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    onError("");
    try {
      saveApiKeyResult(await authApi.rotateApiKey(connection.baseUrl, connection.token));
      return true;
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "API 调用密钥没有轮换成功。");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!apiKeySecret) return;
    await navigator.clipboard.writeText(apiKeySecret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const lastUsedLabel = apiKey?.lastUsedAt
    ? new Date(apiKey.lastUsedAt).toLocaleString("zh-CN", { hour12: false })
    : "还没有使用过";

  return (
    <div className="flex flex-col gap-xs border-t border-hairline/80 pt-md">
      <div className="flex items-center justify-between gap-md">
        <div>
          <span className="text-label-sm font-label-sm text-on-surface-variant">
            OpenAI 兼容 API 调用密钥
          </span>
          <p className="mt-[2px] text-[12px] leading-relaxed text-on-surface-variant">
            用于 ChatBox、Cherry Studio 等第三方客户端访问 /v1 接口。
          </p>
        </div>
        <button
          type="button"
          onClick={apiKey ? () => setConfirmingRotate(true) : generateApiKey}
          disabled={busy || loading}
          className="inline-flex shrink-0 items-center gap-xs rounded-full border border-primary-fixed-dim/30 bg-primary-fixed px-md py-xs text-label-md font-label-md text-on-primary-fixed transition-all duration-200 hover:border-primary-fixed-dim/60 hover:bg-primary-fixed-dim active:scale-95 disabled:opacity-50"
        >
          <Icon
            name={busy || loading ? "progress_activity" : "key"}
            className={`${busy || loading ? "animate-spin" : ""} text-[16px]`}
          />
          {apiKey ? "轮换密钥" : "生成密钥"}
        </button>
      </div>
      {confirmingRotate && apiKey ? (
        <AccountApiKeyRotateDialog
          preview={apiKey.preview}
          busy={busy}
          onConfirm={async () => {
            const rotated = await rotateApiKey();
            if (rotated) setConfirmingRotate(false);
          }}
          onClose={() => {
            if (!busy) setConfirmingRotate(false);
          }}
        />
      ) : null}
      <div className="flex min-w-0 items-center justify-between gap-sm rounded-sm border border-hairline bg-surface-container-low/40 px-sm py-xs">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <span className="truncate select-all font-mono text-[13px] text-on-surface">
            {apiKeySecret || apiKey?.preview || "尚未生成 API 调用密钥"}
          </span>
          {apiKeySecret ? (
            <span className="text-[12px] text-tertiary">只显示这一次，请现在复制保存。</span>
          ) : apiKey ? (
            <span className="text-[12px] text-on-surface-variant">最近使用：{lastUsedLabel}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copySecret}
          disabled={!apiKeySecret}
          title={apiKeySecret ? "复制密钥" : "生成后才可复制完整密钥"}
          className="flex items-center justify-center rounded-full p-xs text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name={copied ? "check" : "content_copy"} className={`text-[15px] ${copied ? "scale-110 text-primary" : ""}`} />
          {copied ? <span className="ml-xs text-[12px] font-label-sm text-primary">已复制</span> : null}
        </button>
      </div>
    </div>
  );
}
