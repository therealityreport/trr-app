export const SOCIAL_TIME_ZONE = "America/New_York";

const DATE_TOKEN_RE = /^\d{4}-\d{2}-\d{2}$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const parseDateToken = (value: string): DateParts | null => {
  const match = DATE_TOKEN_RE.exec(value);
  if (!match) return null;
  return {
    year: Number(match[0].slice(0, 4)),
    month: Number(match[0].slice(5, 7)),
    day: Number(match[0].slice(8, 10)),
  };
};

const getTimeZoneOffsetMs = (timestampMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = Number(part.value);
  }
  const zonedAsUtc = Date.UTC(
    values.year ?? 0,
    (values.month ?? 1) - 1,
    values.day ?? 1,
    values.hour ?? 0,
    values.minute ?? 0,
    values.second ?? 0,
  );
  return zonedAsUtc - timestampMs;
};

const toZonedUtcIso = (
  parts: DateParts,
  time: { hour: number; minute: number; second: number; millisecond?: number },
): string => {
  const baseUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    time.hour,
    time.minute,
    time.second,
    time.millisecond ?? 0,
  );
  const firstOffset = getTimeZoneOffsetMs(baseUtc, SOCIAL_TIME_ZONE);
  let correctedUtc = baseUtc - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(correctedUtc, SOCIAL_TIME_ZONE);
  if (secondOffset !== firstOffset) {
    correctedUtc = baseUtc - secondOffset;
  }
  return new Date(correctedUtc).toISOString();
};

const addDays = (parts: DateParts, days: number): DateParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

export const buildIsoDayRange = (dayLocal: string): { dateStart: string; dateEnd: string } | null => {
  const parsed = parseDateToken(dayLocal);
  if (!parsed) return null;
  const dateStart = toZonedUtcIso(parsed, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  const nextDay = addDays(parsed, 1);
  const nextDateStart = toZonedUtcIso(nextDay, { hour: 0, minute: 0, second: 0, millisecond: 0 });
  return {
    dateStart,
    dateEnd: new Date(Date.parse(nextDateStart) - 1).toISOString(),
  };
};
