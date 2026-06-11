import { Icon } from "@/components/UI";

interface CareRecordPanelHeaderProps {
  total: number;
  isMobile: boolean;
}

export function CareRecordPanelHeader({
  total,
  isMobile
}: CareRecordPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-sm">
      <div className="min-w-0">
        <h2
          className={`font-display ${isMobile ? "text-headline-sm" : "text-headline-md"} text-primary inline-flex items-center gap-xs`}
        >
          <Icon name="water_drop" className="text-[20px] text-secondary" />
          养护记录
        </h2>
      </div>
      {total > 0 ? (
        <span className="shrink-0 rounded-full bg-secondary-container/40 px-sm py-xs text-label-sm font-label-sm text-on-secondary-container tabular-nums">
          共 {total} 次
        </span>
      ) : null}
    </div>
  );
}
