import { Icon } from "@/components/UI";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  suffix: string;
  delay?: number;
  className?: string;
}

export function StatCard({ icon, label, value, suffix, delay = 0, className = "" }: StatCardProps) {
  return (
    <div
      className={`surface-card surface-card-hover stagger-in rounded-md p-md sm:p-lg flex flex-col justify-between ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-xs sm:gap-sm mb-sm sm:mb-md text-on-surface-variant min-w-0">
        <Icon name={icon} className="text-secondary text-[16px] sm:text-[20px] shrink-0" />
        <span className="font-label-sm sm:font-label-md text-label-sm sm:text-label-md truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-xs">
        <span className="font-display text-headline-lg sm:text-headline-xl text-primary tabular-nums leading-none">{value}</span>
        <span className="font-body text-body-xs sm:text-body-md text-on-surface-variant">{suffix}</span>
      </div>
    </div>
  );
}
