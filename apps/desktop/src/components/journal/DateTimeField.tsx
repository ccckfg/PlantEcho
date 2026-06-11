import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/UI";
import { toDateTimeLocalValue } from "./careRecordTime";

interface DateTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  max?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

const pad = (value: number): string => String(value).padStart(2, "0");

const parseLocal = (value?: string): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const localValueFromDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatDisplay = (value: string, placeholder = "选择时间"): string => {
  const date = parseLocal(value);
  if (!date) return placeholder;
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const monthDays = (year: number, month: number): Array<Date | null> => {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7;
  return [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1))
  ];
};

export function DateTimeField({
  value,
  onChange,
  label,
  placeholder,
  max,
  disabled = false,
  allowClear = false
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);
  const fallbackDate = useMemo(() => parseLocal(max) ?? new Date(), [max]);
  const maxDate = useMemo(() => parseLocal(max), [max]);
  const sourceDate = parseLocal(value) ?? fallbackDate;
  const [draft, setDraft] = useState(sourceDate);
  const [viewMonth, setViewMonth] = useState(() => new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));

  useEffect(() => {
    if (!open) return;
    const next = parseLocal(value) ?? fallbackDate;
    setDraft(next);
    setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [fallbackDate, open, value]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const days = monthDays(viewMonth.getFullYear(), viewMonth.getMonth());
  const selectedKey = `${draft.getFullYear()}-${draft.getMonth()}-${draft.getDate()}`;

  const applyDate = (day: Date) => {
    const next = new Date(day);
    next.setHours(draft.getHours(), draft.getMinutes(), 0, 0);
    setDraft(maxDate && next > maxDate ? maxDate : next);
  };

  const shiftMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const updateTime = (part: "hour" | "minute", raw: string) => {
    const limit = part === "hour" ? 23 : 59;
    const parsed = Number.parseInt(raw, 10);
    const value = Number.isFinite(parsed) ? Math.max(0, Math.min(limit, parsed)) : 0;
    const next = new Date(draft);
    if (part === "hour") next.setHours(value);
    if (part === "minute") next.setMinutes(value);
    setDraft(maxDate && next > maxDate ? maxDate : next);
  };

  const confirm = () => {
    onChange(localValueFromDate(maxDate && draft > maxDate ? maxDate : draft));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={label}
        className="min-w-0 inline-flex w-full items-center justify-between gap-sm rounded-full bg-surface-container-lowest px-md py-sm text-left text-body-sm text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-surface-container-highest/50 transition-all duration-200 ease-standard hover:bg-secondary-container/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className={value ? "truncate tabular-nums" : "truncate text-on-surface-variant/60"}>
          {formatDisplay(value, placeholder)}
        </span>
        <Icon name="calendar_month" className="shrink-0 text-[16px] text-secondary" />
      </button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-inverse-surface/30 px-3 py-4 backdrop-blur-sm dialog-backdrop-in"
          role="presentation"
        >
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="dialog-pop-in relative z-10 w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-hidden rounded-[24px] bg-surface-container-lowest p-3 shadow-modal ring-1 ring-surface-container-highest/60 max-h-[calc(100vh-2rem)]"
          >
            <div className="mb-sm flex items-start justify-between gap-sm">
              <div className="min-w-0">
                <p className="truncate text-title-sm font-display text-on-surface">{label}</p>
                <p className="mt-1 truncate text-label-sm font-label-sm text-on-surface-variant">
                  {formatDisplay(localValueFromDate(draft))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭日期选择"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition-all duration-200 hover:text-primary active:scale-95"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>

            <div className="rounded-2xl bg-surface-container-low/80 p-xs ring-1 ring-surface-container-highest/40">
              <div className="mb-sm flex items-center justify-between">
                <button type="button" onClick={() => shiftMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full text-secondary hover:bg-secondary-container/40">
                  <Icon name="arrow_back" className="text-[16px]" />
                </button>
                <span className="text-label-lg font-label-lg text-on-surface tabular-nums">
                  {viewMonth.getFullYear()} 年 {viewMonth.getMonth() + 1} 月
                </span>
                <button type="button" onClick={() => shiftMonth(1)} className="grid h-9 w-9 place-items-center rounded-full text-secondary hover:bg-secondary-container/40">
                  <Icon name="arrow_forward" className="text-[16px]" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-label-sm font-label-sm text-on-surface-variant">
                {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                  <span key={day} className="py-xs">{day}</span>
                ))}
                {days.map((day, index) => {
                  const key = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : `blank-${index}`;
                  const selected = key === selectedKey;
                  const disabledDay = Boolean(maxDate && day && day > maxDate);
                  return day ? (
                    <button
                      key={key}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => applyDate(day)}
                      className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-label-md font-label-md tabular-nums transition-all duration-200 ${
                        selected
                          ? "bg-primary text-on-primary shadow-leaf"
                          : "text-on-surface hover:bg-secondary-container/45"
                      } disabled:text-on-surface-variant/25 disabled:hover:bg-transparent`}
                    >
                      {day.getDate()}
                    </button>
                  ) : (
                    <span key={key} aria-hidden />
                  );
                })}
              </div>
            </div>

            <div className="mt-sm grid w-full max-w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-xs rounded-2xl bg-secondary-container/25 p-xs">
              <input
                inputMode="numeric"
                value={pad(draft.getHours())}
                onChange={(event) => updateTime("hour", event.target.value)}
                aria-label="小时"
                className="h-11 min-w-0 w-full rounded-full bg-surface-container-lowest px-sm text-center text-title-sm text-on-surface tabular-nums outline-none ring-1 ring-surface-container-highest/50 focus:ring-2 focus:ring-primary/40 md:text-title-md"
              />
              <span className="text-title-md text-secondary">:</span>
              <input
                inputMode="numeric"
                value={pad(draft.getMinutes())}
                onChange={(event) => updateTime("minute", event.target.value)}
                aria-label="分钟"
                className="h-11 min-w-0 w-full rounded-full bg-surface-container-lowest px-sm text-center text-title-sm text-on-surface tabular-nums outline-none ring-1 ring-surface-container-highest/50 focus:ring-2 focus:ring-primary/40 md:text-title-md"
              />
            </div>

            <div className="mt-sm flex items-center justify-between gap-sm">
              {allowClear ? (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded-full px-md py-sm text-label-sm font-label-sm text-secondary hover:bg-secondary-container/35">
                  清除
                </button>
              ) : <span />}
              <div className="flex items-center gap-xs">
                <button type="button" onClick={() => setDraft(parseLocal(toDateTimeLocalValue()) ?? new Date())} className="rounded-full px-md py-sm text-label-sm font-label-sm text-secondary hover:bg-secondary-container/35">
                  此刻
                </button>
                <button type="button" onClick={confirm} className="rounded-full bg-primary px-lg py-sm text-label-sm font-label-sm text-on-primary shadow-leaf transition-all duration-200 hover:bg-surface-tint active:scale-[0.98]">
                  设置
                </button>
              </div>
            </div>
          </section>
        </div>,
        document.body
      ) : null}
    </>
  );
}
