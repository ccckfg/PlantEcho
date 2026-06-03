import { ChangeEvent, DragEvent, FormEvent, useState } from "react";
import type { PlantSummary } from "@dyn/shared";
import { api, mediaUrl, type PlantPhoto } from "@/lib/api";
import { Icon } from "@/components/UI";
import { imageUploadConfig } from "@/config/uploads";
import { useIsMobile } from "@/lib/usePlatform";
import { prepareImageUpload, type PreparedImageUpload } from "@/lib/imageCompression";

interface UploadedPhoto {
  photo: PlantPhoto;
  plantName: string;
}

interface AlbumUploadPanelProps {
  plants: PlantSummary[];
  onUploaded: (photo: UploadedPhoto) => void;
  className?: string;
}

export function AlbumUploadPanel({
  plants,
  onUploaded,
  className = "surface-card rounded-lg p-lg"
}: AlbumUploadPanelProps) {
  const isMobile = useIsMobile();
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [upload, setUpload] = useState<PreparedImageUpload | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const useSelectedFile = async (selected: File | null) => {
    setUpload(null);
    setError("");
    setNotice("");
    if (!selected) {
      setPreview("");
      setCapturedAt("");
      return;
    }
    setPreparing(true);
    try {
      const prepared = await prepareImageUpload(selected);
      setUpload(prepared);
      setPreview(prepared.dataUrl);
      setCapturedAt(new Date(selected.lastModified || Date.now()).toISOString());
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

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    await useSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleDrag = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || preparing) return;
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  };

  const dropFile = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy || preparing) return;
    await useSelectedFile(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!upload || !preview || !plantId || busy || preparing) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.uploadPhoto(plantId, {
        fileName: upload.fileName,
        dataUrl: upload.dataUrl,
        caption,
        capturedAt
      });
      const plant = plants.find((item) => item.id === plantId);
      onUploaded({ photo: result.photo, plantName: plant?.name ?? plantId });
      setUpload(null);
      setPreview("");
      setCaption("");
      setCapturedAt("");
      setNotice("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={`stagger-in grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-lg ${className}`}
    >
      <label
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={dropFile}
        className={`group relative aspect-[21/9] lg:aspect-square rounded-md border-2 border-dashed grid place-items-center overflow-hidden cursor-pointer transition-all duration-300 ease-standard ${
          dragActive
            ? "border-primary bg-primary-fixed/40 shadow-ring-primary scale-[1.01]"
            : "border-outline-variant/70 bg-surface-container-low/50 hover:border-secondary-fixed-dim hover:bg-secondary-container/20"
        }`}
        aria-label={isMobile ? "选择照片" : "选择或拖入照片"}
      >
        {preview ? (
          <img src={mediaUrl(preview)} alt="" className="w-full h-full object-cover rounded-sm" />
        ) : (
          <span className="flex flex-col items-center gap-xs lg:gap-sm text-on-surface-variant transition-transform duration-300 ease-emphasized group-hover:scale-105">
            <Icon name={dragActive ? "move_to_inbox" : "add_photo_alternate"} className="text-[32px] lg:text-[40px] text-secondary" />
            <span className="text-label-md font-label-md">{dragActive ? "松手导入" : isMobile ? "选择照片" : "选择或拖入照片"}</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant/70">
              超过 {imageUploadConfig.maxStoredSizeLabel} 自动压缩
            </span>
          </span>
        )}
        {dragActive ? (
          <span className="pointer-events-none absolute inset-sm rounded-sm ring-2 ring-primary/30" aria-hidden />
        ) : null}
        <input type="file" accept={imageUploadConfig.accept} className="sr-only" onChange={selectFile} />
      </label>

      <div className="flex flex-col gap-md min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-label-md text-on-surface">绑定植物</span>
            <select
              value={plantId}
              onChange={(event) => setPlantId(event.target.value)}
              className="rounded-md ring-1 ring-surface-container-highest bg-surface px-md py-sm text-body-md outline-none transition-all duration-200 ease-standard focus:ring-2 focus:ring-primary/50"
            >
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-xs">
            <span className="text-label-md font-label-md text-on-surface">说明</span>
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="今天长出新叶了"
              className="rounded-md ring-1 ring-surface-container-highest bg-surface px-md py-sm text-body-md outline-none transition-all duration-200 ease-standard focus:ring-2 focus:ring-primary/50"
            />
          </label>
        </div>

        {notice ? <p className="dialog-pop-in text-primary text-label-sm font-label-sm">{notice}</p> : null}
        {error ? <p className="dialog-pop-in text-error text-label-sm font-label-sm">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!upload || !plantId || busy || preparing}
            className="group inline-flex items-center gap-sm bg-primary text-on-primary rounded-full px-lg py-sm font-label-md text-label-md shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Icon name={busy || preparing ? "progress_activity" : "cloud_upload"} className={busy || preparing ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:-translate-y-0.5"} />
            {preparing ? "压缩中" : busy ? "上传中" : "保存到相册"}
          </button>
        </div>
      </div>
    </form>
  );
}
