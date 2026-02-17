import { describe, expect, it } from "vitest";

import {
  canonicalizeCastRoleName,
  castRoleMatchesFilter,
  normalizeCastRoleList,
} from "@/lib/admin/cast-role-normalization";

describe("cast role normalization", () => {
  it("collapses self/themselves role variants into Self", () => {
    expect(canonicalizeCastRoleName("Self (as Autumn)")).toBe("Self");
    expect(canonicalizeCastRoleName("Self - Host")).toBe("Self");
    expect(canonicalizeCastRoleName("Themselves")).toBe("Self");
  });

  it("preserves canonical non-self roles", () => {
    expect(canonicalizeCastRoleName("Housewife")).toBe("Housewife");
    expect(canonicalizeCastRoleName("Friend")).toBe("Friend");
  });

  it("deduplicates canonicalized role lists", () => {
    expect(
      normalizeCastRoleList(["Self", "Self (as Jill)", "Themselves", "Housewife", "Self - Host"])
    ).toEqual(["Self", "Housewife"]);
  });

  it("matches filters based on canonical role labels", () => {
    expect(castRoleMatchesFilter("Self (as Meredith)", "Self")).toBe(true);
    expect(castRoleMatchesFilter("Themselves", "Self")).toBe(true);
    expect(castRoleMatchesFilter("Housewife", "Self")).toBe(false);
  });
});
