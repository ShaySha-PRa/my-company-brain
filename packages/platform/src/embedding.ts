export type MiniMaxEmbeddingType = "db" | "query";

export type MiniMaxEmbeddingOptions = {
  baseUrl: string;
  apiKey: string;
  model?: string;
  type: MiniMaxEmbeddingType;
  dimensions?: number;
  signal?: AbortSignal;
};

type MiniMaxEmbeddingResponse = {
  vectors?: unknown;
  base_resp?: { status_code?: unknown; status_msg?: unknown };
};

/** Return the constitution's fixed MRL(1024)+L2 representation. */
export function normalizeMiniMaxEmbedding(vector: unknown, dimensions = 1024): number[] {
  if (!Array.isArray(vector) || vector.length < dimensions) {
    throw new Error(`MiniMax embedding must contain at least ${dimensions} dimensions`);
  }
  const truncated = vector.slice(0, dimensions).map((value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("MiniMax embedding contains a non-finite value");
    return value;
  });
  const norm = Math.hypot(...truncated);
  if (!Number.isFinite(norm) || norm === 0) throw new Error("MiniMax embedding has zero norm");
  return truncated.map((value) => value / norm);
}

/** Call MiniMax's native embeddings endpoint; it is not OpenAI-compatible. */
export async function embedMiniMaxTexts(texts: readonly string[], options: MiniMaxEmbeddingOptions): Promise<number[][]> {
  if (texts.length === 0) return [];
  const dimensions = options.dimensions ?? 1024;
  if (!Number.isInteger(dimensions) || dimensions < 1) throw new Error("embedding dimensions must be a positive integer");
  const endpoint = `${options.baseUrl.replace(/\/+$/, "")}/embeddings`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${options.apiKey}` },
    body: JSON.stringify({ model: options.model ?? "embo-01", texts: [...texts], type: options.type }),
    signal: options.signal,
  });
  const payload = await response.json().catch(() => null) as MiniMaxEmbeddingResponse | null;
  if (!response.ok) throw new Error(`MiniMax embedding HTTP ${response.status}`);
  if (payload?.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax embedding failed: ${String(payload?.base_resp?.status_msg ?? "unknown error")}`);
  }
  if (!Array.isArray(payload?.vectors) || payload.vectors.length !== texts.length) {
    throw new Error("MiniMax embedding response vector count mismatch");
  }
  return payload.vectors.map((vector) => normalizeMiniMaxEmbedding(vector, dimensions));
}
