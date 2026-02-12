import { describe, expect, it } from "vitest";
import {
  buildMissingVariantBreakdown,
  getMissingVariantKeys,
  hasMissingVariants,
} from "@/lib/admin/gallery-diagnostics";

describe("gallery diagnostics variant checks", () => {
  it("returns no missing keys when base card/detail exist", () => {
    const metadata = {
      variants: {
        base: {
          card: { webp: { url: "https://cdn.example/card.webp" } },
          detail: { webp: { url: "https://cdn.example/detail.webp" } },
        },
      },
    };
    expect(getMissingVariantKeys(metadata)).toEqual([]);
    expect(hasMissingVariants(metadata)).toBe(false);
  });

  it("flags base.card and base.detail when missing", () => {
    const metadata = { variants: { base: {} } };
    expect(getMissingVariantKeys(metadata)).toEqual(["base.card", "base.detail"]);
  });

  it("uses display_url/detail_url direct metadata fallbacks", () => {
    const metadata = {
      display_url: "https://cdn.example/display.jpg",
      detail_url: "https://cdn.example/detail.jpg",
    };
    expect(getMissingVariantKeys(metadata)).toEqual([]);
  });

  it("flags crop variants when active crop signature is present", () => {
    const metadata = {
      variants: {
        base: {
          card: { jpg: { url: "https://cdn.example/base-card.jpg" } },
          detail: { jpg: { url: "https://cdn.example/base-detail.jpg" } },
        },
        "manual:50:50:1.2": {
          crop_card: { webp: { url: "https://cdn.example/crop-card.webp" } },
        },
      },
      active_crop_signature: "manual:50:50:1.2",
    };
    expect(getMissingVariantKeys(metadata)).toEqual(["crop_detail"]);
  });

  it("builds unique missing variant counts across assets", () => {
    const breakdown = buildMissingVariantBreakdown([
      { variants: { base: {} } },
      {
        variants: {
          base: {
            card: { webp: { url: "https://cdn.example/c.webp" } },
          },
        },
      },
      {
        variants: {
          base: {
            card: { webp: { url: "https://cdn.example/c2.webp" } },
            detail: { webp: { url: "https://cdn.example/d2.webp" } },
          },
          crop_sig: {},
        },
        active_crop_signature: "crop_sig",
      },
    ]);

    expect(breakdown).toEqual([
      { key: "base.detail", count: 2 },
      { key: "base.card", count: 1 },
      { key: "crop_card", count: 1 },
      { key: "crop_detail", count: 1 },
    ]);
  });
});
