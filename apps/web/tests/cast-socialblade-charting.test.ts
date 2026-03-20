import { describe, expect, it } from "vitest";
import {
  buildFollowersGainedSeries,
  deriveCastComparisonWindow,
} from "@/lib/admin/cast-socialblade-charting";

describe("cast socialblade charting", () => {
  it("derives the comparison window from preseason start through postseason end", () => {
    expect(
      deriveCastComparisonWindow([
        { week_index: 0, week_type: "preseason", start: "2025-09-01", end: "2025-09-07" },
        { week_index: 1, week_type: "episode", start: "2025-09-08", end: "2025-09-14" },
        { week_index: 16, week_type: "postseason", start: "2025-12-22", end: "2025-12-28" },
      ]),
    ).toEqual({
      start: "2025-09-01",
      end: "2025-12-28",
    });
  });

  it("builds a gained-series anchored to zero on the first preseason day", () => {
    expect(
      buildFollowersGainedSeries(
        [
          { date: "2025-08-31", followers: 1000 },
          { date: "2025-09-02", followers: 1015 },
          { date: "2025-09-05", followers: 1030 },
          { date: "2025-09-09", followers: 1050 },
        ],
        { start: "2025-09-01", end: "2025-09-10" },
      ),
    ).toEqual([
      { date: "2025-09-01", gained: 0 },
      { date: "2025-09-02", gained: 15 },
      { date: "2025-09-05", gained: 30 },
      { date: "2025-09-09", gained: 50 },
      { date: "2025-09-10", gained: 50 },
    ]);
  });
});
