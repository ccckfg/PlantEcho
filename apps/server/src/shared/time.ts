export const nowIso = (): string => new Date().toISOString();

export const startOfRecentWindow = (hours: number): string => {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
};

export const isoDatePart = (iso: string): string => iso.slice(0, 10);

export const isoTimePart = (iso: string): string => iso.slice(11, 16);

export const daysBetween = (currentIso: string, pastIso: string): number => {
  const current = new Date(currentIso).getTime();
  const past = new Date(pastIso).getTime();
  if (!Number.isFinite(current) || !Number.isFinite(past)) return 0;
  return Math.max(0, (current - past) / 86_400_000);
};

