import { useState } from "react";
import { mediaUrl } from "@/lib/api";
import { plantImage } from "@/lib/format";
import { savePhotoToLocalAlbum } from "@/lib/photoSave";
import { Icon } from "@/components/UI";
import { useToast } from "@/components/Toast";

export interface AlbumPhoto {
  id: string;
  src: string;
  plantId: string;
  plantName: string;
  caption: string;
  capturedAt: string;
  monthLabel: string;
}

interface PhotoCardProps {
  photo: AlbumPhoto;
  onDelete?: (photo: AlbumPhoto) => Promise<void> | void;
}

export function PhotoCard({ photo, onDelete }: PhotoCardProps) {
  const toast = useToast();
  const [lightbox, setLightbox] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const deletePhoto = async () => {
    if (!onDelete || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setError("");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await onDelete(photo);
      setLightbox(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "删除失败");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const savePhoto = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await savePhotoToLocalAlbum(photo);
      setSaved(true);
      toast.show({
        title: "已保存到本地相册",
        tone: "success",
        durationMs: 2200
      });
      window.setTimeout(() => setSaved(false), 1800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <figure
        className="group relative rounded-md overflow-hidden bg-surface-container-lowest aspect-square ring-1 ring-surface-container-highest/40 shadow-leaf transition-all duration-420 ease-emphasized hover:shadow-soft hover:-translate-y-0.5 hover:ring-secondary-fixed-dim/60 cursor-pointer"
        onClick={() => setLightbox(true)}
        role="button"
        tabIndex={0}
        aria-label={`查看大图：${photo.caption || photo.plantName}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setLightbox(true); }}
      >
        <img
          src={mediaUrl(photo.src)}
          alt={photo.caption || photo.plantName}
          className="w-full h-full object-cover transition-transform duration-700 ease-emphasized group-hover:scale-[1.06]"
          onError={(event) => {
            event.currentTarget.src = plantImage(photo.plantId);
          }}
        />

        <span className="absolute top-sm left-sm bg-tertiary-fixed/95 text-on-tertiary-fixed-variant font-label-sm text-label-sm px-3 py-1 rounded-full backdrop-blur-sm shadow-sm transition-transform duration-300 ease-emphasized group-hover:-translate-y-0.5">
          {photo.plantName}
        </span>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-0 transition-opacity duration-300 ease-standard group-hover:opacity-100 pointer-events-none"
        />

        {photo.caption ? (
          <figcaption className="absolute inset-x-0 bottom-0 px-md pb-md text-white/95 text-body-sm leading-relaxed translate-y-2 opacity-0 transition-all duration-420 ease-emphasized group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none line-clamp-2">
            {photo.caption}
          </figcaption>
        ) : null}

        {error ? (
          <span className="absolute inset-x-sm bottom-sm rounded-md bg-error-container px-sm py-xs text-label-sm font-label-sm text-on-error-container shadow-sm">
            {error}
          </span>
        ) : null}

        <div className="absolute bottom-sm right-sm flex gap-xs translate-y-2 opacity-0 transition-all duration-300 ease-emphasized group-hover:translate-y-0 group-hover:opacity-100">
          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void deletePhoto();
              }}
              onKeyDown={(event) => event.stopPropagation()}
              onMouseLeave={() => {
                if (!deleting) setConfirmDelete(false);
              }}
              disabled={deleting}
              className={`inline-flex items-center gap-xs rounded-full px-sm py-2 text-label-sm font-label-sm backdrop-blur-md shadow-sm ring-1 transition-all duration-200 active:scale-95 disabled:cursor-wait ${
                confirmDelete
                  ? "bg-error text-on-error ring-error/30 hover:bg-error/90"
                  : "bg-white/20 text-white ring-white/20 hover:bg-error/85"
              }`}
              aria-label={confirmDelete ? "确认删除照片" : "删除照片"}
            >
              <Icon
                name={deleting ? "progress_activity" : confirmDelete ? "delete_forever" : "delete"}
                className={`text-[18px] ${deleting ? "animate-spin" : ""}`}
              />
              {confirmDelete ? "确认" : ""}
            </button>
          ) : null}
          <span
            className="bg-white/20 text-white p-2 rounded-full backdrop-blur-md shadow-sm ring-1 ring-white/20"
            aria-hidden
          >
            <Icon name="zoom_in" className="text-[18px]" />
          </span>
        </div>
      </figure>

      {lightbox ? (
        <PhotoLightbox
          photo={photo}
          onClose={() => {
            setLightbox(false);
            setConfirmDelete(false);
          }}
          onDelete={onDelete ? deletePhoto : undefined}
          confirmDelete={confirmDelete}
          deleting={deleting}
          saving={saving}
          saved={saved}
          error={error}
          onSave={savePhoto}
        />
      ) : null}
    </>
  );
}

function PhotoLightbox({
  photo,
  onClose,
  onDelete,
  confirmDelete,
  deleting,
  saving,
  saved,
  error,
  onSave
}: {
  photo: AlbumPhoto;
  onClose: () => void;
  onDelete?: () => void;
  confirmDelete: boolean;
  deleting: boolean;
  saving: boolean;
  saved: boolean;
  error: string;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center dialog-backdrop-in bg-black/80 backdrop-blur-sm p-lg"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="dialog"
      aria-label="照片预览"
    >
      <div
        className="dialog-pop-in relative flex flex-col items-center gap-md max-w-[90vw] max-h-[calc(100vh-4rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-lg bg-black/10 ring-1 ring-white/10 overflow-hidden w-fit h-fit flex items-center justify-center shadow-2xl">
          <img
            src={mediaUrl(photo.src)}
            alt={photo.caption || photo.plantName}
            className="max-w-[85vw] max-h-[72vh] object-contain block"
            onError={(event) => {
              event.currentTarget.src = plantImage(photo.plantId);
            }}
          />
          {/* 操作按钮 — 浮在图片右上角，避免和图片边缘冲突 */}
          <div className="absolute top-md right-md flex gap-sm">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={`group inline-flex items-center gap-xs rounded-full px-md py-2 text-label-sm font-label-sm backdrop-blur-md ring-1 transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-wait ${
                saved
                  ? "bg-primary text-on-primary ring-primary/20"
                  : "bg-white/15 text-white ring-white/25 hover:bg-white/30"
              }`}
              aria-label="保存照片到本地相册"
            >
              <Icon
                name={saving ? "progress_activity" : "save"}
                className={`text-[18px] ${saving ? "animate-spin" : ""}`}
              />
              <span>{saving ? "保存中" : saved ? "已保存" : "保存"}</span>
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className={`group inline-flex items-center gap-xs rounded-full px-md py-2 text-label-sm font-label-sm backdrop-blur-md ring-1 transition-all duration-200 hover:scale-[1.03] active:scale-95 disabled:cursor-wait ${
                  confirmDelete
                    ? "bg-error text-on-error ring-error/20"
                    : "bg-white/15 text-white ring-white/25 hover:bg-error/85"
                }`}
                aria-label={confirmDelete ? "确认删除照片" : "删除照片"}
              >
                <Icon
                  name={deleting ? "progress_activity" : confirmDelete ? "delete_forever" : "delete"}
                  className={`text-[18px] ${deleting ? "animate-spin" : ""}`}
                />
                {confirmDelete ? "再点一次确认" : ""}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-all duration-200 hover:bg-white/30 hover:scale-[1.03] active:scale-95"
              aria-label="关闭预览"
            >
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
        </div>
        {error ? (
          <p className="shrink-0 rounded-md bg-error-container px-md py-sm text-body-sm text-on-error-container">
            {error}
          </p>
        ) : null}
        {photo.caption ? (
          <p className="shrink-0 text-white/85 text-body-md text-center max-w-2xl mx-auto leading-relaxed">
            {photo.caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
