import { useEffect, useState, type FormEvent } from "react";
import { PLANT_NAME_MAX_LENGTH, type PlantSummary } from "@dyn/shared";
import { api } from "@/lib/api";
import { Icon } from "@/components/UI";

interface PlantNameEditorProps {
  plant: PlantSummary;
  onUpdated: () => void;
}

export function PlantNameEditor({ plant, onUpdated }: PlantNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plant.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(plant.name);
    setEditing(false);
    setError("");
  }, [plant.id, plant.name]);

  const trimmedDraft = draft.trim();
  const canSave = trimmedDraft.length > 0 && trimmedDraft !== plant.name && !saving;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await api.updatePlant(plant.id, { name: trimmedDraft });
      setEditing(false);
      onUpdated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-sm">
        <h1 className="min-w-0 font-display text-headline-xl text-on-surface">
          {plant.name}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="grid h-9 w-9 place-items-center rounded-full text-on-surface-variant transition-all duration-200 hover:bg-secondary-container/60 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="修改植物名字"
          title="修改植物名字"
        >
          <Icon name="edit" className="text-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <form className="flex max-w-xl flex-col gap-xs" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-sm">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={PLANT_NAME_MAX_LENGTH}
          autoFocus
          className="min-w-[220px] flex-1 rounded-md bg-surface-container-lowest px-md py-sm font-display text-headline-md text-on-surface outline-none ring-1 ring-surface-container-highest transition-all focus:ring-2 focus:ring-primary/45"
          aria-label="植物名字"
        />
        <button
          type="submit"
          disabled={!canSave}
          className="inline-flex items-center gap-xs rounded-full bg-primary px-md py-sm text-label-md font-label-md text-on-primary shadow-leaf transition-all hover:bg-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name={saving ? "progress_activity" : "check"} className={saving ? "animate-spin" : ""} />
          保存
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(plant.name);
            setEditing(false);
            setError("");
          }}
          disabled={saving}
          className="inline-flex items-center gap-xs rounded-full bg-surface-container-lowest px-md py-sm text-label-md font-label-md text-primary ring-1 ring-outline-variant transition-all hover:bg-secondary-container/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="close" />
          取消
        </button>
      </div>
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
    </form>
  );
}
