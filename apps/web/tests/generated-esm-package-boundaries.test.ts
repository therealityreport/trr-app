import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ESM_BOUNDARIES = [
  {
    packageDir: "src/lib/admin/api-references",
    scriptPath: "scripts/generate-admin-api-references.mjs",
    importedModule: "src/lib/admin/api-references/generator.ts",
  },
  {
    packageDir: "src/lib/fonts",
    scriptPath: "scripts/generate-brand-font-artifacts.mjs",
    importedModule: "src/lib/fonts/brand-fonts/generator.ts",
  },
] as const;

describe("generated artifact ESM package boundaries", () => {
  it("keeps Node from reparsing generated artifact TypeScript imports as typeless packages", () => {
    const projectRoot = process.cwd();

    for (const boundary of ESM_BOUNDARIES) {
      const packageJson = JSON.parse(
        readFileSync(join(projectRoot, boundary.packageDir, "package.json"), "utf8"),
      ) as { type?: string };
      const scriptSource = readFileSync(join(projectRoot, boundary.scriptPath), "utf8");

      expect(packageJson.type).toBe("module");
      expect(scriptSource).toContain(boundary.importedModule);
    }
  });
});
