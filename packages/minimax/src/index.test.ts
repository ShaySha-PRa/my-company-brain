import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MINIMAX_EMBEDDING_DIMENSIONS,
  MiniMaxEmbeddingClient,
  ThinkBlockStripper,
  normalizeMiniMaxEmbedding,
  stripThinkBlocks,
} from "./index.ts";

describe("@mcb/minimax", () => {
  test("strips think blocks when opening and closing tags cross chunks", () => {
    const stripper = new ThinkBlockStripper();

    expect(stripper.push("答案<thi")).toBe("答案");
    expect(stripper.push("nk>内部推理</thin")).toBe("");
    expect(stripper.push("k>结论")).toBe("结论");
    expect(stripper.finish()).toBe("");
  });

  test("drops an unterminated think block without dropping preceding text", () => {
    expect(stripThinkBlocks("前言<think>不可展示")).toBe("前言");
  });

  test("removes think blocks before structured JSON parsing", () => {
    const raw = '<think>{"invalid":true}</think>{"answer":"可见"}';
    expect(stripThinkBlocks(raw)).toBe('{"answer":"可见"}');
  });

  test("normalizes a 1536-dimensional vector to 1024 dimensions", () => {
    const vector = Array.from({ length: 1536 }, (_, index) => index + 1);
    const normalized = normalizeMiniMaxEmbedding(vector);

    expect(normalized).toHaveLength(DEFAULT_MINIMAX_EMBEDDING_DIMENSIONS);
    expect(Math.hypot(...normalized)).toBeCloseTo(1, 10);
    expect(normalized[0]).toBeCloseTo(1 / Math.sqrt(1024 * 1025 * 2049 / 6), 10);
  });

  test("uses MiniMax native embedding fields and preserves batch order", async () => {
    const requests: Request[] = [];
    const client = new MiniMaxEmbeddingClient({
      baseUrl: "https://embedding.example/v1",
      apiKey: "secret",
      fetchImpl: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        const body = (await request.clone().json()) as Record<string, unknown>;
        expect(body).toEqual({ model: "embo-01", texts: ["一", "二"], type: "query" });
        expect(body).not.toHaveProperty("input");
        return new Response(
          JSON.stringify({
            vectors: [
              Array.from({ length: 1536 }, () => 1),
              Array.from({ length: 1536 }, (_, index) => index + 1),
            ],
            base_resp: { status_code: 0 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    const vectors = await client.embedTexts(["一", "二"], "query");
    expect(requests).toHaveLength(1);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).not.toEqual(vectors[1]);
    expect(vectors.every((vector) => vector.length === 1024)).toBe(true);
  });

  test("rejects a non-zero MiniMax base response status", async () => {
    const client = new MiniMaxEmbeddingClient({
      apiKey: "secret",
      fetchImpl: async () =>
        new Response(JSON.stringify({ vectors: [], base_resp: { status_code: 1001 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });

    await expect(client.embedTexts(["文本"], "db")).rejects.toThrow("status_code");
  });
});
