import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const projectRoot = new URL("..", import.meta.url).pathname;
const execFileAsync = promisify(execFile);

const withGlyphComparison = process.argv.includes("--with-glyph-comparison");

if (withGlyphComparison) {
  await execFileAsync(process.execPath, [join(projectRoot, "scripts/brand-font-glyph-comparison.mjs")], {
    cwd: projectRoot,
  });
}

const { buildBrandFontArtifacts } = await import("../src/lib/fonts/brand-fonts/generator.ts");

const artifacts = buildBrandFontArtifacts(projectRoot);
const outputDir = join(projectRoot, "src/lib/fonts/brand-fonts/generated");

await mkdir(outputDir, { recursive: true });

await Promise.all([
  writeFile(
    join(outputDir, "discovered-brand-font-snapshot.json"),
    `${JSON.stringify(artifacts.discovered, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    join(outputDir, "normalized-brand-font-registry.json"),
    `${JSON.stringify(artifacts.registry, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    join(outputDir, "normalized-r2-font-catalog.json"),
    `${JSON.stringify(artifacts.catalog, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    join(outputDir, "brand-font-match-results.json"),
    `${JSON.stringify(artifacts.matches, null, 2)}\n`,
    "utf8",
  ),
]);

console.log(`Generated brand font artifacts in ${outputDir}`);
