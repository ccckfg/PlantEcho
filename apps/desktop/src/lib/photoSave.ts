import { mediaUrl } from "./api";
import type { AlbumPhoto } from "@/components/album/PhotoCard";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

const safeName = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "photo";

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });

const downloadInBrowser = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

const shareOnAndroid = async (blob: Blob, fileName: string): Promise<boolean> => {
  if (!/android/i.test(navigator.userAgent)) return false;
  if (!navigator.share || typeof File === "undefined") return false;
  const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
  if (navigator.canShare && !navigator.canShare({ files: [file] })) return false;
  await navigator.share({
    files: [file],
    title: "保存 PlantEcho 照片"
  });
  return true;
};

const buildPhotoFileName = (photo: AlbumPhoto, mimeType: string): string => {
  const extension = MIME_EXTENSION[mimeType] ?? "jpg";
  const date = Number.isNaN(Date.parse(photo.capturedAt))
    ? new Date()
    : new Date(photo.capturedAt);
  const stamp = date.toISOString().slice(0, 10);
  return `${safeName(photo.plantName)}-${stamp}-${safeName(photo.id)}.${extension}`;
};

export const savePhotoToLocalAlbum = async (photo: AlbumPhoto): Promise<string> => {
  const response = await fetch(mediaUrl(photo.src));
  if (!response.ok) throw new Error(`图片读取失败：HTTP ${response.status}`);
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";
  const fileName = buildPhotoFileName(photo, mimeType);

  if (await shareOnAndroid(blob, fileName)) {
    return "已打开安卓系统保存菜单";
  }

  if (!window.__TAURI_INTERNALS__) {
    downloadInBrowser(blob, fileName);
    return "已下载到浏览器默认下载目录";
  }

  const dataUrl = await blobToDataUrl(blob);
  const dataBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] ?? "" : dataUrl;
  const { invoke } = await import("@tauri-apps/api/core");
  return await invoke<string>("save_photo_to_gallery", {
    fileName,
    mimeType,
    dataBase64
  });
};
