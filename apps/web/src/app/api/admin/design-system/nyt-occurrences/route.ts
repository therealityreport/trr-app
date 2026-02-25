import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const SEARCH_REGEX = /\b(?:new york times|nytimes|nyt[a-z0-9_-]*)\b/gi;
const MAX_OCCURRENCES = 10_000;

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".txt",
  ".html",
  ".yml",
  ".yaml",
  ".sql",
]);

const IGNORED_DIRS = new Set([
  ".next",
  "node_modules",
  ".turbo",
  ".git",
  "coverage",
  "dist",
  "build",
]);

interface NytOccurrence {
  file_path: string;
  line_number: number;
  column_number: number;
  match: string;
  line_text: string;
}

async function findScanRoot(): Promise<string> {
  const candidates = [
    path.resolve(process.cwd(), "apps/web/src"),
    path.resolve(process.cwd(), "src"),
  ];

  for (const candidate of candidates) {
    try {
      const stats = await readdir(candidate);
      if (stats.length >= 0) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Unable to resolve app scan root");
}

async function collectTextFiles(rootDir: string): Promise<string[]> {
  const queue: string[] = [rootDir];
  const files: string[] = [];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    if (!currentDir) continue;

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        if (entry.name !== ".env.example") {
          continue;
        }
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          queue.push(fullPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(extension)) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function findOccurrencesInFile(contents: string, absolutePath: string, scanRoot: string): NytOccurrence[] {
  const occurrences: NytOccurrence[] = [];
  const lines = contents.split(/\r?\n/);
  const relativePath = path.relative(scanRoot, absolutePath).replaceAll(path.sep, "/");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    SEARCH_REGEX.lastIndex = 0;
    for (const match of line.matchAll(SEARCH_REGEX)) {
      const matchValue = match[0];
      if (!matchValue) {
        continue;
      }
      occurrences.push({
        file_path: relativePath,
        line_number: lineIndex + 1,
        column_number: (match.index ?? 0) + 1,
        match: matchValue,
        line_text: line.trim(),
      });
      if (occurrences.length >= MAX_OCCURRENCES) {
        return occurrences;
      }
    }
  }

  return occurrences;
}

/**
 * GET /api/admin/design-system/nyt-occurrences
 *
 * Returns every NYT-related token occurrence in the app codebase.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const scanRoot = await findScanRoot();
    const files = await collectTextFiles(scanRoot);
    const occurrences: NytOccurrence[] = [];

    for (const filePath of files) {
      const fileContents = await readFile(filePath, "utf8");
      const fileMatches = findOccurrencesInFile(fileContents, filePath, scanRoot);
      occurrences.push(...fileMatches);
      if (occurrences.length >= MAX_OCCURRENCES) {
        break;
      }
    }

    const filesWithMatches = new Set(occurrences.map((entry) => entry.file_path)).size;

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      scan_root: scanRoot,
      file_count_scanned: files.length,
      files_with_matches: filesWithMatches,
      occurrence_count: occurrences.length,
      capped: occurrences.length >= MAX_OCCURRENCES,
      occurrences,
    });
  } catch (error) {
    console.error("[api] Failed to scan NYT occurrences", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
