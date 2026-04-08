import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

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
    const workspaceRoot = path.resolve(process.cwd(), "../../..");
    const manifestPath = path.join(workspaceRoot, "docs/workspace/shared-env-manifest.json");
    const envExamplePath = path.join(process.cwd(), ".env.example");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      repo_validation: {
        "TRR-APP": {
          required_env_example_keys: string[];
        };
      };
    };

    const envKeys = readEnvKeys(fs.readFileSync(envExamplePath, "utf-8"));
    expect(new Set(manifest.repo_validation["TRR-APP"].required_env_example_keys)).toEqual(
      new Set(["TRR_API_URL", "TRR_DB_URL", "TRR_DB_FALLBACK_URL", "TRR_INTERNAL_ADMIN_SHARED_SECRET", "SCREENALYTICS_API_URL"]),
    );
    for (const key of manifest.repo_validation["TRR-APP"].required_env_example_keys) {
      expect(envKeys.has(key), `missing ${key} in apps/web/.env.example`).toBe(true);
    }
  });
});
