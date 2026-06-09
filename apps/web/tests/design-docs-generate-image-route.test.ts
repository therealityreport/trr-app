import { describe, expect, it } from "vitest";

import { resolveGeminiImageModel } from "@/app/api/design-docs/generate-image/route";

describe("design docs generate image route", () => {
  it("uses behavior-compatible Gemini image model defaults", () => {
    expect(resolveGeminiImageModel("flash", {})).toBe("gemini-3.1-flash-image-preview");
    expect(resolveGeminiImageModel("pro", {})).toBe("gemini-3-pro-image-preview");
  });

  it("allows Gemini image model IDs to be configured from env", () => {
    expect(
      resolveGeminiImageModel("flash", {
        GEMINI_FLASH_IMAGE_MODEL: " gemini-flash-image-stable ",
      }),
    ).toBe("gemini-flash-image-stable");
    expect(
      resolveGeminiImageModel("pro", {
        GEMINI_PRO_IMAGE_MODEL: "gemini-pro-image-stable",
      }),
    ).toBe("gemini-pro-image-stable");
  });

  it("falls back to defaults when env overrides are blank", () => {
    expect(resolveGeminiImageModel("flash", { GEMINI_FLASH_IMAGE_MODEL: " " })).toBe(
      "gemini-3.1-flash-image-preview",
    );
    expect(resolveGeminiImageModel("pro", { GEMINI_PRO_IMAGE_MODEL: "" })).toBe(
      "gemini-3-pro-image-preview",
    );
  });
});
