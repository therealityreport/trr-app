import { describe, expect, it } from "vitest";

import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

describe("hosted-media", () => {
  it("rewrites legacy CloudFront media-variant URLs onto the canonical hosted-media base", () => {
    expect(
      canonicalizeHostedMediaUrl(
        "https://d1fmdyqfafwim3.cloudfront.net/media-variants/asset-1/base/card.webp",
      ),
    ).toBe("https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media-variants/asset-1/base/card.webp");
  });

  it("rewrites legacy CloudFront cast-photo variant URLs onto the canonical hosted-media base", () => {
    expect(
      canonicalizeHostedMediaUrl(
        "https://d1fmdyqfafwim3.cloudfront.net/cast-photo-variants/asset-1/base/card.webp",
      ),
    ).toBe(
      "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/cast-photo-variants/asset-1/base/card.webp",
    );
  });

  it("rewrites legacy CloudFront face-crop URLs onto the canonical hosted-media base", () => {
    expect(
      canonicalizeHostedMediaUrl(
        "https://d1fmdyqfafwim3.cloudfront.net/face-crops/cast_photo/asset-1/example.jpg",
      ),
    ).toBe("https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/face-crops/cast_photo/asset-1/example.jpg");
  });

  it("leaves non-hosted external URLs unchanged", () => {
    expect(
      canonicalizeHostedMediaUrl("https://www.bravotv.com/sites/bravo/files/2025/08/rhoslc_s6_lisa_1x1.png"),
    ).toBe("https://www.bravotv.com/sites/bravo/files/2025/08/rhoslc_s6_lisa_1x1.png");
  });
});
