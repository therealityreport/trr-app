import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

describe("show bravo sync modal wiring", () => {
  it("keeps orchestration in the route and delegates the modal workspace", () => {
    const route = readSource("../src/app/admin/trr-shows/[showId]/page.tsx");
    const modal = readSource("../src/components/admin/ShowBravoSyncModal.tsx");
    const preview = readSource("../src/components/admin/ShowBravoSyncPreviewStep.tsx");

    expect(route).toMatch(/<ShowBravoSyncModal/);
    expect(route).toMatch(/previewSyncByBravo/);
    expect(route).toMatch(/commitSyncByBravo/);
    expect(route).toMatch(/openSyncBravoConfirmStep/);
    expect(route).toMatch(/startSyncBravoFlow/);
    expect(route).toMatch(/syncBravoPreviewAbortControllerRef/);
    expect(route).toMatch(/import-bravo\/preview\/stream/);

    expect(route).not.toMatch(/ariaLabel="Sync by Bravo mode picker"/);
    expect(route).not.toMatch(/ariaLabel="Import by Bravo"/);
    expect(route).not.toMatch(/Probe Queue/);
    expect(modal).toMatch(/ariaLabel="Sync by Bravo mode picker"/);
    expect(modal).toMatch(/ariaLabel="Import by Bravo"/);
    expect(preview).toMatch(/Probe Queue/);
    expect(preview).toMatch(/Fandom Cast Coverage/);
    expect(preview).toMatch(/BRAVO_IMPORT_IMAGE_KIND_OPTIONS/);
  });

  it("keeps both extracted components presentational", () => {
    const contents = [
      readSource("../src/components/admin/ShowBravoSyncModal.tsx"),
      readSource("../src/components/admin/ShowBravoSyncPreviewStep.tsx"),
    ].join("\n");

    expect(contents).not.toMatch(/\bfetch\s*\(/);
    expect(contents).not.toMatch(/useEffect|useLayoutEffect|useState|useReducer/);
    expect(contents).not.toMatch(/["'`]\/api\//);
    expect(contents).not.toMatch(/FeaturedLogoDrawer|ShowBrandLogosSection/);
  });
});
