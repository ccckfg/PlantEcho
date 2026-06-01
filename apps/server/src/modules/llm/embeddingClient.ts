import { env } from "../../config/env.js";

type EmbeddingProvider = "openai-compatible" | "dashscope";

const normalizeProvider = (): EmbeddingProvider => {
  const provider = env.EMBEDDING_PROVIDER.trim().toLowerCase();
  if (provider === "dashscope" || provider === "qwen" || provider === "qwen-dashscope") {
    return "dashscope";
  }
  return "openai-compatible";
};

const openAiCompatibleEmbeddingsUrl = (): string => {
  const base = (env.EMBEDDING_API_URL || env.LLM_API_URL).replace(/\/$/, "");
  if (!base) return "";
  return base.endsWith("/embeddings") ? base : `${base}/embeddings`;
};

const dashScopeEmbeddingsUrl = (): string => {
  const base = (env.EMBEDDING_API_URL || "https://dashscope-intl.aliyuncs.com/api/v1")
    .replace(/\/$/, "");
  if (base.endsWith("/services/embeddings/text-embedding/text-embedding")) {
    return base;
  }
  return `${base}/services/embeddings/text-embedding/text-embedding`;
};

const embeddingsUrl = (): string =>
  normalizeProvider() === "dashscope" ? dashScopeEmbeddingsUrl() : openAiCompatibleEmbeddingsUrl();

const embeddingKey = (): string => env.EMBEDDING_API_KEY || env.LLM_API_KEY;

const maxEmbeddingBatchSize = (): number => normalizeProvider() === "dashscope" ? 10 : 100;

export const isEmbeddingConfigured = (): boolean => {
  return Boolean(embeddingsUrl() && embeddingKey() && env.EMBEDDING_MODEL_ID);
};

export const embeddingConfig = () => ({
  provider: normalizeProvider(),
  model: env.EMBEDDING_MODEL_ID,
  dimensions: env.EMBEDDING_DIMENSIONS ?? null
});

const embedOpenAiCompatible = async (texts: string[]): Promise<number[][] | null> => {
  const body: Record<string, unknown> = {
    model: env.EMBEDDING_MODEL_ID,
    input: texts
  };
  if (env.EMBEDDING_DIMENSIONS) body.dimensions = env.EMBEDDING_DIMENSIONS;
  const response = await fetch(openAiCompatibleEmbeddingsUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${embeddingKey()}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };
  const data = [...(json.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const embeddings = data.map((item) => item.embedding ?? []);
  return embeddings.length === texts.length ? embeddings : null;
};

const embedDashScope = async (texts: string[]): Promise<number[][] | null> => {
  const body: Record<string, unknown> = {
    model: env.EMBEDDING_MODEL_ID,
    input: { texts },
    parameters: {
      output_type: "dense",
      ...(env.EMBEDDING_DIMENSIONS ? { dimension: env.EMBEDDING_DIMENSIONS } : {})
    }
  };
  const response = await fetch(dashScopeEmbeddingsUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${embeddingKey()}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as {
    output?: {
      embeddings?: Array<{ embedding?: number[]; text_index?: number; index?: number }>;
    };
  };
  const data = [...(json.output?.embeddings ?? [])].sort((a, b) => {
    const left = a.text_index ?? a.index ?? 0;
    const right = b.text_index ?? b.index ?? 0;
    return left - right;
  });
  const embeddings = data.map((item) => item.embedding ?? []);
  return embeddings.length === texts.length ? embeddings : null;
};

export const embedTexts = async (texts: string[]): Promise<number[][] | null> => {
  if (!texts.length) return [];
  if (!isEmbeddingConfigured()) return null;
  const batchSize = maxEmbeddingBatchSize();
  if (texts.length > batchSize) {
    const batches: number[][] = [];
    for (let index = 0; index < texts.length; index += batchSize) {
      const batch = await embedTexts(texts.slice(index, index + batchSize));
      if (!batch) return null;
      batches.push(...batch);
    }
    return batches;
  }
  return normalizeProvider() === "dashscope"
    ? embedDashScope(texts)
    : embedOpenAiCompatible(texts);
};
