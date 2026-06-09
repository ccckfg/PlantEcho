import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AuthLoginSession } from "@dyn/shared";
import { Chip, Icon } from "@/components/UI";
import { authApi } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
import { AccountApiKeyPanel } from "./AccountApiKeyPanel";
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
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [baseUrlCopied, setBaseUrlCopied] = useState(false);

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
    if (busyId || exitingIds.includes(session.id)) return;
    setError("");

    const isRevoked = Boolean(session.revokedAt);
    if (isRevoked) {
      // 已退出会话的物理删除，触发平滑的折叠淡出动画
      setExitingIds((prev) => [...prev, session.id]);
      
      // 等待 CSS 动画执行完毕 (320ms)
      await new Promise((resolve) => setTimeout(resolve, 320));
      
      // 客户端先进行物理移出，避免网络请求延迟造成的界面卡顿或瞬闪
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      setBusyId(session.id);
      
      try {
        await authApi.revokeSession(connection.baseUrl, connection.token, session.id);
        // 静默获取最新列表，确保同步一致
        const res = await authApi.listSessions(connection.baseUrl, connection.token);
        setSessions(res.sessions);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "这个会话没有删除成功。");
        // 失败时回滚，重新加载列表
        await loadSessions();
      } finally {
        setBusyId("");
        setExitingIds((prev) => prev.filter((id) => id !== session.id));
      }
    } else {
      // 未退出会话的普通注销操作
      setBusyId(session.id);
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
    }
  };

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(connection.baseUrl);
    setBaseUrlCopied(true);
    window.setTimeout(() => setBaseUrlCopied(false), 2000);
  };

  const displayName = connection.user.displayName || connection.user.username || "User";
  const avatarChar = displayName[0].toUpperCase();
  const isAdmin = connection.user.role === "admin";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-inverse-surface/30 p-0 backdrop-blur-sm dialog-backdrop-in sm:items-center sm:p-md">
      <section className="dialog-pop-in flex max-h-[calc(100dvh-0.75rem)] w-full flex-col overflow-hidden rounded-t-lg bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal sm:max-h-none sm:w-[min(680px,calc(100vw-1.5rem))] sm:rounded-md">
        <header className="flex items-start justify-between gap-md border-b border-surface-container-highest/50 bg-gradient-to-b from-surface-container-low/40 to-transparent px-md py-sm sm:px-lg sm:py-md">
          <div>
            <h2 className="font-display text-headline-lg-mobile text-on-surface sm:text-headline-lg">账号中心</h2>
            <p className="mt-xs text-label-md font-normal text-on-surface-variant sm:text-body-sm">
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

        <div className="scroll-area flex max-h-[calc(100dvh-7rem)] flex-col gap-md overflow-y-auto px-md py-md pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-h-[calc(100vh-10rem)] sm:gap-lg sm:px-lg sm:pb-md">
          <div className="relative flex shrink-0 flex-col gap-md overflow-hidden rounded-md border border-hairline bg-gradient-to-br from-surface-container-lowest to-surface px-md py-md shadow-leaf sm:px-lg">
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex flex-col gap-md sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-sm sm:flex-1 sm:gap-md">
                <div className={`flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full border bg-gradient-to-tr font-display text-[20px] font-bold shadow-sm sm:h-14 sm:w-14 sm:text-[22px] ${avatarGradientFor(displayName)}`}>
                  {avatarChar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-xs sm:gap-sm">
                    <p className="truncate text-title-sm font-title-md text-on-surface sm:text-title-md">
                      {displayName}
                    </p>
                    <Chip tone={isAdmin ? "primary" : "secondary"} icon={isAdmin ? "verified" : "person"}>
                      {isAdmin ? "管理员" : "成员"}
                    </Chip>
                  </div>
                  <p className="mt-xs max-w-full select-all truncate rounded bg-surface-container-low/60 px-sm py-[2px] font-mono text-[12px] text-on-surface-variant sm:w-fit sm:text-body-sm">
                    @{connection.user.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex w-full items-center justify-center gap-xs rounded-full border border-error/15 bg-error-container/20 px-md py-xs text-label-md font-label-md text-on-error-container transition-all duration-200 hover:border-error/30 hover:bg-error-container/60 active:scale-95 sm:w-auto sm:shrink-0"
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
                  <Icon name={baseUrlCopied ? "check" : "content_copy"} className={`text-[15px] ${baseUrlCopied ? "scale-110 text-primary" : ""}`} />
                  {baseUrlCopied ? <span className="ml-xs text-[12px] font-label-sm text-primary">已复制</span> : null}
                </button>
              </div>
            </div>

            <AccountApiKeyPanel connection={connection} onError={setError} />
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
                  isExiting={exitingIds.includes(session.id)}
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
