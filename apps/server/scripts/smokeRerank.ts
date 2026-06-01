import { env } from "../src/config/env.js";
import { isRerankConfigured, rerankDocuments } from "../src/modules/llm/rerankClient.js";

const documents = [
  { id: "east-window", text: "今天主人把我从客厅移到了东窗边，这是一次位置变化。" },
  { id: "dry-soil", text: "土壤湿度偏低，需要提醒主人观察是否该浇水。" },
  { id: "temperature", text: "主人询问当前温度是否偏高，以及植物今天状态怎么样。" }
];

if (!isRerankConfigured()) {
  throw new Error("Rerank is not configured. Set LLM_API_URL/LLM_API_KEY or RERANK_*.");
}

console.log(`Smoke rerank: model=${env.RERANK_MODEL_ID} url=${env.RERANK_API_URL}`);

const scores = await rerankDocuments(
  "植物被搬到东窗边，位置发生了变化",
  documents,
  documents.length
);

if (!scores?.length) throw new Error("Rerank returned no scores");

const top = scores[0];
console.log(`Top result: ${top.id} score=${top.score}`);
if (top.id !== "east-window") {
  throw new Error(`Expected east-window to rank first, got ${top.id}`);
}

console.log("Rerank smoke complete.");
