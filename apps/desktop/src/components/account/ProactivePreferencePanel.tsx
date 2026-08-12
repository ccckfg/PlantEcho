import { useEffect, useState } from "react";
import {
  talkativenessOptions,
  type Talkativeness
} from "@/config/proactive";
import { proactiveApi } from "@/lib/proactiveApi";
import { Icon } from "@/components/UI";

export function ProactivePreferencePanel() {
  const [selected, setSelected] = useState<Talkativeness | null>(null);
  const [saving, setSaving] = useState<Talkativeness | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void proactiveApi.getSettings()
      .then((settings) => {
        if (active) setSelected(settings.talkativeness);
      })
      .catch(() => {
        if (active) setError("还没读到主动发言设置。");
      });
    return () => {
      active = false;
    };
  }, []);

  const choose = async (value: Talkativeness) => {
    if (saving || value === selected) return;
    const previous = selected;
    setSelected(value);
    setSaving(value);
    setError("");
    try {
      const settings = await proactiveApi.updateSettings(value);
      setSelected(settings.talkativeness);
    } catch (caught) {
      setSelected(previous);
      setError(caught instanceof Error ? caught.message : "这次没有保存下来。");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-md border border-primary/10 bg-gradient-to-br from-[#f4f7ed] via-surface-container-lowest to-[#eef3e7] px-md py-md shadow-leaf sm:px-lg">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-primary/10 bg-primary/5"
      />
      <div className="relative flex items-start gap-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
          <Icon name="psychiatry" className="text-[18px]" />
        </span>
        <div>
          <h3 className="text-title-md font-title-md text-on-surface">它开口的分寸</h3>
          <p className="mt-[2px] text-body-sm leading-relaxed text-on-surface-variant">
            只影响植物自己想说的话；你定下的提醒始终会送达。
          </p>
        </div>
      </div>

      <div className="relative mt-md grid grid-cols-3 gap-xs" role="radiogroup" aria-label="主动发言频率">
        {talkativenessOptions.map((option) => {
          const active = selected === option.value;
          const pending = saving === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={selected === null || saving !== null}
              onClick={() => void choose(option.value)}
              className={[
                "group flex min-h-[78px] flex-col items-center justify-center gap-[3px] rounded-sm border px-xs py-sm text-center transition-all duration-250 active:scale-[0.97]",
                active
                  ? "border-primary/35 bg-primary-container/55 text-on-primary-container shadow-[0_7px_20px_rgba(74,101,51,0.13)]"
                  : "border-hairline bg-surface-container-lowest/70 text-on-surface-variant hover:border-primary/20 hover:bg-surface-container-lowest",
                selected === null ? "animate-pulse opacity-60" : "",
                saving && !pending ? "opacity-55" : ""
              ].join(" ")}
            >
              <Icon
                name={pending ? "progress_activity" : option.icon}
                className={`text-[17px] ${pending ? "animate-spin" : active ? "text-primary" : "text-secondary"}`}
              />
              <span className="text-label-md font-label-md">{option.label}</span>
              <span className="text-[11px] leading-none opacity-70">{option.detail}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="relative mt-sm text-label-sm text-error">{error}</p> : null}
    </section>
  );
}
