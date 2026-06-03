import { imageUploadConfig } from "@/config/uploads";

export interface PreparedImageUpload {
  dataUrl: string;
  fileName: string;
  originalBytes: number;
  storedBytes: number;
  wasCompressed: boolean;
}

const readAsDataUrl = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });

const dataUrlByteLength = (dataUrl: string): number => {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片无法压缩，请换一张图片试试"));
    image.src = dataUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图片压缩失败"))),
      mimeType,
      quality
    );
  });

const compressedExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

const compressedFileName = (fileName: string, mimeType: string): string => {
  const extension = compressedExtensions[mimeType] ?? ".jpg";
  return `${fileName.replace(/\.[^.]*$/, "") || "photo"}${extension}`;
};

export const prepareImageUpload = async (file: File): Promise<PreparedImageUpload> => {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > imageUploadConfig.maxSourceBytes) {
    throw new Error(`原图不能超过 ${imageUploadConfig.maxSourceSizeLabel}`);
  }

  const originalDataUrl = await readAsDataUrl(file);
  if (file.size <= imageUploadConfig.maxStoredBytes) {
    return {
      dataUrl: originalDataUrl,
      fileName: file.name,
      originalBytes: file.size,
      storedBytes: dataUrlByteLength(originalDataUrl),
      wasCompressed: false
    };
  }

  const image = await loadImage(originalDataUrl);
  const config = imageUploadConfig.compression;
  const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
  let scale = Math.min(1, config.maxDimension / maxSide);

  while (Math.max(image.naturalWidth, image.naturalHeight) * scale >= config.minDimension) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前环境无法压缩图片");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (
      let quality = config.initialQuality;
      quality >= config.minQuality;
      quality -= config.qualityStep
    ) {
      const blob = await canvasToBlob(canvas, config.targetMimeType, quality);
      if (blob.size <= imageUploadConfig.maxStoredBytes) {
        return {
          dataUrl: await readAsDataUrl(blob),
          fileName: compressedFileName(file.name, blob.type || config.targetMimeType),
          originalBytes: file.size,
          storedBytes: blob.size,
          wasCompressed: true
        };
      }
    }

    scale *= config.scaleStep;
  }

  throw new Error(`图片压缩后仍超过 ${imageUploadConfig.maxStoredSizeLabel}`);
};
