import { describe, expect, it } from "vitest";
import {
  buildSeasonSocialBreadcrumb,
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
    expect(
      buildSeasonWeekBreadcrumb("RHOSLC", 5, "Week 2", {
        showHref: "/admin/trr-shows/rhoslc",
        seasonHref: "/admin/trr-shows/rhoslc/seasons/5",
        weekHref: "/admin/trr-shows/rhoslc/seasons/5/social/week/2",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "RHOSLC", href: "/admin/trr-shows/rhoslc" },
      { label: "Season 5", href: "/admin/trr-shows/rhoslc/seasons/5" },
      { label: "Week 2", href: "/admin/trr-shows/rhoslc/seasons/5/social/week/2" },
    ]);

    expect(
      buildSeasonWeekBreadcrumb("RHOSLC", 5, "Week 2", {
        showHref: "/admin/trr-shows/rhoslc",
        seasonHref: "/admin/trr-shows/rhoslc/seasons/5",
        socialHref: "/admin/trr-shows/rhoslc/seasons/5?tab=social",
        subTabLabel: "Reddit",
        subTabHref: "/admin/trr-shows/rhoslc/seasons/5?tab=social&social_platform=reddit",
        weekHref: "/admin/trr-shows/rhoslc/seasons/5/social/week/2?social_platform=reddit",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "RHOSLC", href: "/admin/trr-shows/rhoslc" },
      { label: "Season 5", href: "/admin/trr-shows/rhoslc/seasons/5" },
      { label: "Social Analytics", href: "/admin/trr-shows/rhoslc/seasons/5?tab=social" },
      { label: "Reddit", href: "/admin/trr-shows/rhoslc/seasons/5?tab=social&social_platform=reddit" },
      { label: "Week 2", href: "/admin/trr-shows/rhoslc/seasons/5/social/week/2?social_platform=reddit" },
    ]);
  });

  it("builds season social breadcrumbs", () => {
    expect(
      buildSeasonSocialBreadcrumb("RHOSLC", 5, {
        showHref: "/admin/trr-shows/rhoslc",
        seasonHref: "/admin/trr-shows/rhoslc/seasons/5",
        socialHref: "/admin/trr-shows/rhoslc/seasons/5?tab=social",
        subTabLabel: "Reddit",
        subTabHref: "/admin/trr-shows/rhoslc/seasons/5?tab=social&social_platform=reddit",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "RHOSLC", href: "/admin/trr-shows/rhoslc" },
      { label: "Season 5", href: "/admin/trr-shows/rhoslc/seasons/5" },
      { label: "Social Analytics", href: "/admin/trr-shows/rhoslc/seasons/5?tab=social" },
      { label: "Reddit", href: "/admin/trr-shows/rhoslc/seasons/5?tab=social&social_platform=reddit" },
    ]);
  });

  it("builds person breadcrumbs with and without show context", () => {
    expect(
      buildPersonBreadcrumb("Monica Garcia", {
        personHref: "/admin/trr-shows/the-real-housewives-of-salt-lake-city/people/monica-garcia",
        showName: "The Real Housewives of Salt Lake City",
        showHref: "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      {
        label: "The Real Housewives of Salt Lake City",
        href: "/admin/trr-shows/the-real-housewives-of-salt-lake-city",
      },
      { label: "Monica Garcia", href: "/admin/trr-shows/the-real-housewives-of-salt-lake-city/people/monica-garcia" },
    ]);

    expect(
      buildPersonBreadcrumb("Meredith Marks", {
        personHref: "/admin/trr-shows/people/meredith-marks",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/admin/trr-shows" },
      { label: "Meredith Marks", href: "/admin/trr-shows/people/meredith-marks" },
    ]);
  });

  it("builds survey detail breadcrumbs", () => {
    expect(buildSurveyDetailBreadcrumb("Rhoslc S5 E1", "/admin/surveys/rhoslc-s5-e1")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Survey Editor", href: "/admin/surveys" },
      { label: "Rhoslc S5 E1", href: "/admin/surveys/rhoslc-s5-e1" },
    ]);

    expect(buildNormalizedSurveyDetailBreadcrumb("Weekly Pulse", "/admin/surveys/normalized/weekly-pulse")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Normalized Surveys", href: "/admin/surveys/normalized" },
      { label: "Weekly Pulse", href: "/admin/surveys/normalized/weekly-pulse" },
    ]);
  });
});
