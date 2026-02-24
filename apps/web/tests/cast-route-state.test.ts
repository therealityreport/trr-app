import { describe, expect, it } from "vitest";
import {
  parseSeasonCastRouteState,
  parseShowCastRouteState,
  writeSeasonCastRouteState,
  writeShowCastRouteState,
} from "@/lib/admin/cast-route-state";

describe("cast route state", () => {
  it("reads canonical show keys and round-trips using canonical writers", () => {
    const initial = new URLSearchParams(
      "tab=cast&cast_q=Lisa&cast_sort=name&cast_order=asc&cast_img=yes&cast_seasons=1,6&cast_filters=role:friend,credit:Crew"
    );
    const parsed = parseShowCastRouteState(initial);
    expect(parsed.searchQuery).toBe("Lisa");
    expect(parsed.sortBy).toBe("name");
    expect(parsed.sortOrder).toBe("asc");
    expect(parsed.hasImageFilter).toBe("yes");
    expect(parsed.seasonFilters).toEqual([1, 6]);
    expect(parsed.filters).toEqual(["role:friend", "credit:Crew"]);

    const written = writeShowCastRouteState(new URLSearchParams(initial.toString()), parsed);
    expect(written.get("cast_q")).toBe("Lisa");
    expect(written.get("cast_sort")).toBe("name");
    expect(written.get("cast_order")).toBe("asc");
    expect(written.get("cast_img")).toBe("yes");
    expect(written.get("cast_seasons")).toBe("1,6");
    expect(written.get("cast_filters")).toBe("role:friend,credit:Crew");
    expect(written.get("cast_roles")).toBeNull();
  });

  it("reads legacy keys for backward compatibility", () => {
    const showLegacy = new URLSearchParams("cast_roles=role:host,credit:Cast");
    const parsedShow = parseShowCastRouteState(showLegacy);
    expect(parsedShow.filters).toEqual(["role:host", "credit:Cast"]);

    const seasonLegacy = new URLSearchParams("cast_roles=Housewife,Friend&cast_credits=Cast,Guest");
    const parsedSeason = parseSeasonCastRouteState(seasonLegacy);
    expect(parsedSeason.roleFilters).toEqual(["Housewife", "Friend"]);
    expect(parsedSeason.creditFilters).toEqual(["Cast", "Guest"]);
  });

  it("writes canonical season keys and preserves non-cast params", () => {
    const initial = new URLSearchParams(
      "tab=cast&assets=media&cast_q=Heather&cast_roles=legacyRole&cast_credits=legacyCredit"
    );
    const written = writeSeasonCastRouteState(new URLSearchParams(initial.toString()), {
      searchQuery: "Heather",
      sortBy: "episodes",
      sortOrder: "desc",
      hasImageFilter: "all",
      roleFilters: ["Housewife", "Host"],
      creditFilters: ["Cast", "Guest"],
    });

    expect(written.get("cast_q")).toBe("Heather");
    expect(written.get("cast_role_filters")).toBe("Housewife,Host");
    expect(written.get("cast_credit_filters")).toBe("Cast,Guest");
    expect(written.get("cast_roles")).toBeNull();
    expect(written.get("cast_credits")).toBeNull();
    expect(written.get("tab")).toBe("cast");
    expect(written.get("assets")).toBe("media");
  });

  it("drops default and empty values when writing state", () => {
    const showWritten = writeShowCastRouteState(new URLSearchParams("tab=cast"), {
      searchQuery: "",
      sortBy: "episodes",
      sortOrder: "desc",
      hasImageFilter: "all",
      seasonFilters: [],
      filters: [],
    });
    expect(showWritten.get("cast_q")).toBeNull();
    expect(showWritten.get("cast_sort")).toBeNull();
    expect(showWritten.get("cast_order")).toBeNull();
    expect(showWritten.get("cast_img")).toBeNull();
    expect(showWritten.get("cast_seasons")).toBeNull();
    expect(showWritten.get("cast_filters")).toBeNull();
  });
});
