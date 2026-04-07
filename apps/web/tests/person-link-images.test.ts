import { describe, expect, it } from "vitest";

import { pickPreferredPersonLinkFeaturedImage } from "@/lib/admin/show-page/person-link-images";

describe("person link featured image selection", () => {
  it("prefers approved Bravo profile images over other sources", () => {
    const imageUrl = pickPreferredPersonLinkFeaturedImage([
      {
        link_kind: "fandom",
        status: "approved",
        metadata: { featured_image_url: "https://cdn.example.com/fandom.jpg" },
      },
      {
        link_kind: "bravo_profile",
        status: "approved",
        metadata: { featured_image_url: "https://cdn.example.com/bravo.jpg" },
      },
    ]);

    expect(imageUrl).toBe("https://cdn.example.com/bravo.jpg");
  });

  it("ignores rejected or blank featured images", () => {
    const imageUrl = pickPreferredPersonLinkFeaturedImage([
      {
        link_kind: "bravo_profile",
        status: "rejected",
        metadata: { featured_image_url: "https://cdn.example.com/rejected.jpg" },
      },
      {
        link_kind: "imdb",
        status: "approved",
        metadata: { featured_image_url: "   " },
      },
      {
        link_kind: "fandom",
        status: "approved",
        metadata: { featured_image_url: "https://cdn.example.com/fandom.jpg" },
      },
    ]);

    expect(imageUrl).toBe("https://cdn.example.com/fandom.jpg");
  });
});
