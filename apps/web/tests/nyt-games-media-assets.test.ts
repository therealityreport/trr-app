import { readFileSync } from "node:fs";
import path from "node:path";

import {
  NYT_GAMES_PUBLIC_ASSETS,
  NYT_GAMES_SOURCE_COMPONENTS,
  NYT_GAMES_SOURCE_COMPONENT_DATA,
} from "@/components/admin/design-docs/sections/games/nyt-games-public-assets";

const TEST_DIR = path.dirname(new URL(import.meta.url).pathname);

describe("nyt-games media manifest", () => {
  it("provides display metadata and unique file keys for every mirrored asset", () => {
    const files = new Set<string>();

    for (const asset of NYT_GAMES_PUBLIC_ASSETS) {
      expect(asset.label).toBeTruthy();
      expect(asset.kind).toBeTruthy();
      expect(asset.file).toBeTruthy();
      expect(asset.source).toBeTruthy();
      expect(asset.r2).toContain("pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/images/design-docs/nyt-games/");
      expect(asset.display.slot).toBeTruthy();
      expect(asset.display.desktop.width).toBeGreaterThan(0);
      expect(asset.display.desktop.height).toBeGreaterThan(0);
      expect(files.has(asset.file)).toBe(false);
      files.add(asset.file);
    }
  });

  it("keeps the source-backed NYT Games specimens on mirrored assets", () => {
    expect(NYT_GAMES_SOURCE_COMPONENT_DATA.monthlyBonus.progressAsset.r2).toContain(".r2.dev/");
    expect(NYT_GAMES_SOURCE_COMPONENT_DATA.featuredArticle.image.r2).toContain(".r2.dev/");
    expect(
      NYT_GAMES_SOURCE_COMPONENT_DATA.crossplayCta.hamburgerIcons.every((asset) =>
        asset.r2.includes(".r2.dev/"),
      ),
    ).toBe(true);
  });

  it("includes the slot-specific nav, CTA, and supplemental portfolio assets", () => {
    const assetIds = new Set(NYT_GAMES_PUBLIC_ASSETS.map((asset) => asset.file));

    expect(assetIds.has("icons/docs/toc-outline.png")).toBe(true);
    expect(assetIds.has("icons/drawer/pips.svg")).toBe(true);
    expect(assetIds.has("icons/drawer/crossplay.svg")).toBe(true);
    expect(assetIds.has("icons/cta/crossplay-app-icon-rounded.svg")).toBe(true);
    expect(assetIds.has("icons/cta/pips-appdownload-cta.svg")).toBe(true);
    expect(assetIds.has("icons/cta/inline-games-all.svg")).toBe(true);
  });

  it("keeps the screenshot-backed source component inventory in generated data", () => {
    const componentIds = new Set(NYT_GAMES_SOURCE_COMPONENTS.map((component) => component.id));

    expect(componentIds.has("playbook-palette-index")).toBe(true);
    expect(componentIds.has("foundation-moments-buttons")).toBe(true);
    expect(componentIds.has("hub-guide-promo")).toBe(true);
    expect(componentIds.has("hub-print-modal")).toBe(true);
    expect(componentIds.has("hub-shared-accordion")).toBe(true);
  });

  it("does not leave direct NYT asset URLs in the rendered component sources", () => {
    const files = [
      path.resolve(TEST_DIR, "../src/components/admin/design-docs/sections/games/HubComponents.tsx"),
      path.resolve(
        TEST_DIR,
        "../src/components/admin/design-docs/sections/games/BrandNYTGamesResources.tsx",
      ),
      path.resolve(
        TEST_DIR,
        "../src/components/admin/design-docs/sections/games/NYTGamesPreviewShell.tsx",
      ),
    ];

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      expect(contents.includes("nytimes.com/games-assets")).toBe(false);
      expect(contents.includes("/design-docs/nyt-games/")).toBe(false);
      expect(contents.includes("static.thenounproject.com")).toBe(false);
    }
  });
});
