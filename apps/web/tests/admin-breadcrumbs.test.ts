import { describe, expect, it } from "vitest";
import {
  buildNormalizedSurveyDetailBreadcrumb,
  buildPersonBreadcrumb,
  buildSeasonWeekBreadcrumb,
  buildSurveyDetailBreadcrumb,
  humanizePersonSlug,
  humanizeSlug,
} from "@/lib/admin/admin-breadcrumbs";

describe("admin-breadcrumb helpers", () => {
  it("humanizes slugs and falls back for empty input", () => {
    expect(humanizeSlug("networks-and-streaming")).toBe("Networks And Streaming");
    expect(humanizeSlug("the_real-housewives")).toBe("The Real Housewives");
    expect(humanizeSlug("")).toBe("Unknown");
  });

  it("removes person collision suffix from slugs", () => {
    expect(humanizePersonSlug("meredith-marks--7f528757")).toBe("Meredith Marks");
    expect(humanizePersonSlug("andy-cohen")).toBe("Andy Cohen");
  });

  it("builds season week breadcrumbs", () => {
    expect(buildSeasonWeekBreadcrumb("RHOSLC", 5, "Week 2")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "RHOSLC" },
      { label: "Season 5" },
      { label: "Week 2" },
    ]);

    expect(buildSeasonWeekBreadcrumb("RHOSLC", 5, "Week 2", {
      showHref: "/admin/trr-shows/rhoslc",
    })).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "RHOSLC", href: "/admin/trr-shows/rhoslc" },
      { label: "Season 5" },
      { label: "Week 2" },
    ]);
  });

  it("builds person breadcrumbs with and without show context", () => {
    expect(buildPersonBreadcrumb("Meredith Marks", { showName: "The Real Housewives of Salt Lake City" })).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "The Real Housewives of Salt Lake City" },
      { label: "Meredith Marks" },
    ]);

    expect(buildPersonBreadcrumb("Monica Garcia", {
      showName: "The Real Housewives of Salt Lake City",
      showHref: "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
    })).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      {
        label: "The Real Housewives of Salt Lake City",
        href: "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
      },
      { label: "Monica Garcia" },
    ]);

    expect(buildPersonBreadcrumb("Meredith Marks")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "Meredith Marks" },
    ]);
  });

  it("builds survey detail breadcrumbs", () => {
    expect(buildSurveyDetailBreadcrumb("Rhoslc S5 E1")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Survey Editor", href: "/admin/surveys" },
      { label: "Rhoslc S5 E1" },
    ]);

    expect(buildNormalizedSurveyDetailBreadcrumb("Weekly Pulse")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Normalized Surveys", href: "/admin/surveys/normalized" },
      { label: "Weekly Pulse" },
    ]);
  });
});
