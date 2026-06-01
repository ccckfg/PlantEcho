import { Icon } from "@/components/UI";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  suffix: string;
  delay?: number;
}

export function StatCard({ icon, label, value, suffix, delay = 0 }: StatCardProps) {
  return (
    <div
      className="surface-card surface-card-hover stagger-in rounded-md p-lg flex flex-col justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-sm mb-md text-on-surface-variant">
        <Icon name={icon} className="text-secondary text-[20px]" />
        <span className="font-label-md text-label-md">{label}</span>
      </div>
      <div className="flex items-baseline gap-xs">
        <span className="font-display text-headline-xl text-primary tabular-nums">{value}</span>
        <span className="font-body text-body-md text-on-surface-variant">{suffix}</span>
      </div>
    </div>
  );
}
