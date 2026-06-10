import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));

const readEnvKeys = (contents: string): Set<string> => {
  const keys = new Set<string>();
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = rawLine.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }
  return keys;
};

describe("workspace shared env contract", () => {
  it("keeps the app env example aligned to the workspace manifest", () => {
    const envExamplePath = path.join(process.cwd(), ".env.example");
    const expectedKeys = [
      "TRR_API_URL",
      "TRR_DB_DIRECT_URL",
      "TRR_DB_SESSION_URL",
      "TRR_DB_URL",
      "TRR_DB_TRANSACTION_URL",
      "TRR_DB_RUNTIME_LANE",
      "TRR_DB_TRANSACTION_FLIGHT_TEST",
      "TRR_DB_FALLBACK_URL",
      "TRR_CORE_SUPABASE_URL",
      "TRR_CORE_SUPABASE_SERVICE_ROLE_KEY",
      "TRR_INTERNAL_ADMIN_SHARED_SECRET",
    ];
    const manifestCandidates = [
      path.resolve(process.cwd(), "../../../docs/workspace/shared-env-manifest.json"),
      path.resolve(process.cwd(), "../../../../docs/workspace/shared-env-manifest.json"),
    ];
    const manifestPath = manifestCandidates.find((candidate) => fs.existsSync(candidate));
    const manifest = manifestPath
      ? (JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
          repo_validation: {
            "TRR-APP": {
              required_env_example_keys: string[];
            };
          };
        })
      : null;

    const envKeys = readEnvKeys(fs.readFileSync(envExamplePath, "utf-8"));
    if (manifest) {
      expect(new Set(manifest.repo_validation["TRR-APP"].required_env_example_keys)).toEqual(new Set(expectedKeys));
    }
    for (const key of manifest?.repo_validation["TRR-APP"].required_env_example_keys ?? expectedKeys) {
      expect(envKeys.has(key), `missing ${key} in apps/web/.env.example`).toBe(true);
    }
  });

  it("documents runtime failure lanes and the remote debug-log kill switch", () => {
    const contractCandidates = [
      path.resolve(process.cwd(), "docs/workspace/env-contract.md"),
      path.resolve(process.cwd(), "../../docs/workspace/env-contract.md"),
      path.resolve(process.cwd(), "../../../docs/workspace/env-contract.md"),
      path.resolve(process.cwd(), "../../../../docs/workspace/env-contract.md"),
      path.resolve(testDir, "../../../docs/workspace/env-contract.md"),
    ];
    const contractPath = contractCandidates.find((candidate) => fs.existsSync(candidate));
    expect(contractPath, "missing workspace env contract").toBeTruthy();

    const contract = fs.readFileSync(contractPath!, "utf-8");
    expect(contract).toContain("## Operator Failure Lanes");
    expect(contract).toContain("Modal deployment state");
    expect(contract).toContain("TRR_REMOTE_DEBUG_LOG_ENABLED");
    expect(contract).toContain("Hard kill switch for remote /api/debug-log writes");
  });
});
