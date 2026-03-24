import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildBrandFontArtifacts } from "@/lib/fonts/brand-fonts/generator.ts";
import discoveredArtifact from "@/lib/fonts/brand-fonts/generated/discovered-brand-font-snapshot.json";
import matchesArtifact from "@/lib/fonts/brand-fonts/generated/brand-font-match-results.json";
import registryArtifact from "@/lib/fonts/brand-fonts/generated/normalized-brand-font-registry.json";
import catalogArtifact from "@/lib/fonts/brand-fonts/generated/normalized-r2-font-catalog.json";
import { brandIdIsValid, MANUAL_INFERENCE_GATE } from "@/lib/fonts/brand-fonts/normalization.ts";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function stripGeneratedAt<T extends { generatedAt: string }>(artifact: T) {
  const stableFields = { ...artifact };
  delete stableFields.generatedAt;
  return stableFields;
}

describe("brand font artifacts", () => {
  it("stay in sync with the checked-in generated JSON", () => {
    const regenerated = buildBrandFontArtifacts(PROJECT_ROOT);

    expect(stripGeneratedAt(regenerated.discovered)).toEqual(stripGeneratedAt(discoveredArtifact));
    expect(stripGeneratedAt(regenerated.registry)).toEqual(stripGeneratedAt(registryArtifact));
    expect(stripGeneratedAt(regenerated.catalog)).toEqual(stripGeneratedAt(catalogArtifact));
    expect(stripGeneratedAt(regenerated.matches)).toEqual(stripGeneratedAt(matchesArtifact));
  });

  it("covers the discovered brand typography evidence without drift", () => {
    const discovered = discoveredArtifact.data;
    const registry = registryArtifact.data;
    const discoveredIds = new Set(discovered.map((entry) => entry.id));
    const coveredIds = new Set(registry.flatMap((entry) => entry.evidenceIds));
    const uncoveredIds = [...discoveredIds].filter((id) => !coveredIds.has(id));
    const uniqueBrandRoots = new Set(discovered.map((entry) => entry.brandId.split(":")[0]));
    const lowConfidenceManualInferenceCount = registry.filter(
      (entry) => entry.provenance === "manual-inference" && entry.confidence === "low",
    ).length;

    expect(uniqueBrandRoots.size).toBe(8);
    expect(uncoveredIds).toEqual([]);
    expect(lowConfidenceManualInferenceCount / registry.length).toBeLessThanOrEqual(MANUAL_INFERENCE_GATE);
  });

  it("enforces brandId validity and uniqueness across the registry", () => {
    const registry = registryArtifact.data;
    const recordKeys = new Set<string>();

    for (const entry of registry) {
      expect(brandIdIsValid(entry.brandId)).toBe(true);
      const recordKey = `${entry.brandId}::${entry.roleLabel}`;
      expect(recordKeys.has(recordKey)).toBe(false);
      recordKeys.add(recordKey);
    }
  });

  it("only emits typed credible matches or an explicit no-credible-match state", () => {
    for (const entry of matchesArtifact.data) {
      if (entry.status === "no-credible-match") {
        expect(entry.matches).toEqual([]);
        continue;
      }

      expect(entry.matches.length).toBeGreaterThan(0);
      expect(entry.matches.length).toBeLessThanOrEqual(3);

      for (const match of entry.matches) {
        expect(match.score).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it("includes multi-style additional TRR families in the normalized catalog", () => {
    const rudeSlab = catalogArtifact.data.find((entry) => entry.familyName === "Rude Slab");

    expect(rudeSlab).toBeDefined();
    expect(rudeSlab?.weightsNormalized).toEqual([100, 300, 400, 500, 700, 900]);
    expect(rudeSlab?.styles).toContain("italic");
    expect(rudeSlab?.widthsNormalized).toContain("expanded");
  });
});
