import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("show detail assets tab extraction wiring", () => {
  const routePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
  const tabPath = path.resolve(
    __dirname,
    "../src/components/admin/show-tabs/ShowAssetsTab.tsx",
  );
  const routeContents = fs.readFileSync(routePath, "utf8");
  const tabContents = fs.readFileSync(tabPath, "utf8");

  it("keeps the complete assets UI in the lazy tab module", () => {
    expect(routeContents).toMatch(
      /dynamic\(\(\) => import\("@\/components\/admin\/show-tabs\/ShowAssetsTab"\)/,
    );
    expect(routeContents).toMatch(/<ShowAssetsTab[\s\S]*images=\{\{/);
    expect(routeContents).toMatch(/videos=\{\{/);
    expect(routeContents).toMatch(/branding=\{\{/);
    expect(tabContents).toContain("Fallback diagnostics:");
    expect(tabContents).toContain("No persisted Bravo videos found for this show.");
    expect(tabContents).toContain("Featured Images");
    expect(routeContents).not.toContain("No images found for this selection.");
    expect(routeContents).not.toContain("No persisted Bravo videos found for this show.");
    expect(routeContents).not.toMatch(/<ShowBrandEditor/);
  });

  it("keeps state, derivation, telemetry, and async orchestration route-owned", () => {
    expect(routeContents).toContain("const [assetsView, setAssetsView] = useState");
    expect(routeContents).toContain("const filteredGalleryAssets = useMemo");
    expect(routeContents).toContain("const gallerySectionAssets = useMemo");
    expect(routeContents).toContain("const loadGalleryAssets = useCallback");
    expect(routeContents).toContain("trackGalleryFallbackEvent");
    expect(routeContents).toContain("onOpenImport: () => {");
    expect(routeContents).toContain("setScrapeDrawerContext");
    expect(routeContents).toContain("setScrapeDrawerOpen(true)");
    expect(tabContents).not.toMatch(/\buse(?:State|Effect|Memo|Callback|Ref)\b/);
    expect(tabContents).not.toMatch(/fetch\(|\/api\/admin/);
  });

  it("preserves the assets tabpanel accessibility contract", () => {
    expect(tabContents).toContain('id="show-tabpanel-assets"');
    expect(tabContents).toContain('role="tabpanel"');
    expect(tabContents).toContain('aria-labelledby="show-tab-assets"');
  });
});
