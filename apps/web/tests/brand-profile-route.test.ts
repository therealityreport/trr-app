import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { BRANDS_PROFILE_CACHE_NAMESPACE } from "@/lib/server/trr-api/brands-route-cache";

const {
  requireAdminMock,
  getBrandProfileBySlugMock,
  getBrandProfileSuggestionsMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBrandProfileBySlugMock: vi.fn(),
  getBrandProfileSuggestionsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/brand-profile-repository", () => ({
  getBrandProfileBySlug: getBrandProfileBySlugMock,
  getBrandProfileSuggestions: getBrandProfileSuggestionsMock,
}));

import { GET } from "@/app/api/admin/brands/profile/route";

const makePayload = (overrides?: Record<string, unknown>) => ({
  slug: "instagram",
  display_name: "Instagram",
  primary_target_id: "social:instagram.com",
  categories: ["social"],
  counts: {
    targets: 1,
    shows: 1,
    assets: 2,
  },
  targets: [
      {
        id: "social:instagram.com",
        target_type: "social",
        target_key: "instagram.com",
        target_label: "Instagram",
        friendly_slug: "instagram",
        section_href: "/brands?category=social",
      detail_href: null,
      entity_slug: null,
      entity_id: null,
      available_show_count: 1,
      added_show_count: null,
      homepage_url: "https://instagram.com",
      wikipedia_url: null,
      wikidata_id: null,
      instagram_id: "instagram",
      twitter_id: null,
      tiktok_id: null,
      facebook_id: null,
      discovered_from: "https://instagram.com",
      discovered_from_urls: ["https://instagram.com"],
      source_link_kinds: ["host"],
      family: null,
      family_suggestions: [],
      shared_links: [],
      wikipedia_show_urls: [],
    },
  ],
  shows: [
    {
      id: "show-1",
      name: "The Valley",
      canonical_slug: "the-valley",
      poster_url: null,
      categories: ["social"],
      source_target_ids: ["social:instagram.com"],
      source_labels: ["Instagram"],
    },
  ],
  assets: [
    {
      id: "asset-1",
      target_id: "social:instagram.com",
      target_type: "social",
      target_key: "instagram.com",
      target_label: "Instagram",
      role: "wordmark",
      variant: "color",
      display_url: "https://cdn.example.com/instagram.svg",
      source_url: "https://instagram.com",
      source_provider: "official",
      discovered_from: "https://instagram.com",
      is_primary: true,
      is_selected_for_role: true,
      option_kind: "stored",
      updated_at: "2026-03-16T12:00:00Z",
    },
  ],
  social_profiles: [],
  ...overrides,
});

describe("brand profile route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBrandProfileBySlugMock.mockReset();
    getBrandProfileSuggestionsMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    invalidateRouteResponseCache(BRANDS_PROFILE_CACHE_NAMESPACE);
  });

  it("returns an exact network-only profile payload", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(
      makePayload({
        slug: "bravotv",
        display_name: "Bravo",
        primary_target_id: "network:bravo",
        categories: ["network"],
        counts: { targets: 1, shows: 3, assets: 3 },
        targets: [
          {
            ...makePayload().targets[0],
            id: "network:bravo",
            target_type: "network",
            target_key: "bravo",
            target_label: "Bravo",
            friendly_slug: "bravotv",
            section_href: "/brands?category=network",
            detail_href: "/brands/bravo",
            homepage_url: "https://bravotv.com",
            instagram_id: null,
            discovered_from: "https://bravotv.com",
            discovered_from_urls: ["https://bravotv.com"],
            source_link_kinds: ["homepage"],
          },
        ],
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/brands/profile?slug=bravotv"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBeTruthy();
    expect(payload.display_name).toBe("Bravo");
    expect(payload.categories).toEqual(["network"]);
  });

  it("returns an exact publication or social profile payload", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(makePayload());

    const response = await GET(
      new NextRequest("http://localhost/api/admin/brands/profile?slug=instagram"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-cache")).toBe("miss");
    expect(response.headers.get("x-trr-upstream-ms")).toBeTruthy();
    expect(payload.targets[0].target_type).toBe("social");
    expect(payload.targets[0].target_key).toBe("instagram.com");
  });

  it("returns a cache hit for repeated exact profile lookups", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(makePayload());

    const request = new NextRequest("http://localhost/api/admin/brands/profile?slug=instagram");
    const first = await GET(request);
    const second = await GET(request);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect(getBrandProfileBySlugMock).toHaveBeenCalledTimes(1);
  });

  it("returns a merged multi-target profile payload", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(
      makePayload({
        slug: "wikipedia",
        display_name: "Wikipedia",
        categories: ["publication", "other"],
        counts: { targets: 2, shows: 2, assets: 4 },
        targets: [
          {
            ...makePayload().targets[0],
            id: "publication:wikipedia.org",
            target_type: "publication",
            target_key: "wikipedia.org",
            target_label: "Wikipedia",
            friendly_slug: "wikipedia",
          },
          {
            ...makePayload().targets[0],
            id: "other:wikipedia",
            target_type: "other",
            target_key: "wikipedia",
            target_label: "Wikipedia",
            friendly_slug: "wikipedia",
          },
        ],
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/brands/profile?slug=wikipedia"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.counts.targets).toBe(2);
    expect(payload.categories).toEqual(["publication", "other"]);
  });

  it("returns suggestions when no exact match is found", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(null);
    getBrandProfileSuggestionsMock.mockResolvedValue([
      {
        slug: "fandom",
        label: "Fandom",
        target_type: "publication",
        target_key: "fandom.com",
        href: "/brands/fandom",
      },
    ]);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/brands/profile?slug=fan-dom"),
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("not_found");
    expect(payload.suggestions).toEqual([
      {
        slug: "fandom",
        label: "Fandom",
        target_type: "publication",
        target_key: "fandom.com",
        href: "/brands/fandom",
      },
    ]);
  });

  it("returns a clean other-brand payload when there are no related shows", async () => {
    getBrandProfileBySlugMock.mockResolvedValue(
      makePayload({
        slug: "evolution-media",
        display_name: "Evolution Media",
        categories: ["other"],
        counts: { targets: 1, shows: 0, assets: 1 },
        shows: [],
        targets: [
          {
            ...makePayload().targets[0],
            id: "other:evolution-media",
            target_type: "other",
            target_key: "evolution-media",
            target_label: "Evolution Media",
            friendly_slug: "evolution-media",
            source_link_kinds: [],
            discovered_from: null,
            discovered_from_urls: [],
          },
        ],
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/brands/profile?slug=evolution-media"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.counts.shows).toBe(0);
    expect(payload.shows).toEqual([]);
  });
});
