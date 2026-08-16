import { describe, expect, test } from "bun:test";
import { createApiApp } from "./app.ts";
import { serializePublicUser } from "./app.ts";
import { resolveApiPort } from "./server.ts";

const user = {
  id: "user-1",
  username: "member.example",
  isAdmin: false,
  organizationId: "org-1",
  teamIds: ["team-1"],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

class FakeIdentity {
  public lastCreateInput: Record<string, unknown> | undefined;
  private readonly tokens = new Set(["token-a-abcdefghijklmnop", "token-b-abcdefghijklmnop"]);
  async listRegistrationTeams() { return [{ id: "team-1", name: "Product team" }]; }
  async createUser(input: { username: string; password: string; teamId?: string | null }) { this.lastCreateInput = input; return user; }
  async login() { return { token: "token-a-abcdefghijklmnop", user }; }
  async getUserByBearerToken(token: string) { return this.tokens.has(token) ? user : null; }
  async revokeBearerSession(token: string) { return this.tokens.delete(token); }
}

describe("unified API foundation", () => {
  test("returns its shared health response", async () => {
    const response = await createApiApp().request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "api",
      version: "0.1.0",
    });
  });

  test("rejects an invalid startup port", () => {
    expect(() => resolveApiPort("0")).toThrow("MCB_API_PORT");
  });

  test("accepts controlled team_id and rejects camelCase or privilege fields", async () => {
    const identity = new FakeIdentity();
    const app = createApiApp({ identity: identity as never, provisionDefaults: async () => undefined });
    const accepted = await app.request("/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "member.example", password: "password-123", team_id: "team-1" }) });
    expect(accepted.status).toBe(201);
    expect(identity.lastCreateInput?.teamId).toBe("team-1");
    expect(await accepted.json()).toEqual({ user: serializePublicUser(user) });
    for (const field of [{ teamId: "team-1" }, { is_admin: true }, { organization_id: "org-2" }]) {
      const rejected = await app.request("/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "member.example", password: "password-123", ...field }) });
      expect(rejected.status).toBe(400);
    }
  });

  test("serializes login with Bearer token type and revokes only one session", async () => {
    const identity = new FakeIdentity();
    const app = createApiApp({ identity: identity as never });
    const login = await app.request("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "member.example", password: "password-123" }) });
    expect(await login.json()).toMatchObject({ token: "token-a-abcdefghijklmnop", token_type: "Bearer", user: serializePublicUser(user) });
    const first = await app.request("/auth/me", { headers: { authorization: "Bearer token-a-abcdefghijklmnop" } });
    const second = await app.request("/auth/me", { headers: { authorization: "Bearer token-b-abcdefghijklmnop" } });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const logout = await app.request("/auth/logout", { method: "POST", headers: { authorization: "Bearer token-a-abcdefghijklmnop" } });
    expect(logout.status).toBe(200);
    expect((await app.request("/auth/me", { headers: { authorization: "Bearer token-a-abcdefghijklmnop" } })).status).toBe(401);
    expect((await app.request("/auth/me", { headers: { authorization: "Bearer token-b-abcdefghijklmnop" } })).status).toBe(200);
  });

  test("forwards exactly four trusted identity headers", async () => {
    const identity = new FakeIdentity();
    const originalFetch = globalThis.fetch;
    let forwarded: Headers | undefined;
    globalThis.fetch = (async (_input, init) => {
      forwarded = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      const app = createApiApp({ identity: identity as never, nanoBaseUrl: "http://module.test", internalToken: "server-secret" });
      const response = await app.request("/nano/ping", { headers: { authorization: "Bearer token-a-abcdefghijklmnop", "x-mcb-user-id": "spoof", "x-mcb-is-admin": "true", "x-mcb-extra": "spoof" } });
      expect(response.status).toBe(200);
      expect([...forwarded!.keys()].sort()).toEqual(["x-mcb-internal-token", "x-mcb-is-admin", "x-mcb-user-id", "x-mcb-username"]);
      expect(forwarded!.get("x-mcb-user-id")).toBe(user.id);
      expect(forwarded!.get("x-mcb-is-admin")).toBe("false");
    } finally { globalThis.fetch = originalFetch; }
  });

  test("dispatches protected platform routes through the platform store", async () => {
    const identity = new FakeIdentity();
    let actor: unknown;
    const app = createApiApp({
      identity: identity as never,
      platform: {
        listStoredTasks: async (user: { userId: string; name: string; role: string }) => {
          actor = user;
          return [{ id: "task-1", status: "ready" }];
        },
      } as never,
    });
    const response = await app.request("/platform/tasks", {
      headers: { authorization: "Bearer token-a-abcdefghijklmnop" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: [{ id: "task-1", status: "ready" }] });
    expect(actor).toMatchObject({ userId: user.id, name: user.username, role: "member" });
  });

  test("binds global sessions to Agent threads and projects a completed relay run", async () => {
    const identity = new FakeIdentity();
    const createdInput: Record<string, unknown>[] = [];
    const commits: Record<string, unknown>[] = [];
    const session = {
      id: "chat-1",
      title: "新的全域问答",
      ownerUserId: user.id,
      ownerName: user.username,
      organizationId: user.organizationId,
      teamIds: user.teamIds,
      scope: "company",
      threadId: "agent-conversation-1",
      architectureVersion: "agent-gateway",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      compressedContext: "",
      messages: [],
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.endsWith("/agent/conversations") && init?.method === "POST") {
        return new Response(JSON.stringify({ conversation: { id: "agent-conversation-1" } }), { status: 201, headers: { "content-type": "application/json" } });
      }
      if (url.includes("/agent/conversations/agent-conversation-1/stream")) {
        return new Response(
          'event: run_started\ndata: {"run_id":"run-1"}\n\n' +
          'event: message_completed\ndata: {"run_id":"run-1","message":{"content":"已完成"},"trace_id":"trace-1"}\n\n',
          { status: 200, headers: { "content-type": "text/event-stream" } },
        );
      }
      if (url.includes("/internal/agent/conversations/agent-conversation-1/runs/run-1/projection")) {
        return new Response(JSON.stringify({
          status: "completed",
          answer_text: "已完成",
          citations: [],
          context_trace: { route: "direct", scopeLabel: "company", layers: [], shortTermTurns: 0, compressedContext: "", longTermMemoryHits: [], retrievalTracks: [] },
          trace_id: "trace-1",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;
    try {
      const app = createApiApp({
        identity: identity as never,
        agentGatewayBaseUrl: "http://agent.test",
        internalToken: "internal-secret",
        platform: {
          createGlobalChatSession: async (_actor: unknown, input: Record<string, unknown>) => {
            createdInput.push(input);
            return session;
          },
          getGlobalChatSession: async () => session,
          commitAgentChatTurn: async (_actor: unknown, input: Record<string, unknown>) => {
            commits.push(input);
            return { ...session, messages: [{ id: "msg_1", role: "assistant", content: "已完成", createdAt: session.updatedAt }] };
          },
        } as never,
      });
      const created = await app.request("/platform/chat-sessions", {
        method: "POST",
        headers: { authorization: "Bearer token-a-abcdefghijklmnop", "content-type": "application/json" },
        body: JSON.stringify({ query: "公司的核心产品是什么？", scope: "company" }),
      });
      expect(created.status).toBe(201);
      expect(createdInput[0]).toMatchObject({ threadId: "agent-conversation-1", architectureVersion: "agent-gateway" });

      const relayed = await app.request("/platform/chat-sessions/chat-1/messages", {
        method: "POST",
        headers: { authorization: "Bearer token-a-abcdefghijklmnop", "content-type": "application/json" },
        body: JSON.stringify({ query: "请补充一个要点", idempotency_key: "11111111-1111-4111-8111-111111111111" }),
      });
      expect(relayed.status).toBe(200);
      expect(await relayed.text()).toContain("message_completed");
      expect(commits[0]).toMatchObject({ sessionId: "chat-1", idempotencyKey: "11111111-1111-4111-8111-111111111111", traceId: "trace-1" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
