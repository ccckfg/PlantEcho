import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../src/config/env.js";
import { memoryConfig } from "../src/config/memory.js";
import { migrate } from "../src/db/migrate.js";
import { closeDb } from "../src/db/connection.js";
import { createPlant } from "../src/modules/plants/plantRepository.js";
import {
  addEpisodeMemory,
  getEpisodeMemory
} from "../src/modules/memory/repositories/memoryRepository.js";
import { episodeBm25Candidates } from "../src/modules/memory/retrieval/bm25.js";
import { hybridFusion, type FusionInput } from "../src/modules/memory/retrieval/fusion.js";
import {
  ensureVectorIndexForPlant,
  getVectorCandidates
} from "../src/modules/memory/retrieval/vectorIndex.js";
import { distanceToRelevance } from "../src/modules/memory/retrieval/scorer.js";
import { isRerankConfigured, rerankDocuments } from "../src/modules/llm/rerankClient.js";
import type { EpisodeMemory } from "@dyn/shared";
import { distractors, queries, targetMemories, type QueryFixture } from "./retrievalEvalFixtures.js";

interface RankedItem {
  id: string;
  label: string;
  title: string;
  score: number;
}

const today = new Date().toISOString().slice(0, 10);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const reportPath = process.env.RETRIEVAL_REPORT_PATH ??
  path.resolve(repoRoot, "docs/reports", `retrieval-quality-${today.replace(/-/g, "")}.md`);

type Method = "bm25" | "vector" | "hybrid" | "rerank";

const insertFixtures = (plantId: string): Map<string, EpisodeMemory> => {
  const map = new Map<string, EpisodeMemory>();
  [...targetMemories, ...distractors].forEach((item, index) => {
    const memory = addEpisodeMemory({
      plantId,
      date: "2026-05-20",
      time: `${String(8 + (index % 12)).padStart(2, "0")}:00`,
      location: "书桌旁",
      participants: "主人",
      title: item.title,
      content: item.content,
      keywords: item.keywords,
      importance: item.importance,
      sourceType: "eval:retrieval",
      rawDialogue: `[turn=${index + 1}] 主人: ${item.content}`,
      rawPayload: { label: item.label }
    });
    map.set(item.label, memory);
  });
  return map;
};

const bm25Rank = (plantId: string, query: string): RankedItem[] =>
  episodeBm25Candidates(plantId, query).map((item) => ({
    id: item.id,
    label: "",
    title: item.title,
    score: item.score
  }));

const vectorRank = async (plantId: string, query: string): Promise<RankedItem[]> => {
  await ensureVectorIndexForPlant(plantId);
  const rows = await getVectorCandidates(plantId, "episode", query, 15);
  return rows.map((item) => {
    const memory = getEpisodeMemory(item.targetId)!;
    return {
      id: memory.id,
      label: String(memory.rawPayload.label ?? ""),
      title: memory.title,
      score: distanceToRelevance(item.distance)
    };
  });
};

const fusionInputs = async (plantId: string, query: string): Promise<FusionInput[]> => {
  await ensureVectorIndexForPlant(plantId);
  const map = new Map<string, FusionInput>();
  for (const item of await getVectorCandidates(plantId, "episode", query, 15)) {
    const memory = getEpisodeMemory(item.targetId);
    if (!memory) continue;
    map.set(memory.id, {
      id: memory.id,
      content: [memory.title, memory.content].join("\n"),
      vectorDistance: item.distance,
      metadata: { memory }
    });
  }
  for (const item of episodeBm25Candidates(plantId, query)) {
    const memory = getEpisodeMemory(item.id);
    if (!memory) continue;
    const existing = map.get(memory.id);
    map.set(memory.id, {
      id: memory.id,
      content: [memory.title, memory.content].join("\n"),
      vectorDistance: existing?.vectorDistance,
      bm25Raw: item.score,
      metadata: { memory }
    });
  }
  return [...map.values()];
};

const hybridRank = async (plantId: string, query: string): Promise<RankedItem[]> => {
  return hybridFusion(await fusionInputs(plantId, query), true).map((item) => {
    const memory = item.metadata.memory as EpisodeMemory;
    return {
      id: memory.id,
      label: String(memory.rawPayload.label ?? ""),
      title: memory.title,
      score: item.relevance
    };
  });
};

