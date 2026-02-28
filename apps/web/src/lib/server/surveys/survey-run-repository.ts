import "server-only";

import {
  query,
  withAuthTransaction,
  type AuthContext,
} from "@/lib/server/postgres";
import { getShowByTrrShowId } from "@/lib/server/shows/shows-repository";
import type {
  AnswerInput,
  NormalizedSurvey,
  QuestionOption,
  SurveyQuestion,
  SurveyResponse,
  SurveyRun,
  SurveyWithQuestions,
} from "@/lib/surveys/normalized-types";
import { t } from "./survey-schema";
import { getLinkBySurveyId } from "./survey-trr-links-repository";

/**
 * Get the currently active run for a survey by slug.
 * Returns null if no active run exists within the current time window.
 */
export async function getActiveRunForSurvey(
  surveySlug: string,
): Promise<SurveyRun | null> {
  const now = new Date().toISOString();
  const result = await query<SurveyRun>(
    `SELECT sr.*
     FROM ${t("survey_runs")} sr
     INNER JOIN ${t("surveys")} s ON s.id = sr.survey_id
     WHERE s.slug = $1
       AND sr.is_active = true
       AND sr.starts_at <= $2
       AND (sr.ends_at IS NULL OR sr.ends_at > $2)
     ORDER BY sr.starts_at DESC
     LIMIT 1`,
    [surveySlug, now],
  );
  return result.rows[0] ?? null;
}

/**
 * Get a survey with all its questions and options.
 */
export async function getSurveyWithQuestions(
  surveySlug: string,
): Promise<SurveyWithQuestions | null> {
  // Get survey
  const surveyResult = await query<NormalizedSurvey>(
    `SELECT * FROM ${t("surveys")} WHERE slug = $1`,
    [surveySlug],
  );
  const survey = surveyResult.rows[0];
  if (!survey) return null;

  // Get questions
  const questionsResult = await query<SurveyQuestion>(
    `SELECT * FROM ${t("questions")}
     WHERE survey_id = $1
     ORDER BY display_order`,
    [survey.id],
  );
  const questions = questionsResult.rows;

  // Get options for all questions
  const questionIds = questions.map((q) => q.id);
  const optionsByQuestion: Map<string, QuestionOption[]> = new Map();

  if (questionIds.length > 0) {
    const optionsResult = await query<QuestionOption>(
      `SELECT * FROM ${t("options")}
       WHERE question_id = ANY($1)
       ORDER BY display_order`,
      [questionIds],
    );

    for (const option of optionsResult.rows) {
      const existing = optionsByQuestion.get(option.question_id) ?? [];
      existing.push(option);
      optionsByQuestion.set(option.question_id, existing);
    }
  }

  // Combine questions with their options
  const questionsWithOptions = questions.map((q) => ({
    ...q,
    options: optionsByQuestion.get(q.id) ?? [],
  }));

  const trrLink = await getLinkBySurveyId(survey.id);
  let showIconUrl: string | null = null;
  if (trrLink?.trr_show_id) {
    const show = await getShowByTrrShowId(trrLink.trr_show_id);
    showIconUrl = show?.icon_url ?? null;
  }

  return {
    ...survey,
    questions: questionsWithOptions,
    show_icon_url: showIconUrl,
    ...(trrLink ? { trr_link: trrLink } : {}),
  };
}

/**
 * Get the number of submissions a user has made for a specific run.
 * Requires auth context for RLS.
 */
export async function getUserSubmissionCount(
  authContext: AuthContext,
  surveyRunId: string,
): Promise<number> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM ${t("responses")}
       WHERE survey_run_id = $1`,
      [surveyRunId],
    );
    return parseInt(result.rows[0]?.count ?? "0", 10);
  });
}

/**
 * Submit a survey response with answers.
 * Uses advisory lock to prevent race conditions when enforcing max_submissions_per_user.
 * Throws if max submissions reached or run not found/inactive.
 */
export async function submitSurveyResponse(
  authContext: AuthContext,
  surveyRunId: string,
  answers: AnswerInput[],
): Promise<SurveyResponse> {
  return withAuthTransaction(authContext, async (client) => {
    // Advisory lock per (user, run) to serialize concurrent submissions
    // hashtext returns a stable int for the lock key
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2))`,
      [authContext.firebaseUid, surveyRunId],
    );

    // Check run exists and is active
    const runResult = await client.query<SurveyRun>(
      `SELECT * FROM ${t("survey_runs")} WHERE id = $1`,
      [surveyRunId],
    );
    const run = runResult.rows[0];
    if (!run) {
      throw new Error("Survey run not found");
    }
    if (!run.is_active) {
      throw new Error("Survey run is not active");
    }

    // Check time window
    const now = new Date();
    const startsAt = new Date(run.starts_at);
    const endsAt = run.ends_at ? new Date(run.ends_at) : null;

    if (now < startsAt) {
      throw new Error("Survey run has not started yet");
    }
    if (endsAt && now >= endsAt) {
      throw new Error("Survey run has ended");
    }

    // Check max submissions
    const countResult = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM ${t("responses")}
       WHERE survey_run_id = $1 AND user_id = $2`,
      [surveyRunId, authContext.firebaseUid],
    );
    const existingCount = parseInt(countResult.rows[0]?.count ?? "0", 10);

    if (existingCount >= run.max_submissions_per_user) {
      throw new Error("Maximum submissions reached");
    }

    // Insert response
    const responseResult = await client.query<SurveyResponse>(
      `INSERT INTO ${t("responses")} (survey_run_id, user_id, submission_number, completed_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [surveyRunId, authContext.firebaseUid, existingCount + 1],
    );
    const response = responseResult.rows[0];

    // Insert answers
    for (const answer of answers) {
      await client.query(
        `INSERT INTO ${t("answers")} (response_id, question_id, option_id, text_value, numeric_value, json_value)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          response.id,
          answer.questionId,
          answer.optionId ?? null,
          answer.textValue ?? null,
          answer.numericValue ?? null,
          answer.jsonValue !== undefined
            ? JSON.stringify(answer.jsonValue)
            : null,
        ],
      );
    }

    return response;
  });
}

/**
 * Get a survey run by ID.
 */
export async function getSurveyRunById(
  runId: string,
): Promise<SurveyRun | null> {
  const result = await query<SurveyRun>(
    `SELECT * FROM ${t("survey_runs")} WHERE id = $1`,
    [runId],
  );
  return result.rows[0] ?? null;
}
