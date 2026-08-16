import { describe, expect, test } from "bun:test";
import { createNanoBrainApp } from "./app.ts";
import { resolveNanoBrainPort } from "./server.ts";

describe("Nano Brain foundation", () => {
  test("returns its shared health response", async () => {
    const response = await createNanoBrainApp().request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "nano-brain",
      version: "0.1.0",
    });
  });

  test("rejects an invalid startup port", () => {
    expect(() => resolveNanoBrainPort("not-a-port")).toThrow("MCB_NANO_PORT");
  });

  test("validates the internal token and keeps default-source provisioning idempotent", async () => {
    let source = { id: "nano-default", name: "member.example 的知识页面", owner_user_id: "user-1", is_default: true };
    const pool = {
      async query(sql: string) {
        if (sql.includes("SELECT id, name, owner_user_id")) return { rows: [source] };
        return { rows: [] };
      },
    };
    const app = createNanoBrainApp({ internalToken: "module-secret", pool: pool as never });
    const headers = { "x-mcb-internal-token": "module-secret", "x-mcb-user-id": "user-1", "x-mcb-username": "member.example", "x-mcb-is-admin": "false" };
    const first = await app.request("/internal/users/default-source", { method: "POST", headers });
    const second = await app.request("/internal/users/default-source", { method: "POST", headers });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).source.id).toBe((await second.json()).source.id);
    expect((await app.request("/internal/users/default-source", { method: "POST", headers: { ...headers, "x-mcb-internal-token": "wrong" } })).status).toBe(401);
  });
});
