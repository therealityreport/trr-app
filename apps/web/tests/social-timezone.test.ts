import { describe, expect, it } from "vitest";

import { buildIsoDayRange, SOCIAL_TIME_ZONE } from "@/lib/admin/social-timezone";

describe("social timezone buckets", () => {
  it("builds New York day buckets across standard time", () => {
    expect(SOCIAL_TIME_ZONE).toBe("America/New_York");
    expect(buildIsoDayRange("2026-01-01")).toEqual({
      dateStart: "2026-01-01T05:00:00.000Z",
      dateEnd: "2026-01-02T04:59:59.999Z",
    });
  });

  it("builds New York day buckets across daylight saving time", () => {
    expect(buildIsoDayRange("2026-07-01")).toEqual({
      dateStart: "2026-07-01T04:00:00.000Z",
      dateEnd: "2026-07-02T03:59:59.999Z",
    });
  });

  it("builds the local day boundary when daylight saving time starts", () => {
    expect(buildIsoDayRange("2026-03-08")).toEqual({
      dateStart: "2026-03-08T05:00:00.000Z",
      dateEnd: "2026-03-09T03:59:59.999Z",
    });
  });

  it("builds the local day boundary when daylight saving time ends", () => {
    expect(buildIsoDayRange("2026-11-01")).toEqual({
      dateStart: "2026-11-01T04:00:00.000Z",
      dateEnd: "2026-11-02T04:59:59.999Z",
    });
  });

  it("rejects malformed local day tokens", () => {
    expect(buildIsoDayRange("2026-7-1")).toBeNull();
    expect(buildIsoDayRange("not-a-date")).toBeNull();
  });
});
