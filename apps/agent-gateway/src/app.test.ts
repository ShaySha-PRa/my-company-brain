import { describe, expect, test } from "bun:test";
import { createAgentGatewayApp } from "./app.ts";
import { resolveAgentGatewayPort } from "./server.ts";
import { getAgentModelConfig } from "./agent/config.ts";
import { normalizeLangChainEvent } from "./agent/stream.ts";
import { ThinkBlockStripper } from "../../../packages/minimax/src/index.ts";

describe("Agent Gateway foundation", () => {
  test("returns its shared health response", async () => {
    const response = await createAgentGatewayApp().request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "agent-gateway",
      version: "0.1.0",
    });
  });

  test("rejects an invalid startup port", () => {
    expect(() => resolveAgentGatewayPort("65536")).toThrow("MCB_AGENT_PORT");
  });

  test("uses MiniMax M2.7 without a thinking-disable option", () => {
    expect(getAgentModelConfig({
      AGENT_PROVIDER: "minimax",
      AGENT_BASE_URL: "https://api.minimaxi.com/v1",
      AGENT_API_KEY: "secret",
      AGENT_MODEL: "MiniMax-M2.7",
    })).toMatchObject({
      provider: "openai-compatible",
      model: "MiniMax-M2.7",
      baseUrl: "https://api.minimaxi.com/v1",
      temperature: 0,
    });
    expect(JSON.stringify(getAgentModelConfig({
      AGENT_PROVIDER: "minimax",
      AGENT_API_KEY: "secret",
      AGENT_MODEL: "MiniMax-M2.7",
    }))).not.toContain("thinking");
  });

  test("strips MiniMax think text before emitting message deltas", () => {
    const activeToolNames = new Map<string, string>();
    const stripper = new ThinkBlockStripper();
    const event = (text: string, seq: number) => normalizeLangChainEvent({
      method: "messages",
      seq,
      params: {
        node: "model_request",
        data: { event: "content-block-delta", delta: { type: "text-delta", text } },
      },
    }, "run-1", activeToolNames, false, stripper);

    expect(event("答<thi", 1)).toEqual([expect.objectContaining({ data: expect.objectContaining({ text: "答" }) })]);
    expect(event("nk>内部</think>结", 2)).toEqual([expect.objectContaining({ data: expect.objectContaining({ text: "结" }) })]);
  });
});
