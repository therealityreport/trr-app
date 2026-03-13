import { afterEach, describe, expect, it } from "vitest";

import { buildHostedFontsStylesheetFromTemplates } from "@/lib/fonts/hosted-font-stylesheet";
import {
  DEFAULT_HOSTED_FONT_BASE_URL,
  HOSTED_FONT_PRELOADS,
  LEGACY_CLOUDFRONT_FONT_BASE_URL,
  buildHostedFontAssetPath,
  buildHostedFontUrl,
  getHostedFontBaseUrl,
} from "@/lib/fonts/hosted-fonts";

const ORIGINAL_HOSTED_FONT_BASE_URL = process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL;

afterEach(() => {
  if (ORIGINAL_HOSTED_FONT_BASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL;
    return;
  }

  process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL = ORIGINAL_HOSTED_FONT_BASE_URL;
});

describe("hosted font helpers", () => {
  it("falls back to the live R2 public host when no env override is set", () => {
    delete process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL;

    expect(getHostedFontBaseUrl()).toBe(DEFAULT_HOSTED_FONT_BASE_URL);
  });

  it("uses a trimmed NEXT_PUBLIC_HOSTED_FONT_BASE_URL override", () => {
    process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL = "https://fonts.example.test///";

    expect(getHostedFontBaseUrl()).toBe("https://fonts.example.test");
  });

  it("builds upstream R2 URLs from the shared hosted font base", () => {
    const preloadUrl = buildHostedFontUrl(
      HOSTED_FONT_PRELOADS[0]?.assetPath ?? "",
      "https://fonts.example.test/",
    );

    expect(preloadUrl).toBe(
      "https://fonts.example.test/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf",
    );
  });

  it("builds same-origin asset paths for runtime preloads", () => {
    expect(buildHostedFontAssetPath(HOSTED_FONT_PRELOADS[1]?.assetPath ?? "")).toBe(
      "/fonts/monotype/Gloucester/GloucesterOldStyle-5735713.ttf",
    );
  });

  it("rewrites legacy CloudFront templates to same-origin hosted font asset paths", () => {
    const css = buildHostedFontsStylesheetFromTemplates(
      [
        `@font-face { src: url("${LEGACY_CLOUDFRONT_FONT_BASE_URL}/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf") format("opentype"); }`,
        `@font-face { src: url("${LEGACY_CLOUDFRONT_FONT_BASE_URL}/fonts/realitease/NYTKarnak_Condensed.woff2") format("woff2"); }`,
      ],
      "https://fonts.example.test/",
    );

    expect(css).toContain(
      'url("/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf")',
    );
    expect(css).toContain(
      'url("/fonts/realitease/NYTKarnak_Condensed.woff2")',
    );
    expect(css).not.toContain(LEGACY_CLOUDFRONT_FONT_BASE_URL);
  });
});
