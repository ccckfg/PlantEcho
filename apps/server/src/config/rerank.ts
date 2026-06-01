export const defaultRerankApiUrl = "https://api.siliconflow.com/v1/rerank";
export const defaultRerankModelId = "Qwen/Qwen3-Reranker-8B";

export const rerankUrlFromBase = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return defaultRerankApiUrl;
  if (/\/rerank$/i.test(trimmed)) return trimmed;
  const base = trimmed.replace(/\/chat\/completions$/i, "").replace(/\/embeddings$/i, "");
  return `${base}/rerank`;
};
