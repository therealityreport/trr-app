import { describe, expect, it } from "vitest";

import {
  buildDesignSystemHref,
  getDesignSystemTabFromLegacyQuery,
  resolveDesignSystemRoute,
} from "@/lib/admin/design-system-routing";

describe("design system routing", () => {
  it("maps legacy query values to canonical tab slugs", () => {
    expect(getDesignSystemTabFromLegacyQuery(null)).toBe("fonts");
    expect(getDesignSystemTabFromLegacyQuery("colors")).toBe("colors");
    expect(getDesignSystemTabFromLegacyQuery("buttons")).toBe("buttons");
    expect(getDesignSystemTabFromLegacyQuery("questions")).toBe("questions-forms");
    expect(getDesignSystemTabFromLegacyQuery("questions-forms")).toBe("questions-forms");
    expect(getDesignSystemTabFromLegacyQuery("nyt-occurrences")).toBe("nyt-occurrences");
    expect(getDesignSystemTabFromLegacyQuery("unknown")).toBe("fonts");
  });

  it("builds canonical hrefs for tabs and subtabs", () => {
    expect(buildDesignSystemHref("fonts")).toBe("/design-system/fonts");
    expect(buildDesignSystemHref("admin-labels")).toBe("/design-system/admin-labels");
    expect(buildDesignSystemHref("colors")).toBe("/design-system/colors");
    expect(buildDesignSystemHref("buttons")).toBe("/design-system/buttons");
    expect(buildDesignSystemHref("questions-forms")).toBe("/design-system/questions-forms");
    expect(buildDesignSystemHref("questions-forms", "admin")).toBe(
      "/design-system/questions-forms/admin",
    );
    expect(buildDesignSystemHref("components", "layout")).toBe("/design-system/components/layout");
    expect(buildDesignSystemHref("icons-illustrations", "logos")).toBe(
      "/design-system/icons-illustrations/logos",
    );
  });

  it("normalizes unknown tabs and invalid subtabs back to canonical routes", () => {
    expect(resolveDesignSystemRoute("fonts", null)).toEqual({
      tab: "fonts",
      subtab: null,
      isCanonical: true,
      canonicalHref: "/design-system/fonts",
    });

    expect(resolveDesignSystemRoute("admin-labels", null)).toEqual({
      tab: "admin-labels",
      subtab: null,
      isCanonical: true,
      canonicalHref: "/design-system/admin-labels",
    });

    expect(resolveDesignSystemRoute("questions-forms", ["admin"])).toEqual({
      tab: "questions-forms",
      subtab: "admin",
      isCanonical: true,
      canonicalHref: "/design-system/questions-forms/admin",
    });

    expect(resolveDesignSystemRoute("unknown", ["admin"])).toEqual({
      tab: "fonts",
      subtab: null,
      isCanonical: false,
      canonicalHref: "/design-system/fonts",
    });

    expect(resolveDesignSystemRoute("components", ["unknown"])).toEqual({
      tab: "components",
      subtab: null,
      isCanonical: false,
      canonicalHref: "/design-system/components",
    });
  });
});
