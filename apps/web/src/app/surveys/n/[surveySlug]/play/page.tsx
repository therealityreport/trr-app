"use client";

import { use } from "react";
import { NormalizedSurveyPlay } from "@/components/survey";

interface PageProps {
  params: Promise<{ surveySlug: string }>;
}

export default function NormalizedSurveyPlayPage({ params }: PageProps) {
  const { surveySlug } = use(params);

  return (
    <NormalizedSurveyPlay
      surveySlug={surveySlug}
      backUrl={`/surveys/n/${surveySlug}`}
      successRedirect={`/surveys/n/${surveySlug}/results`}
    />
  );
}
