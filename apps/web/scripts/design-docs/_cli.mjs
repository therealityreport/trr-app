import { readFile, writeFile } from "node:fs/promises";

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export async function readRequiredFile(filePath, label) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error(`Missing required --${label} argument`);
  }

  return readFile(filePath, "utf8");
}

export async function writeJsonOutput(outputPath, payload) {
  const json = JSON.stringify(payload, null, 2);
  if (outputPath && typeof outputPath === "string") {
    await writeFile(outputPath, `${json}\n`, "utf8");
    return;
  }

  process.stdout.write(`${json}\n`);
}
