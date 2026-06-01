import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AuthLoginSession } from "@dyn/shared";
import { Chip, Icon } from "@/components/UI";
import { authApi } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
import { AccountSessionRow } from "./AccountSessionRow";
import { avatarGradientFor } from "./accountSessionUtils";

export function AccountDialog({
  connection,
  onLogout,
  onClose
}: {
  connection: BackendConnection;
  onLogout: () => void;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<AuthLoginSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    setError("");
    try {
      setSessions((await authApi.listSessions(connection.baseUrl, connection.token)).sessions);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录会话暂时没有回来。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, [connection.token]);

  const revoke = async (session: AuthLoginSession) => {
    if (busyId) return;
    setBusyId(session.id);
    setError("");
    try {
      await authApi.revokeSession(connection.baseUrl, connection.token, session.id);
      if (session.current) {
        onLogout();
        return;
      }
      await loadSessions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "这个会话没有退出成功。");
    } finally {
      setBusyId("");
    }
  };

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(connection.baseUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const displayName = connection.user.displayName || connection.user.username || "User";
  const avatarChar = displayName[0].toUpperCase();
  const isAdmin = connection.user.role === "admin";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-inverse-surface/30 p-md backdrop-blur-sm dialog-backdrop-in">
      <section className="dialog-pop-in w-[min(680px,calc(100vw-1.5rem))] overflow-hidden rounded-md bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal">
        <header className="flex items-start justify-between gap-md border-b border-surface-container-highest/50 bg-gradient-to-b from-surface-container-low/40 to-transparent px-lg py-md">
          <div>
            <h2 className="font-display text-headline-lg text-on-surface">账号中心</h2>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              连接和当前会话的安全管理
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-surface-container active:scale-90"
            aria-label="关闭"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </header>

        <div className="scroll-area flex max-h-[calc(100vh-10rem)] flex-col gap-lg overflow-y-auto px-lg py-md">
          <div className="relative flex flex-col gap-md overflow-hidden rounded-md border border-hairline bg-gradient-to-br from-surface-container-lowest to-surface px-lg py-md shadow-leaf">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center gap-md">
              <div className={`flex h-14 w-14 select-none items-center justify-center rounded-full border bg-gradient-to-tr font-display text-[22px] font-bold shadow-sm ${avatarGradientFor(displayName)}`}>
                {avatarChar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-sm">
                  <p className="truncate text-title-md font-title-md text-on-surface">
                    {displayName}
                  </p>
                  <Chip tone={isAdmin ? "primary" : "secondary"} icon={isAdmin ? "verified" : "person"}>
                    {isAdmin ? "管理员" : "成员"}
                  </Chip>
                </div>
                <p className="mt-xs w-fit select-all rounded bg-surface-container-low/60 px-sm py-[2px] font-mono text-body-sm text-on-surface-variant">
                  @{connection.user.username}
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-xs rounded-full border border-error/15 bg-error-container/20 px-md py-xs text-label-md font-label-md text-on-error-container transition-all duration-200 hover:border-error/30 hover:bg-error-container/60 active:scale-95"
              >
                <Icon name="logout" className="text-[16px]" />
                退出登录
              </button>
            </div>

            <div className="mt-xs flex flex-col gap-xs border-t border-hairline/80 pt-md">
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                服务器连接地址
              </span>
              <div className="flex min-w-0 items-center justify-between gap-sm rounded-sm border border-hairline bg-surface-container-low/40 px-sm py-xs">
                <div className="flex min-w-0 items-center gap-xs text-body-sm text-on-surface">
                  <Icon name="dns" className="text-[16px] text-secondary" />
                  <span className="truncate select-all font-mono text-[13px]">
                    {connection.baseUrl}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyBaseUrl}
                  title="复制地址"
                  className="flex items-center justify-center rounded-full p-xs text-on-surface-variant transition-all duration-200 hover:bg-surface-container hover:text-primary"
                >
                  <Icon name={copied ? "check" : "content_copy"} className={`text-[15px] ${copied ? "scale-110 text-primary" : ""}`} />
                  {copied ? <span className="ml-xs text-[12px] font-label-sm text-primary">已复制</span> : null}
                </button>
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-sm">
            <div className="flex items-center justify-between gap-md">
              <h3 className="flex items-center gap-xs text-title-md font-title-md text-on-surface">
                登录会话
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" />
              </h3>
              <button
                type="button"
                onClick={loadSessions}
                disabled={loading}
                className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary transition-all duration-200 hover:bg-primary-container/40 active:scale-95 disabled:opacity-50"
              >
                <Icon name={loading ? "progress_activity" : "refresh"} className={loading ? "animate-spin text-[16px]" : "text-[16px]"} />
                刷新
              </button>
            </div>
            {error ? <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">{error}</p> : null}
            <div className="flex flex-col gap-sm">
              {sessions.map((session) => (
                <AccountSessionRow
                  key={session.id}
                  session={session}
                  busy={busyId === session.id}
                  onRevoke={() => revoke(session)}
                />
              ))}
              {!loading && !sessions.length ? (
                <p className="rounded-md border border-dashed border-outline-variant bg-surface/30 px-md py-lg text-center text-body-sm text-on-surface-variant">
                  还没有记录到登录会话。
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body
  );
}
