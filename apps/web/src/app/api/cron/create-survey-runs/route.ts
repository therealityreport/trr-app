import { NextRequest, NextResponse } from "next/server";

import {
  createWeeklySurveyRuns,
  getCurrentWeekWindow,
} from "@/lib/server/surveys/survey-run-scheduler";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/create-survey-runs
 * Vercel Cron job to auto-create weekly survey runs.
 * Should be configured to run weekly (e.g., Sunday at midnight UTC).
 *
 * Example vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/create-survey-runs",
 *     "schedule": "0 0 * * 0"
 *   }]
 * }
 *
 * Surveys must have metadata.autoCreateRuns = true to be included.
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (Vercel sends CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow in development without auth, but require in production
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      console.error("[cron] CRON_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[cron] Unauthorized survey run creation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const window = getCurrentWeekWindow();
    console.log(`[cron] Creating survey runs for ${window.runKey}`, {
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });

    const results = await createWeeklySurveyRuns();

    const created = results.filter((r) => r.created).length;
    const skipped = results.filter((r) => !r.created && !r.error).length;
    const errors = results.filter((r) => r.error).length;

    console.log("[cron] Survey run creation complete", {
      created,
      skipped,
      errors,
      results,
    });

    return NextResponse.json({
      success: true,
      runKey: window.runKey,
      window: {
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      },
      summary: {
        created,
        skipped,
        errors,
      },
      results,
    });
  } catch (error) {
    console.error("[cron] Survey run creation failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
