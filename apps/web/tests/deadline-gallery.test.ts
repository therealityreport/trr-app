import { describe, expect, it } from "vitest";

import {
  extractDeadlineGalleryItems,
  isDeadlineGalleryNonPhotoCaption,
  resolveDeadlineGalleryImageUrl,
} from "@/lib/admin/deadline-gallery";

const SAMPLE_GALLERY_HTML = `
  <script>
    var pmcGalleryExports = {
      "gallery": [
        {
          "image": "https://deadline.com/wp-content/uploads/2025/08/NUP_204746_06735_Heather.jpg",
          "slug": "nup_204746_06735_heather",
          "caption": "<p><strong>Heather Gay<\\/strong> embraces her next chapter as an empty nester.<\\/p>",
          "position": 1,
          "url": "https://deadline.com/gallery/the-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo/"
        },
        {
          "image": "https://deadline.com/wp-content/uploads/2025/08/RHOSLC_S6_KA_4x5_Clean.jpg",
          "slug": "rhoslc_s6_ka_4x5_clean",
          "caption": "<p>(L-R) Meredith Marks, Mary Cosby, Bronwyn Newport, Angie Katsanevas, Lisa Barlow, Heather Gay, Whitney Rose<\\/p>",
          "position": 2,
          "url": "https://deadline.com/gallery/the-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo/"
        }
      ]
    };
  </script>
`;

describe("deadline gallery helpers", () => {
  it("extracts gallery items from pmcGalleryExports", () => {
    expect(extractDeadlineGalleryItems(SAMPLE_GALLERY_HTML)).toEqual([
      {
        captionText: "Heather Gay embraces her next chapter as an empty nester.",
        imageUrl: "https://deadline.com/wp-content/uploads/2025/08/NUP_204746_06735_Heather.jpg",
        pageUrl: "https://deadline.com/gallery/the-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo/",
        position: 1,
        slug: "nup_204746_06735_heather",
      },
      {
        captionText:
          "(L-R) Meredith Marks, Mary Cosby, Bronwyn Newport, Angie Katsanevas, Lisa Barlow, Heather Gay, Whitney Rose",
        imageUrl: "https://deadline.com/wp-content/uploads/2025/08/RHOSLC_S6_KA_4x5_Clean.jpg",
        pageUrl: "https://deadline.com/gallery/the-real-housewives-of-salt-lake-city-season-6-cast-photos-bravo/",
        position: 2,
        slug: "rhoslc_s6_ka_4x5_clean",
      },
    ]);
  });

  it("resolves a direct image URL from the normalized asset caption", () => {
    expect(
      resolveDeadlineGalleryImageUrl(SAMPLE_GALLERY_HTML, {
        caption: "Heather Gay embraces her next chapter as an empty nester.",
      }),
    ).toBe("https://deadline.com/wp-content/uploads/2025/08/NUP_204746_06735_Heather.jpg");

    expect(
      resolveDeadlineGalleryImageUrl(SAMPLE_GALLERY_HTML, {
        caption:
          "(L-R) Meredith Marks, Mary Cosby, Bronwyn Newport, Angie Katsanevas, Lisa Barlow, Heather Gay, Whitney Rose",
      }),
    ).toBe("https://deadline.com/wp-content/uploads/2025/08/RHOSLC_S6_KA_4x5_Clean.jpg");
  });

  it("flags the scraped newsletter promo row as non-photo content", () => {
    expect(
      isDeadlineGalleryNonPhotoCaption("Get our Breaking News Alerts and Keep your inbox happy."),
    ).toBe(true);
    expect(isDeadlineGalleryNonPhotoCaption("Heather Gay embraces her next chapter.")).toBe(false);
  });
});