const rerankRank = async (plantId: string, query: string): Promise<RankedItem[]> => {
  const fused = hybridFusion(await fusionInputs(plantId, query), true);
  const top = fused.slice(0, memoryConfig.rerankTopN);
  const scores = await rerankDocuments(
    query,
    top.map((item) => ({ id: item.id, text: item.content })),
    memoryConfig.rerankTopN
  );
  if (!scores?.length) return hybridRank(plantId, query);
  const scoreById = new Map(scores.map((item) => [item.id, item.score]));
  return top
    .filter((item) => scoreById.has(item.id))
    .map((item) => {
      const memory = item.metadata.memory as EpisodeMemory;
      return {
        id: memory.id,
        label: String(memory.rawPayload.label ?? ""),
        title: memory.title,
        score: scoreById.get(item.id)!
      };
    })
    .sort((a, b) => b.score - a.score);
};

const rankers: Record<Method, (plantId: string, query: string) => Promise<RankedItem[]> | RankedItem[]> = {
  bm25: bm25Rank,
  vector: vectorRank,
  hybrid: hybridRank,
  rerank: rerankRank
};

const summarize = (rows: Array<{ rank: number | null }>) => {
  const total = rows.length;
  const hitAt = (k: number) => rows.filter((row) => row.rank !== null && row.rank <= k).length / total;
  const mrr = rows.reduce((sum, row) => sum + (row.rank ? 1 / row.rank : 0), 0) / total;
  return { top1: hitAt(1), top3: hitAt(3), top5: hitAt(5), mrr };
};

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const main = async (): Promise<void> => {
  migrate();
  if (!isRerankConfigured()) throw new Error("Rerank is not configured");
  const plant = createPlant({
    name: "评估绿萝",
    species: "绿萝",
    location: "评估书桌"
  });
  const labelToMemory = insertFixtures(plant.id);
  await ensureVectorIndexForPlant(plant.id);

  const details: Record<Method, Array<{
    query: QueryFixture;
    rank: number | null;
    top: RankedItem[];
  }>> = { bm25: [], vector: [], hybrid: [], rerank: [] };

  for (const query of queries) {
    const expected = labelToMemory.get(query.expected)!;
    for (const method of Object.keys(rankers) as Method[]) {
      const ranked = await rankers[method](plant.id, query.text);
      const rank = ranked.findIndex((item) => item.id === expected.id);
      details[method].push({
        query,
        rank: rank >= 0 ? rank + 1 : null,
        top: ranked.slice(0, 5).map((item) => ({
          ...item,
          label: item.label || String(getEpisodeMemory(item.id)?.rawPayload.label ?? "")
        }))
      });
    }
  }

  const metrics = (Object.keys(details) as Method[]).map((method) => ({
    method,
    ...summarize(details[method])
  }));
  const misses = details.rerank.filter((row) => row.rank === null || row.rank > 3);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const lines = [
    "# 记忆检索质量评估报告",
    "",
    `- 日期：${new Date().toLocaleString("zh-CN")}`,
    `- 数据库：${env.databasePath}`,
    `- 记忆数量：${targetMemories.length + distractors.length}（目标 ${targetMemories.length}，干扰 ${distractors.length}）`,
    `- 查询数量：${queries.length}`,
    `- Embedding：${env.EMBEDDING_MODEL_ID || "未配置"}`,
    `- Rerank：${env.RERANK_MODEL_ID} @ ${env.RERANK_API_URL}`,
    "",
    "## 总体指标",
    "",
    "| 方法 | Top-1 | Top-3 | Top-5 | MRR |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...metrics.map((item) =>
      `| ${item.method} | ${pct(item.top1)} | ${pct(item.top3)} | ${pct(item.top5)} | ${item.mrr.toFixed(3)} |`
    ),
    "",
    "## Rerank 明细",
    "",
    "| 查询 | 期望记忆 | Rank | Top 3 |",
    "| --- | --- | ---: | --- |",
    ...details.rerank.map((row) =>
      `| ${row.query.text} | ${row.query.expected} | ${row.rank ?? "miss"} | ${row.top.slice(0, 3).map((item) => `${item.label}:${item.title}`).join("<br>")} |`
    ),
    "",
    "## 需要关注的失败/弱项",
    "",
    misses.length
      ? misses.map((row) => `- ${row.query.id}：期望 ${row.query.expected}，rank=${row.rank ?? "miss"}，Top3=${row.top.slice(0, 3).map((item) => item.label).join(", ")}`).join("\n")
      : "- Rerank Top-3 无失败项。",
    "",
    "## 结论",
    "",
    "本次评估使用真实 embedding、sqlite-vec、FTS5/BM25、Qwen rerank 链路。Top-K 指标越高，说明聊天上下文越可能拿到正确长期记忆。"
  ];
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report written: ${reportPath}`);
  metrics.forEach((item) => {
    console.log(`${item.method}: Top1=${pct(item.top1)} Top3=${pct(item.top3)} MRR=${item.mrr.toFixed(3)}`);
  });
  closeDb();
};

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  closeDb();
  process.exitCode = 1;
});
