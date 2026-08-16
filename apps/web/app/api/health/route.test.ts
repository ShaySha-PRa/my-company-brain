import { describe, expect, test } from "bun:test";
import { GET } from "./route.ts";

describe("web health route", () => {
  test("returns the shared web health response", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      service: "web",
      version: "0.1.0",
    });
  });
});
