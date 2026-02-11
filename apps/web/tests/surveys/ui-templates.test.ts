import { describe, expect, it } from "vitest";

import { UI_TEMPLATES } from "@/lib/surveys/ui-templates";

describe("UI_TEMPLATES", () => {
  it("has unique uiVariant entries", () => {
    const variants = UI_TEMPLATES.map((t) => t.uiVariant);
    expect(new Set(variants).size).toBe(variants.length);
  });

  it("defaultConfig.uiVariant matches uiVariant", () => {
    for (const t of UI_TEMPLATES) {
      // @ts-expect-error - runtime assertion for config shape
      expect(t.defaultConfig?.uiVariant).toBe(t.uiVariant);
    }
  });

  it("seeded options are well-formed when provided", () => {
    for (const t of UI_TEMPLATES) {
      if (!t.seedOptions) continue;
      expect(Array.isArray(t.seedOptions)).toBe(true);
      for (const opt of t.seedOptions) {
        expect(typeof opt.option_key).toBe("string");
        expect(opt.option_key.length).toBeGreaterThan(0);
        expect(typeof opt.option_text).toBe("string");
        expect(opt.option_text.length).toBeGreaterThan(0);
      }
    }
  });
});

