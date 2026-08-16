import { describe, expect, test } from "bun:test";
import {
  AGENT_SSE_EVENT_NAMES,
  DEFAULT_PORTS,
  INTERNAL_HEADERS,
  SERVICE_IDS,
  makeApiError,
  makeHealthResponse,
  type AgentSseEvent,
  type ApiError,
  type HealthResponse,
  type JsonValue,
} from "./index.ts";

describe("@mcb/contracts", () => {
  test("accepts the hand-authored cross-language health fixture", async () => {
    const fixture = (await Bun.file(
      new URL("../../../tests/contract/fixtures/health-response.json", import.meta.url),
    ).json()) as HealthResponse[];

    expect(fixture).toEqual(
      SERVICE_IDS.map((service) => makeHealthResponse(service, "0.1.0")),
    );
  });

  test("exposes six stable service identifiers and ports", () => {
    expect(SERVICE_IDS).toEqual([
      "web",
      "api",
      "agent-gateway",
      "nano-brain",
      "traditional-rag",
      "graph-rag",
    ]);
    expect(DEFAULT_PORTS).toEqual({
      web: 3000,
      api: 3101,
      "agent-gateway": 3002,
      "nano-brain": 8100,
      "traditional-rag": 8101,
      "graph-rag": 8102,
    });
  });

  test("enumerates exactly the four trusted internal headers", () => {
    expect(INTERNAL_HEADERS).toEqual([
      "x-mcb-internal-token",
      "x-mcb-user-id",
      "x-mcb-username",
      "x-mcb-is-admin",
    ]);
  });

  test("constructs the shared health response", () => {
    const response: HealthResponse = makeHealthResponse("api", "0.1.0");
    expect(response).toEqual({ status: "ok", service: "api", version: "0.1.0" });
  });

  test("constructs a normalized JSON-safe API error", () => {
    const details: JsonValue = { field: "port", expected: "integer" };
    const response: ApiError = makeApiError("INVALID_CONFIG", "Invalid configuration", details);
    expect(response).toEqual({
      error: {
        code: "INVALID_CONFIG",
        message: "Invalid configuration",
        details,
      },
    });
  });

  test("defines every Agent stream event variant", () => {
    expect(AGENT_SSE_EVENT_NAMES).toEqual([
      "run_started",
      "tool_call_started",
      "tool_call_finished",
      "message_delta",
      "message_completed",
      "run_completed",
      "error",
    ]);
    const event: AgentSseEvent = {
      type: "message_delta",
      data: { delta: "hello" },
    };
    expect(event.type).toBe("message_delta");
  });
});
