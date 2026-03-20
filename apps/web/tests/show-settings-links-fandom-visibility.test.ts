import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show settings links UI structure", () => {
  const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const contents = fs.readFileSync(filePath, "utf8");

  it("defines explicit settings sections and removes fandom seeds from the add box", () => {
    expect(contents).toMatch(/title: "Social Links"/);
    expect(contents).toMatch(/title: "Show Pages"/);
    expect(contents).toMatch(/title: "Season Pages"/);
    expect(contents).toMatch(/title: "Cast Member Pages"/);
    expect(contents).toMatch(/showSocialLinks = useMemo/);
    expect(contents).not.toMatch(/Active Fandom Seeds/);
    expect(contents).toMatch(/isFandomSeedUrl/);
    expect(contents).not.toMatch(/Google News Feed/);
    expect(contents).toMatch(/Google News topic URLs/);
  });

  it("renders show and season pages from page-centric helpers", () => {
    expect(contents).toMatch(/isRenderableShowPageLink/);
    expect(contents).toMatch(/getShowPageLinkTitle/);
    expect(contents).toMatch(/resolveShowPageDisplayTitle/);
    expect(contents).toMatch(/SourceBadge/);
    expect(contents).toMatch(/usesBrandIconOnly/);
    expect(contents).toMatch(/No season-scoped validated links yet\./);
    expect(contents).toMatch(/iconOnly=\{true\}/);
    expect(contents).not.toMatch(/Show wiki\/fandom pages/);
  });

  it("flattens cast member links and moves missing sources into an accordion", () => {
    expect(contents).toMatch(/approvedLinks,/);
    expect(contents).toMatch(/missingSources,/);
    expect(contents).toMatch(/const getCastMemberLinkText = \(link: EntityLink, personName: string\): string =>/);
    expect(contents).toMatch(/if \(badgeKind === "fandom"\) \{\s+return resolveLinkPageTitle\(link\) \|\| personName;/);
    expect(contents).toMatch(/const resolveCastMemberNameFromLinks = \(/);
    expect(contents).toMatch(/Missing \/ Unvalidated Sources/);
    expect(contents).toMatch(/No validated source URL found/);
    expect(contents).not.toMatch(/source\.urls\.map/);
    expect(contents).not.toMatch(/Other Verified Links/);
  });

  it("uses shared social-handle text normalization and keeps the compact pill in details", () => {
    expect(contents).toMatch(/function SocialHandlePill/);
    expect(contents).toMatch(/const extractSocialHandleFromUrl = \(url: string\): string \| null =>/);
    expect(contents).toMatch(/const normalizeSocialHandleValue = \(value: string\): string \| null =>/);
    expect(contents).toMatch(/key=\{`settings-social-link-\$\{pill\.id\}`\}/);
    expect(contents).toMatch(/<span className="truncate text-zinc-900">\{pill\.text\}<\/span>/);
    expect(contents).toMatch(/<SocialHandlePill key=\{`overview-social-link-/);
    expect(contents).toMatch(/overviewSocialHandleLinks = useMemo\(\(\) => showSocialLinks/);
  });

  it("makes persisted settings links editable with the shared editable component", () => {
    expect(contents).toMatch(/from "@\/components\/ui\/editable"/);
    expect(contents).toMatch(/function InlineEditableLinkUrl/);
    expect(contents).toMatch(/EditableTrigger/);
    expect(contents).toMatch(/EditableInput/);
    expect(contents).toMatch(/const updateShowLinkUrl = useCallback/);
    expect(contents).toMatch(/method: "PATCH"/);
    expect(contents).toMatch(/<InlineEditableLinkUrl/);
    expect(contents).toMatch(/Edit URL/);
    expect(contents).toMatch(/Save URL/);
    expect(contents).toMatch(/containerClassName="rounded-md border border-zinc-200 bg-white px-3 py-2"/);
  });
});
