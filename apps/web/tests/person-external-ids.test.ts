import { describe, expect, it } from "vitest";
import {
  buildLegacyExternalIdsFromRecords,
  buildPersonExternalIdUrl,
  normalizePersonExternalIdValue,
  type PersonExternalIdRecord,
} from "@/lib/admin/person-external-ids";

describe("person external id helpers", () => {
  it("normalizes IMDb profile URLs down to the canonical name id", () => {
    expect(
      normalizePersonExternalIdValue("imdb", "https://www.imdb.com/name/nm1234567/?ref_=fn_al_nm_1"),
    ).toBe("nm1234567");
  });

  it("builds IMDb profile URLs from pasted IMDb URLs without nesting them", () => {
    expect(
      buildPersonExternalIdUrl("imdb", "https://www.imdb.com/name/nm1234567/?ref_=fn_al_nm_1"),
    ).toBe("https://www.imdb.com/name/nm1234567/");
  });

  it("normalizes Wikidata URLs to entity ids", () => {
    expect(normalizePersonExternalIdValue("wikidata", "https://www.wikidata.org/wiki/Q42?uselang=en")).toBe("Q42");
  });

  it("builds Wikidata URLs from pasted Wikidata links without duplicating the base URL", () => {
    expect(buildPersonExternalIdUrl("wikidata", "https://www.wikidata.org/wiki/Q42?uselang=en")).toBe(
      "https://www.wikidata.org/wiki/Q42",
    );
  });

  it("normalizes Facebook profile.php URLs to the numeric profile id", () => {
    expect(
      normalizePersonExternalIdValue("facebook", "https://www.facebook.com/profile.php?id=100094321234567"),
    ).toBe("100094321234567");
  });

  it("normalizes Facebook people URLs to the stable numeric profile id", () => {
    expect(
      normalizePersonExternalIdValue("facebook", "https://www.facebook.com/people/Jane-Doe/100094321234567/"),
    ).toBe("100094321234567");
  });

  it("normalizes Twitter intent URLs to the screen_name", () => {
    expect(
      normalizePersonExternalIdValue("twitter", "https://twitter.com/intent/user?screen_name=andy"),
    ).toBe("andy");
  });

  it("normalizes Threads profile URLs to the canonical handle", () => {
    expect(normalizePersonExternalIdValue("threads", "https://www.threads.net/@andycohen")).toBe("andycohen");
  });

  it("normalizes YouTube handle URLs even when extra tabs are present", () => {
    expect(normalizePersonExternalIdValue("youtube", "https://www.youtube.com/@bravotv/videos")).toBe("@bravotv");
  });

  it("normalizes YouTube channel URLs even when extra tabs are present", () => {
    expect(
      normalizePersonExternalIdValue("youtube", "https://www.youtube.com/channel/UCabc123/videos"),
    ).toBe("UCabc123");
  });

  it("normalizes YouTube user URLs even when extra tabs are present", () => {
    expect(
      normalizePersonExternalIdValue("youtube", "https://www.youtube.com/user/BravoTVOfficial/featured"),
    ).toBe("user/BravoTVOfficial");
  });

  it("normalizes YouTube custom c URLs even when extra tabs are present", () => {
    expect(normalizePersonExternalIdValue("youtube", "https://www.youtube.com/c/BravoTV/videos")).toBe(
      "c/BravoTV",
    );
  });

  it("builds YouTube URLs correctly for legacy user paths", () => {
    expect(buildPersonExternalIdUrl("youtube", "user/BravoTVOfficial")).toBe(
      "https://www.youtube.com/user/BravoTVOfficial",
    );
  });

  it("builds YouTube URLs correctly for custom c paths", () => {
    expect(buildPersonExternalIdUrl("youtube", "c/BravoTV")).toBe("https://www.youtube.com/c/BravoTV");
  });

  it("strips query strings and fragments from Fandom links", () => {
    expect(
      normalizePersonExternalIdValue(
        "fandom",
        "https://realhousewives.fandom.com/wiki/Lisa_Barlow?so=search#bio",
      ),
    ).toBe("https://realhousewives.fandom.com/wiki/Lisa_Barlow");
  });

  it("mirrors normalized IMDb identifiers into legacy external_ids fields", () => {
    const legacy = buildLegacyExternalIdsFromRecords([
      {
        id: 1,
        source_id: "imdb",
        external_id: "https://www.imdb.com/name/nm1234567/?ref_=fn_al_nm_1",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ] satisfies PersonExternalIdRecord[]);

    expect(legacy.imdb).toBe("nm1234567");
    expect(legacy.imdb_id).toBe("nm1234567");
  });

  it("mirrors normalized Facebook identifiers into legacy external_ids fields", () => {
    const legacy = buildLegacyExternalIdsFromRecords([
      {
        id: 2,
        source_id: "facebook",
        external_id: "https://www.facebook.com/people/Jane-Doe/100094321234567/",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ] satisfies PersonExternalIdRecord[]);

    expect(legacy.facebook).toBe("100094321234567");
    expect(legacy.facebook_id).toBe("100094321234567");
  });

  it("mirrors normalized Twitter identifiers into legacy external_ids fields", () => {
    const legacy = buildLegacyExternalIdsFromRecords([
      {
        id: 3,
        source_id: "twitter",
        external_id: "https://twitter.com/intent/user?screen_name=andy",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ] satisfies PersonExternalIdRecord[]);

    expect(legacy.twitter).toBe("andy");
    expect(legacy.twitter_id).toBe("andy");
  });

  it("builds Threads profile URLs from stored handles", () => {
    expect(buildPersonExternalIdUrl("threads", "andycohen")).toBe("https://www.threads.net/@andycohen");
  });

  it("mirrors normalized YouTube handle identifiers into legacy external_ids fields", () => {
    const legacy = buildLegacyExternalIdsFromRecords([
      {
        id: 4,
        source_id: "youtube",
        external_id: "https://www.youtube.com/@bravotv/videos",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ] satisfies PersonExternalIdRecord[]);

    expect(legacy.youtube).toBe("@bravotv");
    expect(legacy.youtube_id).toBe("@bravotv");
  });
});
