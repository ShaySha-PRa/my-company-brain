import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dir, "../package.json"), "utf8"),
) as { scripts?: Record<string, string> };

describe("root verification commands", () => {
  test("exposes every independent product layer", () => {
    expect(packageJson.scripts).toMatchObject({
      "check:structure": expect.any(String),
      "check:naming": expect.any(String),
      "test:ts": expect.any(String),
      "typecheck:ts": expect.any(String),
      "test:python": expect.any(String),
      "typecheck:python": expect.any(String),
      "smoke:health": expect.any(String),
    });
  });
});
