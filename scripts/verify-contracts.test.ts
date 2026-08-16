import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const packageJson = JSON.parse(
  readFileSync(resolve(import.meta.dir, "../package.json"), "utf8"),
) as { scripts?: Record<string, string> };

describe("product verification composition", () => {
  test("runs independent checks in a deterministic order", () => {
    const command = packageJson.scripts?.["verify:foundation"] ?? "";
    expect(command).toContain("bun run check:structure");
    expect(command).toContain("bun run check:naming");
    expect(command).toContain("bun run test:ts");
    expect(command).toContain("bun run typecheck:ts");
    expect(command).toContain("bun run test:python");
    expect(command).toContain("bun run typecheck:python");
    expect(command).toContain("bun run smoke:health");
    expect(command.indexOf("check:structure")).toBeLessThan(
      command.indexOf("check:naming"),
    );
    expect(command.indexOf("check:naming")).toBeLessThan(command.indexOf("test:ts"));
  });
});
