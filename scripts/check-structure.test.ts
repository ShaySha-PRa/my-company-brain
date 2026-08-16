import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "..");

const requiredPaths: string[] = [
  "package.json",
  "bunfig.toml",
  "tsconfig.base.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/agent-gateway/package.json",
  "modules/nano-brain/package.json",
  "modules/traditional-rag/pyproject.toml",
  "modules/graph-rag/pyproject.toml",
  "packages/platform/package.json",
  "packages/identity/package.json",
  "packages/contracts/package.json",
  "packages/config/package.json",
  "packages/minimax/package.json",
  "tests/contract/README.md",
  "tests/integration/README.md",
  "tests/permissions/README.md",
  "tests/browser/README.md",
  "tests/smoke/README.md",
  "notebooks/README.md",
];

describe("repository structure", () => {
  test.each(requiredPaths)("contains %s", (relativePath) => {
    expect(existsSync(resolve(repositoryRoot, relativePath))).toBe(true);
  });

  test("contains the database contract and migration families", () => {
    expect(existsSync(resolve(repositoryRoot, "deploy/database/database-contract.json"))).toBe(true);
    for (const family of ["identity", "core", "agent", "nano", "traditional", "graph"]) {
      expect(existsSync(resolve(repositoryRoot, `deploy/database/migrations/${family}/001_up.sql`))).toBe(true);
      expect(existsSync(resolve(repositoryRoot, `deploy/database/migrations/${family}/001_down.sql`))).toBe(true);
    }
  });
});
