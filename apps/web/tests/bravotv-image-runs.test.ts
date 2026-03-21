import { describe, expect, it } from "vitest";

import {
  PERSON_BRAVOTV_SOURCE_OPTIONS,
  SHOW_BRAVOTV_SOURCE_OPTIONS,
  formatBravotvRunStatus,
  getBravotvSourceOptions,
  getBravotvSourcesForSelection,
  parseOptionalNumber,
} from "@/lib/admin/bravotv-image-runs";

describe("bravotv image run helpers", () => {
  it("returns person source options with run-all first", () => {
    expect(getBravotvSourceOptions("person")).toEqual(PERSON_BRAVOTV_SOURCE_OPTIONS);
    expect(PERSON_BRAVOTV_SOURCE_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "getty",
      "fandom",
      "imdb",
      "tmdb",
    ]);
  });

  it("keeps show mode scoped to the fused getty family", () => {
    expect(getBravotvSourceOptions("show")).toEqual(SHOW_BRAVOTV_SOURCE_OPTIONS);
    expect(getBravotvSourcesForSelection("show", "getty")).toEqual(["getty"]);
  });

  it("maps person source selections to backend payload families", () => {
    expect(getBravotvSourcesForSelection("person", "all")).toEqual(["all"]);
    expect(getBravotvSourcesForSelection("person", "getty")).toEqual(["getty"]);
    expect(getBravotvSourcesForSelection("person", "fandom")).toEqual(["fandom"]);
    expect(getBravotvSourcesForSelection("person", "imdb")).toEqual(["imdb"]);
    expect(getBravotvSourcesForSelection("person", "tmdb")).toEqual(["tmdb"]);
  });

  it("formats status and optional numbers defensively", () => {
    expect(formatBravotvRunStatus("replacement_pending")).toBe("Replacement Pending");
    expect(formatBravotvRunStatus("")).toBe("Unknown");
    expect(parseOptionalNumber(12)).toBe(12);
    expect(parseOptionalNumber("7")).toBe(7);
    expect(parseOptionalNumber("abc")).toBeNull();
  });
});
