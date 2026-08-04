import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("show detail settings tab extraction wiring", () => {
  const routePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const tabPath = path.resolve(__dirname, "../src/components/admin/show-tabs/ShowSettingsTab.tsx");
  const badgesPath = path.resolve(__dirname, "../src/components/admin/ShowLinkBadges.tsx");
  const linkModelPath = path.resolve(
    __dirname,
    "../src/lib/admin/show-page/show-link-display-model.ts"
  );
  const routeContents = fs.readFileSync(routePath, "utf8");
  const tabContents = fs.readFileSync(tabPath, "utf8");
  const badgesContents = fs.readFileSync(badgesPath, "utf8");
  const linkModelContents = fs.readFileSync(linkModelPath, "utf8");

  it("keeps the settings UI in the lazy tab module", () => {
    expect(routeContents).toMatch(
      /dynamic\(\(\) => import\("@\/components\/admin\/show-tabs\/ShowSettingsTab"\)/
    );
    expect(routeContents).toMatch(/<ShowSettingsTab[\s\S]*header=\{\{/);
    expect(tabContents).toMatch(/Editable Metadata/);
    expect(tabContents).toMatch(/Role Catalog/);
    expect(tabContents).toMatch(/Paste one or more URLs or handles/);
    expect(tabContents).toMatch(/Loading Reddit communities/);
    expect(routeContents).not.toMatch(/Editable Metadata/);
    expect(routeContents).not.toMatch(/Role Catalog/);
    expect(routeContents).not.toMatch(/Paste one or more URLs or handles/);
  });

  it("keeps route-owned state and mutations outside the tab implementation", () => {
    expect(routeContents).toMatch(/const syncShowScopedBrandLogos = useCallback/);
    expect(routeContents).toMatch(/const fetchShowLinks = useCallback/);
    expect(routeContents).toMatch(/const createShowRole = useCallback/);
    expect(routeContents).toMatch(/from "@\/components\/admin\/ShowLinkBadges"/);
    expect(routeContents).toMatch(/from "@\/lib\/admin\/show-page\/show-link-display-model"/);
    expect(badgesContents).toMatch(/export function SourceBadge/);
    expect(linkModelContents).toMatch(/export const getLinkSourceBadgeKind/);
    expect(routeContents).not.toMatch(/function InlineEditableLinkUrl/);
    expect(routeContents).not.toMatch(/const settingsLinkSections = useMemo/);
    expect(tabContents).toMatch(/function InlineEditableLinkUrl/);
    expect(tabContents).not.toMatch(/ShowBrandLogosSection|FeaturedLogoDrawer|\/api\/admin/);
  });

  it("preserves the settings tabpanel contract", () => {
    expect(tabContents).toMatch(/id="show-tabpanel-settings"/);
    expect(tabContents).toMatch(/role="tabpanel"/);
    expect(tabContents).toMatch(/aria-labelledby="show-tab-settings"/);
  });
});
