"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { QuestionConfig, UiVariant } from "@/lib/surveys/question-config-types";
import { canonicalizeRankingVariant, inferUiVariant } from "@/lib/surveys/question-config-types";

import StarRatingInput from "./StarRatingInput";
import SliderInput from "./SliderInput";
import PersonRankingsInput from "./PersonRankingsInput";
import PosterRankingsInput from "./PosterRankingsInput";
import WhoseSideInput from "./WhoseSideInput";
import MatrixLikertInput from "./MatrixLikertInput";
import CastDecisionCardInput from "./CastDecisionCardInput";
import TwoAxisGridInput from "./TwoAxisGridInput";
import MultiSelectInput from "./MultiSelectInput";
import SingleSelectInput from "./SingleSelectInput";
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
    case "numeric-ranking":
      return (
        <StarRatingInput
          {...commonProps}
          value={value as number | null}
          onChange={onChange}
        />
      );

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
        <WhoseSideInput
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

    // Multiple choice questions
    case "multi-select-choice":
      return (
        <MultiSelectInput
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

    case "image-multiple-choice":
      return (
        <SingleSelectInput
          {...commonProps}
          value={value as string | null}
          onChange={onChange}
          layout="grid"
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
