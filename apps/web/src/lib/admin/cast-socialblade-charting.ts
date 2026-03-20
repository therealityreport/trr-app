export type CastComparisonWeek = {
  start: string;
  end: string;
  week_index?: number | null;
  week_type?: "preseason" | "episode" | "bye" | "postseason";
};

export type CastComparisonWindow = {
  start: string;
  end: string;
};

export type DailyFollowerPoint = {
  date: string;
  followers: number;
};

export type FollowersGainedPoint = {
  date: string;
  gained: number;
};

const isIsoDate = (value: string | null | undefined): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function deriveCastComparisonWindow(
  weeks: CastComparisonWeek[] | null | undefined,
): CastComparisonWindow | null {
  if (!Array.isArray(weeks) || weeks.length === 0) return null;

  const validWeeks = weeks
    .filter((week) => isIsoDate(week.start) && isIsoDate(week.end))
    .sort((a, b) => a.start.localeCompare(b.start));

  if (validWeeks.length === 0) return null;

  const preseasonWeek =
    validWeeks.find((week) => week.week_type === "preseason") ??
    validWeeks.find((week) => week.week_index === 0) ??
    validWeeks[0];
  const postseasonWeek =
    [...validWeeks].reverse().find((week) => week.week_type === "postseason") ??
    validWeeks[validWeeks.length - 1];

  return {
    start: preseasonWeek.start,
    end: postseasonWeek.end,
  };
}

export function buildFollowersGainedSeries(
  points: DailyFollowerPoint[] | null | undefined,
  window: CastComparisonWindow | null | undefined,
): FollowersGainedPoint[] {
  if (!Array.isArray(points) || points.length === 0 || !window || !isIsoDate(window.start) || !isIsoDate(window.end)) {
    return [];
  }

  const sortedPoints = points
    .filter((point) => isIsoDate(point.date) && Number.isFinite(point.followers))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedPoints.length === 0) return [];

  const baselinePoint =
    [...sortedPoints].reverse().find((point) => point.date <= window.start) ??
    sortedPoints.find((point) => point.date >= window.start) ??
    sortedPoints[0];

  if (!baselinePoint) return [];

  const baselineFollowers = baselinePoint.followers;
  const withinWindow = sortedPoints
    .filter((point) => point.date >= window.start && point.date <= window.end)
    .map((point) => ({
      date: point.date,
      gained: point.followers - baselineFollowers,
    }));

  const series = withinWindow.slice();

  if (series.length === 0) {
    const trailingPoint =
      [...sortedPoints].reverse().find((point) => point.date <= window.end) ??
      baselinePoint;
    return [
      { date: window.start, gained: 0 },
      { date: window.end, gained: trailingPoint.followers - baselineFollowers },
    ];
  }

  if (series[0]?.date !== window.start) {
    series.unshift({ date: window.start, gained: 0 });
  } else {
    series[0] = { ...series[0], gained: 0 };
  }

  const lastKnownPoint =
    [...sortedPoints].reverse().find((point) => point.date <= window.end) ??
    sortedPoints[sortedPoints.length - 1];
  if (lastKnownPoint && series[series.length - 1]?.date !== window.end) {
    series.push({
      date: window.end,
      gained: lastKnownPoint.followers - baselineFollowers,
    });
  }

  return series;
}
