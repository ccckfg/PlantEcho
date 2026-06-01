import type { AuthLoginSession } from "@dyn/shared";
import { Chip, Icon } from "@/components/UI";
import { formatSessionTime, parseUserAgent } from "./accountSessionUtils";

export function AccountSessionRow({
  session,
  busy,
  onRevoke
}: {
  session: AuthLoginSession;
  busy: boolean;
  onRevoke: () => void;
}) {
  const revoked = Boolean(session.revokedAt);
  const { icon, label } = parseUserAgent(session.userAgent || "");

  return (
    <article
      className="surface-card rounded-md border border-hairline shadow-leaf flex max-h-[300px] translate-x-0 scale-100 flex-col gap-md overflow-hidden p-md opacity-100 transition-all duration-300 ease-emphasized hover:border-primary-container/20 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-md">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-container-high/60 text-secondary transition-all duration-300">
          <Icon name={icon} className="text-[20px]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-xs">
            <p
              className="truncate text-title-sm font-title-sm text-on-surface"
              title={session.userAgent || "未知设备"}
            >
              {label}
            </p>
            {session.current ? <Chip tone="primary" icon="verified">当前会话</Chip> : null}
            {revoked ? <Chip tone="muted" icon="schedule">已退出</Chip> : null}
          </div>
          <p className="mt-xs flex items-center gap-xs truncate text-body-sm text-on-surface-variant">
            <span className="font-mono text-[13px]">
              {session.ipAddress || "IP 未记录"}
            </span>
            <span>·</span>
            <span>最近活跃 {formatSessionTime(session.lastSeenAt)}</span>
          </p>
          <p className="mt-[2px] text-label-sm font-label-sm text-on-surface-variant/80">
            登录于 {formatSessionTime(session.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRevoke}
        disabled={busy || revoked}
        className={`inline-flex items-center justify-center gap-xs self-end rounded-full border px-md py-xs text-label-md font-label-md transition-all duration-200 active:scale-95 disabled:opacity-50 sm:self-center ${
          session.current
            ? "border-error/20 text-error hover:bg-error-container/40"
            : revoked
              ? "border-hairline text-on-surface-variant"
              : "border-hairline text-on-surface-variant hover:bg-surface-container"
        }`}
      >
        <Icon
          name={busy ? "progress_activity" : revoked ? "check_circle" : "logout"}
          className={busy ? "animate-spin text-[16px]" : "text-[16px]"}
        />
        {revoked ? "已退出" : session.current ? "退出此会话" : "退出"}
      </button>
    </article>
  );
}
