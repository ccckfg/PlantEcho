import { useState } from "react";
import type { CareProfile, PlantSummary } from "@dyn/shared";
import { api } from "@/lib/api";
import { Icon } from "@/components/UI";
import { CareProfileEditor } from "./CareProfileEditor";

interface PlantCareProfileSectionProps {
  plant: PlantSummary;
  onUpdated: () => void;
}

const isInvalidProfile = (profile: CareProfile): boolean =>
  profile.soil.min >= profile.soil.max ||
  profile.light.minLux >= profile.light.maxLux ||
  profile.temperature.minC >= profile.temperature.maxC ||
  profile.humidity.min >= profile.humidity.max;

export function PlantCareProfileSection({ plant, onUpdated }: PlantCareProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CareProfile>(plant.careProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const invalid = isInvalidProfile(draft);

  const beginEdit = () => {
    setDraft(plant.careProfile);
    setError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(plant.careProfile);
    setError("");
    setEditing(false);
  };

  const save = async () => {
    if (saving || invalid) return;
    setSaving(true);
    setError("");
    try {
      await api.updatePlant(plant.id, { careProfile: draft });
      setEditing(false);
      onUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存养护参数失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-md flex items-center justify-between gap-md">
        <h3 className="font-display text-headline-md text-primary">养护规则</h3>
        {editing ? (
          <div className="flex gap-sm stagger-in">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full px-md py-sm text-label-md font-label-md text-primary transition-all duration-200 ease-standard hover:bg-surface-container active:scale-[0.97]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || invalid}
              className="group inline-flex items-center gap-xs rounded-full bg-primary px-md py-sm text-label-md font-label-md text-on-primary shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name={saving ? "progress_activity" : "save"} className={saving ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:scale-110"} />
              {saving ? "保存中" : "保存"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={beginEdit}
            className="group inline-flex items-center gap-xs rounded-full ring-1 ring-outline-variant px-md py-sm text-label-md font-label-md text-primary transition-all duration-200 ease-standard hover:bg-secondary-container/40 hover:ring-secondary-fixed-dim active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Icon name="edit" className="transition-transform duration-300 ease-emphasized group-hover:rotate-[-8deg] group-hover:scale-110" />
            编辑
          </button>
        )}
      </div>
      {error ? (
        <p className="mb-md rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
          {error}
        </p>
      ) : null}
      {editing ? (
        <div className="stagger-in">
          <CareProfileEditor
            value={draft}
            description="修改后会影响状态判断、心情标签和聊天里的养护依据"
            onChange={setDraft}
          />
          {invalid ? (
            <p className="mt-sm text-label-sm font-label-sm text-error">
              每项下限必须小于上限。
            </p>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          <RuleCard icon="water_drop" label="土壤" value={`${plant.careProfile.soil.min}-${plant.careProfile.soil.max}%`} />
          <RuleCard icon="light_mode" label="光照" value={`${plant.careProfile.light.minLux}-${plant.careProfile.light.maxLux} lx`} />
          <RuleCard icon="thermostat" label="温度" value={`${plant.careProfile.temperature.minC}-${plant.careProfile.temperature.maxC} °C`} />
          <RuleCard icon="air" label="湿度" value={`${plant.careProfile.humidity.min}-${plant.careProfile.humidity.max}%`} />
        </div>
      )}
    </section>
  );
}

function RuleCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="surface-card surface-card-hover rounded-md p-md flex flex-col gap-sm">
      <div className="flex items-center gap-xs text-on-surface-variant text-label-sm font-label-sm">
        <Icon name={icon} className="text-secondary" /> {label}
      </div>
      <span className="font-display text-headline-md text-primary tabular-nums">{value}</span>
    </div>
  );
}
