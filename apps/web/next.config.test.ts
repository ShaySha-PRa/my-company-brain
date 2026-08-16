import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "./next.config.ts";

describe("web development configuration", () => {
  test("opts out of nested agent instruction file generation", () => {
    expect(nextConfig.agentRules).toBe(false);

    const generatedFiles = ["AGENTS.md", "CLAUDE.md"].map((name) =>
      resolve(import.meta.dir, name),
    );
    expect(generatedFiles.every((path) => !existsSync(path))).toBe(true);
  });
});
