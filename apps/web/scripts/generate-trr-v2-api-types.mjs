import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const inputPath = join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.json");
const outputPath = join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.d.ts");
const executable = join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript",
);
const checkMode = process.argv.includes("--check");
const temporaryDirectory = await mkdtemp(join(tmpdir(), "trr-openapi-types-"));
const temporaryOutput = join(temporaryDirectory, "openapi.v2.d.ts");

try {
  execFileSync(executable, [inputPath, "--output", temporaryOutput, "--alphabetize"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  const nextContent = await readFile(temporaryOutput, "utf8");
  if (checkMode) {
    const currentContent = await readFile(outputPath, "utf8").catch(() => null);
    if (currentContent !== nextContent) {
      throw new Error(`Generated TRR v2 API types are stale: ${outputPath}`);
    }
    console.log(`TRR v2 API types are up to date: ${outputPath}`);
    process.exitCode = 0;
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, nextContent, "utf8");
    console.log(`Generated TRR v2 API types in ${outputPath}`);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
