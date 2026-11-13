import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedDirectory = join(projectRoot, "src/lib/server/trr-api/generated");
const inputPath = join(generatedDirectory, "instagram-counts.openapi.json");
const outputPath = join(generatedDirectory, "instagram-counts.d.ts");
const executable = resolve(projectRoot, "../../tools/trr-api-types/node_modules/.bin/openapi-typescript");
const checkSource = process.argv.includes("--check-source");
const checkMode = process.argv.includes("--check") || checkSource;
if (process.argv.includes("--export") || checkSource) {
  const backendRoot = resolve(projectRoot, "../../../TRR-Backend");
  const raw = execFileSync(join(backendRoot, ".venv/bin/python"), ["-c", "import json; from trr_backend.socials.instagram.comment_counts import InstagramCommentCounts,InstagramCommentCountsSummary; print(json.dumps({m.__name__:m.model_json_schema() for m in (InstagramCommentCounts,InstagramCommentCountsSummary)}))"], { cwd: backendRoot, encoding: "utf8" });
  const models = JSON.parse(raw);
  const schemas = {};
  for (const [name, model] of Object.entries(models)) {
    Object.assign(schemas, model.$defs ?? {});
    delete model.$defs;
    schemas[name] = model;
  }
  const schema = JSON.stringify({ openapi: "3.1.0", info: { title: "Instagram independent comment counts", version: "1" }, paths: {}, components: { schemas } }, null, 2).replaceAll("#/$defs/", "#/components/schemas/") + "\n";
  if (checkMode) {
    if (await readFile(inputPath, "utf8").catch(() => null) !== schema) throw new Error("Instagram count source schema is stale.");
  } else {
    await mkdir(generatedDirectory, { recursive: true });
    await writeFile(inputPath, schema);
  }
}
const temporaryDirectory = await mkdtemp(join(tmpdir(), "trr-instagram-counts-"));
try {
  const temporaryOutput = join(temporaryDirectory, "instagram-counts.d.ts");
  execFileSync(executable, [inputPath, "--output", temporaryOutput, "--alphabetize"], { cwd: projectRoot, stdio: "inherit" });
  const content = await readFile(temporaryOutput, "utf8");
  if (checkMode) {
    if (await readFile(outputPath, "utf8").catch(() => null) !== content) throw new Error("Instagram count types are stale.");
    console.log("Instagram count contract artifacts are up to date.");
  } else await writeFile(outputPath, content);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
