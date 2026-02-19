import { describe, expect, it } from "vitest";

import { buildTabHref, getTabFromQuery } from "@/app/admin/fonts/_components/tab-routing";

describe("admin fonts tab routing", () => {
  it("resolves tab query values including buttons", () => {
    expect(getTabFromQuery(null)).toBe("fonts");
    expect(getTabFromQuery("colors")).toBe("colors");
    expect(getTabFromQuery("buttons")).toBe("buttons");
    expect(getTabFromQuery("questions-forms")).toBe("questions");
    expect(getTabFromQuery("unknown")).toBe("fonts");
  });

  it("builds hrefs for all top-level tabs", () => {
    expect(buildTabHref("fonts")).toBe("/admin/fonts");
    expect(buildTabHref("colors")).toBe("/admin/fonts?tab=colors");
    expect(buildTabHref("buttons")).toBe("/admin/fonts?tab=buttons");
    expect(buildTabHref("questions")).toBe("/admin/fonts?tab=questions-forms");
  });
});
