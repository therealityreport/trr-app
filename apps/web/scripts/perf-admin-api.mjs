#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(appRoot, "../../..");
const defaultOutputRoot = resolve(workspaceRoot, ".artifacts/perf/autocannon");
const defaultCaPath = `${process.env.HOME ?? ""}/.portless/ca.pem`;

const presets = {
  "social-snapshot": "/api/admin/trr-api/social/profiles/instagram/bravotv/snapshot",
  "social-catalog-detail": "/api/admin/trr-api/social/profiles/instagram/bravotv/snapshot?detail=catalog",
  "comments-summary": "/api/admin/trr-api/social/profiles/instagram/bravotv/comments/summary",
  "cast-data": "/api/admin/trr-api/shows/rhoslc/cast",
  "credits-data": "/api/admin/trr-api/shows/rhoslc/credits",
  "cast-credits": "/api/admin/trr-api/shows/rhoslc/cast-credits",
};

function printHelp() {
  console.log(`Usage: pnpm run perf:admin:api -- [options]

Runs a low-concurrency autocannon benchmark against a clean Portless admin URL.

Options:
  --preset <name>       Preset route. Default: social-snapshot
  --url <url>           Explicit https://admin.trr.localhost/... URL override
  --connections <n>     Autocannon connections. Default: 2
  --duration <seconds>  Autocannon duration. Default: 10
  --max-p95-ms <ms>     Fail when parsed p95 latency exceeds this value
  --max-p99-ms <ms>     Fail when parsed p99 latency exceeds this value
  --out <dir>           Output root. Default: .artifacts/perf/autocannon
  --print-target        Print the resolved target and exit
  --help                Show this help

Presets: ${Object.keys(presets).join(", ")}`);
}

function readArgs(argv) {
  const options = {
    preset: "social-snapshot",
    connections: "2",
    duration: "10",
    out: defaultOutputRoot,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      return value;
    };

    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--") continue;
    else if (arg === "--print-target") options.printTarget = true;
    else if (arg === "--preset") options.preset = next();
    else if (arg === "--url") options.url = next();
    else if (arg === "--connections") options.connections = next();
    else if (arg === "--duration") options.duration = next();
    else if (arg === "--max-p95-ms") options.maxP95Ms = Number(next());
    else if (arg === "--max-p99-ms") options.maxP99Ms = Number(next());
    else if (arg === "--out") options.out = resolve(next());
    else throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function resolveTarget(options) {
  if (options.url) {
    const parsed = new URL(options.url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "admin.trr.localhost") {
      throw new Error("--url must use https://admin.trr.localhost");
    }
    return parsed.toString();
  }

  const route = presets[options.preset];
  if (!route) {
    throw new Error(`Unknown preset: ${options.preset}`);
  }
  return new URL(route, "https://admin.trr.localhost").toString();
}

function percentileMs(result, key) {
  const latency = result.latency;
  if (!latency || typeof latency !== "object") return null;
  const value = latency[key] ?? latency[`p${key}`];
  return typeof value === "number" ? value : null;
}

try {
  const options = readArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const target = resolveTarget(options);
  if (options.printTarget) {
    console.log(target);
    process.exit(0);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const outputDir = resolve(options.out, timestamp);
  mkdirSync(outputDir, { recursive: true });

  const env = { ...process.env };
  if (!env.NODE_EXTRA_CA_CERTS && defaultCaPath.startsWith("/")) {
    env.NODE_EXTRA_CA_CERTS = defaultCaPath;
  }

  const result = spawnSync(
    "npx",
    ["--yes", "autocannon", "--connections", options.connections, "--duration", options.duration, "--latency", "--json", target],
    {
      cwd: appRoot,
      env,
      encoding: "utf8",
    },
  );

  const resultPath = resolve(outputDir, "result.json");
  writeFileSync(resultPath, result.stdout || "", "utf8");
  if (result.stderr) {
    writeFileSync(resolve(outputDir, "stderr.log"), result.stderr, "utf8");
  }
  writeFileSync(
    resolve(outputDir, "metadata.json"),
    JSON.stringify(
      {
        target,
        preset: options.url ? null : options.preset,
        connections: Number(options.connections),
        duration_seconds: Number(options.duration),
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  const latestPath = resolve(options.out, "latest");
  rmSync(latestPath, { force: true, recursive: true });
  symlinkSync(outputDir, latestPath, "dir");

  if (result.status !== 0) {
    process.stderr.write(result.stderr || "autocannon failed\n");
    process.exit(result.status ?? 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`autocannon output was not valid JSON: ${resultPath}`);
  }

  const p95 = percentileMs(parsed, "p95");
  const p99 = percentileMs(parsed, "p99");
  const failures = [];
  if (typeof options.maxP95Ms === "number" && p95 !== null && p95 > options.maxP95Ms) {
    failures.push(`p95 ${p95}ms exceeded ${options.maxP95Ms}ms`);
  }
  if (typeof options.maxP99Ms === "number" && p99 !== null && p99 > options.maxP99Ms) {
    failures.push(`p99 ${p99}ms exceeded ${options.maxP99Ms}ms`);
  }

  console.log(`autocannon result: ${resultPath}`);
  console.log(`target: ${target}`);
  if (p95 !== null || p99 !== null) {
    console.log(`latency: p95=${p95 ?? "n/a"}ms p99=${p99 ?? "n/a"}ms`);
  }
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
