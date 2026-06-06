import type { MemoryCitation } from "@dyn/shared";
import type { RetrievedMemory } from "../memory/retrieval/retrievalService.js";

const directMemoryIntent = /(记得|记忆|之前|上次|刚才|说过|还记得|为什么这么说)/;
const statusOnlyIntent = /(状态|读数|湿度|光照|温度|缺水|晒|热|冷|健康|怎么样)/;
const memoryCues = [
  "我记得你之前说过",
  "我记得你上次说过",
  "我也会参考之前",
  "我还记得",
  "我记得",
  "你之前",
  "你上次",
  "之前你",
  "上次你",
  "你曾经",
  "你说过",
  "你提到"
] as const;
const memoryCue = new RegExp(memoryCues.join("|"));
const allMemoryCues = new RegExp(memoryCues.join("|"), "g");
const maxMemoryCueLength = Math.max(...memoryCues.map((cue) => Array.from(cue).length));

const memoryCuePrefixTailLength = (text: string): number => {
  const chars = Array.from(text);
  const maxLength = Math.min(chars.length, maxMemoryCueLength);
  for (let length = maxLength; length > 0; length -= 1) {
    const suffix = chars.slice(-length).join("");
    if (memoryCues.some((cue) => cue.startsWith(suffix))) return length;
  }
  return 0;
};

const strongRelevance = 0.72;
const intentRelevance = 0.55;

export const shouldOfferMemory = (userMessage: string, item: RetrievedMemory): boolean => {
  if (item.relevance >= strongRelevance && !statusOnlyIntent.test(userMessage)) return true;
  return directMemoryIntent.test(userMessage) && item.relevance >= intentRelevance;
};

export const memoryCitationsForPrompt = (
  userMessage: string,
  memories: RetrievedMemory[]
): MemoryCitation[] => {
  return memories
    .filter((item) => shouldOfferMemory(userMessage, item))
    .slice(0, 1)
    .map(({ memory, relevance }) => ({
      id: memory.id,
      title: memory.title,
      date: memory.date,
      relevance
    }));
};

export const memoriesAllowedForPrompt = (
  memories: RetrievedMemory[],
  offered: MemoryCitation[]
): RetrievedMemory[] => {
  const offeredIds = new Set(offered.map((item) => item.id));
  return memories.filter((item) => offeredIds.has(item.memory.id));
};

export const citationsUsedByReply = (
  reply: string,
  offered: MemoryCitation[]
): MemoryCitation[] => {
  if (!offered.length || !memoryCue.test(reply)) return [];
  return offered.slice(0, 1);
};

export const repairUnsupportedMemoryClaim = (
  reply: string,
  offered: MemoryCitation[]
): string => {
  if (!memoryCue.test(reply) || offered.length) return reply;
  return reply.replace(allMemoryCues, "按你刚才说的");
};

export class UnsupportedMemoryClaimFilter {
  private buffer = "";

  constructor(private readonly offered: MemoryCitation[]) {}

  feed(chunk: string): string {
    if (this.offered.length) return chunk;
    this.buffer += chunk;
    const chars = Array.from(this.buffer);
    const tailLength = memoryCuePrefixTailLength(this.buffer);
    const safeLength = chars.length - tailLength;
    const visible = repairUnsupportedMemoryClaim(
      chars.slice(0, safeLength).join(""),
      this.offered
    );
    this.buffer = chars.slice(safeLength).join("");
    return visible;
  }

  finish(): string {
    const visible = repairUnsupportedMemoryClaim(this.buffer, this.offered);
    this.buffer = "";
    return visible;
  }
}
