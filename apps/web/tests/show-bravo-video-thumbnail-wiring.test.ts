import { describe, expect, it } from "vitest";

import { resolveBravoVideoThumbnailUrl } from "@/lib/admin/bravo-video-thumbnails";

describe("bravo video thumbnail resolution", () => {
  it("prefers hosted thumbnails before falling back to Bravo-provided image urls", () => {
    expect(
      resolveBravoVideoThumbnailUrl({
        hosted_image_url: " https://cdn.example.com/hosted.jpg ",
        image_url: "https://images.example.com/fallback.jpg",
        original_image_url: "https://images.example.com/original.jpg",
      })
    ).toBe("https://cdn.example.com/hosted.jpg");
  });

  it("falls back through image_url and original_image_url when hosted media is absent", () => {
    expect(
      resolveBravoVideoThumbnailUrl({
        hosted_image_url: null,
        image_url: "https://images.example.com/fallback.jpg",
        original_image_url: "https://images.example.com/original.jpg",
      })
    ).toBe("https://images.example.com/fallback.jpg");

    expect(
      resolveBravoVideoThumbnailUrl({
        hosted_image_url: "",
        image_url: " ",
        original_image_url: "https://images.example.com/original.jpg",
      })
    ).toBe("https://images.example.com/original.jpg");
  });

  it("returns null when no usable thumbnail source exists", () => {
    expect(
      resolveBravoVideoThumbnailUrl({
        hosted_image_url: null,
        image_url: "",
        original_image_url: " ",
      })
    ).toBeNull();
  });
});
