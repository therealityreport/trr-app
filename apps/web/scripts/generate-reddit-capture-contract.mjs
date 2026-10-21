import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedDirectory = join(projectRoot, "src/lib/server/trr-api/generated");
const inputPath = join(generatedDirectory, "reddit-capture.openapi.json");
const outputPath = join(generatedDirectory, "reddit-capture.d.ts");
const executable = resolve(projectRoot, "../../tools/trr-api-types/node_modules/.bin", process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript");
const checkMode = process.argv.includes("--check") || process.argv.includes("--check-source");
const exportSource = process.argv.includes("--export");

// Standalone app checks use the committed snapshot. Workspace source checks
// additionally compare it with the backend's canonical Pydantic exporter.
if (exportSource || process.argv.includes("--check-source")) {
  const backendRoot = resolve(projectRoot, "../../../TRR-Backend");
  const schema = execFileSync(join(backendRoot, ".venv/bin/python"), [join(backendRoot, "scripts/export_reddit_capture_contract.py")], { cwd: backendRoot, encoding: "utf8" });
  JSON.parse(schema);
  if (checkMode) {
    if (await readFile(inputPath, "utf8").catch(() => null) !== schema) throw new Error(`Generated Reddit capture schema is stale: ${inputPath}`);
  } else {
    await mkdir(generatedDirectory, { recursive: true });
    await writeFile(inputPath, schema, "utf8");
  }
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), "trr-reddit-capture-types-"));
try {
  const temporaryOutput = join(temporaryDirectory, "reddit-capture.d.ts");
  execFileSync(executable, [inputPath, "--output", temporaryOutput, "--alphabetize"], { cwd: projectRoot, stdio: "inherit" });
  const content = await readFile(temporaryOutput, "utf8");
  if (checkMode) {
    if (await readFile(outputPath, "utf8").catch(() => null) !== content) throw new Error(`Generated Reddit capture types are stale: ${outputPath}`);
    console.log("Reddit capture contract artifacts are up to date.");
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, "utf8");
    console.log(`Generated Reddit capture contract types in ${outputPath}`);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
