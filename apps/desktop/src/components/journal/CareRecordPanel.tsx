import { useMemo, useState } from "react";
import {
  CARE_RECORD_TYPES,
  CARE_RECORD_NOTE_MAX_LENGTH,
  careRecordTypeIcon,
  careRecordTypeLabel,
  type CareRecord,
  type CareRecordType
} from "@dyn/shared";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useSyncRefresh } from "@/hooks/useSyncRefresh";
import { relativeTime } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { Card, Empty, Icon } from "@/components/UI";

interface CareRecordPanelProps {
  plantId: string;
  plantName: string;
  /** 移动端用更紧凑的间距与字号。 */
  variant?: "desktop" | "mobile";
}

const RECORD_LIMIT = 50;

export function CareRecordPanel({ plantId, plantName, variant = "desktop" }: CareRecordPanelProps) {
  const isMobile = variant === "mobile";
  const refresh = useSyncRefresh({ plantId, resources: ["care_records"] });
  const records = useAsync(() => api.listCareRecords(plantId, RECORD_LIMIT), [plantId, refresh]);
  const toast = useToast();

  const [activeType, setActiveType] = useState<CareRecordType>("water");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const list = records.data?.records ?? [];
  const total = list.length;

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.createCareRecord(plantId, {
        type: activeType,
        note: note.trim() || undefined,
        source: "panel"
      });
      setNote("");
      toast.show({
        title: `已记下一次「${careRecordTypeLabel(activeType)}」`,
        description: `${plantName} 的养护记录又添一笔。`,
        tone: "success",
        durationMs: 2600
      });
    } catch (error) {
      toast.show({
        title: "这条养护记录没能存下",
        description: error instanceof Error ? error.message : "网络打了个盹，要不要再试一次？",
        tone: "warning",
        durationMs: 6000
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-md !p-md md:!p-lg">
      <div className="flex items-center justify-between gap-sm">
        <h2
          className={`font-display ${isMobile ? "text-headline-sm" : "text-headline-md"} text-primary inline-flex items-center gap-xs`}
        >
          <Icon name="water_drop" className="text-[20px] text-secondary" />
          养护记录
        </h2>
        {total > 0 ? (
          <span className="shrink-0 rounded-full bg-secondary-container/40 px-sm py-xs text-label-sm font-label-sm text-on-secondary-container tabular-nums">
            共 {total} 次
          </span>
        ) : null}
      </div>

      {/* 快捷记录：选类型 + 可选备注 + 一键记下 */}
      <div className="flex flex-col gap-sm rounded-md bg-surface-container-low/70 ring-1 ring-surface-container-highest/40 p-sm md:p-md">
        <div className="flex gap-xs overflow-x-auto scroll-area pb-0.5">
          {CARE_RECORD_TYPES.map((item) => {
            const selected = item.key === activeType;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveType(item.key)}
                aria-pressed={selected}
                className={`group shrink-0 inline-flex items-center gap-xs whitespace-nowrap rounded-full px-sm py-xs text-label-sm font-label-sm transition-all duration-200 ease-standard active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  selected
                    ? "bg-primary text-on-primary shadow-leaf"
                    : "bg-surface-container-lowest text-secondary ring-1 ring-surface-container-highest/50 hover:bg-secondary-container/30 hover:text-primary"
                }`}
              >
                <Icon
                  name={item.icon}
                  className="text-[16px] transition-transform duration-300 ease-emphasized group-hover:scale-110"
                />
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-sm">
          <input
            value={note}
            maxLength={CARE_RECORD_NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={`备注（可选）· 比如「浇了约200ml」`}
            disabled={saving}
            className="flex-1 min-w-0 rounded-full bg-surface-container-lowest ring-1 ring-surface-container-highest/50 px-md py-sm text-body-sm md:text-body-md text-on-surface placeholder:text-on-surface-variant/55 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            aria-label="记录养护"
            className="group shrink-0 inline-flex items-center gap-xs rounded-full bg-primary text-on-primary px-md py-sm text-label-sm font-label-sm shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-soft active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon
              name={saving ? "progress_activity" : "add"}
              className={`text-[16px] ${saving ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:scale-110"}`}
            />
            记下
          </button>
        </div>
      </div>

      {/* 记录列表：固定高度内滚动，永不撑开版块 */}
      {records.loading && !records.data ? (
        <div className="h-40 animate-pulse rounded-md bg-surface-container" />
      ) : total === 0 ? (
        <Empty
          icon="eco"
          title="还没有养护记录"
          description="浇水、施肥、修剪后点一下上面的按钮，这里会留下照料它的足迹。"
        />
      ) : (
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-surface-container-lowest to-transparent pointer-events-none z-10 rounded-t"
          />
          <ul
            className={`flex flex-col gap-sm overflow-y-auto scroll-area pr-sm py-1 ${
              isMobile ? "max-h-[260px]" : "max-h-[320px]"
            }`}
          >
            {list.map((record) => (
              <CareRecordItem key={record.id} record={record} />
            ))}
          </ul>
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-surface-container-lowest to-transparent pointer-events-none z-10 rounded-b"
          />
        </div>
      )}
    </Card>
  );
}

const SOURCE_LABEL: Record<CareRecord["source"], string> = {
  panel: "手动记录",
  dashboard: "主页一键",
  chat: "聊天记录"
};

function CareRecordItem({ record }: { record: CareRecord }) {
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
          {sourceLabel}
        </span>
      </div>
    </li>
  );
}
