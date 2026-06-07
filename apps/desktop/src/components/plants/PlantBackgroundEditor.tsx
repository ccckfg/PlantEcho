import { useEffect, useState } from "react";
import {
  PLANT_BACKGROUND_MAX_LENGTH,
  type PlantSummary
} from "@dyn/shared";
import { useToast } from "@/components/Toast";
import { Card, Icon } from "@/components/UI";
import { PLANT_BACKGROUND_COVER_TEXT } from "@/config/plantBackground";
import { api } from "@/lib/api";

interface PlantBackgroundEditorProps {
  plant: PlantSummary;
  onUpdated: () => void;
}

export function PlantBackgroundEditor({ plant, onUpdated }: PlantBackgroundEditorProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plant.backgroundInfo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(plant.backgroundInfo);
    setEditing(false);
    setError("");
  }, [plant.id, plant.backgroundInfo]);

  const trimmedDraft = draft.trim();
  const canSave = trimmedDraft !== plant.backgroundInfo && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      await api.updatePlant(plant.id, { backgroundInfo: trimmedDraft });
      setEditing(false);
      onUpdated();
      toast.show({
        title: "它的来历已经轻轻改写",
        description: "之后的聊天和主动发言会尊重这些设定。",
        tone: "success",
        durationMs: 3200
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "背景信息保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <div className="mb-md flex items-center justify-between gap-md">
        <div>
          <h3 className="font-display text-headline-md text-primary">背景与性格</h3>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            写下它如何看世界、与你的关系，或哪些感知暂时不可信。
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group inline-flex shrink-0 items-center gap-xs rounded-full px-md py-sm text-label-md font-label-md text-primary ring-1 ring-outline-variant transition-all hover:bg-secondary-container/40 active:scale-[0.97]"
          >
            <Icon name="edit" className="transition-transform group-hover:-rotate-6" />
            编辑
          </button>
        ) : null}
      </div>

      <Card className="flex flex-col gap-md">
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={PLANT_BACKGROUND_MAX_LENGTH}
              rows={6}
              autoFocus
              placeholder="例如：它住在书桌旁，话不多，喜欢把心事说得像风。传感器目前没有插进土里，读数暂时不可信。"
              className="min-h-36 w-full resize-y rounded-md bg-surface-container-low px-md py-sm text-body-md text-on-surface outline-none ring-1 ring-outline-variant transition-all focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <span className="text-label-sm text-on-surface-variant">
                {draft.length}/{PLANT_BACKGROUND_MAX_LENGTH}
              </span>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(plant.backgroundInfo);
                    setEditing(false);
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-full px-md py-sm text-label-md font-label-md text-primary transition-colors hover:bg-surface-container"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!canSave}
                  className="inline-flex items-center gap-xs rounded-full bg-primary px-md py-sm text-label-md font-label-md text-on-primary shadow-leaf transition-all hover:bg-surface-tint active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name={saving ? "progress_activity" : "save"} className={saving ? "animate-spin" : ""} />
                  {saving ? "保存中" : "保存"}
                </button>
              </div>
            </div>
          </>
        ) : plant.backgroundInfo ? (
          <p className="font-display text-body-lg leading-relaxed text-on-surface-variant">
            “{PLANT_BACKGROUND_COVER_TEXT}”
          </p>
        ) : (
          <p className="text-body-md text-on-surface-variant">
            它还没有被写下来的来历。留白也可以，等你慢慢认识它。
          </p>
        )}
        {error ? (
          <p className="rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
