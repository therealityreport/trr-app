import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const inputPath = join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.json");
const outputPath = join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.d.ts");
const provenancePath = join(
  projectRoot,
  "src/lib/server/trr-api/generated/openapi.v2.provenance.json",
);
const executable = join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript",
);
const checkMode = process.argv.includes("--check");
const backendOpenapiArgumentIndex = process.argv.indexOf("--backend-openapi");
const backendOpenapiPath =
  backendOpenapiArgumentIndex === -1
    ? null
    : process.argv[backendOpenapiArgumentIndex + 1] ?? null;
const temporaryDirectory = await mkdtemp(join(tmpdir(), "trr-openapi-types-"));
const temporaryOutput = join(temporaryDirectory, "openapi.v2.d.ts");

if (backendOpenapiArgumentIndex !== -1 && (!backendOpenapiPath || backendOpenapiPath.startsWith("--"))) {
  throw new Error("--backend-openapi requires the exported TRR-Backend OpenAPI JSON path");
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const loadProvenance = async () => {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(provenancePath, "utf8"));
  } catch (error) {
    throw new Error(`TRR v2 OpenAPI provenance is unreadable: ${provenancePath}`, { cause: error });
  }
  const backend = parsed?.backend;
  if (
    parsed?.schemaVersion !== 1 ||
    !backend ||
    typeof backend.repository !== "string" ||
    typeof backend.commit !== "string" ||
    !/^[0-9a-f]{40}$/i.test(backend.commit) ||
    typeof backend.contractPath !== "string" ||
    typeof backend.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/i.test(backend.sha256) ||
    typeof backend.exportCheckCommand !== "string" ||
    typeof backend.crossRepoValidationCommand !== "string"
  ) {
    throw new Error(`TRR v2 OpenAPI provenance is invalid: ${provenancePath}`);
  }
  return backend;
};

const verifyOpenapiProvenance = async () => {
  const [snapshot, provenance] = await Promise.all([readFile(inputPath), loadProvenance()]);
  const snapshotHash = sha256(snapshot);
  if (snapshotHash !== provenance.sha256) {
    throw new Error(
      `TRR v2 OpenAPI snapshot hash mismatch: expected ${provenance.sha256}, received ${snapshotHash}`,
    );
  }
  if (backendOpenapiPath) {
    const backendSnapshot = await readFile(backendOpenapiPath);
    if (!snapshot.equals(backendSnapshot)) {
      throw new Error(
        `TRR v2 OpenAPI snapshot differs from backend export: ${backendOpenapiPath}`,
      );
    }
  }
  return provenance;
};

try {
  const provenance = await verifyOpenapiProvenance();
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
    console.log(
      `TRR v2 API types are up to date: ${outputPath} (backend ${provenance.commit})`,
    );
    process.exitCode = 0;
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, nextContent, "utf8");
    console.log(`Generated TRR v2 API types in ${outputPath}`);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
