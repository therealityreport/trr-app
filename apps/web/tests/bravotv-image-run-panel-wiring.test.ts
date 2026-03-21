import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(import.meta.dirname, relativePath), "utf8");

describe("bravotv image run panel wiring", () => {
  it("renders the shared panel on the person gallery page", () => {
    const contents = read("../src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx");

    expect(contents).toContain('import { BravotvImageRunPanel } from "@/components/admin/BravotvImageRunPanel"');
    expect(contents).toContain("<BravotvImageRunPanel");
    expect(contents).toContain('mode="person"');
    expect(contents).toContain("fetchPhotos()");
  });

  it("renders the shared panel on the show assets page", () => {
    const contents = read("../src/app/admin/trr-shows/[showId]/page.tsx");

    expect(contents).toContain('import { BravotvImageRunPanel } from "@/components/admin/BravotvImageRunPanel"');
    expect(contents).toContain("<BravotvImageRunPanel");
    expect(contents).toContain('mode="show"');
    expect(contents).toContain("loadGalleryAssets(selectedGallerySeason)");
  });
});
