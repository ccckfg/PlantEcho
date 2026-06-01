import { ChangeEvent, DragEvent, FormEvent, useState } from "react";
import type { PlantSummary } from "@dyn/shared";
import { api, mediaUrl, type PlantPhoto } from "@/lib/api";
import { Icon } from "@/components/UI";
import { imageUploadConfig } from "@/config/uploads";
import { useIsMobile } from "@/lib/usePlatform";

interface UploadedPhoto {
  photo: PlantPhoto;
  plantName: string;
}

interface AlbumUploadPanelProps {
  plants: PlantSummary[];
  onUploaded: (photo: UploadedPhoto) => void;
}

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });

export function AlbumUploadPanel({ plants, onUploaded }: AlbumUploadPanelProps) {
  const isMobile = useIsMobile();
  const [plantId, setPlantId] = useState(plants[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const useSelectedFile = async (selected: File | null) => {
    setFile(selected);
    setError("");
    if (!selected) {
      setPreview("");
      return;
    }
    if (!selected.type.startsWith("image/")) {
      setError("请选择图片文件");
      setPreview("");
      return;
    }
    if (selected.size > imageUploadConfig.maxBytes) {
      setError(`图片不能超过 ${imageUploadConfig.maxSizeLabel}`);
      setPreview("");
      return;
    }
    setPreview(await readAsDataUrl(selected));
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    await useSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleDrag = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setDragActive(event.type === "dragenter" || event.type === "dragover");
  };

  const dropFile = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy) return;
    await useSelectedFile(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !preview || !plantId || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.uploadPhoto(plantId, {
        fileName: file.name,
        dataUrl: preview,
        caption,
        capturedAt: new Date(file.lastModified || Date.now()).toISOString()
      });
      const plant = plants.find((item) => item.id === plantId);
      onUploaded({ photo: result.photo, plantName: plant?.name ?? plantId });
      setFile(null);
      setPreview("");
      setCaption("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="stagger-in grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-lg surface-card rounded-lg p-lg"
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
              支持 {imageUploadConfig.maxSizeLabel} 内图片
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

        {error ? <p className="dialog-pop-in text-error text-label-sm font-label-sm">{error}</p> : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || !plantId || busy}
            className="group inline-flex items-center gap-sm bg-primary text-on-primary rounded-full px-lg py-sm font-label-md text-label-md shadow-leaf transition-all duration-200 ease-standard hover:bg-surface-tint hover:shadow-soft active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Icon name={busy ? "progress_activity" : "cloud_upload"} className={busy ? "animate-spin" : "transition-transform duration-300 ease-emphasized group-hover:-translate-y-0.5"} />
            {busy ? "上传中" : "保存到相册"}
          </button>
        </div>
      </div>
    </form>
  );
}
