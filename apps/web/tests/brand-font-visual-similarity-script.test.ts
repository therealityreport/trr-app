import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import fixtures from "./fixtures/brand-font-visual-similarity-fixtures.json";

const execFileAsync = promisify(execFile);
const projectRoot = resolve("/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web");
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("brand font visual similarity worker", () => {
  it("emits resolved assets and differentiated visual scores for the checked-in Wordle fixture", async () => {
    const fixture = fixtures[0];
    expect(fixture).toBeDefined();

    const outputDir = await mkdtemp(join(tmpdir(), "brand-font-visual-"));
    tempDirs.push(outputDir);
    const outputPath = join(outputDir, "visual-report.json");

    await execFileAsync(
      process.execPath,
      [
        "scripts/brand-font-visual-similarity.mjs",
        "--brand-id",
        fixture.brandId,
        "--role-label",
        fixture.roleLabel,
        "--specimen",
        fixture.specimen,
        "--text",
        fixture.text,
        "--limit",
        String(fixture.limit),
        "--output",
        outputPath,
      ],
      {
        cwd: projectRoot,
      },
    );

    const report = JSON.parse(await readFile(outputPath, "utf8")) as {
      input: {
        resolvedSourceAsset: { resolvedFamilyName: string; resolvedWeight: number } | null;
      };
      results: Array<{
        familyName: string;
        visualScore: number;
        combinedScore: number;
        fontLoadStatus: string;
        resolvedCandidateAsset: { resolvedFamilyName: string; resolvedWeight: number } | null;
      }>;
    };

    expect(report.input.resolvedSourceAsset?.resolvedFamilyName).toBeTruthy();
    expect(report.input.resolvedSourceAsset?.resolvedWeight).toBeGreaterThan(0);
    expect(report.results[0]?.familyName).toBe("Hamburg Serial");
    expect(report.results[0]?.fontLoadStatus).toBe("loaded");
    expect(report.results[0]?.resolvedCandidateAsset?.resolvedFamilyName).toBeTruthy();
    expect(new Set(report.results.slice(0, 5).map((entry) => entry.visualScore)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(report.results.slice(0, 5).map((entry) => entry.combinedScore)).size).toBeGreaterThanOrEqual(3);
  }, 45000);
});
