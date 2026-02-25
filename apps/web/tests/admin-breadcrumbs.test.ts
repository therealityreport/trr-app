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
        showHref: "/shows/rhoslc",
        seasonHref: "/shows/rhoslc/s5",
        weekHref: "/shows/rhoslc/s5/social/week/2",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/shows" },
      { label: "RHOSLC", href: "/shows/rhoslc" },
      { label: "Season 5", href: "/shows/rhoslc/s5" },
      { label: "Week 2", href: "/shows/rhoslc/s5/social/week/2" },
    ]);

    expect(
      buildSeasonWeekBreadcrumb("RHOSLC", 5, "Week 2", {
        showHref: "/shows/rhoslc",
        seasonHref: "/shows/rhoslc/s5",
        socialHref: "/shows/rhoslc/s5/social/reddit",
        subTabLabel: "Reddit Analytics",
        subTabHref: "/shows/rhoslc/s5/social/reddit",
        weekHref: "/shows/rhoslc/s5/social/week/2?social_platform=reddit",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/shows" },
      { label: "RHOSLC", href: "/shows/rhoslc" },
      { label: "Social Media", href: "/shows/rhoslc/s5/social/reddit" },
      { label: "Reddit Analytics", href: "/shows/rhoslc/s5/social/reddit" },
      { label: "Week 2", href: "/shows/rhoslc/s5/social/week/2?social_platform=reddit" },
    ]);
  });

  it("builds season social breadcrumbs", () => {
    expect(
      buildSeasonSocialBreadcrumb("RHOSLC", 5, {
        showHref: "/shows/rhoslc",
        seasonHref: "/shows/rhoslc/s5",
        socialHref: "/shows/rhoslc/s5/social/reddit",
        subTabLabel: "Reddit Analytics",
        subTabHref: "/shows/rhoslc/s5/social/reddit",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/shows" },
      { label: "RHOSLC", href: "/shows/rhoslc" },
      { label: "Social Media", href: "/shows/rhoslc/s5/social/reddit" },
      { label: "Reddit Analytics", href: "/shows/rhoslc/s5/social/reddit" },
    ]);
  });

  it("builds person breadcrumbs with and without show context", () => {
    expect(
      buildPersonBreadcrumb("Monica Garcia", {
        personHref: "/shows/the-real-housewives-of-salt-lake-city/people/monica-garcia",
        showName: "The Real Housewives of Salt Lake City",
        showHref: "/shows/the-real-housewives-of-salt-lake-city",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/shows" },
      {
        label: "The Real Housewives of Salt Lake City",
        href: "/shows/the-real-housewives-of-salt-lake-city",
      },
      { label: "Monica Garcia", href: "/shows/the-real-housewives-of-salt-lake-city/people/monica-garcia" },
    ]);

    expect(
      buildPersonBreadcrumb("Meredith Marks", {
        personHref: "/shows/people/meredith-marks",
      }),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Shows", href: "/shows" },
      { label: "Meredith Marks", href: "/shows/people/meredith-marks" },
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
