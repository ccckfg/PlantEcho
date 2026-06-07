export const getClientTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || undefined;
  } catch {
    return undefined;
  }
};
