export const compact = (text: string): string => text.replace(/\s+/g, " ").trim();

export const tokenize = (text: string): string[] => {
  const normalized = text.toLowerCase();
  const matches = normalized.match(/[a-z0-9]+|[\u4e00-\u9fff]/g) ?? [];
  return [...new Set(matches.filter(Boolean))];
};

export const ftsTerms = (text: string, maxTerms = 32): string[] => {
  const terms = tokenize(text);
  return terms.slice(0, maxTerms);
};

export const ftsDocument = (text: string): string => ftsTerms(text, 512).join(" ");

export const ftsMatchQuery = (text: string): string => {
  const terms = ftsTerms(text);
  return terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" OR ");
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
