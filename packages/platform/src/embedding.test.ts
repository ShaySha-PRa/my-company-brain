import { describe, expect, test } from "bun:test";
import { embedMiniMaxTexts, normalizeMiniMaxEmbedding } from "./embedding";

describe("MiniMax native embedding contract", () => {
  test("truncates to 1024 dimensions and normalizes", () => {
    const value = normalizeMiniMaxEmbedding(Array.from({ length: 1536 }, (_, index) => index === 0 ? 3 : 4));
    expect(value).toHaveLength(1024);
    expect(Math.hypot(...value)).toBeCloseTo(1, 8);
  });

  test("sends texts/type and validates native response", async () => {
    const originalFetch = globalThis.fetch;
    let request: { body?: string; headers?: Headers } = {};
    globalThis.fetch = (async (_input, init) => {
      request = { body: String(init?.body), headers: new Headers(init?.headers) };
      return new Response(JSON.stringify({
        vectors: [Array.from({ length: 1536 }, () => 1)],
        base_resp: { status_code: 0 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const vectors = await embedMiniMaxTexts(["query"], { baseUrl: "https://api.minimaxi.com/v1", apiKey: "key", type: "query" });
      expect(JSON.parse(request.body ?? "{}")).toEqual({ model: "embo-01", texts: ["query"], type: "query" });
      expect(request.headers?.get("authorization")).toBe("Bearer key");
      expect(vectors[0]).toHaveLength(1024);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
