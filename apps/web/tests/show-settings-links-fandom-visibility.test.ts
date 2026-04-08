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
    expect(contents).toMatch(/Refresh Links/);
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

  it("renders Reddit and regional networks-streaming sections on the overview and settings pages", () => {
    expect(contents).toMatch(/<h4 className="text-sm font-semibold text-zinc-700">Reddit<\/h4>/);
    expect(contents).toMatch(/Open Reddit Admin/);
    expect(contents).toMatch(/Open Community/);
    expect(contents).toMatch(/Assigned Flairs/);
    expect(contents).toMatch(/Networks & Streaming/);
    expect(contents).toMatch(/watchProviderRegionOptions = useMemo/);
    expect(contents).toMatch(/resolveDefaultOverviewWatchProviderRegion/);
    expect(contents).toMatch(/aria-label="Availability region"/);
    expect(contents).toMatch(/Stream/);
    expect(contents).toMatch(/Free/);
    expect(contents).toMatch(/Rent \/ Buy/);
    expect(contents).toMatch(/Typed TMDb availability is unavailable for this show\./);
    expect(contents).not.toMatch(/overviewWatchAvailability\.map/);
    expect(contents).not.toMatch(/overviewStreamingProviders/);
    expect(contents).not.toMatch(/Brands \(Network & Streaming\)/);
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

  it("runs links refresh through a resumable progress modal with run and operation ids", () => {
    expect(contents).toMatch(/const buildLinksDiscoveryFlowScope = \(showId: string\): string =>/);
    expect(contents).toMatch(/buildLinkDiscoveryProgressSummary/);
    expect(contents).toMatch(/ariaLabel="Links discovery progress"/);
    expect(contents).toMatch(/Reconnected to Links refresh from this tab/);
    expect(contents).toMatch(/Run ID/);
    expect(contents).toMatch(/Operation ID/);
    expect(contents).toMatch(/remote worker/);
    expect(contents).toMatch(/const cancelShowLinksRefresh = useCallback/);
    expect(contents).toMatch(/\/api\/admin\/trr-api\/operations\/\$\{operationId\}\/cancel/);
    expect(contents).toMatch(/Cancel job/);
    expect(contents).toMatch(/Worker Monitor/);
    expect(contents).toMatch(/Correct \/ Live by Source/);
    expect(contents).toMatch(/Last stream update/);
  });

  it("filters settings cast-member coverage through a dedicated links-eligible roster", () => {
    expect(contents).toMatch(/const \[linksEligibleCast, setLinksEligibleCast\] = useState<TrrCastMember\[]>\(\[\]\)/);
    expect(contents).toMatch(/eligibilityMode: "links"/);
    expect(contents).toMatch(/const linksEligiblePersonIds = useMemo/);
    expect(contents).toMatch(/if \(linksEligiblePersonIds\.size > 0 && !linksEligiblePersonIds\.has\(personId\)\) continue;/);
  });

  it("adds exact and min\\/max episode filters to the credits gallery controls", () => {
    expect(contents).toMatch(/Episode Exact/);
    expect(contents).toMatch(/Episode Min/);
    expect(contents).toMatch(/Episode Max/);
    expect(contents).toMatch(/castExactEpisodeCount/);
    expect(contents).toMatch(/castMinEpisodeCount/);
    expect(contents).toMatch(/castMaxEpisodeCount/);
  });
});
