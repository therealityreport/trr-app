"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { NumericRankingConfig } from "@/lib/surveys/question-config-types";
import EpisodeRating from "@/components/episode-rating";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

export interface StarRatingInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * StarRatingInput - Wraps EpisodeRating for use in normalized surveys.
 *
 * Uses the advanced EpisodeRating component which has:
 * - 10 stars with partial fill
 * - Text input with auto-formatting ("88" → "8.8")
 * - Slider for precise control (0.1 increments)
 */
export default function StarRatingInput({
  question,
  value,
  onChange,
  disabled = false,
}: StarRatingInputProps) {
  const config = question.config as unknown as NumericRankingConfig;

  // Build a custom theme using indigo colors to match the survey system
  const surveyTheme = React.useMemo(() => ({
    ...DEFAULT_SURVEY_THEME,
    slotBg: "#ffffff",
    questionFont: "inherit",
    questionColor: "#111827", // gray-900
    instructionFont: "inherit",
    instructionColor: "#6b7280", // gray-500
    slotNumberFont: "inherit",
    progressFill: "#6366f1", // indigo-500
    progressBg: "#e5e7eb", // gray-200
    submitBg: "#6366f1", // indigo-500
  }), []);

  // Use config labels if provided
  const episodeLabel = config.labels?.max
    ? `(${config.labels.min} - ${config.labels.max})`
    : "";

  const handleChange = React.useCallback(
    (newValue: number) => {
      if (disabled) return;
      onChange(newValue);
    },
    [disabled, onChange]
  );

  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <EpisodeRating
        value={value}
        onChange={handleChange}
        surveyTheme={surveyTheme}
        episodeLabel={episodeLabel}
        hideHeader
      />
    </div>
  );
}
