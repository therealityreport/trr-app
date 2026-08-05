import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) =>
  readFileSync(resolve(import.meta.dirname, relativePath), "utf8");

describe("bravotv image run panel wiring", () => {
  it("keeps person gallery bravotv support inside the main image pipeline", () => {
    const contents = read("../src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx");

    expect(contents).toContain('type BackendGetImagesSource = "getty" | "nbcumv" | "bravotv" | "imdb" | "tmdb"');
    expect(contents).toContain('const GET_IMAGES_SOURCE_SELECTION_MAP');
    expect(contents).toContain('all: ["nbcumv", "imdb", "tmdb"]');
    expect(contents).toContain("fetchPhotos()");
  });

  it("renders the shared panel on the show assets page", () => {
    const routeContents = read("../src/app/admin/trr-shows/[showId]/page.tsx");
    const tabContents = read("../src/components/admin/show-tabs/ShowAssetsTab.tsx");

    expect(tabContents).toContain(
      'import { BravotvImageRunPanel } from "@/components/admin/BravotvImageRunPanel"',
    );
    expect(tabContents).toContain("<BravotvImageRunPanel");
    expect(tabContents).toContain('mode="show"');
    expect(routeContents).toContain("onRunCompleted: async () => {");
    expect(routeContents).toContain("loadGalleryAssets(selectedGallerySeason)");
    expect(routeContents).toContain("gallerySeasonInitialized");
    expect(routeContents).toContain("newestVisibleSeason");
  });
});
