/**
 * Shared MiniMax protocol helpers.
 *
 * Chat uses MiniMax's OpenAI-compatible endpoint. Embeddings intentionally do
 * not use the OpenAI request shape: MiniMax requires `texts` and `type`.
 */

export const MINIMAX_CHAT_BASE_URL = "https://api.minimaxi.com/v1";
export const MINIMAX_CHAT_MODEL = "MiniMax-M2.7";
export const MINIMAX_EMBEDDING_MODEL = "embo-01";
export const MINIMAX_EMBEDDING_INPUT_TYPES = ["db", "query"] as const;
export type MiniMaxEmbeddingInputType = (typeof MINIMAX_EMBEDDING_INPUT_TYPES)[number];
export const DEFAULT_MINIMAX_EMBEDDING_DIMENSIONS = 1024;
export const MINIMAX_EMBEDDING_SOURCE_DIMENSIONS = 1536;

export type MiniMaxChatConfig = {
  baseUrl: string;
  apiKey: string;
  model: typeof MINIMAX_CHAT_MODEL;
  temperature?: number;
  streamUsage?: boolean;
};

export function getMiniMaxChatConfig(environment: Record<string, string | undefined> = process.env): MiniMaxChatConfig {
  const apiKey = environment.AGENT_API_KEY?.trim();
  if (!apiKey) throw new Error("未配置 AGENT_API_KEY，无法初始化 MiniMax Agent 模型");
  const model = environment.AGENT_MODEL?.trim() || MINIMAX_CHAT_MODEL;
  if (model !== MINIMAX_CHAT_MODEL) {
    throw new Error(`AGENT_MODEL 必须是 ${MINIMAX_CHAT_MODEL}`);
  }
  const rawTemperature = environment.AGENT_TEMPERATURE?.trim();
  const temperature = rawTemperature ? Number(rawTemperature) : 0;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error("AGENT_TEMPERATURE 必须是 0 到 2 之间的数字");
  }
  return {
    baseUrl: environment.AGENT_BASE_URL?.trim() || MINIMAX_CHAT_BASE_URL,
    apiKey,
    model: MINIMAX_CHAT_MODEL,
    temperature,
    streamUsage: environment.AGENT_STREAM_USAGE === "true",
  };
}

/**
 * Stateful filter for MiniMax's `<think>...</think>` blocks.
 *
 * The provider may split either tag over multiple streaming chunks. Text that
 * might be a partial tag is held until the next chunk, while text inside a
 * think block is discarded. An unterminated block is fail-closed on finish.
 */
export class ThinkBlockStripper {
  private buffer = "";
  private insideThink = false;

  push(chunk: string): string {
    if (!chunk) return "";
    this.buffer += chunk;
    return this.drain(false);
  }

  finish(): string {
    return this.drain(true);
  }

  reset(): void {
    this.buffer = "";
    this.insideThink = false;
  }

  private drain(finalChunk: boolean): string {
    let output = "";
    const openTag = "<think>";
    const closeTag = "</think>";

    while (this.buffer.length > 0) {
      const lower = this.buffer.toLowerCase();
      if (this.insideThink) {
        const closeIndex = lower.indexOf(closeTag);
        if (closeIndex >= 0) {
          this.buffer = this.buffer.slice(closeIndex + closeTag.length);
          this.insideThink = false;
          continue;
        }
        if (finalChunk) {
          this.buffer = "";
          break;
        }
        const keep = longestTagPrefixSuffix(lower, closeTag);
        this.buffer = keep === 0 ? "" : this.buffer.slice(-keep);
        break;
      }

      const openIndex = lower.indexOf(openTag);
      if (openIndex >= 0) {
        output += this.buffer.slice(0, openIndex);
        this.buffer = this.buffer.slice(openIndex + openTag.length);
        this.insideThink = true;
        continue;
      }
      if (finalChunk) {
        output += this.buffer;
        this.buffer = "";
        break;
      }
      const keep = longestTagPrefixSuffix(lower, openTag);
      const visibleLength = this.buffer.length - keep;
      if (visibleLength > 0) output += this.buffer.slice(0, visibleLength);
      this.buffer = keep === 0 ? "" : this.buffer.slice(-keep);
      break;
    }
    return output;
  }
}

export const createThinkBlockStripper = (): ThinkBlockStripper => new ThinkBlockStripper();
export const stripThinkingBlocks = stripThinkBlocks;
export const ThinkingStreamFilter = ThinkBlockStripper;

function longestTagPrefixSuffix(value: string, tag: string): number {
  const max = Math.min(value.length, tag.length - 1);
  for (let length = max; length > 0; length -= 1) {
    if (value.endsWith(tag.slice(0, length))) return length;
  }
  return 0;
}

export function stripThinkBlocks(text: string): string {
  const stripper = new ThinkBlockStripper();
  return stripper.push(text) + stripper.finish();
}

export type MiniMaxEmbeddingRequest = {
  model: string;
  texts: string[];
  type: MiniMaxEmbeddingInputType;
};

export type MiniMaxEmbeddingResponse = {
  vectors: unknown;
  base_resp?: { status_code?: unknown; status_msg?: unknown };
};

export type MiniMaxEmbeddingResult = {
  model: string;
  dimensions: number;
  embeddings: number[][];
};

export type MiniMaxEmbeddingClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  fetchImpl?: MiniMaxFetch;
  dimensions?: number;
};

export type MiniMaxFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class MiniMaxEmbeddingError extends Error {
  constructor(message: string, public readonly code: "missing_config" | "http_error" | "provider_error" | "invalid_response") {
    super(message);
    this.name = "MiniMaxEmbeddingError";
  }
}

