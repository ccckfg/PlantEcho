import { Icon } from "@/components/UI";
import type { CareProfileDraft, CareProfileFieldId } from "./careProfileDraft";

interface CareProfileEditorProps {
  value: CareProfileDraft;
  description?: string;
  errors?: Partial<Record<CareProfileFieldId, string>>;
  onChange: (value: CareProfileDraft) => void;
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

const fieldId = ([section, key]: FieldPath): CareProfileFieldId =>
  `${section}.${key}` as CareProfileFieldId;

const readValue = (profile: CareProfileDraft, [section, key]: FieldPath): string =>
  profile[section][key as never] as string;

export function CareProfileEditor({
  value,
  description = "可以按实际环境微调",
  errors = {},
  onChange
}: CareProfileEditorProps) {
  const update = ([section, key]: FieldPath, nextValue: string) => {
    onChange({
      ...value,
      [section]: {
        ...value[section],
        [key]: nextValue
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
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-sm items-start">
              <NumberInput
                label="下限"
                value={readValue(value, field.minPath)}
                error={errors[fieldId(field.minPath)]}
                onChange={(next) => update(field.minPath, next)}
              />
              <NumberInput
                label="上限"
                value={readValue(value, field.maxPath)}
                error={errors[fieldId(field.maxPath)]}
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
  error,
  onChange
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-xs">
      <span className="text-label-sm font-label-sm text-on-surface-variant">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`w-full rounded border bg-surface px-sm py-xs text-body-sm outline-none ${
          error
            ? "border-error focus:border-error"
            : "border-surface-container-highest focus:border-primary"
        }`}
      />
      {error ? <span className="text-label-sm font-label-sm text-error">{error}</span> : null}
    </label>
  );
}
