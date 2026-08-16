import { afterEach, describe, expect, test } from 'bun:test';
import { embedTexts } from './embeddings';

const saved = {
  provider: process.env.EMBEDDING_PROVIDER,
  baseUrl: process.env.EMBEDDING_BASE_URL,
  apiKey: process.env.EMBEDDING_API_KEY,
  model: process.env.EMBEDDING_MODEL,
};

afterEach(() => {
  process.env.EMBEDDING_PROVIDER = saved.provider;
  process.env.EMBEDDING_BASE_URL = saved.baseUrl;
  process.env.EMBEDDING_API_KEY = saved.apiKey;
  process.env.EMBEDDING_MODEL = saved.model;
});

function vector(first: number, second: number): number[] {
  return [first, second, ...Array.from({ length: 1534 }, () => 0)];
}

describe('MiniMax native embeddings', () => {
  test('uses the default embo-01 model and query type with normalized 1024-d vectors', async () => {
    process.env.EMBEDDING_PROVIDER = 'minimax-native';
    process.env.EMBEDDING_BASE_URL = 'https://embedding.example/v1';
    process.env.EMBEDDING_API_KEY = 'secret';
    delete process.env.EMBEDDING_MODEL;
    const requests: Array<Record<string, unknown>> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ vectors: [vector(3, 4)], base_resp: { status_code: 0 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    try {
      const result = await embedTexts(['question'], 'search');
      expect(requests).toEqual([{ model: 'embo-01', texts: ['question'], type: 'query' }]);
      expect(result.model).toBe('embo-01');
      expect(result.embeddings[0]?.length).toBe(1024);
      expect(result.embeddings[0]?.slice(0, 2)).toEqual([0.6, 0.8]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
