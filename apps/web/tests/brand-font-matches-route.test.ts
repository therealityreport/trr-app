import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, buildBrandFontArtifactsMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  buildBrandFontArtifactsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/fonts/brand-fonts/generator.ts", () => ({
  buildBrandFontArtifacts: buildBrandFontArtifactsMock,
}));

import { GET as getBrandFontMatches } from "@/app/api/admin/design-system/brand-font-matches/route";

describe("brand font matches route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    buildBrandFontArtifactsMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("returns generated artifact data by default", async () => {
    const response = await getBrandFontMatches(
      new NextRequest("http://localhost/api/admin/design-system/brand-font-matches"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("generated-artifact");
    expect(payload.refreshMode).toBe("artifact");
    expect(payload.scoringMode).toBeDefined();
    expect(payload.visualEvidence).toBeDefined();
    expect(Array.isArray(payload.matches)).toBe(true);
    expect(buildBrandFontArtifactsMock).not.toHaveBeenCalled();
  });

  it("regenerates live matches when refresh is requested", async () => {
    buildBrandFontArtifactsMock.mockReturnValue({
      discovered: {
        schemaVersion: "schema",
        inputHash: "hash-1",
        generatedAt: "2026-03-22T12:00:00.000Z",
        scoringConfigVersion: "score-v2",
        data: [],
      },
      registry: {
        schemaVersion: "schema",
        inputHash: "hash-1",
        generatedAt: "2026-03-22T12:00:00.000Z",
        scoringConfigVersion: "score-v2",
        data: [{ brandId: "brand-nyt-cooking" }],
      },
      catalog: {
        schemaVersion: "schema",
        inputHash: "hash-1",
        generatedAt: "2026-03-22T12:00:00.000Z",
        scoringConfigVersion: "score-v2",
        data: [{ familyName: "Hamburg Serial" }, { familyName: "Franklin Gothic" }],
      },
      matches: {
        schemaVersion: "schema",
        inputHash: "hash-1",
        generatedAt: "2026-03-22T12:00:00.000Z",
        scoringConfigVersion: "score-v2",
        data: [
          {
            brandId: "brand-nyt-cooking",
            brandLabel: "NYT Cooking",
            roleLabel: "Ingredient List",
            roleType: "ui",
            sourceFontFamily: "Franklin Gothic",
            provenance: "design-doc-jsx",
            confidence: "high",
            evidenceLabel: "Ingredient List",
            evidenceExcerpt: "Ingredient label",
            evidencePath: {
              type: "file",
              path: "src/example.tsx",
              lineHint: 12,
            },
            matches: [],
            status: "no-credible-match",
            scoringMode: "metadata-only",
          },
        ],
      },
      scoringMode: "metadata-only",
      visualEvidenceHealth: {
        status: "stale",
        reason: "input-hash-mismatch",
        compatible: false,
        generatedAt: "2026-03-20T12:00:00.000Z",
        inputHash: "old-hash",
      },
    });

    const response = await getBrandFontMatches(
      new NextRequest("http://localhost/api/admin/design-system/brand-font-matches?refresh=1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.source).toBe("live-regenerated");
    expect(payload.refreshMode).toBe("local-rerank");
    expect(payload.scoringMode).toBe("metadata-only");
    expect(payload.visualEvidence.status).toBe("stale");
    expect(payload.registryCount).toBe(1);
    expect(payload.catalogCount).toBe(2);
    expect(payload.inputHash).toBe("hash-1");
    expect(buildBrandFontArtifactsMock).toHaveBeenCalledTimes(1);
  });
});
