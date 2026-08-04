import { createHash } from "node:crypto";
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

  it("pins the v2 OpenAPI snapshot to a reproducible backend export", () => {
    const projectRoot = process.cwd();
    const snapshot = readFileSync(
      join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.json"),
    );
    const provenance = JSON.parse(
      readFileSync(
        join(projectRoot, "src/lib/server/trr-api/generated/openapi.v2.provenance.json"),
        "utf8",
      ),
    ) as {
      schemaVersion: number;
      backend: {
        repository: string;
        commit: string;
        contractPath: string;
        sha256: string;
        exportCheckCommand: string;
        crossRepoValidationCommand: string;
      };
    };

    expect(provenance.schemaVersion).toBe(1);
    expect(provenance.backend).toMatchObject({
      repository: "therealityreport/trr-backend",
      contractPath: "docs/api/openapi.v2.json",
      exportCheckCommand: "python scripts/dev/export_v2_openapi.py --check",
    });
    expect(provenance.backend.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(provenance.backend.sha256).toBe(
      createHash("sha256").update(snapshot).digest("hex"),
    );
    expect(provenance.backend.crossRepoValidationCommand).toContain("--backend-openapi");
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

  it("keeps helper-based admin backend proxy routes in the inventory", () => {
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
        (edge) =>
          edge.from === "route:POST:/api/admin/trr-api/media-assets/[assetId]/variants" &&
          edge.to === "backend:POST:/api/v1/admin/media-assets/[assetId]/variants" &&
          edge.basis.includes("static_scan:createAdminBackendProxyRoute"),
      ),
    ).toBe(true);
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
        (edge) =>
          edge.from === "route:POST:/api/admin/trr-api/cast-photos/[photoId]/variants" &&
          edge.to === "backend:POST:/api/v1/admin/cast-photos/[photoId]/variants" &&
          edge.basis.includes("static_scan:createAdminBackendProxyRoute"),
      ),
    ).toBe(true);
  });

  it("records explicit v2 covered-shows proxy edges without stale v1 edges", () => {
    const expectedEdges = [
      [
        "route:GET:/api/admin/covered-shows",
        "backend:GET:/api/v2/admin/covered-shows",
      ],
      [
        "route:POST:/api/admin/covered-shows",
        "backend:POST:/api/v2/admin/covered-shows",
      ],
      [
        "route:GET:/api/admin/covered-shows/[showId]",
        "backend:GET:/api/v2/admin/covered-shows/[showId]",
      ],
      [
        "route:DELETE:/api/admin/covered-shows/[showId]",
        "backend:DELETE:/api/v2/admin/covered-shows/[showId]",
      ],
    ];
    for (const [from, to] of expectedEdges) {
      expect(
        GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
          (edge) => edge.from === from && edge.to === to,
        ),
      ).toBe(true);
    }
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.nodes.some((node) =>
        node.id.includes("/api/v1/admin/covered-shows"),
      ),
    ).toBe(false);
  });

  it("records explicit v2 recent-people proxy edges without stale v1 edges", () => {
    const expectedEdges = [
      [
        "route:GET:/api/admin/recent-people",
        "backend:GET:/api/v2/admin/recent-people",
      ],
      [
        "route:POST:/api/admin/recent-people",
        "backend:POST:/api/v2/admin/recent-people",
      ],
    ];
    for (const [from, to] of expectedEdges) {
      expect(
        GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
          (edge) => edge.from === from && edge.to === to,
        ),
      ).toBe(true);
    }
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.nodes.some((node) =>
        node.id.includes("/api/v1/admin/recent-people"),
      ),
    ).toBe(false);
  });

  it("records the indirect v2 external-ID client edges", () => {
    const expectedEdges = [
      [
        "route:GET:/api/admin/trr-api/people/[personId]/external-ids",
        "backend:GET:/api/v2/admin/people/[personId]/external-ids",
      ],
      [
        "route:POST:/api/admin/social/landing",
        "backend:GET:/api/v2/admin/people/[personId]/external-ids",
      ],
      [
        "route:GET:/api/admin/social/landing",
        "backend:POST:/api/v2/admin/people/external-ids/batch",
      ],
      [
        "route:POST:/api/admin/social/landing",
        "backend:POST:/api/v2/admin/people/external-ids/batch",
      ],
      [
        "route:GET:/api/admin/social/landing",
        "backend:POST:/api/v2/admin/shows/external-ids/batch",
      ],
      [
        "route:POST:/api/admin/social/landing",
        "backend:POST:/api/v2/admin/shows/external-ids/batch",
      ],
    ];
    for (const [from, to] of expectedEdges) {
      expect(
        GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
          (edge) =>
            edge.from === from &&
            edge.to === to &&
            edge.verificationStatus === "verified",
        ),
      ).toBe(true);
    }
  });

  it("normalizes dynamic backend URL query templates without leaking template source", () => {
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.nodes.some(
        (node) =>
          node.id === "backend:GET:/api/v1/admin/people/socialblade/history" &&
          node.pathPattern === "/api/v1/admin/people/socialblade/history",
      ),
    ).toBe(true);
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.nodes.some((node) =>
        node.pathPattern?.includes("[query]`"),
      ),
    ).toBe(false);
    for (const node of GENERATED_ADMIN_API_REFERENCE_INVENTORY.nodes) {
      if (!node.pathPattern) continue;
      expect(node.pathPattern).not.toContain("?");
      expect(node.pathPattern).not.toContain("#");
      expect(node.pathPattern).not.toMatch(/\[(?:query|search|params|searchParams)\]/i);
    }
    expect(
      GENERATED_ADMIN_API_REFERENCE_INVENTORY.edges.some(
        (edge) =>
          edge.from === "route:GET:/api/admin/trr-api/social-growth/history" &&
          edge.to === "backend:GET:/api/v1/admin/people/socialblade/history",
      ),
    ).toBe(true);
  });
});
