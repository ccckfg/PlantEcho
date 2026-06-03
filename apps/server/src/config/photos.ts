const maxStoredImageBytes = 5 * 1024 * 1024;

export const photoConfig = {
  maxStoredImageBytes,
  maxStoredImageSizeLabel: "5MB",
  uploadBodyLimitBytes: maxStoredImageBytes * 2
};
