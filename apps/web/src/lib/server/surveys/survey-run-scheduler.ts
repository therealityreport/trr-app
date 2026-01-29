import "server-only";

import { query, withTransaction } from "@/lib/server/postgres";
import type { NormalizedSurvey, SurveyRun } from "@/lib/surveys/normalized-types";

interface SchedulerResult {
  surveySlug: string;
  runKey: string;
  created: boolean;
  error?: string;
}

interface SurveyWithSchedulerConfig extends NormalizedSurvey {
  metadata: {
    autoCreateRuns?: boolean;
    schedulerConfig?: {
      frequency?: "weekly" | "daily";
      startDayOfWeek?: number; // 0 = Sunday
      durationDays?: number;
    };
  };
}

/**
 * Get ISO week number for a date.
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get ISO week year (may differ from calendar year at year boundaries).
 */
function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

/**
 * Generate run key for the current period.
 * Format: "YYYY-Www" (e.g., "2026-W05")
 */
function generateWeeklyRunKey(date: Date): string {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

/**
 * Calculate the start and end of the current ISO week (Monday 00:00 UTC to Sunday 23:59:59 UTC).
 */
function calculateWeeklyWindow(date: Date): { startsAt: string; endsAt: string } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay();

  // Monday of current week
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);

  // Sunday end of current week (23:59:59.999)
  const sundayEnd = new Date(monday);
  sundayEnd.setUTCDate(monday.getUTCDate() + 6);
  sundayEnd.setUTCHours(23, 59, 59, 999);

  return {
    startsAt: monday.toISOString(),
    endsAt: sundayEnd.toISOString(),
  };
}

/**
 * Create weekly survey runs for all surveys configured with autoCreateRuns.
 * This is idempotent - if a run already exists for the current week, it won't create a duplicate.
 */
export async function createWeeklySurveyRuns(): Promise<SchedulerResult[]> {
  const results: SchedulerResult[] = [];
  const now = new Date();
  const runKey = generateWeeklyRunKey(now);
  const { startsAt, endsAt } = calculateWeeklyWindow(now);

  // Get surveys configured for auto-run creation
  const surveysResult = await query<SurveyWithSchedulerConfig>(
    `SELECT * FROM surveys.surveys
     WHERE is_active = true
       AND (metadata->>'autoCreateRuns')::boolean = true`,
  );

  for (const survey of surveysResult.rows) {
    try {
      // Check if run already exists (idempotent)
      const existingResult = await query<SurveyRun>(
        `SELECT * FROM surveys.survey_runs
         WHERE survey_id = $1 AND run_key = $2`,
        [survey.id, runKey],
      );

      if (existingResult.rows.length > 0) {
        results.push({
          surveySlug: survey.slug,
          runKey,
          created: false,
        });
        continue;
      }

      // Create new run
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO surveys.survey_runs (survey_id, run_key, title, starts_at, ends_at, max_submissions_per_user, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            survey.id,
            runKey,
            `Week ${runKey}`,
            startsAt,
            endsAt,
            1, // Default to one submission per user
            true,
          ],
        );
      });

      results.push({
        surveySlug: survey.slug,
        runKey,
        created: true,
      });
    } catch (error) {
      console.error(`[scheduler] Failed to create run for survey ${survey.slug}`, error);
      results.push({
        surveySlug: survey.slug,
        runKey,
        created: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Get the current run key for reference/debugging.
 */
export function getCurrentRunKey(): string {
  return generateWeeklyRunKey(new Date());
}

/**
 * Get the current week window for reference/debugging.
 */
export function getCurrentWeekWindow(): { startsAt: string; endsAt: string; runKey: string } {
  const now = new Date();
  return {
    ...calculateWeeklyWindow(now),
    runKey: generateWeeklyRunKey(now),
  };
}
