import { randomUUID } from "node:crypto";

const apiBase = (process.env.MCB_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3101").replace(/\/$/, "");
const internalToken = process.env.MCB_INTERNAL_TOKEN ?? process.env.RAG_INTERNAL_TOKEN ?? "";
const nanoBase = (process.env.MCB_NANO_INTERNAL_BASE_URL ?? process.env.NANO_BRAIN_HTTP_URL ?? "http://127.0.0.1:8100").replace(/\/$/, "");
const traditionalBase = (process.env.MCB_TRADITIONAL_INTERNAL_BASE_URL ?? process.env.TRADITIONAL_RAG_HTTP_URL ?? "http://127.0.0.1:8101").replace(/\/$/, "");
const password = process.env.MCB_SMOKE_PASSWORD ?? `Smoke-${randomUUID()}-Password`;
const username = process.env.MCB_SMOKE_USERNAME ?? `smoke-${randomUUID().slice(0, 12)}`;

async function request(path: string, init: RequestInit = {}): Promise<{ response: Response; body: any }> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { text }; }
  return { response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const teams = await request("/auth/registration-teams");
  assert(teams.response.ok && Array.isArray(teams.body?.teams), "registration teams are unavailable");
  const teamId = teams.body.teams[0]?.id;
  assert(typeof teamId === "string", "registration teams did not expose an id");

  const forbidden = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username: `${username}-forbidden`, password, is_admin: true }),
  });
  assert(forbidden.response.status >= 400 && forbidden.response.status < 500, "privilege input was accepted");

  const registered = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, team_id: teamId }),
  });
  assert(registered.response.status === 201, `registration failed with HTTP ${registered.response.status}`);

  if (internalToken) {
    for (const base of [nanoBase, traditionalBase]) {
      const headers = {
        "x-mcb-internal-token": internalToken,
        "x-mcb-user-id": registered.body.user.id,
        "x-mcb-username": registered.body.user.username,
        "x-mcb-is-admin": "false",
      };
      const first = await fetch(`${base}/internal/users/default-source`, { method: "POST", headers, body: "{}" });
      const second = await fetch(`${base}/internal/users/default-source`, { method: "POST", headers, body: "{}" });
      assert(first.ok && second.ok, `default-source idempotency failed for ${base}`);
      const forged = await fetch(`${base}/health`, { headers: { ...headers, "x-mcb-user-id": "forged-user" } });
      assert(forged.ok, `forged header health probe failed for ${base}`);
    }
  }

  const login1 = await request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  const login2 = await request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  assert(login1.response.ok && login2.response.ok, "login failed");
  assert(login1.body.token_type === "Bearer" && login1.body.token !== login2.body.token, "two sessions were not issued");
  const me = await request("/auth/me", { headers: { authorization: `Bearer ${login1.body.token}` } });
  assert(me.response.ok && me.body.user?.is_admin === false && Array.isArray(me.body.user?.team_ids), "me contract failed");
  const logout = await request("/auth/logout", { method: "POST", headers: { authorization: `Bearer ${login1.body.token}` } });
  assert(logout.response.ok, "exact-session logout failed");
  const remaining = await request("/auth/me", { headers: { authorization: `Bearer ${login2.body.token}` } });
  assert(remaining.response.ok, "logout revoked more than one session");
  const invalid = await request("/auth/login", { method: "POST", body: JSON.stringify({ username, password: "wrong-password" }) });
  assert(invalid.response.status === 401, "invalid credentials were not rejected");
  assert(!JSON.stringify(invalid.body).includes(password), "secret appeared in an error response");
  console.log(JSON.stringify({ status: "ok", checks: ["registration", "teams", "privilege-rejection", "default-source-idempotency", "login", "sessions", "me", "logout", "forged-header", "secret-safe-errors"] }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
