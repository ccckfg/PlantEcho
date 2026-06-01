import type { EpisodeMemory, Understanding } from "@dyn/shared";
import {
  appHeaders,
  baseUrl,
  expectStatus,
  fetchJson,
  smokeDefaults,
  waitFor
} from "./smokeSupport.js";

interface ChatTurn {
  turn: number;
  reply: string;
  usedLlm: boolean;
  llmError?: string;
}

const plantId = smokeDefaults.plantId;
const marker = process.env.SMOKE_MARKER ?? `smoke-memory-${Date.now()}`;
const timeoutMs = Number(process.env.SMOKE_MEMORY_TIMEOUT_MS ?? 60_000);

const pathFor = (suffix: string): string =>
  `/api/v1/plants/${encodeURIComponent(plantId)}${suffix}`;

const sendChat = async (content: string): Promise<ChatTurn> => {
  const { response, body } = await fetchJson<ChatTurn>(pathFor("/chat"), {
    method: "POST",
    headers: appHeaders(),
    body: JSON.stringify({ content })
  });
  expectStatus(`chat turn ${body.turn ?? "?"}`, response.status, 200);
  if (!body.usedLlm) {
    throw new Error(
      `Memory chat smoke requires a working LLM. Chat used fallback: ${body.llmError ?? "unknown error"}`
    );
  }
  return body;
};

const listMemories = async (): Promise<EpisodeMemory[]> => {
  const { response, body } = await fetchJson<{ memories: EpisodeMemory[] }>(
    pathFor("/memories"),
    { headers: appHeaders() }
  );
  expectStatus("list memories", response.status, 200);
  return body.memories;
};

const listUnderstandings = async (): Promise<Understanding[]> => {
  const { response, body } = await fetchJson<{ understandings: Understanding[] }>(
    pathFor("/understandings"),
    { headers: appHeaders() }
  );
  expectStatus("list understandings", response.status, 200);
  return body.understandings;
};

const memoryIncludesMarker = (memory: EpisodeMemory): boolean => {
  const text = [
    memory.title,
    memory.content,
    memory.rawDialogue,
    JSON.stringify(memory.keywords)
  ].join("\n");
  return text.includes(marker);
};

const main = async (): Promise<void> => {
  console.log(`Smoke memory chat: plant=${plantId} marker=${marker} -> ${baseUrl}`);

  const before = await listMemories();
  console.log(`Initial memories: ${before.length}`);

  await sendChat(
    `烟测标记 ${marker}：今天我把你从客厅移到了东窗边，这是一次记忆测试。`
  );
  await sendChat(`关于 ${marker} 的搬动安排已经说完了，请记住东窗边这个位置。`);
  await sendChat("现在换个话题：按当前读数看，你今天状态怎么样？");

  const memory = await waitFor(
    "memory containing smoke marker",
    async () => {
      const memories = await listMemories();
      return memories.find(memoryIncludesMarker) ?? null;
    },
    { timeoutMs, intervalMs: 2_000 }
  );

  const understandings = await listUnderstandings();
  console.log(`OK memory created: ${memory.title} (${memory.id})`);
  console.log(`Understandings available: ${understandings.length}`);
  console.log("Memory chat smoke complete.");
};

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
