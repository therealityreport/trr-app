import { describe, expect, it } from "vitest";

import { buildPaletteExportBundle } from "@/lib/admin/color-lab/palette-export";

const PALETTE = ["#412733", "#383D73", "#1E2044", "#0E0B1A", "#1D101C", "#495194", "#BE8FB8"];

describe("color-lab export bundle", () => {
  it("emits CSS + SCSS blocks and gradients", () => {
    const bundle = buildPaletteExportBundle(PALETTE);

    expect(bundle.cssHex).toContain("/* CSS HEX */");
    expect(bundle.cssHsl).toContain("/* CSS HSL */");
    expect(bundle.scssHex).toContain("/* SCSS HEX */");
    expect(bundle.scssHsl).toContain("/* SCSS HSL */");
    expect(bundle.scssRgb).toContain("/* SCSS RGB */");
    expect(bundle.scssGradient).toContain("/* SCSS Gradient */");

    expect(bundle.scssGradient).toContain("$gradient-top");
    expect(bundle.scssGradient).toContain("$gradient-right");
    expect(bundle.scssGradient).toContain("$gradient-radial");

    expect(bundle.all).toContain("linear-gradient(0deg");
    expect(bundle.all).toContain("hsla(");
    expect(bundle.all).toContain("rgba(");
    expect(bundle.all).toMatch(/--[a-z0-9-]+:/);
  });
});
