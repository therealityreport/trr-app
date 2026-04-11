import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = new URL("..", import.meta.url).pathname;
const outputDir = join(projectRoot, "src/lib/admin/api-references/generated");
const outputPath = join(outputDir, "inventory.ts");
const checkMode = process.argv.includes("--check");

const generatorModule = await import("../src/lib/admin/api-references/generator.ts");
const currentContent = await readFile(outputPath, "utf8").catch(() => null);
const currentGeneratedAt = currentContent?.match(/"generatedAt": "([^"]+)"/)?.[1] ?? undefined;
const currentSourceCommitSha = currentContent?.match(/"sourceCommitSha": "([^"]+)"/)?.[1] ?? undefined;
const nextContent = generatorModule.renderGeneratedAdminApiReferenceInventoryModule(projectRoot, {
  generatedAt: checkMode ? currentGeneratedAt : undefined,
  sourceCommitSha: checkMode ? currentSourceCommitSha : undefined,
});

if (checkMode) {
  if (currentContent !== nextContent) {
    throw new Error(`Generated admin API references artifact is stale: ${outputPath}`);
  }
  console.log(`Admin API references artifact is up to date: ${outputPath}`);
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, nextContent, "utf8");
console.log(`Generated admin API references artifact in ${outputPath}`);
