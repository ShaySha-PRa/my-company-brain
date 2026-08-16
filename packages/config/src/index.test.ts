import { describe, expect, test } from "bun:test";
import { DEFAULT_PORTS } from "@mcb/contracts";
import {
  parsePort,
  parsePortTopology,
  parseServerEnvironment,
  toBrowserConfig,
} from "./index.ts";

const completeEnvironment = {
  MCB_WEB_PORT: "3000",
  MCB_API_PORT: "3101",
  MCB_AGENT_PORT: "3002",
  MCB_NANO_PORT: "8100",
  MCB_TRADITIONAL_PORT: "8101",
  MCB_GRAPH_PORT: "8102",
  MCB_PUBLIC_API_BASE_URL: "http://127.0.0.1:3101",
  API_INTERNAL_BASE_URL: "http://127.0.0.1:3101",
  AGENT_BASE_URL: "https://api.minimaxi.com/v1",
  AGENT_MODEL: "MiniMax-M2.7",
  AGENT_API_KEY: "agent-secret",
  EMBEDDING_BASE_URL: "https://api.minimaxi.com/v1",
  EMBEDDING_MODEL: "embo-01",
  EMBEDDING_API_KEY: "embedding-secret",
  MCB_INTERNAL_TOKEN: "internal-secret",
  DATABASE_URL: "postgres://secret",
} as const;

describe("@mcb/config", () => {
  test("uses a default port and accepts a valid override", () => {
    expect(parsePort(undefined, 3101, "MCB_API_PORT")).toBe(3101);
    expect(parsePort("43101", 3101, "MCB_API_PORT")).toBe(43101);
  });

  test.each(["", "0", "65536", "3.14", "not-a-number"])(
    "rejects invalid port %s",
    (value) => {
      expect(() => parsePort(value, 3101, "MCB_API_PORT")).toThrow("MCB_API_PORT");
    },
  );

  test("uses the fixed default topology", () => {
    expect(parsePortTopology({})).toEqual(DEFAULT_PORTS);
  });

  test("rejects duplicate service ports and names both services", () => {
    expect(() =>
      parsePortTopology({ MCB_WEB_PORT: "3101", MCB_API_PORT: "3101" }),
    ).toThrow("web and api");
  });

  test("rejects a missing required server value", () => {
    const environment = { ...completeEnvironment, AGENT_API_KEY: "" };
    expect(() => parseServerEnvironment(environment)).toThrow("AGENT_API_KEY");
  });

  test("projects only explicit browser-safe values", () => {
    const server = parseServerEnvironment(completeEnvironment);
    expect(toBrowserConfig(server)).toEqual({
      productName: "My Company Brain",
      apiBaseUrl: "http://127.0.0.1:3101",
    });
    expect(JSON.stringify(toBrowserConfig(server))).not.toContain("secret");
    expect(JSON.stringify(toBrowserConfig(server))).not.toContain("DATABASE_URL");
  });
});
