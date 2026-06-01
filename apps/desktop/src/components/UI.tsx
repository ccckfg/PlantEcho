import type { ReactNode } from "react";
import { iconPaths } from "./IconPaths";

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number;
}

export function Icon({ name, filled = false, className = "", size }: IconProps) {
  const style = size ? { fontSize: `${size}px` } : undefined;
  const path = iconPaths[name] ?? iconPaths.eco;
  return (
    <svg
      className={`local-icon ${filled ? "fill" : ""} ${className}`}
      style={style}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

interface ChipProps {
  icon?: string;
  iconFilled?: boolean;
  tone?: "primary" | "secondary" | "tertiary" | "error" | "muted";
  children: ReactNode;
}

export function Chip({ icon, iconFilled, tone = "secondary", children }: ChipProps) {
  const palette: Record<NonNullable<ChipProps["tone"]>, string> = {
    primary: "bg-primary-container/95 text-on-primary-container ring-1 ring-primary-container/30",
    secondary: "bg-secondary-container/55 text-on-secondary-container ring-1 ring-secondary-fixed-dim/45",
    tertiary: "bg-tertiary-fixed/90 text-on-tertiary-fixed-variant ring-1 ring-tertiary-fixed-dim/50",
    error: "bg-error-container text-on-error-container ring-1 ring-error/20",
    muted: "bg-surface-container text-on-surface-variant ring-1 ring-surface-container-highest/40"
  };
  return (
    <span
      className={`inline-flex items-center gap-xs px-sm py-xs rounded-full text-label-sm font-label-sm leading-none min-h-[1.75rem] ${palette[tone]} transition-all duration-250 ease-standard`}
    >
      {icon ? <Icon name={icon} filled={iconFilled} className="text-[14px]" /> : null}
      {children}
    </span>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false }: CardProps) {
  return (
    <div
      className={`surface-card rounded-md p-md md:p-lg ${
        interactive ? "surface-card-hover cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  icon: string;
  value: number;
  /** 当数值偏离健康区间时变成 warning 配色 */
  tone?: "default" | "warning" | "danger";
}

export function ProgressBar({ label, icon, value, tone = "default" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const trackColor =
    tone === "danger"
      ? "bg-error-container/60"
      : tone === "warning"
        ? "bg-tertiary-fixed/60"
        : "bg-secondary-fixed-dim/60";
  const fillColor =
    tone === "danger"
      ? "bg-gradient-to-r from-error to-error/80"
      : tone === "warning"
        ? "bg-gradient-to-r from-tertiary-container to-tertiary"
        : "bg-gradient-to-r from-primary-container to-primary";
  const valueColor =
    tone === "danger" ? "text-error" : tone === "warning" ? "text-tertiary" : "text-primary";
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex justify-between text-label-sm font-label-sm">
        <span className="inline-flex items-center gap-xs text-on-surface">
          <Icon name={icon} className={`text-[16px] ${valueColor}`} />
          {label}
        </span>
        <span className={`font-bold tabular-nums ${valueColor}`}>{pct}%</span>
      </div>
      <div className={`h-2 w-full rounded-full overflow-hidden ${trackColor}`}>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          className={`h-full rounded-full ${fillColor} transition-[width] duration-700 ease-emphasized shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface EmptyProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function Empty({ icon = "eco", title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-xl md:py-xxl text-on-surface-variant text-center gap-sm md:gap-md">
      <div className="relative grid place-items-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-secondary-container/50">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-secondary-container/40 animate-ping opacity-60"
          style={{ animationDuration: "2.6s" }}
        />
        <Icon name={icon} className="text-[32px] md:text-[40px] text-secondary relative icon-leaf-hover" />
      </div>
      <p className="text-body-lg md:text-headline-md font-display text-on-surface">{title}</p>
      {description ? (
        <p className="text-body-md max-w-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-xs">{action}</div> : null}
    </div>
  );
}
