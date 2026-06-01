export const jobConfig = {
  pollIntervalMs: 1_000,
  batchSize: 3,
  lockTimeoutMs: 60_000,
  retryBaseDelayMs: 2_000,
  retryMaxDelayMs: 60_000,
  defaultMaxAttempts: 5,
  consolidationMaxAttempts: 5
};
