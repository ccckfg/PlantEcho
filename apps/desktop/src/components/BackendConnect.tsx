import { useState, type FormEvent } from "react";
import { APP_BRAND } from "@/config/branding";
import { getApiConnection, setApiConnection, testApiConnection } from "@/lib/api";
import type { BackendConnection } from "@/lib/connection";
import { BrandMark } from "./BrandMark";
import { Icon } from "./UI";

interface BackendConnectProps {
  onConnected: (connection: BackendConnection) => void;
  onCancel?: () => void;
}

type ConnectState = "idle" | "testing" | "connected";

const formatConnectionError = (caught: unknown): string => {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "无法连接到后端服务。请确认后端已启动：npm run dev:server，并检查地址/端口是否为 http://127.0.0.1:8787 或 http://localhost:8787。";
  }
  return message || "连接失败";
};

export function BackendConnect({ onConnected, onCancel }: BackendConnectProps) {
  const savedConnection = getApiConnection();
  const [baseUrl, setBaseUrl] = useState(savedConnection?.baseUrl ?? "");
  const [apiKey, setApiKey] = useState(savedConnection?.apiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [state, setState] = useState<ConnectState>("idle");
  const [error, setError] = useState("");

  const canConnect = baseUrl.trim().length > 0 && apiKey.trim().length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConnect || state === "testing") return;

    setState("testing");
    setError("");

    try {
      const connection = await testApiConnection({ baseUrl, apiKey });
      setApiConnection(connection);
      setState("connected");
      onConnected(connection);
    } catch (caught) {
      setState("idle");
      setError(formatConnectionError(caught));
    }
  };

  return (
    <main className="h-full bg-surface flex items-center justify-center p-lg relative overflow-hidden">
      {/* 装饰性背景光斑 — 让登录页不那么"工具感" */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 40% at 30% 20%, rgba(161, 212, 148, 0.25), transparent 70%), radial-gradient(50% 40% at 80% 90%, rgba(191, 237, 209, 0.30), transparent 70%)"
        }}
      />
      <section className="dialog-pop-in w-full max-w-xl bg-surface-container-lowest/95 backdrop-blur-md ring-1 ring-surface-container-highest/60 rounded-lg shadow-soft p-xl">
        <div className="flex items-start gap-md">
          <BrandMark size="lg" className="shadow-leaf" />
          <div className="min-w-0">
            <h1 className="font-display text-headline-lg text-on-surface">后端连接</h1>
            <p className="text-body-md text-on-surface-variant mt-xs leading-relaxed">
              {onCancel
                ? "可以切换到另一个 DYN 后端服务。"
                : `${APP_BRAND.name} 需要一个可访问的 DYN 后端服务，才能听到植物的声音。`}
            </p>
          </div>
        </div>

        <form className="mt-xl flex flex-col gap-lg" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-label-md text-on-surface">后端地址</span>
            <div className="flex items-center gap-sm rounded-md ring-1 ring-surface-container-highest bg-surface px-md py-sm transition-all duration-200 ease-standard focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-surface-container-lowest">
              <Icon name="dns" className="text-on-surface-variant" />
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://127.0.0.1:8787"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant/60"
                autoComplete="url"
              />
            </div>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-label-md text-on-surface">访问密钥</span>
            <div className="flex items-center gap-sm rounded-md ring-1 ring-surface-container-highest bg-surface px-md py-sm transition-all duration-200 ease-standard focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-surface-container-lowest">
              <Icon name="key" className="text-on-surface-variant" />
              <input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type={showKey ? "text" : "password"}
                placeholder="APP_ACCESS_KEY"
                className="w-full bg-transparent outline-none text-body-md text-on-surface placeholder:text-on-surface-variant/60"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowKey((value) => !value)}
                className="w-9 h-9 rounded-full grid place-items-center text-on-surface-variant hover:bg-surface-container transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={showKey ? "隐藏密钥" : "显示密钥"}
              >
                <Icon name={showKey ? "visibility_off" : "visibility"} />
              </button>
            </div>
          </label>

          {error ? (
            <div
              role="alert"
              className="dialog-pop-in flex items-start gap-sm rounded-md bg-error-container ring-1 ring-error/20 text-on-error-container px-md py-sm text-body-sm"
            >
              <Icon name="error" filled className="shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-sm sm:items-center sm:justify-between">
            <p className="text-body-sm text-on-surface-variant inline-flex items-center gap-xs">
              <Icon name="lock" className="text-[14px]" />
              密钥仅保存在本机，并随请求发送给后端。
            </p>
            <div className="flex flex-col sm:flex-row gap-sm sm:justify-end">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={state === "testing"}
                  className="inline-flex items-center justify-center gap-sm rounded-full ring-1 ring-secondary-fixed-dim bg-surface-container-lowest px-lg py-md font-label-md text-label-md text-primary transition-all duration-200 ease-standard hover:bg-secondary-container/30 hover:ring-secondary-fixed active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon name="arrow_back" />
                  返回应用
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!canConnect || state === "testing"}
                className="group inline-flex items-center justify-center gap-sm rounded-full bg-primary text-on-primary px-xl py-md font-label-md text-label-md shadow-soft transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-modal active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Icon
                  name={state === "testing" ? "progress_activity" : "login"}
                  className={state === "testing" ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5"}
                />
                {state === "testing" ? "连接中" : "连接"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
