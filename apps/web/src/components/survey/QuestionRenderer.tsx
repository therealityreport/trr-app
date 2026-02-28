"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { NumericRankingConfig, QuestionConfig, UiVariant } from "@/lib/surveys/question-config-types";
import { canonicalizeRankingVariant, inferUiVariant } from "@/lib/surveys/question-config-types";

import StarRatingInput from "./StarRatingInput";
import IconRatingInput from "./IconRatingInput";
import SliderInput from "./SliderInput";
import PersonRankingsInput from "./PersonRankingsInput";
import PosterRankingsInput from "./PosterRankingsInput";
import TwoChoiceCast from "./TwoChoiceCast";
import MatrixLikertInput from "./MatrixLikertInput";
import CastDecisionCardInput from "./CastDecisionCardInput";
import TwoAxisGridInput from "./TwoAxisGridInput";
import ReunionSeatingPredictionInput from "./ReunionSeatingPredictionInput";
import MultiSelectInput from "./MultiSelectInput";
import CastMultiSelectInput from "./CastMultiSelectInput";
import SingleSelectInput from "./SingleSelectInput";
import RankTextFields from "./RankTextFields";
import PosterSingleSelect from "./PosterSingleSelect";
import SingleSelectCastInput from "./SingleSelectCastInput";
import DropdownInput from "./DropdownInput";
import TextEntryInput from "./TextEntryInput";

// ============================================================================
// Types
// ============================================================================

export interface QuestionRendererProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  showIconUrl?: string | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * QuestionRenderer - Dispatches to the appropriate input component
 * based on question_type and config.uiVariant.
 */
export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  showIconUrl = null,
}: QuestionRendererProps) {
  const config = question.config as QuestionConfig;
  const uiVariant: UiVariant = canonicalizeRankingVariant(
    config.uiVariant ?? inferUiVariant(question.question_type),
  ) as UiVariant;

  const commonProps = {
    question,
    disabled,
  };

  switch (uiVariant) {
    // Numeric rating questions
    case "numeric-ranking": {
      const numericConfig = config as NumericRankingConfig;
      const override = typeof numericConfig.iconOverrideUrl === "string"
        ? numericConfig.iconOverrideUrl.trim()
        : "";
      const resolvedIconUrl = override || (showIconUrl ?? "").trim();
      if (resolvedIconUrl) {
        return (
          <IconRatingInput
            value={value as number | null}
            onChange={onChange}
            min={numericConfig.min}
            max={numericConfig.max}
            step={numericConfig.step}
            iconCount={Math.max(1, Math.round(numericConfig.max))}
            iconSrc={resolvedIconUrl}
            ariaLabel={question.question_text}
            disabled={disabled}
          />
        );
      }
      return (
        <StarRatingInput
          {...commonProps}
          value={value as number | null}
          onChange={onChange}
        />
      );
    }

    case "numeric-scale-slider":
      return (
        <SliderInput
          {...commonProps}
          value={value as number | null}
          onChange={onChange}
        />
      );

    case "two-axis-grid":
      return (
        <TwoAxisGridInput
          {...commonProps}
          value={value as Record<string, { x: number; y: number }> | null}
          onChange={onChange}
        />
      );

    // Ranking questions (drag and drop)
    case "person-rankings":
      return (
        <PersonRankingsInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "poster-rankings":
      return (
        <PosterRankingsInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "circle-ranking":
      return (
        <PersonRankingsInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "rectangle-ranking":
      return (
        <PosterRankingsInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    // Slider choice questions
    case "two-choice-slider":
      return (
        <TwoChoiceCast
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    case "three-choice-slider":
    case "cast-decision-card":
      return (
        <CastDecisionCardInput
          {...commonProps}
          value={value as Record<string, string> | null}
          onChange={onChange}
        />
      );

    case "agree-likert-scale":
      return (
        <MatrixLikertInput
          {...commonProps}
          value={value as Record<string, string> | null}
          onChange={onChange}
        />
      );

    case "reunion-seating-prediction":
      return (
        <ReunionSeatingPredictionInput
          {...commonProps}
          value={value as { fullTimeOrder?: string[]; friendSide?: "left" | "right" | null; completed?: boolean } | null}
          onChange={onChange}
        />
      );

    // Multiple choice questions
    case "multi-select-choice":
      return (
        <MultiSelectInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "cast-multi-select":
      return (
        <CastMultiSelectInput
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "text-multiple-choice":
      return (
        <SingleSelectInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    case "rank-text-fields":
      return (
        <RankTextFields
          {...commonProps}
          value={value as string[] | null}
          onChange={onChange}
        />
      );

    case "image-multiple-choice":
      return (
        <SingleSelectInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
          layout="grid"
        />
      );

    case "poster-single-select":
      return (
        <PosterSingleSelect
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    case "cast-single-select":
      return (
        <SingleSelectCastInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    case "dropdown":
      return (
        <DropdownInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    case "text-entry":
      return (
        <TextEntryInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
        />
      );

    default:
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
          <p className="text-red-600 text-sm">
            Unknown question type: {question.question_type} / {uiVariant}
          </p>
        </div>
      );
  }
}
