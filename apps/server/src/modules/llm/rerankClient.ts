import { env } from "../../config/env.js";

export interface RerankDocument {
  id: string;
  text: string;
}

export interface RerankScore {
  id: string;
  score: number;
}

type RawRerankResult = {
  index?: number;
  relevance_score?: number;
  relevanceScore?: number;
  score?: number;
};

type RawRerankResponse = {
  results?: RawRerankResult[];
  output?: {
    results?: RawRerankResult[];
  };
};

export const isRerankConfigured = (): boolean => {
  return Boolean(env.RERANK_API_URL && env.RERANK_API_KEY && env.RERANK_MODEL_ID);
};

export const parseRerankScores = (
  json: RawRerankResponse,
  documents: RerankDocument[]
): RerankScore[] => {
  const results = json.results ?? json.output?.results ?? [];
  return results
    .map((item) => {
      const index = item.index ?? -1;
      const doc = documents[index];
      if (!doc) return null;
      return {
        id: doc.id,
        score: item.relevance_score ?? item.relevanceScore ?? item.score ?? 0
      };
    })
    .filter((item): item is RerankScore => item !== null);
};

export const rerankDocuments = async (
  query: string,
  documents: RerankDocument[],
  topN: number
): Promise<RerankScore[] | null> => {
  if (!documents.length || !isRerankConfigured()) return null;
  const response = await fetch(env.RERANK_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RERANK_API_KEY}`
    },
    body: JSON.stringify({
      model: env.RERANK_MODEL_ID,
      query,
      documents: documents.map((item) => item.text),
      top_n: topN,
      return_documents: false
    })
  });
  if (!response.ok) {
    throw new Error(`Rerank request failed: ${response.status} ${await response.text()}`);
  }
  return parseRerankScores((await response.json()) as RawRerankResponse, documents);
};
