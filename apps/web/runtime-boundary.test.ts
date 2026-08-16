import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const webRoot = import.meta.dir;
const forbiddenImport = ["@mcb/platform", "platform-store"].join("/");
const forbiddenDbMarker = ["platform", "pg"].join("-");

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== ".next" && entry.name !== "node_modules") {
      files.push(...await sourceFiles(path));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

describe("Web runtime persistence boundary", () => {
  test("does not import the platform store or platform database from runtime code", async () => {
    const files = await sourceFiles(webRoot);
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (source.includes(forbiddenImport) || source.includes(forbiddenDbMarker)) violations.push(file);
    }
    expect(violations).toEqual([]);
  });
});
