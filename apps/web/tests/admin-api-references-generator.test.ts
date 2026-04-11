import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderGeneratedAdminApiReferenceInventoryModule } from "@/lib/admin/api-references/generator";
import { GENERATED_ADMIN_API_REFERENCE_INVENTORY } from "@/lib/admin/api-references/generated/inventory";

describe("admin api references generator", () => {
  it("keeps the checked-in artifact in sync with source and overrides", () => {
    const projectRoot = process.cwd();
    const artifactPath = join(projectRoot, "src/lib/admin/api-references/generated/inventory.ts");
    const artifactSource = readFileSync(artifactPath, "utf8");
    const generatedAt = artifactSource.match(/"generatedAt": "([^"]+)"/)?.[1];
    const sourceCommitSha = artifactSource.match(/"sourceCommitSha": "([^"]+)"/)?.[1];

    expect(generatedAt).toBeTruthy();
    expect(sourceCommitSha).toBeTruthy();
    expect(
      renderGeneratedAdminApiReferenceInventoryModule(projectRoot, { generatedAt, sourceCommitSha }),
    ).toBe(artifactSource);
  });

  it("includes freshness metadata and manual backend repository mappings", () => {
    expect(GENERATED_ADMIN_API_REFERENCE_INVENTORY.inventorySchemaVersion).toBe("1.0.0");
    expect(GENERATED_ADMIN_API_REFERENCE_INVENTORY.generatorVersion).toBe("1.0.0");
    expect(GENERATED_ADMIN_API_REFERENCE_INVENTORY.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(GENERATED_ADMIN_API_REFERENCE_INVENTORY.sourceCommitSha).toHaveLength(40);
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
        (edge) =>
          edge.from === "backend:GET:/api/v1/admin/brands/families/by-entity" &&
          edge.to === "repo:src/lib/server/admin/brand-profile-repository.ts::module" &&
          edge.verificationStatus === "unverified_manual",
      ),
    ).toBe(true);
  });
});
