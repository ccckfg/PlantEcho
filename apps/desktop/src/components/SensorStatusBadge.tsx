import type { SensorConnection } from "@/lib/sensorStatus";
import { Icon } from "./UI";

interface SensorStatusBadgeProps {
  connection: SensorConnection;
  variant?: "inline" | "badge";
  className?: string;
}

const dotClass = {
  online: "bg-primary",
  offline: "bg-error",
  waiting: "bg-outline"
} satisfies Record<SensorConnection["state"], string>;

const textClass = {
  online: "text-primary",
  offline: "text-error",
  waiting: "text-on-surface-variant"
} satisfies Record<SensorConnection["state"], string>;

const ringClass = {
  online: "bg-primary/30",
  offline: "bg-error/30",
  waiting: "bg-outline/20"
} satisfies Record<SensorConnection["state"], string>;

export function SensorStatusBadge({
  connection,
  variant = "badge",
  className = ""
}: SensorStatusBadgeProps) {
  const Dot = (
    <span className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center">
      {connection.state === "online" ? (
        <span
          aria-hidden
          className={`absolute inset-[-3px] rounded-full ${ringClass[connection.state]} animate-ping`}
          style={{ animationDuration: "2s" }}
        />
      ) : null}
      <span className={`h-2 w-2 rounded-full ${dotClass[connection.state]} relative`} />
    </span>
  );

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-xs font-label-sm text-label-sm ${textClass[connection.state]} ${className}`}
        title={connection.detail}
      >
        {Dot}
        {connection.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full bg-surface-container/80 ring-1 ring-surface-container-highest/40 px-sm py-xs font-label-sm text-label-sm ${textClass[connection.state]} ${className}`}
      title={connection.detail}
    >
      <Icon name={connection.icon} className="text-[14px]" />
      {connection.label}
    </span>
  );
}
