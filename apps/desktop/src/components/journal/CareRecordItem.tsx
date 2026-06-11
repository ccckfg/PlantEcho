import { useMemo } from "react";
import {
  careRecordTypeIcon,
  careRecordTypeLabel,
  type CareRecord
} from "@dyn/shared";
import { formatTime, relativeTime } from "@/lib/format";
import { Icon } from "@/components/UI";

const SOURCE_LABEL: Record<CareRecord["source"], string> = {
  panel: "手动记录",
  dashboard: "主页一键",
  chat: "聊天记录"
};

interface CareRecordItemProps {
  record: CareRecord;
  plantName: string;
}

export function CareRecordItem({ record, plantName }: CareRecordItemProps) {
  const label = careRecordTypeLabel(record.type);
  const icon = careRecordTypeIcon(record.type);
  const sourceLabel = useMemo(() => SOURCE_LABEL[record.source] ?? "手动记录", [record.source]);

  return (
    <li className="flex items-start gap-sm rounded-md bg-surface-container-low/70 ring-1 ring-surface-container-highest/30 px-md py-sm transition-all duration-200 ease-standard hover:bg-secondary-container/25 hover:ring-secondary-fixed-dim/50">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary-fixed text-on-secondary-fixed">
        <Icon name={icon} className="text-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-sm">
          <span className="font-label-md text-label-md text-on-surface">{label}</span>
          <span className="shrink-0 text-label-sm font-label-sm text-on-surface-variant tabular-nums">
            {relativeTime(record.performedAt)}
          </span>
        </div>
        {record.note ? (
          <p className="mt-xs font-body text-body-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed break-words">
            {record.note}
          </p>
        ) : null}
        <span className="mt-xs inline-block text-label-sm font-label-sm text-on-surface-variant/70">
          {plantName} · {sourceLabel} · {formatTime(record.performedAt)}
        </span>
      </div>
    </li>
  );
}
