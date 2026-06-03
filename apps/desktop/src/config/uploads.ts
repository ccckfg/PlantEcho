export const imageUploadConfig = {
  accept: "image/*",
  maxStoredBytes: 5 * 1024 * 1024,
  maxStoredSizeLabel: "5MB",
  maxSourceBytes: 25 * 1024 * 1024,
  maxSourceSizeLabel: "25MB",
  compression: {
    targetMimeType: "image/webp",
    initialQuality: 0.86,
    minQuality: 0.52,
    qualityStep: 0.08,
    maxDimension: 2200,
    minDimension: 640,
    scaleStep: 0.82
  }
};
