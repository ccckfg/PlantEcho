export const intentionRetryDelayMs = (
  attemptCount: number,
  baseDelayMs: number,
  maxDelayMs: number
): number =>
  Math.min(
    baseDelayMs * 2 ** Math.max(0, attemptCount - 1),
    maxDelayMs
  );
