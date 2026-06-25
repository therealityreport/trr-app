import { describe, expect, it } from "vitest";

import {
  TRR_APP_FLAGS,
  getTrrAppFlagDefinitions,
  getTrrAppFlagValue,
  getTrrAppFlags,
  parseTrrAppFlagValue,
} from "@/lib/trr-app-flags";

describe("TRR app flags", () => {
  it("keeps risky admin/social flags off by default", () => {
    expect(getTrrAppFlagValue("adminSocialIngestionUi", {})).toBe(false);
    expect(getTrrAppFlagValue("adminSocialScraperTriggers", {})).toBe(false);
    expect(getTrrAppFlagValue("adminSocialLiveRefresh", {})).toBe(false);
  });

  it("keeps the existing cast/social dashboard on by default", () => {
    expect(getTrrAppFlagValue("adminCastSocialDashboard", {})).toBe(true);
  });

  it("accepts explicit boolean env overrides", () => {
    expect(
      getTrrAppFlagValue("adminSocialIngestionUi", {
        NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_INGESTION_UI: "enabled",
      }),
    ).toBe(true);

    expect(
      getTrrAppFlagValue("adminCastSocialDashboard", {
        NEXT_PUBLIC_TRR_FLAG_ADMIN_CAST_SOCIAL_DASHBOARD: "off",
      }),
    ).toBe(false);
  });

  it("falls back to safe defaults for missing or invalid overrides", () => {
    expect(parseTrrAppFlagValue("definitely")).toBeNull();
    expect(
      getTrrAppFlagValue("adminSocialScraperTriggers", {
        NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_SCRAPER_TRIGGERS: "definitely",
      }),
    ).toBe(false);
    expect(
      getTrrAppFlagValue("adminCastSocialDashboard", {
        NEXT_PUBLIC_TRR_FLAG_ADMIN_CAST_SOCIAL_DASHBOARD: "definitely",
      }),
    ).toBe(true);
  });

  it("exposes stable flag definitions and values from one module", () => {
    expect(getTrrAppFlagDefinitions()).toEqual([
      TRR_APP_FLAGS.adminSocialIngestionUi,
      TRR_APP_FLAGS.adminSocialScraperTriggers,
      TRR_APP_FLAGS.adminSocialLiveRefresh,
      TRR_APP_FLAGS.adminCastSocialDashboard,
    ]);

    expect(
      getTrrAppFlags({
        NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_INGESTION_UI: "true",
        NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_SCRAPER_TRIGGERS: "false",
        NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_LIVE_REFRESH: "1",
        NEXT_PUBLIC_TRR_FLAG_ADMIN_CAST_SOCIAL_DASHBOARD: "0",
      }),
    ).toEqual({
      adminSocialIngestionUi: true,
      adminSocialScraperTriggers: false,
      adminSocialLiveRefresh: true,
      adminCastSocialDashboard: false,
    });
  });
});
