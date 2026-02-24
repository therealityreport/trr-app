import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show featured image lightbox wiring", () => {
  it("tracks featured poster/backdrop ids on the show model", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/primary_poster_image_id\?: string \| null/);
    expect(contents).toMatch(/primary_backdrop_image_id\?: string \| null/);
    expect(contents).toMatch(/const setFeaturedShowImage = useCallback/);
  });

  it("wires featured poster/backdrop actions and state into ImageLightbox", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/trr-shows/[showId]/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/onSetFeaturedPoster=/);
    expect(contents).toMatch(/onSetFeaturedBackdrop=/);
    expect(contents).toMatch(/isFeaturedPoster=\{isFeaturedPoster\}/);
    expect(contents).toMatch(/isFeaturedBackdrop=\{isFeaturedBackdrop\}/);
    expect(contents).toMatch(/origin_table === "show_images"/);
  });
});
