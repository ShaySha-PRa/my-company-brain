import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { GET, POST } from "./route";

describe("unified platform proxy", () => {
  test("contains no Web-local platform store import", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
    expect(source).not.toContain(["@mcb/platform", "platform-store"].join("/"));
    expect(source).not.toContain(["platform", "pg"].join("-"));
  });

  test("routes auth at the API root and business paths under /platform", async () => {
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input) => {
      calls.push(String(input));
      return Response.json({ ok: true });
    }) as typeof fetch;
    try {
      await GET(new Request("http://web.local/api/platform/auth/me"), { params: Promise.resolve({ path: ["auth", "me"] }) });
      await GET(new Request("http://web.local/api/platform/scenarios"), { params: Promise.resolve({ path: ["scenarios"] }) });
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(calls).toEqual([
      "http://127.0.0.1:3101/auth/me",
      "http://127.0.0.1:3101/platform/scenarios",
    ]);
  });

  test("sets an HttpOnly session cookie after a successful login", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ token: "mcb_test_token", user: { id: "admin" } })) as typeof fetch;
    try {
      const response = await POST(
        new Request("http://web.local/api/platform/auth/login", { method: "POST" }),
        { params: Promise.resolve({ path: ["auth", "login"] }) },
      );
      expect(response.status).toBe(200);
      const setCookie = response.headers.get("set-cookie");
      expect(typeof setCookie).toBe("string");
      expect(setCookie ?? "").toContain("mcb_session=mcb_test_token");
      expect(setCookie ?? "").toContain("HttpOnly");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("restores the session cookie after a successful bearer-authenticated me request", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ user: { id: "admin", is_admin: true } })) as typeof fetch;
    try {
      const response = await GET(
        new Request("http://web.local/api/platform/auth/me", {
          headers: { authorization: "Bearer mcb_existing_token" },
        }),
        { params: Promise.resolve({ path: ["auth", "me"] }) },
      );
      expect(response.status).toBe(200);
      const setCookie = response.headers.get("set-cookie");
      expect(setCookie ?? "").toContain("mcb_session=mcb_existing_token");
      expect(setCookie ?? "").toContain("HttpOnly");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("clears the session cookie after logout", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ ok: true })) as typeof fetch;
    try {
      const response = await POST(
        new Request("http://web.local/api/platform/auth/logout", { method: "POST" }),
        { params: Promise.resolve({ path: ["auth", "logout"] }) },
      );
      expect(response.status).toBe(200);
      const setCookie = response.headers.get("set-cookie");
      expect(typeof setCookie).toBe("string");
      expect(setCookie ?? "").toContain("mcb_session=");
      expect(setCookie ?? "").toContain("Max-Age=0");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
