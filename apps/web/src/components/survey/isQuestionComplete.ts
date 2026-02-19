"use client";

import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type {
  AgreeLikertScaleConfig,
  CastDecisionCardConfig,
  QuestionConfig,
  ThreeChoiceSliderConfig,
  TwoAxisGridConfig,
  UiVariant,
} from "@/lib/surveys/question-config-types";
import { canonicalizeRankingVariant, inferUiVariant } from "@/lib/surveys/question-config-types";

import { coercePlacements, getExtent, getSubjects } from "./twoAxisGridUtils";

type QuestionWithOptions = SurveyQuestion & { options: QuestionOption[] };

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getUiVariant(question: QuestionWithOptions): UiVariant {
  const config = question.config as QuestionConfig;
  return canonicalizeRankingVariant(
    config.uiVariant ?? inferUiVariant(question.question_type),
  ) as UiVariant;
}

/**
 * Determines whether a question should be treated as "answered"/complete for
 * completion percentage + required gating.
 *
 * Special cases:
 * - Matrix-likert variants must have a value for every row id.
 * - two-axis-grid must have a coordinate for every subject id.
 */
export function isQuestionComplete(question: QuestionWithOptions, value: unknown): boolean {
  const uiVariant = getUiVariant(question);
  const config = question.config as QuestionConfig;

  if (value === null || value === undefined) return false;

  if (isNonEmptyString(value)) return true;
  if (isFiniteNumber(value)) return true;
  if (isNonEmptyArray(value)) return true;

  if (isPlainObject(value)) {
    switch (uiVariant) {
      case "agree-likert-scale":
      case "cast-decision-card":
      case "three-choice-slider": {
        const cfg = config as AgreeLikertScaleConfig | CastDecisionCardConfig | ThreeChoiceSliderConfig;
        const rows = cfg.rows ?? [];
        if (rows.length === 0) return false;
        return rows.every((row) => isNonEmptyString(value[row.id]));
      }

      case "two-axis-grid": {
        const cfg = config as TwoAxisGridConfig;
        const extent = getExtent(cfg);
        const subjects = getSubjects(question, cfg);
        if (subjects.length === 0) return false;
        const placements = coercePlacements(value, subjects, extent);
        return subjects.every((s) => Boolean(placements[s.id]));
      }

      default:
        return Object.keys(value).length > 0;
    }
  }

  return false;
}