export function normalizeMiniMaxEmbedding(
  vector: readonly number[],
  dimensions = DEFAULT_MINIMAX_EMBEDDING_DIMENSIONS,
): number[] {
  if (!Number.isInteger(dimensions) || dimensions < 1) {
    throw new MiniMaxEmbeddingError("embedding dimensions 必须是正整数", "invalid_response");
  }
  if (vector.length < dimensions) {
    throw new MiniMaxEmbeddingError(
      `MiniMax embedding 维度不足：需要至少 ${dimensions}，实际 ${vector.length}`,
      "invalid_response",
    );
  }
  const truncated = vector.slice(0, dimensions);
  if (!truncated.every((value) => Number.isFinite(value))) {
    throw new MiniMaxEmbeddingError("MiniMax embedding 含有非有限数字", "invalid_response");
  }
  const norm = Math.sqrt(truncated.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) throw new MiniMaxEmbeddingError("MiniMax embedding 不能是零向量", "invalid_response");
  return truncated.map((value) => value / norm);
}

export const normalizeEmbedding = normalizeMiniMaxEmbedding;

function embeddingEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/embeddings`;
}

export class MiniMaxEmbeddingClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: MiniMaxFetch;
  private readonly dimensions: number;

  constructor(options: MiniMaxEmbeddingClientOptions = {}) {
    this.baseUrl = options.baseUrl?.trim() || process.env.EMBEDDING_BASE_URL?.trim() || MINIMAX_CHAT_BASE_URL;
    this.apiKey = options.apiKey?.trim() || process.env.EMBEDDING_API_KEY?.trim() || "";
    this.model = options.model?.trim() || process.env.EMBEDDING_MODEL?.trim() || MINIMAX_EMBEDDING_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.dimensions = options.dimensions ?? DEFAULT_MINIMAX_EMBEDDING_DIMENSIONS;
  }

  async embedTexts(texts: readonly string[], type: MiniMaxEmbeddingInputType): Promise<number[][]> {
    if (!this.apiKey) throw new MiniMaxEmbeddingError("未配置 EMBEDDING_API_KEY", "missing_config");
    if (!MINIMAX_EMBEDDING_INPUT_TYPES.includes(type)) {
      throw new MiniMaxEmbeddingError(`embedding type 不合法：${String(type)}`, "invalid_response");
    }
    if (texts.length === 0) return [];
    if (texts.some((text) => typeof text !== "string")) {
      throw new MiniMaxEmbeddingError("embedding texts 必须全部是字符串", "invalid_response");
    }

    const request: MiniMaxEmbeddingRequest = { model: this.model, texts: [...texts], type };
    let response: Response;
    try {
      response = await this.fetchImpl(embeddingEndpoint(this.baseUrl), {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      throw new MiniMaxEmbeddingError(
        `MiniMax embedding 请求失败：${error instanceof Error ? error.message : String(error)}`,
        "http_error",
      );
    }
    const body = (await response.json().catch(() => null)) as MiniMaxEmbeddingResponse | null;
    if (!response.ok) {
      throw new MiniMaxEmbeddingError(`MiniMax embedding HTTP ${response.status}`, "http_error");
    }
    if (body?.base_resp?.status_code !== 0) {
      throw new MiniMaxEmbeddingError(
        `MiniMax embedding base_resp.status_code=${String(body?.base_resp?.status_code)}`,
        "provider_error",
      );
    }
    if (!Array.isArray(body?.vectors) || body.vectors.length !== texts.length) {
      throw new MiniMaxEmbeddingError("MiniMax embedding vectors 数量与 texts 不一致", "invalid_response");
    }
    return body.vectors.map((vector) => {
      if (!Array.isArray(vector)) {
        throw new MiniMaxEmbeddingError("MiniMax embedding vector 格式不合法", "invalid_response");
      }
      return normalizeMiniMaxEmbedding(vector as number[], this.dimensions);
    });
  }

  async embedTextsDetailed(
    texts: readonly string[],
    type: MiniMaxEmbeddingInputType,
  ): Promise<MiniMaxEmbeddingResult> {
    const embeddings = await this.embedTexts(texts, type);
    return { model: this.model, dimensions: this.dimensions, embeddings };
  }

  embed(texts: readonly string[], type: MiniMaxEmbeddingInputType): Promise<number[][]> {
    return this.embedTexts(texts, type);
  }

  embedDocuments(texts: readonly string[]): Promise<number[][]> {
    return this.embedTexts(texts, "db");
  }

  embedQueries(texts: readonly string[]): Promise<number[][]> {
    return this.embedTexts(texts, "query");
  }
}

export function createMiniMaxEmbeddingClient(options: MiniMaxEmbeddingClientOptions = {}): MiniMaxEmbeddingClient {
  return new MiniMaxEmbeddingClient(options);
}

export const createEmbeddingClient = createMiniMaxEmbeddingClient;

export async function embedTexts(
  texts: readonly string[],
  type: MiniMaxEmbeddingInputType,
  options: MiniMaxEmbeddingClientOptions = {},
): Promise<number[][]> {
  return createMiniMaxEmbeddingClient(options).embedTexts(texts, type);
}

export function embedDocuments(
  texts: readonly string[],
  options: MiniMaxEmbeddingClientOptions = {},
): Promise<number[][]> {
  return embedTexts(texts, "db", options);
}

export function embedQueries(
  texts: readonly string[],
  options: MiniMaxEmbeddingClientOptions = {},
): Promise<number[][]> {
  return embedTexts(texts, "query", options);
}
