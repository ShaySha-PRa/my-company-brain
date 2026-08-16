import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temporaryRoots: string[] = [];
const scriptPath = resolve(import.meta.dir, "check-naming.ts");

function createWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "mcb-naming-"));
  temporaryRoots.push(root);
  writeFileSync(join(root, "patterns.txt"), "blocked-token\n");
  return root;
}

async function runGate(root: string) {
  const process = Bun.spawn(
    [
      "bun",
      scriptPath,
      "--root",
      root,
      "--patterns",
      join(root, "patterns.txt"),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  return {
    exitCode: await process.exited,
    stdout: await new Response(process.stdout).text(),
    stderr: await new Response(process.stderr).text(),
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("repository naming gate", () => {
  test("accepts a clean owned workspace", async () => {
    const root = createWorkspace();
    writeFileSync(join(root, "clean.txt"), "My Company Brain");
    const result = await runGate(root);
    expect(result).toEqual({ exitCode: 0, stdout: "Naming scan passed\n", stderr: "" });
  });

  test("reports path and line for a case-insensitive violation", async () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "bad.txt"), "safe\nBLOCKED-TOKEN\n");
    const result = await runGate(root);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("src/bad.txt:2");
  });

  test("excludes Git metadata, dependencies, and the audit configuration", async () => {
    const root = createWorkspace();
    for (const directory of [".git", "node_modules", ".venv"]) {
      mkdirSync(join(root, directory));
      writeFileSync(join(root, directory, "ignored.txt"), "blocked-token");
    }
    writeFileSync(join(root, "forbidden-words.txt"), "blocked-token");
    const result = await runGate(root);
    expect(result.exitCode).toBe(0);
  });

  test("does not match configured identifiers inside unrelated words or hashes", async () => {
    const root = createWorkspace();
    const prefixPattern = ["f", "f", "_"].join("");
    const versionPattern = ["M", "5"].join("");
    const namePattern = ["li", "si"].join("");
    writeFileSync(
      join(root, "patterns.txt"),
      `${prefixPattern}\n${versionPattern}\n${namePattern}\n`,
    );
    writeFileSync(
      join(root, "clean.txt"),
      `.rumcb_cache colmember-bon checksum${versionPattern}suffix`,
    );
    const result = await runGate(root);
    expect(result.exitCode).toBe(0);

    writeFileSync(join(root, "bad.txt"), `${prefixPattern}removed`);
    const violatingResult = await runGate(root);
    expect(violatingResult.exitCode).toBe(1);
    expect(violatingResult.stderr).toContain("bad.txt:1");
  });
});
