import "server-only";

import { query, withAuthTransaction, type AuthContext } from "@/lib/server/postgres";
import { t } from "./survey-schema";
import type {
  NormalizedSurvey,
  QuestionOption,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponse,
  SurveyRun,
} from "@/lib/surveys/normalized-types";

// ============================================================================
// SURVEYS CRUD
// ============================================================================

export async function listSurveys(): Promise<NormalizedSurvey[]> {
  const result = await query<NormalizedSurvey>(
    `SELECT * FROM ${t("surveys")} ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function getSurveyBySlug(slug: string): Promise<NormalizedSurvey | null> {
  const result = await query<NormalizedSurvey>(
    `SELECT * FROM ${t("surveys")} WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function getSurveyById(id: string): Promise<NormalizedSurvey | null> {
  const result = await query<NormalizedSurvey>(
    `SELECT * FROM ${t("surveys")} WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface CreateSurveyInput {
  slug: string;
  title: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export async function createSurvey(
  authContext: AuthContext,
  input: CreateSurveyInput,
): Promise<NormalizedSurvey> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<NormalizedSurvey>(
      `INSERT INTO ${t("surveys")} (slug, title, description, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.slug,
        input.title,
        input.description ?? null,
        input.is_active ?? true,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  });
}

export interface UpdateSurveyInput {
  title?: string;
  description?: string;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export async function updateSurvey(
  authContext: AuthContext,
  surveyId: string,
  input: UpdateSurveyInput,
): Promise<NormalizedSurvey | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      sets.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.is_active !== undefined) {
      sets.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (sets.length === 0) {
      return getSurveyById(surveyId);
    }

    values.push(surveyId);
    const result = await client.query<NormalizedSurvey>(
      `UPDATE ${t("surveys")} SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteSurvey(
  authContext: AuthContext,
  surveyId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${t("surveys")} WHERE id = $1`,
      [surveyId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

// ============================================================================
// QUESTIONS CRUD
// ============================================================================

export async function listQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  const result = await query<SurveyQuestion>(
    `SELECT * FROM ${t("questions")} WHERE survey_id = $1 ORDER BY display_order`,
    [surveyId],
  );
  return result.rows;
}

export async function getQuestionById(questionId: string): Promise<SurveyQuestion | null> {
  const result = await query<SurveyQuestion>(
    `SELECT * FROM ${t("questions")} WHERE id = $1`,
    [questionId],
  );
  return result.rows[0] ?? null;
}

export interface CreateQuestionInput {
  survey_id: string;
  question_key: string;
  question_text: string;
  question_type: string;
  display_order?: number;
  is_required?: boolean;
  config?: Record<string, unknown>;
}

export async function createQuestion(
  authContext: AuthContext,
  input: CreateQuestionInput,
): Promise<SurveyQuestion> {
  return withAuthTransaction(authContext, async (client) => {
    // Get next display_order if not provided
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const maxResult = await client.query<{ max: number | null }>(
        `SELECT MAX(display_order) as max FROM ${t("questions")} WHERE survey_id = $1`,
        [input.survey_id],
      );
      displayOrder = (maxResult.rows[0]?.max ?? -1) + 1;
    }

    const result = await client.query<SurveyQuestion>(
      `INSERT INTO ${t("questions")} (survey_id, question_key, question_text, question_type, display_order, is_required, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.survey_id,
        input.question_key,
        input.question_text,
        input.question_type,
        displayOrder,
        input.is_required ?? false,
        JSON.stringify(input.config ?? {}),
      ],
    );
    return result.rows[0];
  });
}

export interface UpdateQuestionInput {
  question_key?: string;
  question_text?: string;
  question_type?: string;
  display_order?: number;
  is_required?: boolean;
  config?: Record<string, unknown>;
}

export async function updateQuestion(
  authContext: AuthContext,
  questionId: string,
  input: UpdateQuestionInput,
): Promise<SurveyQuestion | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.question_key !== undefined) {
      sets.push(`question_key = $${paramIndex++}`);
      values.push(input.question_key);
    }
    if (input.question_text !== undefined) {
      sets.push(`question_text = $${paramIndex++}`);
      values.push(input.question_text);
    }
    if (input.question_type !== undefined) {
      sets.push(`question_type = $${paramIndex++}`);
      values.push(input.question_type);
    }
    if (input.display_order !== undefined) {
      sets.push(`display_order = $${paramIndex++}`);
      values.push(input.display_order);
    }
    if (input.is_required !== undefined) {
      sets.push(`is_required = $${paramIndex++}`);
      values.push(input.is_required);
    }
    if (input.config !== undefined) {
      sets.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(input.config));
    }

    if (sets.length === 0) {
      return getQuestionById(questionId);
    }

    values.push(questionId);
    const result = await client.query<SurveyQuestion>(
      `UPDATE ${t("questions")} SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteQuestion(
  authContext: AuthContext,
  questionId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${t("questions")} WHERE id = $1`,
      [questionId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

// ============================================================================
// OPTIONS CRUD
// ============================================================================

export async function listOptions(questionId: string): Promise<QuestionOption[]> {
  const result = await query<QuestionOption>(
    `SELECT * FROM ${t("options")} WHERE question_id = $1 ORDER BY display_order`,
    [questionId],
  );
  return result.rows;
}

export async function getOptionById(optionId: string): Promise<QuestionOption | null> {
  const result = await query<QuestionOption>(
    `SELECT * FROM ${t("options")} WHERE id = $1`,
    [optionId],
  );
  return result.rows[0] ?? null;
}

export interface CreateOptionInput {
  question_id: string;
  option_key: string;
  option_text: string;
  display_order?: number;
  metadata?: Record<string, unknown>;
}

export async function createOption(
  authContext: AuthContext,
  input: CreateOptionInput,
): Promise<QuestionOption> {
  return withAuthTransaction(authContext, async (client) => {
    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const maxResult = await client.query<{ max: number | null }>(
        `SELECT MAX(display_order) as max FROM ${t("options")} WHERE question_id = $1`,
        [input.question_id],
      );
      displayOrder = (maxResult.rows[0]?.max ?? -1) + 1;
    }

    const result = await client.query<QuestionOption>(
      `INSERT INTO ${t("options")} (question_id, option_key, option_text, display_order, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.question_id,
        input.option_key,
        input.option_text,
        displayOrder,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  });
}

export interface UpdateOptionInput {
  option_key?: string;
  option_text?: string;
  display_order?: number;
  metadata?: Record<string, unknown>;
}

export async function updateOption(
  authContext: AuthContext,
  optionId: string,
  input: UpdateOptionInput,
): Promise<QuestionOption | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.option_key !== undefined) {
      sets.push(`option_key = $${paramIndex++}`);
      values.push(input.option_key);
    }
    if (input.option_text !== undefined) {
      sets.push(`option_text = $${paramIndex++}`);
      values.push(input.option_text);
    }
    if (input.display_order !== undefined) {
      sets.push(`display_order = $${paramIndex++}`);
      values.push(input.display_order);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (sets.length === 0) {
      return getOptionById(optionId);
    }

    values.push(optionId);
    const result = await client.query<QuestionOption>(
      `UPDATE ${t("options")} SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteOption(
  authContext: AuthContext,
  optionId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${t("options")} WHERE id = $1`,
      [optionId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

// ============================================================================
// SURVEY RUNS CRUD
// ============================================================================

export async function listRuns(surveyId: string): Promise<SurveyRun[]> {
  const result = await query<SurveyRun>(
    `SELECT * FROM ${t("survey_runs")} WHERE survey_id = $1 ORDER BY starts_at DESC`,
    [surveyId],
  );
  return result.rows;
}

export async function getRunById(runId: string): Promise<SurveyRun | null> {
  const result = await query<SurveyRun>(
    `SELECT * FROM ${t("survey_runs")} WHERE id = $1`,
    [runId],
  );
  return result.rows[0] ?? null;
}

export async function getRunByKey(surveyId: string, runKey: string): Promise<SurveyRun | null> {
  const result = await query<SurveyRun>(
    `SELECT * FROM ${t("survey_runs")} WHERE survey_id = $1 AND run_key = $2`,
    [surveyId, runKey],
  );
  return result.rows[0] ?? null;
}

export interface CreateRunInput {
  survey_id: string;
  run_key: string;
  title?: string;
  starts_at: string;
  ends_at?: string;
  max_submissions_per_user?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export async function createRun(
  authContext: AuthContext,
  input: CreateRunInput,
): Promise<SurveyRun> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<SurveyRun>(
      `INSERT INTO ${t("survey_runs")} (survey_id, run_key, title, starts_at, ends_at, max_submissions_per_user, is_active, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.survey_id,
        input.run_key,
        input.title ?? null,
        input.starts_at,
        input.ends_at ?? null,
        input.max_submissions_per_user ?? 1,
        input.is_active ?? true,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return result.rows[0];
  });
}

export interface UpdateRunInput {
  run_key?: string;
  title?: string;
  starts_at?: string;
  ends_at?: string | null;
  max_submissions_per_user?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
}

export async function updateRun(
  authContext: AuthContext,
  runId: string,
  input: UpdateRunInput,
): Promise<SurveyRun | null> {
  return withAuthTransaction(authContext, async (client) => {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.run_key !== undefined) {
      sets.push(`run_key = $${paramIndex++}`);
      values.push(input.run_key);
    }
    if (input.title !== undefined) {
      sets.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.starts_at !== undefined) {
      sets.push(`starts_at = $${paramIndex++}`);
      values.push(input.starts_at);
    }
    if (input.ends_at !== undefined) {
      sets.push(`ends_at = $${paramIndex++}`);
      values.push(input.ends_at);
    }
    if (input.max_submissions_per_user !== undefined) {
      sets.push(`max_submissions_per_user = $${paramIndex++}`);
      values.push(input.max_submissions_per_user);
    }
    if (input.is_active !== undefined) {
      sets.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (sets.length === 0) {
      return getRunById(runId);
    }

    values.push(runId);
    const result = await client.query<SurveyRun>(
      `UPDATE ${t("survey_runs")} SET ${sets.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  });
}

export async function deleteRun(
  authContext: AuthContext,
  runId: string,
): Promise<boolean> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query(
      `DELETE FROM ${t("survey_runs")} WHERE id = $1`,
      [runId],
    );
    return (result.rowCount ?? 0) > 0;
  });
}

// ============================================================================
// RESPONSES (Admin Read-Only)
// ============================================================================

export interface ResponseWithAnswers extends SurveyResponse {
  answers: SurveyAnswer[];
}

export async function listResponses(
  authContext: AuthContext,
  runId: string,
): Promise<SurveyResponse[]> {
  return withAuthTransaction(authContext, async (client) => {
    const result = await client.query<SurveyResponse>(
      `SELECT * FROM ${t("responses")} WHERE survey_run_id = $1 ORDER BY created_at DESC`,
      [runId],
    );
    return result.rows;
  });
}

export async function getResponseWithAnswers(
  authContext: AuthContext,
  responseId: string,
): Promise<ResponseWithAnswers | null> {
  return withAuthTransaction(authContext, async (client) => {
    const responseResult = await client.query<SurveyResponse>(
      `SELECT * FROM ${t("responses")} WHERE id = $1`,
      [responseId],
    );
    const response = responseResult.rows[0];
    if (!response) return null;

    const answersResult = await client.query<SurveyAnswer>(
      `SELECT * FROM ${t("answers")} WHERE response_id = $1`,
      [responseId],
    );

    return {
      ...response,
      answers: answersResult.rows,
    };
  });
}

export async function getResponseCount(runId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM ${t("responses")} WHERE survey_run_id = $1`,
    [runId],
  );
  return parseInt(result.rows[0]?.count ?? "0", 10);
}
