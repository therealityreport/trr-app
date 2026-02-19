"use client";

import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import { canonicalizeRankingVariant, inferUiVariant } from "@/lib/surveys/question-config-types";

import PersonRankingsInput from "./PersonRankingsInput";
import PosterRankingsInput from "./PosterRankingsInput";

export interface RankOrderInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function RankOrderInput(props: RankOrderInputProps) {
  const config = props.question.config as { uiVariant?: string } | null | undefined;
  const normalizedVariant = canonicalizeRankingVariant(
    config?.uiVariant ?? inferUiVariant(props.question.question_type),
  );

  if (normalizedVariant === "poster-rankings") {
    return <PosterRankingsInput {...props} />;
  }

  return <PersonRankingsInput {...props} />;
}
