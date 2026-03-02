import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show settings links fandom visibility", () => {
  it("renders show pages section from persisted links and includes fandom copy", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/title: "Show Pages"/);
    expect(contents).toMatch(/Show wiki\/fandom pages/);
    expect(contents).toMatch(/links: sortLinks\(showPageLinks\)/);
    expect(contents).toMatch(/No links in this category yet\./);
    expect(contents).toMatch(/Add Link\(s\)/);
    expect(contents).toMatch(/Paste one or more URLs or handles/);
  });

  it("renders overview metadata sections and keeps cast announcements out of show-wide external IDs", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/External IDs/);
    expect(contents).toMatch(/Social Handles/);
    expect(contents).toMatch(/Season URL Coverage/);
    expect(contents).toMatch(/link\.link_kind !== "cast_announcement"/);
  });

  it("uses a single refresh control and a single in-flight links progress stream", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/runShowLinkDiscovery/);
    expect(contents).toMatch(/\{linksRefreshing \? "Refreshing Links\.\.\." : "Refresh Links"\}/);
    expect(contents).toMatch(/linksRefreshing && linksRefreshProgress/);
    expect(contents).toMatch(/\/links\/discover\/stream/);
    expect(contents).not.toMatch(/\/links\/discover["']/);
    expect(contents).toMatch(/\/links\?view=active/);
    expect(contents).not.toMatch(/Discovering\.\.\./);
  });

  it("keeps wikipedia and wikidata distinct and renders multi-url cast source pills", () => {
    const pagePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const pageContents = fs.readFileSync(pagePath, "utf8");
    const constantsPath = path.resolve(__dirname, "../src/lib/admin/show-page/constants.ts");
    const constantsContents = fs.readFileSync(constantsPath, "utf8");

    expect(pageContents).toMatch(/key: "wikipedia", label: "Wikipedia"/);
    expect(pageContents).toMatch(/key: "wikidata", label: "Wikidata"/);
    expect(pageContents).toMatch(/source\.urls\.map/);
    expect(pageContents).toMatch(/approvedUrl\.iconUrl/);
    expect(pageContents).toMatch(/resolveLinkPageTitle/);
    expect(pageContents).toMatch(/buildHostFaviconUrl/);
    expect(pageContents).toMatch(/link\.iconUrl/);
    expect(pageContents).toMatch(/if \(kind === "wikidata"\) return "wikidata";/);
    expect(pageContents).not.toMatch(/kind\.includes\("knowledge"\)/);
    expect(pageContents).toMatch(/approvedLinkCount/);
    expect(pageContents).toMatch(/Other Verified Links/);
    expect(pageContents).toMatch(/cards\.sort\(\(a, b\) => \{/);
    expect(pageContents).toMatch(/b\.approvedLinkCount - a\.approvedLinkCount/);
    expect(constantsContents).toMatch(/key: "wikipedia", label: "Wikipedia"/);
    expect(constantsContents).toMatch(/key: "wikidata", label: "Wikidata"/);
    expect(pageContents).not.toMatch(/Knowledge Graph/);
    expect(constantsContents).not.toMatch(/Knowledge Graph/);
  });
});
