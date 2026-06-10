import type { AuthLoginSession } from "@dyn/shared";
import { Chip, Icon } from "@/components/UI";
import { formatSessionTime, parseUserAgent } from "./accountSessionUtils";

export function AccountSessionRow({
  session,
  busy,
  onRevoke,
  isExiting = false
}: {
  session: AuthLoginSession;
  busy: boolean;
  onRevoke: () => void;
  isExiting?: boolean;
}) {
  const revoked = Boolean(session.revokedAt);
  const { icon, label } = parseUserAgent(session.userAgent || "");

  return (
    <article
      className={`surface-card flex flex-col overflow-hidden rounded-md border p-md shadow-leaf transition-all duration-320 ease-emphasized hover:border-primary-container/20 hover:shadow-soft sm:flex-row sm:items-center sm:justify-between ${
        isExiting
          ? "opacity-0 scale-95 max-h-0 py-0 my-0 border-transparent gap-0 pointer-events-none"
          : "translate-x-0 scale-100 opacity-100 border-hairline gap-md max-h-[300px]"
      }`}
    >
      <div className="flex min-w-0 items-start gap-sm sm:gap-md">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container-high/60 text-secondary transition-all duration-300 sm:h-10 sm:w-10">
          <Icon name={icon} className="text-[18px] sm:text-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-xs">
            <p
              className="min-w-0 max-w-full truncate text-title-sm font-title-sm text-on-surface"
              title={session.userAgent || "未知设备"}
            >
              {label}
            </p>
            {session.current ? (
              <span className="inline-flex min-h-[1.75rem] items-center gap-xs rounded-full border border-primary-fixed-dim/50 bg-primary-fixed/90 px-sm py-xs text-label-sm font-label-sm leading-none text-on-primary-fixed transition-all duration-250">
                <Icon name="verified" className="text-[14px]" />
                当前会话
              </span>
            ) : null}
            {revoked ? <Chip tone="muted" icon="schedule">已退出</Chip> : null}
          </div>
          <p className="mt-xs flex flex-wrap items-center gap-x-xs gap-y-[2px] text-label-md font-normal text-on-surface-variant sm:text-body-sm">
            <span className="font-mono text-[12px] sm:text-[13px]">
              {session.ipAddress || "IP 未记录"}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="basis-full sm:basis-auto">最近活跃 {formatSessionTime(session.lastSeenAt)}</span>
          </p>
          <p className="mt-xs text-label-sm font-label-sm text-on-surface-variant/80 sm:mt-[2px]">
            登录于 {formatSessionTime(session.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onRevoke}
        disabled={busy}
        className={`inline-flex w-full items-center justify-center gap-xs rounded-full border px-md py-xs text-label-md font-label-md transition-all duration-200 active:scale-95 disabled:opacity-50 sm:w-auto sm:self-center ${
          session.current
            ? "border-error/20 text-error hover:bg-error-container/40"
            : revoked
              ? "border-hairline text-on-surface-variant hover:border-error/20 hover:text-error hover:bg-error-container/20"
              : "border-hairline text-on-surface-variant hover:bg-surface-container"
        }`}
      >
        <Icon
          name={busy ? "progress_activity" : revoked ? "delete" : "logout"}
          className={busy ? "animate-spin text-[16px]" : "text-[16px]"}
        />
        {revoked ? "删除" : session.current ? "退出此会话" : "退出"}
      </button>
    </article>
  );
}
