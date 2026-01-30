import { NextRequest, NextResponse } from "next/server";
import { getSurveysWithAutoProgress } from "@/lib/server/surveys/survey-config-repository";
import { progressToNextEpisode } from "@/lib/server/surveys/survey-episodes-repository";

export const dynamic = "force-dynamic";
/**
 * POST /api/cron/episode-progression
 * Vercel Cron job to auto-progress episodes based on air schedule.
 * Should be configured to run hourly.
 *
 * Example vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/episode-progression",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel sends CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow in development without auth, but require in production
  if (process.env.NODE_ENV === "production" && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[cron] Unauthorized episode progression attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[cron] Starting episode progression check");

    // Get all surveys with auto-progress enabled
    const surveys = await getSurveysWithAutoProgress();
    console.log(`[cron] Found ${surveys.length} surveys with auto-progress`);

    const now = new Date();
    const results: Array<{
      surveyKey: string;
      action: string;
      episodeId?: string;
    }> = [];

    for (const survey of surveys) {
      const schedule = survey.air_schedule;
      if (!schedule) continue;

      // Check if today is an air day
      const surveyTimezone = schedule.timezone || "America/New_York";
      const localNow = getLocalTime(now, surveyTimezone);
      const dayName = getDayName(localNow);

      if (!schedule.airDays.includes(dayName)) {
        results.push({
          surveyKey: survey.key,
          action: "skipped",
        });
        continue;
      }

      // Parse air time
      const [airHour, airMinute] = schedule.airTime.split(":").map(Number);
      const localHour = localNow.getHours();
      const localMinute = localNow.getMinutes();

      // Check if we're past the air time (with 1 hour buffer)
      // This allows the cron to run at any time within 1 hour after air time
      const airTimeMinutes = airHour * 60 + airMinute;
      const currentTimeMinutes = localHour * 60 + localMinute;

      // Only progress if we're within 1 hour after air time
      const isWithinProgressWindow =
        currentTimeMinutes >= airTimeMinutes &&
        currentTimeMinutes <= airTimeMinutes + 60;

      if (!isWithinProgressWindow) {
        results.push({
          surveyKey: survey.key,
          action: "not_air_time",
        });
        continue;
      }

      // Progress to the next episode
      const nextEpisode = await progressToNextEpisode(survey.key);

      if (nextEpisode) {
        console.log(
          `[cron] Progressed ${survey.key} to episode ${nextEpisode.episode_id}`
        );
        results.push({
          surveyKey: survey.key,
          action: "progressed",
          episodeId: nextEpisode.episode_id,
        });
      } else {
        results.push({
          surveyKey: survey.key,
          action: "no_next_episode",
        });
      }
    }

    console.log("[cron] Episode progression complete", results);

    return NextResponse.json({
      success: true,
      processed: surveys.length,
      results,
    });
  } catch (error) {
    console.error("[cron] Episode progression failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Get local time in a specific timezone
 */
function getLocalTime(date: Date, timezone: string): Date {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(date);

  const getPart = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  return new Date(
    parseInt(getPart("year")),
    parseInt(getPart("month")) - 1,
    parseInt(getPart("day")),
    parseInt(getPart("hour")),
    parseInt(getPart("minute"))
  );
}

/**
 * Get day name from date
 */
function getDayName(date: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}
