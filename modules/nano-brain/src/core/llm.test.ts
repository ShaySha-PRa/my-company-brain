import { expect, test } from 'bun:test';
import { createAgentCompileClient } from './llm';

test('Agent compile client uses MiniMax defaults and strips reasoning blocks before JSON parsing', async () => {
  const originalFetch = globalThis.fetch;
  let request: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_input, init) => {
    request = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '<think>private reasoning</think>{"sections":[{"heading":"标题","level":2,"content":"正文","evidence":[]}]}' } }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;
  try {
    const result = await createAgentCompileClient({ AGENT_API_KEY: 'secret' }).compile({
      rawText: '原始资料',
      title: '资料',
      segmentIndex: 0,
      segmentCount: 1,
    });
    expect((request as Record<string, unknown> | null)?.model).toBe('MiniMax-M2.7');
    expect(result?.sections[0]?.heading).toBe('标题');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
