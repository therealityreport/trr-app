import { describe, expect, it } from "vitest";

import {
  classifyPersonLinkSource,
  extractSocialHandleFromUrl,
  getApprovedLinkText,
  getCastMemberLinkText,
  getLinkSourceBadgeKind,
  getLinkSourceLabel,
  getShowPageLinkTitle,
  getSourceBadgeOrder,
  isRenderableSeasonPageLink,
  isRenderableShowPageLink,
  normalizeEntityLinkStatus,
  normalizeSocialHandleValue,
  pickPreferredPersonSourceLink,
  resolveCastMemberNameFromLinks,
  toSocialPlatformIconKey,
  usesBrandIconOnly,
} from "@/lib/admin/show-page/show-link-display-model";
import type { EntityLink } from "@/lib/admin/show-page/workspace-model";

const makeLink = (overrides: Partial<EntityLink> = {}): EntityLink => ({
  id: "link-1",
  show_id: "show-1",
  entity_type: "show",
  entity_id: "show-1",
  season_number: 0,
  link_group: "official",
  link_kind: "official_page",
  label: null,
  url: "https://example.com/shows/test-show",
  status: "approved",
  confidence: null,
  source: null,
  metadata: null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

describe("show link display model", () => {
  it("normalizes statuses and classifies person-link source aliases", () => {
    expect(normalizeEntityLinkStatus(" APPROVED ")).toBe("approved");
    expect(normalizeEntityLinkStatus("rejected")).toBe("rejected");
    expect(normalizeEntityLinkStatus("unexpected")).toBe("pending");

    expect(classifyPersonLinkSource("bravo_profile")).toBe("bravo");
    expect(classifyPersonLinkSource("imdb_name")).toBe("imdb");
    expect(classifyPersonLinkSource("wikia")).toBe("fandom");
    expect(classifyPersonLinkSource("instagram")).toBeNull();
  });

  it("selects person sources by status, canonical kind, then stable label order", () => {
    const rejected = makeLink({
      id: "rejected",
      link_kind: "wikipedia",
      label: "A",
      status: "rejected",
    });
    const approvedAlias = makeLink({
      id: "approved-alias",
      link_kind: "wikipedia_mirror",
      label: "A",
    });
    const approvedCanonical = makeLink({
      id: "approved-canonical",
      link_kind: "wikipedia",
      label: "Z",
    });
    const links = [rejected, approvedAlias, approvedCanonical];

    expect(pickPreferredPersonSourceLink("wikipedia", links)?.id).toBe("approved-canonical");
    expect(links.map((link) => link.id)).toEqual([
      "rejected",
      "approved-alias",
      "approved-canonical",
    ]);
    expect(pickPreferredPersonSourceLink("wikipedia", [])).toBeNull();
  });

  it("maps source badges, labels, and ordering without losing site metadata", () => {
    const bravo = makeLink({
      url: "https://www.bravotv.com/the-real-housewives-of-salt-lake-city",
    });
    const fandom = makeLink({
      link_kind: "wikia",
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City",
      metadata: { site_title: "The Real Housewives Wiki" },
    });
    const twitter = makeLink({ link_group: "social", link_kind: "twitter" });
    const googleNews = makeLink({ link_kind: "google_news_url" });

    expect(getLinkSourceBadgeKind(bravo)).toBe("bravo");
    expect(getLinkSourceLabel(bravo)).toBe("Bravo TV");
    expect(getLinkSourceBadgeKind(fandom)).toBe("fandom");
    expect(getLinkSourceLabel(fandom)).toBe("The Real Housewives Wiki");
    expect(getLinkSourceBadgeKind(twitter)).toBe("x");
    expect(getLinkSourceBadgeKind(googleNews)).toBe("google_news");
    expect(getSourceBadgeOrder("official")).toBeLessThan(getSourceBadgeOrder("instagram"));
  });

  it("normalizes encoded social handles and uses them as approved-link text", () => {
    const instagram = makeLink({
      link_group: "social",
      link_kind: "instagram",
      label: "Instagram profile",
      url: "https://instagram.com/%40andy.cohen/",
    });

    expect(normalizeSocialHandleValue(" profile: @andy.cohen ")).toBe("@andy.cohen");
    expect(normalizeSocialHandleValue("%40bravotv")).toBe("@bravotv");
    expect(extractSocialHandleFromUrl(instagram.url)).toBe("@andy.cohen");
    expect(extractSocialHandleFromUrl("not a url")).toBeNull();
    expect(getApprovedLinkText(instagram, "Andy Cohen")).toBe("@andy.cohen");
    expect(getCastMemberLinkText(instagram, "Andy Cohen")).toBe("@andy.cohen");
  });

  it("keeps canonical show titles while using fandom page titles for cast links", () => {
    const fandom = makeLink({
      entity_type: "person",
      entity_id: "person-1",
      link_kind: "fandom",
      label: "Angie Katsanevas/Gallery",
      url: "https://real-housewives.fandom.com/wiki/Angie_Katsanevas/Gallery",
      metadata: { page_title: "Angie Katsanevas" },
    });
    const official = makeLink({
      label: "Legacy label",
      url: "https://example.com/shows/rhoslc",
    });

    expect(getShowPageLinkTitle(official, "The Real Housewives of Salt Lake City")).toBe(
      "The Real Housewives of Salt Lake City"
    );
    expect(getCastMemberLinkText(fandom, "Angie K.")).toBe("Angie Katsanevas");
  });

  it("resolves cast names by roster override, approval, and source priority", () => {
    const pendingBravo = makeLink({
      id: "bravo",
      entity_type: "person",
      entity_id: "person-1",
      link_kind: "bravo_profile",
      label: "Bravo Name",
      status: "pending",
    });
    const approvedWikipedia = makeLink({
      id: "wikipedia",
      entity_type: "person",
      entity_id: "person-1",
      link_kind: "wikipedia",
      label: "Wikipedia Name",
    });

    expect(resolveCastMemberNameFromLinks([pendingBravo, approvedWikipedia], null)).toBe(
      "Wikipedia Name"
    );
    expect(resolveCastMemberNameFromLinks([approvedWikipedia], " Roster Name ")).toBe(
      "Roster Name"
    );
    expect(resolveCastMemberNameFromLinks([], null)).toBe("Unknown Person");
  });

  it("only renders approved, page-shaped show and season links in their intended sections", () => {
    const showPage = makeLink();
    const seasonPage = makeLink({
      entity_type: "season",
      entity_id: "season-2",
      season_number: 2,
      link_kind: "fandom",
      url: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City/Season_2",
    });

    expect(isRenderableShowPageLink(showPage)).toBe(true);
    expect(isRenderableShowPageLink(makeLink({ status: "pending" }))).toBe(false);
    expect(
      isRenderableShowPageLink(
        makeLink({ link_group: "social", link_kind: "instagram", url: "https://instagram.com/rhoslc" })
      )
    ).toBe(false);
    expect(isRenderableShowPageLink(makeLink({ url: "https://example.com/" }))).toBe(false);

    expect(isRenderableSeasonPageLink(seasonPage)).toBe(true);
    expect(
      isRenderableSeasonPageLink(
        makeLink({
          entity_type: "season",
          season_number: 2,
          link_kind: "network_blog",
        })
      )
    ).toBe(false);
    expect(
      isRenderableSeasonPageLink(
        makeLink({
          entity_type: "season",
          season_number: 2,
          link_kind: "fandom",
          url: "https://real-housewives.fandom.com/",
        })
      )
    ).toBe(false);
  });

  it("maps social brands to shared icon keys and brand-only presentation", () => {
    expect(toSocialPlatformIconKey("x")).toBe("twitter");
    expect(toSocialPlatformIconKey("instagram")).toBe("instagram");
    expect(toSocialPlatformIconKey("official")).toBeNull();
    expect(usesBrandIconOnly("imdb")).toBe(true);
    expect(usesBrandIconOnly("instagram")).toBe(true);
    expect(usesBrandIconOnly("fandom")).toBe(false);
  });
});
