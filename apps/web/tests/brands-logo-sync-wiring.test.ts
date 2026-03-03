import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("brands logo sync wiring", () => {
  it("wires global brands sync trigger", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/brands/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/sync/);
    expect(contents).toMatch(/scope:\s*"all"/);
    expect(contents).toMatch(/Sync All Brand Logos/);
  });

  it("wires news page sync, include_missing loading, and placeholder icon fallback", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/news/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/include_missing=true/);
    expect(contents).toMatch(/scope:\s*"page"/);
    expect(contents).toMatch(/page:\s*"news"/);
    expect(contents).toMatch(/PLACEHOLDER_ICON_PATH/);
    expect(contents).toMatch(/"\/icons\/brand-placeholder\.svg"/);
    expect(contents).toMatch(/allowDevAdminBypass:\s*true/);
    expect(contents).toMatch(/BrandLogoOptionsModal/);
  });

  it("wires other and shows page-scoped logo sync", () => {
    const otherPath = path.resolve(__dirname, "../src/app/admin/other/page.tsx");
    const showsPath = path.resolve(__dirname, "../src/app/brands/shows-and-franchises/page.tsx");
    const otherContents = fs.readFileSync(otherPath, "utf8");
    const showsContents = fs.readFileSync(showsPath, "utf8");

    expect(otherContents).toMatch(/scope:\s*"page"/);
    expect(otherContents).toMatch(/page:\s*"other"/);
    expect(otherContents).toMatch(/allowDevAdminBypass:\s*true/);
    expect(otherContents).toMatch(/BrandLogoOptionsModal/);
    expect(showsContents).toMatch(/scope:\s*"page"/);
    expect(showsContents).toMatch(/page:\s*"shows"/);
    expect(showsContents).toMatch(/BrandLogoOptionsModal/);
  });

  it("wires logo option proxy endpoints and modal save actions", () => {
    const modalPath = path.resolve(__dirname, "../src/components/admin/BrandLogoOptionsModal.tsx");
    const sourceRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/sources/route.ts");
    const discoverRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/discover/route.ts");
    const selectRoute = path.resolve(__dirname, "../src/app/api/admin/trr-api/brands/logos/options/select/route.ts");
    const modalContents = fs.readFileSync(modalPath, "utf8");
    const sourceContents = fs.readFileSync(sourceRoute, "utf8");
    const discoverContents = fs.readFileSync(discoverRoute, "utf8");
    const selectContents = fs.readFileSync(selectRoute, "utf8");

    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/sources/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/discover/);
    expect(modalContents).toMatch(/\/api\/admin\/trr-api\/brands\/logos\/options\/select/);
    expect(modalContents).toMatch(/Related logo pairing temporarily unavailable; discovery sources are still usable\./);
    expect(modalContents).toMatch(/buildSourceRows\(\[\], includeRelated, null, \[\]\)/);
    expect(sourceContents).toMatch(/\/admin\/brands\/logos\/options\/sources/);
    expect(discoverContents).toMatch(/\/admin\/brands\/logos\/options\/discover/);
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
