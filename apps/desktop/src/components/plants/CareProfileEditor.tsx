import type { CareProfile } from "@dyn/shared";
import { Icon } from "@/components/UI";

interface CareProfileEditorProps {
  value: CareProfile;
  description?: string;
  onChange: (value: CareProfile) => void;
}

type FieldPath =
  | ["soil", "min" | "max"]
  | ["light", "minLux" | "maxLux"]
  | ["temperature", "minC" | "maxC"]
  | ["humidity", "min" | "max"];

const FIELDS: Array<{
  label: string;
  icon: string;
  unit: string;
  minPath: FieldPath;
  maxPath: FieldPath;
}> = [
  { label: "土壤湿度", icon: "water_drop", unit: "%", minPath: ["soil", "min"], maxPath: ["soil", "max"] },
  { label: "光照", icon: "light_mode", unit: "lux", minPath: ["light", "minLux"], maxPath: ["light", "maxLux"] },
  { label: "温度", icon: "thermostat", unit: "°C", minPath: ["temperature", "minC"], maxPath: ["temperature", "maxC"] },
  { label: "空气湿度", icon: "air", unit: "%", minPath: ["humidity", "min"], maxPath: ["humidity", "max"] }
];

const readValue = (profile: CareProfile, [section, key]: FieldPath): number =>
  profile[section][key as never] as number;

export function CareProfileEditor({
  value,
  description = "可以按实际环境微调",
  onChange
}: CareProfileEditorProps) {
  const update = ([section, key]: FieldPath, nextValue: number) => {
    onChange({
      ...value,
      [section]: {
        ...value[section],
        [key]: Number.isFinite(nextValue) ? nextValue : 0
      }
    });
  };

  return (
    <div className="rounded-md border border-surface-container-highest bg-surface-container-lowest p-md">
      <div className="mb-md flex items-center justify-between gap-md">
        <div>
          <p className="text-label-md font-label-md text-on-surface">养护参数</p>
          <p className="text-label-sm font-label-sm text-on-surface-variant">{description}</p>
        </div>
        <Icon name="tune" className="text-primary" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {FIELDS.map((field) => (
          <div key={field.label} className="rounded bg-surface-container-low p-sm">
            <div className="mb-sm flex items-center gap-xs text-label-sm font-label-sm text-on-surface">
              <Icon name={field.icon} className="text-[16px] text-primary" />
              {field.label}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-sm items-center">
              <NumberInput
                label="下限"
                value={readValue(value, field.minPath)}
                onChange={(next) => update(field.minPath, next)}
              />
              <NumberInput
                label="上限"
                value={readValue(value, field.maxPath)}
                onChange={(next) => update(field.maxPath, next)}
              />
              <span className="text-label-sm font-label-sm text-on-surface-variant">{field.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-label-sm font-label-sm text-on-surface-variant">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded border border-surface-container-highest bg-surface px-sm py-xs text-body-sm outline-none focus:border-primary"
      />
    </label>
  );
}
