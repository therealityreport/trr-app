import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const projectRoot = new URL("..", import.meta.url).pathname;
const execFileAsync = promisify(execFile);

const checkMode = process.argv.includes("--check");
const withGlyphComparison = process.argv.includes("--with-glyph-comparison");

if (withGlyphComparison) {
  await execFileAsync(process.execPath, [join(projectRoot, "scripts/brand-font-glyph-comparison.mjs")], {
    cwd: projectRoot,
  });
}

const { buildBrandFontArtifacts } = await import("../src/lib/fonts/brand-fonts/generator.ts");

const artifacts = buildBrandFontArtifacts(projectRoot);
const outputDir = join(projectRoot, "src/lib/fonts/brand-fonts/generated");
const generatedArtifacts = [
  ["discovered-brand-font-snapshot.json", artifacts.discovered],
  ["normalized-brand-font-registry.json", artifacts.registry],
  ["normalized-r2-font-catalog.json", artifacts.catalog],
  ["brand-font-match-results.json", artifacts.matches],
];

const generatedFiles = await Promise.all(
  generatedArtifacts.map(async ([fileName, artifact]) => {
    const outputPath = join(outputDir, fileName);
    const currentContent = checkMode ? await readFile(outputPath, "utf8").catch(() => null) : null;
    let currentGeneratedAt = null;

    if (currentContent !== null) {
      try {
        currentGeneratedAt = JSON.parse(currentContent).generatedAt;
      } catch {
        currentGeneratedAt = null;
      }
    }

    const comparableArtifact =
      checkMode && typeof currentGeneratedAt === "string"
        ? { ...artifact, generatedAt: currentGeneratedAt }
        : artifact;

    return [fileName, `${JSON.stringify(comparableArtifact, null, 2)}\n`, currentContent];
  }),
);

if (checkMode) {
  const staleFiles = [];

  for (const [fileName, expectedContent, currentContent] of generatedFiles) {
    const outputPath = join(outputDir, fileName);

    if (currentContent !== expectedContent) {
      staleFiles.push(outputPath);
    }
  }

  if (staleFiles.length > 0) {
    throw new Error(`Generated brand font artifacts are stale:\n${staleFiles.join("\n")}`);
  }

  console.log(`Brand font artifacts are up to date: ${outputDir}`);
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });
await Promise.all(
  generatedFiles.map(([fileName, content]) => writeFile(join(outputDir, fileName), content, "utf8")),
);

console.log(`Generated brand font artifacts in ${outputDir}`);
