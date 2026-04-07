import { describe, expect, it } from "vitest";
import {
  normalizeBrandStreamingServices,
  pickPrimaryBrandTarget,
  resolveBrandProfileTargets,
  toFriendlyBrandSlug,
  type BrandProfileMatchCandidate,
  type BrandProfileTarget,
} from "@/lib/admin/brand-profile";

const makeTarget = (
  id: string,
  target_type: BrandProfileTarget["target_type"],
  target_label: string,
): BrandProfileTarget => ({
  id,
  target_type,
  target_key: target_label.toLowerCase(),
  target_label,
  friendly_slug: toFriendlyBrandSlug(target_label),
  section_href: "/brands",
  detail_href: null,
  entity_slug: null,
  entity_id: null,
  available_show_count: null,
  added_show_count: null,
  homepage_url: null,
  wikipedia_url: null,
  wikidata_id: null,
  instagram_id: null,
  twitter_id: null,
  tiktok_id: null,
  facebook_id: null,
  discovered_from: null,
  discovered_from_urls: [],
  source_link_kinds: [],
  family: null,
  family_suggestions: [],
  shared_links: [],
  wikipedia_show_urls: [],
});

describe("brand profile utilities", () => {
  it.each([
    ["instagram.com", "instagram"],
    ["wikipedia.org", "wikipedia"],
    ["fandom.com", "fandom"],
    ["Evolution Media", "evolution-media"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(toFriendlyBrandSlug(input)).toBe(expected);
  });

  it("matches targets by exact friendly slug across host-backed keys and labels", () => {
    const candidates: BrandProfileMatchCandidate[] = [
      {
        target_type: "social",
        target_key: "instagram.com",
        target_label: "Instagram",
      },
      {
        target_type: "publication",
        target_key: "fandom.com",
        target_label: "Fandom",
      },
      {
        target_type: "other",
        target_key: "evolution-media",
        target_label: "Evolution Media",
      },
    ];

    expect(resolveBrandProfileTargets("instagram", candidates)).toEqual([candidates[0]]);
    expect(resolveBrandProfileTargets("fandom", candidates)).toEqual([candidates[1]]);
    expect(resolveBrandProfileTargets("evolution-media", candidates)).toEqual([candidates[2]]);
  });

  it("prefers networks over lower-priority target types for the primary identity", () => {
    const primary = pickPrimaryBrandTarget([
      makeTarget("social:instagram", "social", "Instagram"),
      makeTarget("network:bravo", "network", "Bravo"),
      makeTarget("publication:wiki", "publication", "Wikipedia"),
    ]);

    expect(primary?.id).toBe("network:bravo");
  });

  it("canonicalizes and dedupes streaming service aliases for brand profiles", () => {
    expect(
      normalizeBrandStreamingServices([
        "Peacock Premium",
        "Peacock Premium Plus",
        "Apple TV Store",
        "Amazon Video",
        "Amazon Prime Video",
        "Netflix",
        "netflix",
        "  ",
      ]),
    ).toEqual(["Apple TV", "Netflix", "Peacock", "Prime Video"]);
  });
});
