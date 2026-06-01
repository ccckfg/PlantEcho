type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  cachedAt: string;
};

const cache = new Map<string, CacheEntry<unknown>>();

export const getCached = <T>(key: string): { value: T; cachedAt: string } | null => {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry || entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return { value: entry.value, cachedAt: entry.cachedAt };
};

export const setCached = <T>(key: string, value: T, ttlSeconds: number): { value: T; cachedAt: string } => {
  const cachedAt = new Date().toISOString();
  cache.set(key, {
    value,
    cachedAt,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
  return { value, cachedAt };
};
