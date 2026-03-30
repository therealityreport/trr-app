import { describe, expect, it } from "vitest";

import { buildDesignDocsPath, ADMIN_SOCIAL_PATH } from "@/lib/admin/admin-route-paths";
import { getBrandSubSections } from "@/lib/admin/design-docs-config";
import { ADMIN_JOB_DOCS } from "@/lib/admin/docs/job-catalog";

describe("admin route path parity", () => {
  it("keeps brand design-doc sublinks on the canonical design-docs namespace", () => {
    for (const sectionId of ["brand-nyt", "brand-the-athletic"] as const) {
      const hrefs = getBrandSubSections(sectionId)
        .map((subSection) => subSection.href)
        .filter((href): href is string => Boolean(href));

      expect(hrefs.length).toBeGreaterThan(0);
      expect(hrefs.every((href) => href.startsWith("/design-docs/"))).toBe(true);
      expect(hrefs.some((href) => href.startsWith("/admin/design-docs/"))).toBe(false);
    }

    expect(buildDesignDocsPath("nyt-articles")).toBe("/design-docs/nyt-articles");
    expect(buildDesignDocsPath("brand-the-athletic/resources")).toBe(
      "/design-docs/brand-the-athletic/resources",
    );
  });

  it("keeps shared social docs aligned with the canonical social route", () => {
    const socialIngestJob = ADMIN_JOB_DOCS.find((entry) => entry.id === "shared-social-ingest");

    expect(socialIngestJob).toBeDefined();
    expect(socialIngestJob?.pageHref).toBe(ADMIN_SOCIAL_PATH);
    expect(socialIngestJob?.pagePathPattern).toBe(ADMIN_SOCIAL_PATH);
  });
});
