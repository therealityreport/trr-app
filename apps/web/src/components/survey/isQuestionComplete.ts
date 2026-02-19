"use client";

import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type {
  AgreeLikertScaleConfig,
  CastMultiSelectConfig,
  CastDecisionCardConfig,
  MultiSelectChoiceConfig,
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
  if (Array.isArray(value)) {
    if (uiVariant === "multi-select-choice" || uiVariant === "cast-multi-select") {
      const cfg = config as MultiSelectChoiceConfig | CastMultiSelectConfig;
      const minFromConfig = typeof cfg.minSelections === "number" && Number.isFinite(cfg.minSelections)
        ? Math.max(0, Math.floor(cfg.minSelections))
        : undefined;
      const maxFromConfig = typeof cfg.maxSelections === "number" && Number.isFinite(cfg.maxSelections)
        ? Math.max(1, Math.floor(cfg.maxSelections))
        : Infinity;
      const minSelections = minFromConfig ?? (uiVariant === "cast-multi-select" ? 2 : 1);
      return value.length >= minSelections && value.length <= maxFromConfig;
    }
    return isNonEmptyArray(value);
  }

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

      case "reunion-seating-prediction": {
        const fullTimeOptions = question.options.filter((option) => {
          const metadata = option.metadata as { castRole?: string; surveyRole?: string } | null | undefined;
          return metadata?.castRole === "main" || metadata?.surveyRole === "main";
        });
        const fallbackFullTimeCount = fullTimeOptions.length > 0
          ? fullTimeOptions.length
          : question.options.filter((option) => {
            const metadata = option.metadata as { castRole?: string; surveyRole?: string } | null | undefined;
            return metadata?.castRole !== "friend_of" && metadata?.surveyRole !== "friend_of";
          }).length;
        const friendCount = question.options.filter((option) => {
          const metadata = option.metadata as { castRole?: string; surveyRole?: string } | null | undefined;
          return metadata?.castRole === "friend_of" || metadata?.surveyRole === "friend_of";
        }).length;

        const fullTimeOrder = Array.isArray(value.fullTimeOrder)
          ? value.fullTimeOrder.filter((entry): entry is string => isNonEmptyString(entry))
          : [];
        const hasFullTimeComplete = fullTimeOrder.length >= fallbackFullTimeCount && fallbackFullTimeCount > 0;
        if (!hasFullTimeComplete) return false;
        if (friendCount === 1) {
          return value.friendSide === "left" || value.friendSide === "right";
        }
        return true;
      }

      default:
        return Object.keys(value).length > 0;
    }
  }

  return false;
}
