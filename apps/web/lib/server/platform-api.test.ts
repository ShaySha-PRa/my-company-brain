import { describe, expect, test } from "bun:test";

import {
  buildUnifiedApiUrl,
  requestUnifiedPlatform,
  resolveUnifiedApiBaseUrl,
} from "./platform-api";

describe("server platform API boundary", () => {
  test("resolves the internal API root without falling back to a Web-local store", () => {
    expect(resolveUnifiedApiBaseUrl({ API_INTERNAL_BASE_URL: "http://api:3101/" })).toBe("http://api:3101");
    expect(buildUnifiedApiUrl("/platform/scenarios", { API_INTERNAL_BASE_URL: "http://api:3101" })).toBe(
      "http://api:3101/platform/scenarios",
    );
  });

  test("forwards the session bearer token to the unified platform API", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const response = await requestUnifiedPlatform<{ scenarios: unknown[] }>(
      "mcb_identity_token",
      "/scenarios",
      {
        environment: { API_INTERNAL_BASE_URL: "http://api:3101" },
        fetchImpl: async (url, init) => {
          requests.push({ url: String(url), init });
          return Response.json({ scenarios: [] });
        },
      },
    );

    expect(response).toEqual({ scenarios: [] });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("http://api:3101/platform/scenarios");
    expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe("Bearer mcb_identity_token");
  });
});
