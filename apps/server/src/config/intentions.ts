export const intentionConfig = {
  dayMs: 86_400_000,
  innerExpiryDays: 3,
  agreementExpiryDays: 7,
  importantEpisodeExpiryDays: 7,
  understandingExpiryDays: 7,
  innerQuietMs: 6 * 60 * 60_000,
  agreementQuietMs: 12 * 60 * 60_000,
  importantEpisodeQuietMs: 24 * 60 * 60_000,
  understandingQuietMs: 24 * 60 * 60_000,
  contentMaxChars: 180
} as const;
