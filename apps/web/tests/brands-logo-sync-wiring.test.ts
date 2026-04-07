import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("brands logo sync wiring", () => {
  it("wires unified brands sync and removes legacy network-only controls", () => {
    const filePath = path.resolve(__dirname, "../src/components/admin/UnifiedBrandsWorkspace.tsx");
    const configPath = path.resolve(__dirname, "../src/lib/admin/brands-workspace.ts");
    const contents = fs.readFileSync(filePath, "utf8");
    const configContents = fs.readFileSync(configPath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/sync/);
    expect(contents).toMatch(/scope:\s*"all"/);
    expect(contents).toMatch(/Sync Logos/);
    expect(configContents).toMatch(/Table View/);
    expect(configContents).toMatch(/Gallery View/);
    expect(contents).toMatch(/Missing Icon/);
    expect(contents).not.toMatch(/Sync\/Mirror Brands/);
    expect(contents).not.toMatch(/Re-run Unresolved Only/);
    expect(contents).not.toMatch(/Completion Gate/);
    expect(contents).toMatch(/PLACEHOLDER_ICON_PATH/);
    expect(contents).toMatch(/"\/icons\/brand-placeholder\.svg"/);
    expect(contents).toMatch(/allowDevAdminBypass:\s*true/);
    expect(contents).toMatch(/BrandLogoOptionsModal/);
  });

  it("keeps the page export pointed at the unified workspace component", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/brands/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/UnifiedBrandsWorkspace/);
  });

  it("wires logo option proxy endpoints and modal save actions", () => {
    const modalPath = path.resolve(__dirname, "../src/components/admin/BrandLogoOptionsModal.tsx");
    const modalRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/modal/route.ts");
    const discoverRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/discover/route.ts");
    const sourceQueryRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/source-query/route.ts");
    const selectRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/select/route.ts");
    const modalContents = fs.readFileSync(modalPath, "utf8");
    const modalRouteContents = fs.readFileSync(modalRoute, "utf8");
    const discoverContents = fs.readFileSync(discoverRoute, "utf8");
    const sourceQueryContents = fs.readFileSync(sourceQueryRoute, "utf8");
    const selectContents = fs.readFileSync(selectRoute, "utf8");

    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/modal/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/discover/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/source-query/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/source-suggestions/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/assign/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/select/);
    expect(modalContents).toMatch(/Related logo pairing temporarily unavailable; discovery sources are still usable\./);
    expect(modalContents).toMatch(/runWithConcurrency/);
    expect(modalContents).toMatch(/Add Manual Import/);
    expect(modalRouteContents).toMatch(/\/admin\/brands\/logos\/options\/modal/);
    expect(discoverContents).toMatch(/\/admin\/brands\/logos\/options\/discover/);
    expect(sourceQueryContents).toMatch(/\/admin\/brands\/logos\/options\/source-query/);
    expect(selectContents).toMatch(/\/admin\/brands\/logos\/options\/select/);
  });

  it("wires show settings scoped sync on the show page", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/syncShowScopedBrandLogos/);
    expect(contents).toMatch(/scope:\s*"show"/);
    expect(contents).toMatch(/show_id:\s*showId/);
    expect(contents).toMatch(/Sync Show Logo Targets/);
  });
});
