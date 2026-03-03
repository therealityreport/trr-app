import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADVANCED_FILTERS,
  clearAdvancedFilters,
  countActiveAdvancedFilters,
  readAdvancedFilters,
  writeAdvancedFilters,
} from "@/lib/admin/advanced-filters";

describe("advanced filters references", () => {
  it("reads af_refs from search params", () => {
    const params = new URLSearchParams("af_refs=references,not_references");
    const filters = readAdvancedFilters(params);
    expect(filters.references).toEqual(["references", "not_references"]);
  });

  it("writes and clears af_refs in search params", () => {
    const params = new URLSearchParams();
    const withRefs = writeAdvancedFilters(params, {
      ...DEFAULT_ADVANCED_FILTERS,
      references: ["references"],
    });
    expect(withRefs.get("af_refs")).toBe("references");

    const cleared = writeAdvancedFilters(withRefs, {
      ...DEFAULT_ADVANCED_FILTERS,
      references: [],
    });
    expect(cleared.get("af_refs")).toBeNull();
  });

  it("counts references as an active advanced filter", () => {
    const next = {
      ...DEFAULT_ADVANCED_FILTERS,
      references: ["not_references"],
    };
    expect(countActiveAdvancedFilters(next)).toBe(1);
    expect(clearAdvancedFilters().references).toEqual([]);
  });
});
