import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AuthLoginSession } from "@dyn/shared";
import { authApi } from "@/lib/authApi";
import type { BackendConnection } from "@/lib/connection";
import { Icon, Chip } from "./UI";

interface UserMenuProps {
  connection: BackendConnection;
  onLogout: () => void;
}

export function UserMenu({ connection, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center sm:gap-xs rounded-full bg-surface-container/80 text-label-sm font-label-sm text-on-surface-variant ring-1 ring-surface-container-highest/40 transition-all duration-200 hover:bg-surface-container active:scale-95 sm:px-md sm:py-xs"
        title={connection.user.displayName}
      >
        <Icon name="person" className="text-[16px]" />
        <span className="max-w-[160px] truncate hidden sm:inline">{connection.user.displayName}</span>
      </button>
      {open ? (
        <AccountDialog
          connection={connection}
          onLogout={onLogout}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

// 基于用户昵称哈希计算质感森林系渐变色背景
const getAvatarGradient = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-primary/25 via-secondary/15 to-primary-fixed-dim/20 text-primary-container border-primary-container/10",
    "from-secondary/25 via-primary-container/20 to-secondary-fixed/20 text-on-secondary-fixed-variant border-secondary/10",
    "from-tertiary-fixed-dim/35 via-tertiary/10 to-primary/15 text-on-tertiary-fixed-variant border-tertiary/10",
    "from-primary-fixed/35 via-secondary/15 to-secondary-fixed-dim/25 text-on-primary-fixed-variant border-secondary-fixed-dim/15"
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

// 智能识别 User Agent 中的操作系统和浏览器
const parseUA = (uaString: string) => {
  const ua = uaString || "";
  const lower = ua.toLowerCase();
  let icon = "globe";
  let deviceName = "未知设备";

  // 1. 优先识别移动设备（因为它们的 UA 可能会包含 "like Mac OS X" 或 "Linux; Android" 等描述性关键字）
  if (lower.includes("iphone")) {
    icon = "smartphone";
    deviceName = "iPhone 手机";
  } else if (lower.includes("ipad")) {
    icon = "smartphone";
    deviceName = "iPad 平板";
  } else if (lower.includes("android")) {
    icon = "smartphone";
    deviceName = "Android 手机";
  }
  // 2. 识别桌面操作系统
  else if (lower.includes("windows")) {
    icon = "monitor";
    deviceName = "Windows PC";
  } else if (lower.includes("macintosh") || lower.includes("mac os x")) {
    icon = "monitor";
    deviceName = "macOS 电脑";
  } else if (lower.includes("linux")) {
    icon = "monitor";
    deviceName = "Linux PC";
  }

  let browser = "";
  if (lower.includes("edg/")) {
    browser = "Edge";
  } else if (lower.includes("chrome/") && !lower.includes("chromium")) {
    browser = "Chrome";
  } else if (lower.includes("safari/") && !lower.includes("chrome/")) {
    browser = "Safari";
  } else if (lower.includes("firefox/")) {
    browser = "Firefox";
  }

  const finalName = browser ? `${deviceName} (${browser})` : deviceName;
  return { icon, finalName };
};

function AccountDialog({
  connection,
  onLogout,
  onClose
}: UserMenuProps & { onClose: () => void }) {
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(connection.baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // ignore
    }
  };

  const displayName = connection.user.displayName || connection.user.username || "User";
  const avatarChar = displayName[0].toUpperCase();
  const avatarGradient = getAvatarGradient(displayName);
  const isAdmin = connection.user.role === "admin";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-md dialog-backdrop-in bg-inverse-surface/30 backdrop-blur-sm">
      <section className="dialog-pop-in w-[min(680px,calc(100vw-1.5rem))] overflow-hidden rounded-md bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal">
        {/* 精致头部 */}
        <header className="flex items-start justify-between gap-md border-b border-surface-container-highest/50 px-lg py-md bg-gradient-to-b from-surface-container-low/40 to-transparent">
          <div>
            <h2 className="font-display text-headline-lg text-on-surface flex items-center gap-xs">
              账号中心
            </h2>
            <p className="mt-xs text-body-sm text-on-surface-variant flex items-center gap-xs">
              连接和当前会话的安全管理
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-90 transition-all duration-200"
            aria-label="关闭"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </header>

        <div className="scroll-area max-h-[calc(100vh-10rem)] overflow-y-auto px-lg py-md flex flex-col gap-lg">
          {/* 用户资料卡片 */}
          <div className="flex flex-col gap-md rounded-md bg-gradient-to-br from-surface-container-lowest to-surface px-lg py-md border border-hairline shadow-leaf relative overflow-hidden">
            {/* 顶层背景微光装饰，提升高级感 */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-md">
              {/* 优雅渐变头像 */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-display text-[22px] font-bold border shadow-sm transition-transform duration-320 hover:scale-105 select-none bg-gradient-to-tr ${avatarGradient}`}>
                {avatarChar}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-sm">
                  <p className="text-title-md font-title-md text-on-surface truncate">
                    {displayName}
                  </p>
                  <Chip tone={isAdmin ? "primary" : "secondary"} icon={isAdmin ? "verified" : "person"}>
                    {isAdmin ? "管理员" : "成员"}
                  </Chip>
                </div>
                <p className="mt-xs text-body-sm text-on-surface-variant font-mono bg-surface-container-low/60 px-sm py-[2px] rounded w-fit select-all">
                  @{connection.user.username}
                </p>
              </div>

              {/* 退出登录操作 */}
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md bg-error-container/20 text-on-error-container border border-error/15 hover:bg-error-container/60 hover:border-error/30 active:scale-95 transition-all duration-200"
              >
                <Icon name="logout" className="text-[16px]" />
                退出登录
              </button>
            </div>

            {/* 服务器连接信息 */}
            <div className="border-t border-hairline/80 pt-md mt-xs flex flex-col gap-xs">
              <span className="text-label-sm font-label-sm text-on-surface-variant">服务器连接地址</span>
              <div className="flex items-center justify-between gap-sm bg-surface-container-low/40 border border-hairline rounded-sm px-sm py-xs min-w-0">
                <div className="flex items-center gap-xs min-w-0 text-body-sm text-on-surface">
                  <Icon name="dns" className="text-secondary text-[16px]" />
                  <span className="truncate select-all font-mono text-[13px]">{connection.baseUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  title="复制地址"
                  className="flex items-center justify-center p-xs rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all duration-200"
                >
                  <Icon 
                    name={copied ? "check" : "content_copy"} 
                    className={`text-[15px] ${copied ? "text-primary scale-110" : ""}`} 
                  />
                  {copied ? <span className="text-[12px] font-label-sm ml-xs text-primary">已复制</span> : null}
                </button>
              </div>
            </div>
          </div>

          {/* 登录会话面板 */}
          <section className="flex flex-col gap-sm">
            <div className="flex items-center justify-between gap-md">
              <h3 className="text-title-md font-title-md text-on-surface flex items-center gap-xs">
                登录会话
                <span className="w-2 h-2 rounded-full bg-primary/70 animate-pulse" />
              </h3>
              <button
                type="button"
                onClick={loadSessions}
                disabled={loading}
                className="inline-flex items-center gap-xs rounded-full px-md py-xs text-label-md font-label-md text-primary hover:bg-primary-container/40 active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                <Icon name={loading ? "progress_activity" : "refresh"} className={loading ? "animate-spin text-[16px]" : "text-[16px]"} />
                刷新
              </button>
            </div>
            {error ? (
              <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
                {error}
              </p>
            ) : null}
            
            <div className="flex flex-col gap-sm">
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  busy={busyId === session.id}
                  onRevoke={() => revoke(session)}
                />
              ))}
              {!loading && !sessions.length ? (
                <p className="rounded-md border border-dashed border-outline-variant px-md py-sm text-body-sm text-on-surface-variant text-center py-lg bg-surface/30">
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

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

function SessionRow({
  session,
  busy,
  onRevoke
}: {
  session: AuthLoginSession;
  busy: boolean;
  onRevoke: () => void;
}) {
  const revoked = Boolean(session.revokedAt);
  const [isDeleting, setIsDeleting] = useState(false);
  const { icon, finalName } = parseUA(session.userAgent || "");

  const handleDeleteClick = () => {
    if (revoked) {
      setIsDeleting(true);
      setTimeout(() => {
        onRevoke();
      }, 300);
    } else {
      onRevoke();
    }
  };

  return (
    <article 
      className={`surface-card rounded-md border border-hairline shadow-leaf flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md group hover:border-primary-container/20 hover:shadow-soft transition-all duration-300 ease-emphasized overflow-hidden ${
        isDeleting 
          ? "opacity-0 translate-x-12 scale-95 max-h-0 p-0 my-0 border-0" 
          : "opacity-100 translate-x-0 scale-100 max-h-[300px] p-md"
      }`}
    >
      <div className="flex items-start gap-md min-w-0">
        {/* 设备类型图标 */}
        <div className="grid h-10 w-10 place-items-center rounded-full bg-surface-container-high/60 text-secondary transition-all duration-320 group-hover:scale-105 group-hover:bg-primary-container/20 group-hover:text-primary shrink-0">
          <Icon name={icon} className="text-[20px]" />
        </div>
        
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-xs">
            <p className="truncate text-title-sm font-title-sm text-on-surface" title={session.userAgent || "未知设备"}>
              {finalName}
            </p>
            {session.current ? (
              <Chip tone="primary" icon="verified">当前会话</Chip>
            ) : null}
            {revoked ? (
              <Chip tone="muted" icon="schedule">已退出</Chip>
            ) : null}
          </div>
          <p className="mt-xs truncate text-body-sm text-on-surface-variant flex items-center gap-xs">
            <span className="font-mono text-[13px]">{session.ipAddress || "IP 未记录"}</span>
            <span>·</span>
            <span>最近活跃 {formatDateTime(session.lastSeenAt)}</span>
          </p>
          <p className="mt-[2px] text-label-sm font-label-sm text-on-surface-variant/80">
            登录于 {formatDateTime(session.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center self-end sm:self-center shrink-0">
        {revoked ? (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={busy || isDeleting}
            title="清除此会话历史记录"
            className="inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md border border-hairline text-on-surface-variant hover:bg-error-container/20 hover:text-error hover:border-error/20 active:scale-95 transition-all duration-200 disabled:opacity-50"
          >
            <Icon name={busy ? "progress_activity" : "delete"} className={busy ? "animate-spin text-[16px]" : "text-[16px]"} />
            删除记录
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-xs rounded-full px-md py-xs text-label-md font-label-md border transition-all duration-200 disabled:opacity-50 active:scale-95 ${
              session.current
                ? "border-error/20 text-error hover:bg-error-container/40"
                : "border-hairline text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <Icon name={busy ? "progress_activity" : "logout"} className={busy ? "animate-spin text-[16px]" : "text-[16px]"} />
            {session.current ? "退出此会话" : "退出"}
          </button>
        )}
      </div>
    </article>
  );
}
