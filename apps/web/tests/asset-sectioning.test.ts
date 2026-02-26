import { describe, expect, it } from "vitest";

import {
  classifySeasonAssetSection,
  groupSeasonAssetsBySection,
} from "@/lib/admin/asset-sectioning";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const makeAsset = (overrides: Partial<SeasonAsset> = {}): SeasonAsset => ({
  id: overrides.id ?? "asset-1",
  type: overrides.type ?? "season",
  source: overrides.source ?? "fandom",
  kind: overrides.kind ?? "other",
  hosted_url: overrides.hosted_url ?? "https://cdn.example.com/asset.jpg",
  width: overrides.width ?? 1200,
  height: overrides.height ?? 800,
  caption: overrides.caption ?? null,
  context_section: overrides.context_section ?? null,
  context_type: overrides.context_type ?? null,
  metadata: overrides.metadata ?? null,
  ...overrides,
});

describe("asset-sectioning", () => {
  it("keeps cast photos strict to official season announcement", () => {
    const osaCast = makeAsset({
      kind: "cast",
      context_section: "official season announcement",
      metadata: {
        fandom_section_tag: "official_season_announcement",
      },
    });
    const nonOsaCast = makeAsset({
      id: "asset-2",
      kind: "cast",
      context_section: "promo",
    });

    expect(classifySeasonAssetSection(osaCast)).toBe("cast_photos");
    expect(classifySeasonAssetSection(nonOsaCast)).toBe("other");
  });

  it("classifies OSA profile-kind promos as cast photos", () => {
    const osaProfileKind = makeAsset({
      kind: "profile",
      context_section: "official_season_announcement",
      metadata: {
        fandom_section_tag: "official season announcement",
      },
    });

    expect(classifySeasonAssetSection(osaProfileKind)).toBe("cast_photos");
  });

  it("classifies dedicated section buckets", () => {
    expect(
      classifySeasonAssetSection(
        makeAsset({ kind: "confessional", metadata: { content_type: "CONFESSIONAL" } })
      )
    ).toBe("confessionals");
    expect(
      classifySeasonAssetSection(
        makeAsset({ kind: "reunion", metadata: { content_type: "REUNION" } })
      )
    ).toBe("reunion");
    expect(
      classifySeasonAssetSection(
        makeAsset({ kind: "intro", metadata: { content_type: "INTRO" } })
      )
    ).toBe("intro_card");
    expect(classifySeasonAssetSection(makeAsset({ type: "episode", kind: "still" }))).toBe(
      "episode_stills"
    );
    expect(classifySeasonAssetSection(makeAsset({ kind: "banner" }))).toBe("banners");
    expect(classifySeasonAssetSection(makeAsset({ kind: "poster" }))).toBe("posters");
    expect(classifySeasonAssetSection(makeAsset({ kind: "backdrop" }))).toBe("backdrops");
    expect(
      classifySeasonAssetSection(makeAsset({ context_type: "profile_picture", kind: "other" }))
    ).toBe("profile_pictures");
  });

  it("does not infer profile picture section from loose caption text alone", () => {
    const looselyProfileTagged = makeAsset({
      id: "asset-profile-false-positive",
      kind: "other",
      caption: "Season 5 profile update photo",
      context_type: null,
      context_section: null,
      metadata: {
        // Simulates noisy text fields that previously pushed inferred content type to PROFILE PICTURE.
        fandom_section_label: "General Media",
      },
    });

    expect(classifySeasonAssetSection(looselyProfileTagged)).toBe("other");
  });

  it("requires explicit profile signals for profile picture section", () => {
    const profileByKindOnly = makeAsset({
      id: "asset-profile-kind-only",
      kind: "profile",
      context_type: null,
      context_section: null,
      metadata: {},
    });

    expect(classifySeasonAssetSection(profileByKindOnly)).toBe("other");
  });

  it("groups assets by section with optional other exclusion", () => {
    const grouped = groupSeasonAssetsBySection(
      [
        makeAsset({ id: "a1", kind: "poster" }),
        makeAsset({ id: "a2", kind: "backdrop" }),
        makeAsset({ id: "a3", kind: "banner" }),
        makeAsset({ id: "a4", kind: "cast", context_section: "promo" }),
      ],
      { includeOther: false }
    );

    expect(grouped.banners).toHaveLength(1);
    expect(grouped.posters).toHaveLength(1);
    expect(grouped.backdrops).toHaveLength(1);
    expect(grouped.other).toHaveLength(0);
  });
});
