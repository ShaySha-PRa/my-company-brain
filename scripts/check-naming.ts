import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".pytest_cache",
  ".rumcb_cache",
  ".venv",
  "__pycache__",
  "node_modules",
]);

export interface NamingHit {
  path: string;
  line: number;
  pattern: string;
}

function patternMatcher(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const leftBoundary = /^[A-Za-z0-9]/.test(pattern)
    ? "(?<![A-Za-z0-9])"
    : "";
  const rightBoundary = /[A-Za-z0-9]$/.test(pattern)
    ? "(?![A-Za-z0-9])"
    : "";
  return new RegExp(`${leftBoundary}${escaped}${rightBoundary}`, "i");
}

function loadPatterns(patternPath: string): string[] {
  return readFileSync(patternPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function ownedFiles(root: string, patternPath: string): string[] {
  const files: string[] = [];
  const resolvedPatternPath = resolve(patternPath);

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (
        entry.isFile() &&
        path !== resolvedPatternPath &&
        entry.name !== "forbidden-words.txt"
      ) {
        files.push(path);
      }
    }
  }

  visit(resolve(root));
  return files.sort();
}

export function scanOwnedTree(root: string, patternPath: string): NamingHit[] {
  const patterns = loadPatterns(patternPath).map((pattern) => ({
    pattern,
    matcher: patternMatcher(pattern),
  }));
  const hits: NamingHit[] = [];

  for (const path of ownedFiles(root, patternPath)) {
    const content = readFileSync(path);
    if (content.includes(0)) {
      continue;
    }
    const lines = content.toString("utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { matcher, pattern } of patterns) {
        if (matcher.test(line)) {
          hits.push({
            path: relative(resolve(root), path),
            line: index + 1,
            pattern,
          });
        }
      }
    });
  }
  return hits;
}

function argument(name: string): string | undefined {
  const index = Bun.argv.indexOf(name);
  return index === -1 ? undefined : Bun.argv[index + 1];
}

if (import.meta.main) {
  const root = resolve(argument("--root") ?? ".");
  const patternPath = resolve(argument("--patterns") ?? resolve(root, "forbidden-words.txt"));
  const hits = scanOwnedTree(root, patternPath);

  if (hits.length === 0) {
    console.log("Naming scan passed");
  } else {
    for (const hit of hits) {
      console.error(`${hit.path}:${hit.line}: disallowed token "${hit.pattern}"`);
    }
    process.exitCode = 1;
  }
}
