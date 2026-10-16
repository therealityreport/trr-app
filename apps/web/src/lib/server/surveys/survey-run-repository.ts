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
import { inferUiVariant } from "@/lib/surveys/question-config-types";

export class SurveyAnswerValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate the persisted definition, using the values emitted by the play UI. */
function validateAnswers(
  answers: AnswerInput[],
  questions: SurveyQuestion[],
  options: QuestionOption[],
): void {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  const fields = ["optionId", "textValue", "numericValue", "jsonValue"] as const;
  function fail(reason: string): never {
    throw new SurveyAnswerValidationError(`Invalid answers: ${reason}`);
  }

  for (const answer of answers) {
    if (!isRecord(answer) || typeof answer.questionId !== "string") fail("question ID required");
    const question = questionsById.get(answer.questionId);
    if (!question) fail("question does not belong to this survey");
    if (seen.has(question.id)) fail("duplicate question ID");
    seen.add(question.id);
    const config = question.config ?? {};
    const variant = config.uiVariant ?? inferUiVariant(question.question_type);
    const questionOptions = options.filter((option) => option.question_id === question.id);
    const field = question.question_type === "single_choice" ? "optionId"
      : question.question_type === "free_text" ? "textValue"
      : question.question_type === "numeric" ? "numericValue" : "jsonValue";
    if (fields.some((key) => key !== field && answer[key] != null)) fail("unexpected value field");
    const value = answer[field];
    if (value == null) {
      if (question.is_required) fail("required question unanswered");
      continue;
    }
    const optionIdentity = (entry: unknown): string => {
      if (typeof entry !== "string") return fail("option must be a string");
      const option = questionOptions.find((candidate) => candidate.option_key === entry || candidate.id === entry);
      return option?.id ?? fail("option does not belong to this question");
    };
    const validateSelection = (selection: unknown): unknown[] => {
      if (!Array.isArray(selection)) return fail("option array required");
      const identities = selection.map(optionIdentity);
      if (new Set(identities).size !== identities.length) fail("duplicate option");
      return selection;
    };

    switch (question.question_type) {
      case "single_choice":
        if (typeof value !== "string" || !questionOptions.some((option) => option.id === value)) {
          fail("option ID does not belong to this question");
        }
        break;
      case "numeric": {
        const min = typeof config.min === "number" ? config.min : 0;
        const max = typeof config.max === "number" ? config.max : variant === "numeric-ranking" ? 10 : 100;
        if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
          fail("numeric value outside permitted range");
        }
        break;
      }
      case "free_text": {
        if (typeof value !== "string") fail("text value required");
        if (value.trim().length === 0) {
          if (question.is_required) fail("required question unanswered");
          break;
        }
        const validation = isRecord(config.validation) ? config.validation : {};
        if ((typeof validation.minLength === "number" && value.length < validation.minLength)
          || (typeof validation.maxLength === "number" && value.length > validation.maxLength)
          || (typeof validation.pattern === "string" && !new RegExp(validation.pattern).test(value))) {
          fail("text does not satisfy validation rules");
        }
        break;
      }
      case "ranking":
      case "multi_choice": {
        const selection = validateSelection(value);
        if (selection.length === 0 && !question.is_required) break;
        const min = question.question_type === "ranking" ? 1
          : typeof config.minSelections === "number" && Number.isFinite(config.minSelections)
            ? Math.max(0, Math.floor(config.minSelections)) : variant === "cast-multi-select" ? 2 : 1;
        const max = typeof config.maxSelections === "number" && Number.isFinite(config.maxSelections)
          ? Math.max(1, Math.floor(config.maxSelections)) : Infinity;
        if (selection.length < min || selection.length > max) fail("invalid number of selections");
        break;
      }
      case "likert": {
        if (!isRecord(value)) fail("object value required");
        if (variant === "reunion-seating-prediction") {
          if (Object.keys(value).some((key) => !["fullTimeOrder", "friendSide", "completed"].includes(key))) {
            fail("unknown seating field");
          }
          const role = (option: QuestionOption) => option.metadata?.castRole ?? option.metadata?.surveyRole;
          const mains = questionOptions.filter((option) => role(option) === "main");
          const fullTime = mains.length ? mains : questionOptions.filter((option) => role(option) !== "friend_of");
          const order = validateSelection(value.fullTimeOrder);
          if (order.some((entry) => !fullTime.some((option) => option.id === optionIdentity(entry)))) {
            fail("invalid full-time seating option");
          }
          if (value.friendSide != null && value.friendSide !== "left" && value.friendSide !== "right") {
            fail("invalid friend side");
          }
          if (value.completed !== undefined && typeof value.completed !== "boolean") fail("invalid completion flag");
          if (question.is_required && (fullTime.length === 0 || order.length !== fullTime.length
            || (questionOptions.filter((option) => role(option) === "friend_of").length === 1 && !value.friendSide))) {
            fail("required seating incomplete");
          }
          break;
        }
        const rows = Array.isArray(config.rows)
          ? config.rows.filter(isRecord).map((row) => row.id).filter((id): id is string => typeof id === "string") : [];
        const subjects = variant === "two-axis-grid" && rows.length === 0
          ? questionOptions.map((option) => option.option_key) : rows;
        if (Object.keys(value).some((key) => !subjects.includes(key))) fail("unknown row or subject");
        for (const entry of Object.values(value)) {
          if (variant === "two-axis-grid") {
            const rawExtent = Number(config.extent);
            const extent = Number.isFinite(rawExtent) && rawExtent > 0 ? Math.max(1, Math.round(rawExtent)) : 5;
            if (!isRecord(entry) || Object.keys(entry).some((key) => key !== "x" && key !== "y")
              || ![entry.x, entry.y].every((coordinate) => typeof coordinate === "number"
                && Number.isInteger(coordinate) && Math.abs(coordinate) <= extent)) fail("invalid grid coordinates");
          } else {
            const decision = variant === "cast-decision-card" || variant === "three-choice-slider";
            const normalize = (key: string) => key.trim().toLowerCase().replace(/[\s-]+/g, "_");
            const choices = decision && Array.isArray(config.choices) && config.choices.length
              ? config.choices.filter(isRecord).map((choice) => choice.value).filter((key): key is string => typeof key === "string")
              : questionOptions.map((option) => option.option_key);
            const allowed = decision ? choices.map(normalize) : choices;
            if (typeof entry !== "string" || !allowed.includes(entry)) fail("invalid row choice");
          }
        }
        if (question.is_required && (subjects.length === 0
          || subjects.some((id) => !Object.hasOwn(value, id)))) fail("required rows or subjects incomplete");
        break;
      }
      default:
        fail("unsupported question type");
    }
  }
  if (questions.some((question) => question.is_required && !seen.has(question.id))) {
    fail("required question missing");
  }
}

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

    // Use the selected run's definition on this same transaction/connection.
    // Validate the entire answer set before creating a completed response.
    const questionsResult = await client.query<SurveyQuestion>(
      `SELECT * FROM ${t("questions")} WHERE survey_id = $1 ORDER BY display_order`,
      [run.survey_id],
    );
    const optionsResult = await client.query<QuestionOption>(
      `SELECT * FROM ${t("options")} WHERE question_id = ANY($1::uuid[]) ORDER BY display_order`,
      [questionsResult.rows.map((question) => question.id)],
    );
    validateAnswers(answers, questionsResult.rows, optionsResult.rows);

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
