import { useState, type FormEvent, type ReactNode } from "react";
import { APP_BRAND } from "@/config/branding";
import { InteractiveEcho } from "./InteractiveEcho";
import { getApiConnection, setApiConnection, testApiConnection } from "@/lib/api";
import { registerWithPassword } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
import { useIsMobile } from "@/lib/usePlatform";
import { useAuthViewportLock } from "@/hooks/useAuthViewportLock";
import { BrandMark } from "./BrandMark";
import { Icon } from "./UI";

interface BackendConnectProps {
  onConnected: (connection: BackendConnection) => void;
  onCancel?: () => void;
}

type ConnectMode = "login" | "register";
type ConnectState = "idle" | "testing" | "connected";

const DEFAULT_BACKEND_HINT = "http://后端电脑IP:8787";

const formatConnectionError = (caught: unknown): string => {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (/Failed to fetch|NetworkError|Load failed|Network request failed|ERR_/i.test(message)) {
    return "我们暂时联系不上 PlantEcho 的家。";
  }
  return message || "登录失败";
};

export function BackendConnect({ onConnected, onCancel }: BackendConnectProps) {
  const keyboardOpen = useAuthViewportLock();
  const isMobile = useIsMobile();
  const savedConnection = getApiConnection();
  const savedBaseUrl = savedConnection?.baseUrl ?? "";
  const [mode, setMode] = useState<ConnectMode>("login");
  const [baseUrl, setBaseUrl] = useState(savedBaseUrl);
  const [username, setUsername] = useState(savedConnection?.user.username ?? "");
  const [displayName, setDisplayName] = useState(savedConnection?.user.displayName ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<ConnectState>("idle");
  const [error, setError] = useState("");

  const canConnect =
    baseUrl.trim().length > 0 &&
    username.trim().length >= 3 &&
    password.length >= 8;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConnect || state === "testing") return;
    setState("testing");
    setError("");

    try {
      const input = { baseUrl, username, password };
      const connection =
        mode === "register"
          ? await registerWithPassword({ ...input, displayName: displayName.trim() || undefined })
          : await testApiConnection(input);
      setApiConnection(connection);
      setState("connected");
      onConnected(connection);
    } catch (caught) {
      setState("idle");
      setError(formatConnectionError(caught));
    }
  };

  return (
    <main
      className="bg-surface flex items-center justify-center p-lg relative overflow-hidden overscroll-none max-sm:p-sm"
      style={{ height: "var(--auth-viewport-height, 100dvh)" }}
    >
      <section className={`dialog-pop-in w-full max-w-xl max-h-full bg-surface-container-lowest/95 backdrop-blur-md ring-1 ring-surface-container-highest/60 rounded-lg shadow-soft overflow-hidden max-sm:rounded-[28px] ${keyboardOpen ? "p-md max-sm:p-sm" : "p-xl max-sm:p-md"}`}>
        <div className={`flex items-start gap-md max-sm:items-center max-sm:gap-sm ${keyboardOpen ? "max-sm:hidden" : ""}`}>
          <BrandMark size={isMobile ? "md" : "lg"} className="shadow-leaf" />
          <div className="min-w-0">
            <h1 className="font-display text-headline-lg text-on-surface flex min-w-0 items-center gap-xs max-sm:text-[28px] max-sm:leading-tight">
              <span className="shrink-0">{mode === "register" ? "注册" : "登录"}</span>
              <InteractiveEcho className="min-w-0 shrink whitespace-nowrap max-sm:text-[28px]" />
            </h1>
            <p className="text-body-md text-on-surface-variant mt-xs leading-relaxed max-sm:text-body-sm max-sm:leading-snug">
              {onCancel
                ? "可以换一个后端，或用另一个账号回来照看花园。"
                : `${APP_BRAND.name} 需要先确认你是谁，才会打开植物的小屋。`}
            </p>
          </div>
        </div>

        <div className={`flex rounded-full bg-surface-container p-xs ${keyboardOpen ? "mt-0" : "mt-lg max-sm:mt-md"}`}>
          {[
            { key: "login", label: "登录" },
            { key: "register", label: "注册" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMode(item.key as ConnectMode)}
              className={`flex-1 rounded-full px-md py-sm text-label-md font-label-md transition-all duration-300 ease-emphasized max-sm:py-xs ${
                mode === item.key
                  ? "bg-primary text-on-primary shadow-leaf"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className={`flex flex-col ${keyboardOpen ? "mt-sm gap-xs" : "mt-lg gap-md max-sm:mt-md max-sm:gap-sm"}`} onSubmit={handleSubmit}>
          <Field icon="dns" label="后端HTTP地址">
            <input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={DEFAULT_BACKEND_HINT}
              className="w-full bg-transparent outline-none text-[16px] leading-6 text-on-surface placeholder:text-on-surface-variant/60"
              autoComplete="url"
            />
          </Field>

          <Field icon="person" label="账号">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_name"
              className="w-full bg-transparent outline-none text-[16px] leading-6 text-on-surface placeholder:text-on-surface-variant/60"
              autoComplete="username"
            />
          </Field>

          {mode === "register" ? (
            <Field icon="badge" label="显示名称">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="小绿的主人"
                className="w-full bg-transparent outline-none text-[16px] leading-6 text-on-surface placeholder:text-on-surface-variant/60"
                autoComplete="name"
              />
            </Field>
          ) : null}

          <Field icon="key" label="密码">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="至少 8 位"
              className="w-full bg-transparent outline-none text-[16px] leading-6 text-on-surface placeholder:text-on-surface-variant/60"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="w-9 h-9 rounded-full grid place-items-center text-on-surface-variant hover:bg-surface-container transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} />
            </button>
          </Field>

          {error ? (
            <div
              role="alert"
              className="dialog-pop-in flex items-start gap-sm rounded-md bg-error-container ring-1 ring-error/20 text-on-error-container px-md py-sm text-body-sm"
            >
              <Icon name="info" className="shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-sm sm:items-center sm:justify-between">
            <p className="text-body-sm text-on-surface-variant inline-flex items-center gap-xs max-sm:text-label-sm max-sm:leading-snug">
              <Icon name="lock" className="text-[14px] shrink-0" />
              登录凭证仅保存在本机，用来和后端确认你的身份。
            </p>
            <div className="flex flex-col sm:flex-row gap-sm sm:justify-end w-full sm:w-auto">
              {onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={state === "testing"}
                  className="w-full sm:w-auto shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-sm rounded-full ring-1 ring-secondary-fixed-dim bg-surface-container-lowest px-lg py-md font-label-md text-label-md text-primary transition-all duration-200 ease-standard hover:bg-secondary-container/30 hover:ring-secondary-fixed active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Icon name="arrow_back" className="shrink-0" />
                  返回应用
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!canConnect || state === "testing"}
                className="w-full sm:w-auto shrink-0 whitespace-nowrap group inline-flex items-center justify-center gap-sm rounded-full bg-primary text-on-primary px-xl py-md font-label-md text-label-md shadow-soft transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-modal active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface max-sm:py-sm"
              >
                <Icon
                  name={state === "testing" ? "progress_activity" : "login"}
                  className={state === "testing" ? "animate-spin shrink-0" : "transition-transform duration-300 ease-emphasized group-hover:translate-x-0.5 shrink-0"}
                />
                {state === "testing" ? "正在确认" : mode === "register" ? "注册并进入" : "登录"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({
  icon,
  label,
  children
}: {
  icon: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-label-md font-label-md text-on-surface max-sm:text-label-sm">{label}</span>
      <div className="flex items-center gap-sm rounded-md ring-1 ring-surface-container-highest bg-surface px-md py-sm transition-all duration-200 ease-standard focus-within:ring-2 focus-within:ring-primary/50 focus-within:bg-surface-container-lowest max-sm:rounded-[20px] max-sm:px-md max-sm:py-[7px]">
        <Icon name={icon} className="text-on-surface-variant" />
        {children}
      </div>
    </label>
  );
}
