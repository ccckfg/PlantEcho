import { getApiConnection } from "@/lib/api";

export const PROACTIVE_UNREAD_EVENT = "dyn:proactive-unread";

const storageKey = (): string => {
  const connection = getApiConnection();
  const scope = connection
    ? `${connection.baseUrl}:${connection.user.id}`
    : "anonymous";
  return `dyn.proactive.unread.v1:${scope}`;
};

export const readProactiveUnread = (): Set<string> => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) ?? "[]") as unknown;
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
        : []
    );
  } catch {
    return new Set();
  }
};

const persist = (plantIds: Set<string>): void => {
  window.localStorage.setItem(storageKey(), JSON.stringify([...plantIds]));
  window.dispatchEvent(new CustomEvent(PROACTIVE_UNREAD_EVENT));
};

export const markProactiveUnread = (plantId: string): void => {
  const unread = readProactiveUnread();
  if (unread.has(plantId)) return;
  unread.add(plantId);
  persist(unread);
};

export const markProactiveRead = (plantId: string): void => {
  const unread = readProactiveUnread();
  if (!unread.delete(plantId)) return;
  persist(unread);
};
