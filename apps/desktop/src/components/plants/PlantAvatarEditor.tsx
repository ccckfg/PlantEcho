import { useEffect, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import type { PlantSummary } from "@dyn/shared";
import { api, mediaUrl, type PlantPhoto } from "@/lib/api";
import { Icon } from "@/components/UI";
import { imageUploadConfig } from "@/config/uploads";
import { prepareImageUpload, type PreparedImageUpload } from "@/lib/imageCompression";

interface PlantAvatarEditorProps {
  plant: PlantSummary;
  onClose: () => void;
  onUpdated: () => void;
}

export function PlantAvatarEditor({ plant, onClose, onUpdated }: PlantAvatarEditorProps) {
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [preview, setPreview] = useState("");
  const [upload, setUpload] = useState<PreparedImageUpload | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(plant.avatarUrl ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listPhotos(plant.id)
      .then((result) => {
        if (!cancelled) setPhotos(result.photos);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "相册加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plant.id]);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setError("");
    setNotice("");
    setUpload(null);
    if (!nextFile) {
      setPreview("");
      setCapturedAt("");
      return;
    }
    setPreparing(true);
    try {
      const prepared = await prepareImageUpload(nextFile);
      setUpload(prepared);
      setPreview(prepared.dataUrl);
      setCapturedAt(new Date(nextFile.lastModified || Date.now()).toISOString());
      setSelectedUrl("");
      if (prepared.wasCompressed) {
        setNotice(`已自动压缩到 ${imageUploadConfig.maxStoredSizeLabel} 内存储`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图片处理失败");
      setPreview("");
      setCapturedAt("");
    } finally {
      setPreparing(false);
    }
  };

  const save = async () => {
    if (saving || preparing) return;
    setSaving(true);
    setError("");
    try {
      let avatarUrl = selectedUrl || null;
      if (upload && preview) {
        const result = await api.uploadPhoto(plant.id, {
          fileName: upload.fileName,
          dataUrl: upload.dataUrl,
          caption: "植物头像",
          capturedAt
        });
        avatarUrl = result.photo.contentUrl;
      }
      await api.updatePlant(plant.id, { avatarUrl });
      onUpdated();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存头像失败");
    } finally {
      setSaving(false);
    }
  };

  const currentPreview = preview || selectedUrl || plant.avatarUrl || "";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md dialog-backdrop-in bg-inverse-surface/30 backdrop-blur-sm">
      <section className="dialog-pop-in flex h-[min(720px,calc(100vh-2rem))] w-[min(900px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg bg-surface-container-lowest ring-1 ring-surface-container-highest/60 shadow-modal">
        <header className="shrink-0 border-b border-surface-container-highest/50 px-lg py-md sm:px-xl sm:py-lg">
          <div className="flex items-start justify-between gap-md">
            <div>
              <h2 className="font-display text-headline-lg text-on-surface">设计头像</h2>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                上传新图片，或从 {plant.name} 的相册中选择。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            >
              <Icon name="close" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-lg overflow-y-auto px-lg py-md sm:px-xl sm:py-lg lg:grid-cols-[280px_1fr] scroll-area">
          <div className="flex flex-col gap-md">
            <div className="aspect-square overflow-hidden rounded-lg bg-surface-container shadow-leaf">
              {currentPreview ? (
                <img src={mediaUrl(currentPreview)} alt={plant.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-on-surface-variant">
                  <Icon name="local_florist" className="text-[56px]" />
                </div>
              )}
            </div>
            <label className="group grid cursor-pointer place-items-center rounded-md border-2 border-dashed border-outline-variant/70 bg-surface-container-low/50 px-md py-lg text-center transition-colors hover:border-secondary-fixed-dim hover:bg-secondary-container/20">
              <span className="flex flex-col items-center gap-sm text-on-surface-variant">
                <Icon name="add_photo_alternate" className="text-[32px] text-secondary" />
                <span className="text-label-md font-label-md">上传本地图片</span>
              </span>
              <input type="file" accept={imageUploadConfig.accept} className="sr-only" onChange={selectFile} />
            </label>
            {plant.avatarUrl ? (
              <button
                type="button"
                onClick={() => {
                  setUpload(null);
                  setPreview("");
                  setSelectedUrl("");
                  setCapturedAt("");
                  setNotice("");
                }}
                className="inline-flex items-center justify-center gap-xs rounded-full border border-outline-variant px-md py-sm text-label-md font-label-md text-primary hover:bg-primary-container"
              >
                <Icon name="hide_image" />
                清除头像
              </button>
            ) : null}
          </div>

          <div className="min-w-0">
            <h3 className="mb-md text-label-md font-label-md text-on-surface">从相册选择</h3>
            {loading ? (
              <div className="grid grid-cols-3 gap-sm">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-square animate-pulse rounded-md bg-surface-container" />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <div className="rounded-md border border-dashed border-outline-variant p-lg text-body-sm text-on-surface-variant">
                这株植物还没有相册照片，可以先上传一张作为头像。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
                {photos.map((photo) => {
                  const active = selectedUrl === photo.contentUrl && !preview;
                  return (
                    <button
                      type="button"
                      key={photo.id}
                      onClick={() => {
                        setUpload(null);
                        setPreview("");
                        setSelectedUrl(photo.contentUrl);
                        setCapturedAt("");
                        setNotice("");
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-md ring-2 transition-all ${
                        active ? "ring-primary" : "ring-transparent hover:ring-secondary-fixed-dim"
                      }`}
                    >
                      <img src={mediaUrl(photo.contentUrl)} alt={photo.caption || plant.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {active ? (
                        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary shadow-leaf">
                          <Icon name="check" className="text-[18px]" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {notice ? (
          <p className="mx-lg mb-sm rounded-md bg-primary-container px-md py-sm text-body-sm text-on-primary-container sm:mx-xl">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mx-lg mb-sm rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container sm:mx-xl">
            {error}
          </p>
        ) : null}
        <footer className="flex shrink-0 justify-end gap-sm border-t border-surface-container-highest/50 px-lg py-md sm:px-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-lg py-sm text-label-md font-label-md text-primary hover:bg-primary-container"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || preparing}
            className="inline-flex items-center gap-sm rounded-full bg-primary px-lg py-sm text-label-md font-label-md text-on-primary disabled:opacity-50"
          >
            <Icon name={saving || preparing ? "progress_activity" : "save"} className={saving || preparing ? "animate-spin" : ""} />
            {preparing ? "压缩中" : saving ? "保存中" : "保存头像"}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
