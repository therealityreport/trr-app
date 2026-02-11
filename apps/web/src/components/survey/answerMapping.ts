"use client";

import type { QuestionOption } from "@/lib/surveys/normalized-types";

export function resolveSingleChoiceOptionId(
  options: QuestionOption[],
  selected: string | null | undefined,
): string | undefined {
  if (!selected) return undefined;
  const match = options.find((o) => o.option_key === selected || o.id === selected);
  return match?.id;
}

