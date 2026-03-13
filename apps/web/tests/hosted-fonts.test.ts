import { afterEach, describe, expect, it } from "vitest";

import { buildHostedFontsStylesheetFromTemplates } from "@/lib/fonts/hosted-font-stylesheet";
import {
  DEFAULT_HOSTED_FONT_BASE_URL,
  HOSTED_FONT_PRELOADS,
  buildHostedFontAssetPath,
  buildHostedFontUrl,
  extractHostedFontAssetLinks,
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

  it("rewrites absolute hosted font templates to same-origin hosted font asset paths", () => {
    const css = buildHostedFontsStylesheetFromTemplates(
      [
        `@font-face { src: url("https://fonts.legacy.example/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf") format("opentype"); }`,
        `@font-face { src: url("${DEFAULT_HOSTED_FONT_BASE_URL}/fonts/realitease/NYTKarnak_Condensed.woff2") format("woff2"); }`,
      ],
      "https://fonts.example.test/",
    );

    expect(css).toContain(
      'url("/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf")',
    );
    expect(css).toContain(
      'url("/fonts/realitease/NYTKarnak_Condensed.woff2")',
    );
    expect(css).not.toContain("https://fonts.legacy.example");
    expect(css).not.toContain(DEFAULT_HOSTED_FONT_BASE_URL);
  });

  it("extracts concrete upstream font file links from hosted stylesheet css", () => {
    const fontAssetLinks = extractHostedFontAssetLinks(
      [
        '@font-face { font-family: "Beton"; src: url("/fonts/monotype/Beton/Beton%20T%20Extended%20Bold.ttf") format("truetype"); }',
        '@font-face { font-family: "Biotif Pro"; src: url("https://fonts.example.test/fonts/monotype/Biotif%20Pro/BiotifProBook-930829391.otf") format("opentype"); }',
      ].join("\n"),
      "https://fonts.example.test/",
    );

    expect(fontAssetLinks["Beton"]).toBe(
      "https://fonts.example.test/fonts/monotype/Beton/Beton%20T%20Extended%20Bold.ttf",
    );
    expect(fontAssetLinks["Biotif Pro"]).toBe(
      "https://fonts.example.test/fonts/monotype/Biotif%20Pro/BiotifProBook-930829391.otf",
    );
  });
});
