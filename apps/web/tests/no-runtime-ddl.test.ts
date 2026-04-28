import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// DDL keywords we never want executed via runtime query() calls in app/server code.
// Owner of all schema mutations is the TRR-Backend Supabase migrations directory.
const DDL_PATTERN =
  /\b(?:ALTER\s+TABLE|CREATE\s+(?:UNIQUE\s+)?INDEX|CREATE\s+TABLE|CREATE\s+OR\s+REPLACE\s+FUNCTION|CREATE\s+TRIGGER|DROP\s+TRIGGER|DROP\s+TABLE|DROP\s+INDEX)\b/i;

// Detects a query() call adjacent to DDL — covers the historical anti-pattern
// shapes: `await query(...)`, `client.query(...)`, `query<T>(...)`, etc.
const QUERY_CALL_PATTERN = /(?:^|[^A-Za-z0-9_$])query\s*[<(]/;

// How many lines on either side of a query() call to scan for DDL keywords.
// 10 lines covers multi-line tagged template literals while staying tight enough
// to avoid false positives from unrelated nearby strings.
const PROXIMITY_WINDOW = 10;

type Finding = {
  file: string;
  line: number;
  snippet: string;
};

const repoFile = fileURLToPath(import.meta.url);
const testsDir = path.dirname(repoFile);
const webRoot = path.resolve(testsDir, "..");
const repoRoot = path.resolve(webRoot, "..", "..");

const SCAN_ROOTS = [
  path.join(webRoot, "src", "app", "api"),
  path.join(webRoot, "src", "lib", "server"),
];

const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx"]);

function walk(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    out.push(full);
  }
}

function scanFile(absPath: string, findings: Finding[]): void {
  const text = fs.readFileSync(absPath, "utf-8");
  const lines = text.split(/\r?\n/);
  const queryLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (QUERY_CALL_PATTERN.test(lines[i])) {
      queryLines.push(i);
    }
  }
  if (queryLines.length === 0) return;

  const relPath = path.relative(repoRoot, absPath).split(path.sep).join("/");
  const seenLines = new Set<number>();
  for (const queryLine of queryLines) {
    const start = Math.max(0, queryLine - PROXIMITY_WINDOW);
    const end = Math.min(lines.length - 1, queryLine + PROXIMITY_WINDOW);
    for (let j = start; j <= end; j++) {
      if (seenLines.has(j)) continue;
      const line = lines[j];
      if (DDL_PATTERN.test(line)) {
        seenLines.add(j);
        findings.push({
          file: relPath,
          line: j + 1,
          snippet: line.trim().slice(0, 200),
        });
      }
    }
  }
}

describe("no runtime DDL in app/server code", () => {
  it("rejects ALTER/CREATE/DROP DDL inside query() calls under apps/web/src/app/api and apps/web/src/lib/server", () => {
    const files: string[] = [];
    for (const root of SCAN_ROOTS) {
      walk(root, files);
    }

    const findings: Finding[] = [];
    for (const file of files) {
      scanFile(file, findings);
    }

    const message =
      findings.length > 0
        ? `Runtime DDL found in ${findings.length} location(s); schema changes must live in TRR-Backend migrations:\n${findings
            .map((f) => `  ${f.file}:${f.line} - ${f.snippet}`)
            .join("\n")}`
        : "no runtime DDL detected";

    expect(findings, message).toEqual([]);
  });

  it("regex flags the historical anti-pattern", () => {
    const sample = "await query(`ALTER TABLE survey_shows ADD COLUMN ...`);";
    expect(DDL_PATTERN.test(sample)).toBe(true);
    expect(QUERY_CALL_PATTERN.test(sample)).toBe(true);
  });

  it("regex flags client.query() with CREATE INDEX", () => {
    const sample = 'await client.query("CREATE UNIQUE INDEX idx_x ON foo(bar)");';
    expect(DDL_PATTERN.test(sample)).toBe(true);
    expect(QUERY_CALL_PATTERN.test(sample)).toBe(true);
  });

  it("regex does not flag plain SELECT inside query()", () => {
    const sample = "await query(`SELECT id FROM survey_shows WHERE id = $1`);";
    expect(DDL_PATTERN.test(sample)).toBe(false);
  });
});
