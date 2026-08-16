import { describe, expect, test } from "bun:test";
import { DEFAULT_PORTS, SERVICE_IDS } from "../packages/contracts/src/index.ts";
import {
  defaultHealthTargets,
  startHealthSmoke,
  type HealthTarget,
} from "./smoke-health.ts";

function fixtureTarget(service: (typeof SERVICE_IDS)[number], status = 200): HealthTarget {
  return {
    service,
    url: `http://health.test/${service}/health?status=${status}`,
  };
}

describe("health smoke checks", () => {
  test("uses the web API health route while keeping module health routes stable", () => {
    const targets = defaultHealthTargets({});
    expect(targets[0]?.url).toContain("/api/health");
    expect(targets.slice(1).every((target) => target.url.endsWith("/health"))).toBe(true);
  });

  test("checks every process adapter against the shared health contract", async () => {
    const targets = SERVICE_IDS.map((service) => fixtureTarget(service));
    const results = await startHealthSmoke(targets, async (input) => {
      const service = new URL(input.toString()).pathname.split("/")[1];
      return Response.json({ status: "ok", service, version: "0.1.0" });
    });

    expect(results).toHaveLength(6);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(results.map((result) => result.service)).toEqual([...SERVICE_IDS]);
    expect(results.map((result) => result.port)).toEqual(
      SERVICE_IDS.map((service) => DEFAULT_PORTS[service]),
    );
  });

  test("reports status and contract diagnostics for unhealthy adapters", async () => {
    const unhealthy = fixtureTarget("api", 503);
    const results = await startHealthSmoke([unhealthy], async (input) => {
      const status = Number(new URL(input.toString()).searchParams.get("status"));
      return Response.json({ status: "unavailable" }, { status });
    });

    expect(results).toEqual([
      {
        ok: false,
        service: "api",
        url: unhealthy.url,
        port: DEFAULT_PORTS.api,
        message: expect.stringContaining("HTTP 503"),
      },
    ]);
  });
});
