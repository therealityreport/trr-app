import { describe, expect, it } from "vitest";
import {
  parseSeasonCastRouteState,
  parseShowCastRouteState,
  writeSeasonCastRouteState,
  writeShowCastRouteState,
} from "@/lib/admin/cast-route-state";

describe("cast route state", () => {
  it("round-trips show cast route state with multi-select filters", () => {
    const initial = new URLSearchParams(
      "tab=cast&cast_q=Lisa&cast_sort=name&cast_order=asc&cast_img=yes&cast_seasons=1,6&cast_roles=role:friend,credit:Crew"
    );
    const parsed = parseShowCastRouteState(initial);
    expect(parsed.searchQuery).toBe("Lisa");
    expect(parsed.sortBy).toBe("name");
    expect(parsed.sortOrder).toBe("asc");
    expect(parsed.hasImageFilter).toBe("yes");
    expect(parsed.seasonFilters).toEqual([1, 6]);
    expect(parsed.roleAndCreditFilters).toEqual(["role:friend", "credit:Crew"]);

    const written = writeShowCastRouteState(new URLSearchParams(initial.toString()), parsed);
    expect(written.get("cast_q")).toBe("Lisa");
    expect(written.get("cast_sort")).toBe("name");
    expect(written.get("cast_order")).toBe("asc");
    expect(written.get("cast_img")).toBe("yes");
    expect(written.get("cast_seasons")).toBe("1,6");
    expect(written.get("cast_roles")).toBe("role:friend,credit:Crew");
  });

  it("round-trips season cast route state and preserves non-cast query params", () => {
    const initial = new URLSearchParams(
      "tab=cast&assets=media&cast_q=Heather&cast_roles=Housewife,Host&cast_credits=Cast,Guest"
    );
    const parsed = parseSeasonCastRouteState(initial);
    expect(parsed.searchQuery).toBe("Heather");
    expect(parsed.roleFilters).toEqual(["Housewife", "Host"]);
    expect(parsed.creditFilters).toEqual(["Cast", "Guest"]);

    const written = writeSeasonCastRouteState(new URLSearchParams(initial.toString()), parsed);
    expect(written.get("cast_q")).toBe("Heather");
    expect(written.get("cast_roles")).toBe("Housewife,Host");
    expect(written.get("cast_credits")).toBe("Cast,Guest");
    expect(written.get("tab")).toBe("cast");
    expect(written.get("assets")).toBe("media");
  });

  it("drops default/empty values when writing state", () => {
    const showWritten = writeShowCastRouteState(new URLSearchParams("tab=cast"), {
      searchQuery: "",
      sortBy: "episodes",
      sortOrder: "desc",
      hasImageFilter: "all",
      seasonFilters: [],
      roleAndCreditFilters: [],
    });
    expect(showWritten.get("cast_q")).toBeNull();
    expect(showWritten.get("cast_sort")).toBeNull();
    expect(showWritten.get("cast_order")).toBeNull();
    expect(showWritten.get("cast_img")).toBeNull();
    expect(showWritten.get("cast_seasons")).toBeNull();
    expect(showWritten.get("cast_roles")).toBeNull();
  });
});
