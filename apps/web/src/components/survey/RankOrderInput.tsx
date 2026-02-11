"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { CircleRankingConfig, RectangleRankingConfig } from "@/lib/surveys/question-config-types";
import type { SurveyRankingItem } from "@/lib/surveys/types";
import FlashbackRanker from "@/components/flashback-ranker";

export interface RankOrderInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function RankOrderInput({
  question,
  value,
  onChange,
  disabled = false,
}: RankOrderInputProps) {
  const config = question.config as unknown as CircleRankingConfig | RectangleRankingConfig;
  // Determine variant from uiVariant: circle-ranking = grid, rectangle-ranking = classic
  const variant = config.uiVariant === "circle-ranking" ? "grid" : "classic";
  const lineLabelTop = config.lineLabelTop ?? "BEST";
  const lineLabelBottom = config.lineLabelBottom ?? "WORST";

  const getImagePath = React.useCallback((metadata: unknown): string => {
    const record = metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return record?.imagePath ?? record?.imageUrl ?? "";
  }, []);

  // Convert options to SurveyRankingItem format
  const items: SurveyRankingItem[] = React.useMemo(
    () =>
      question.options
        .sort((a, b) => a.display_order - b.display_order)
        .map((opt) => ({
          id: opt.option_key,
          label: opt.option_text,
          img: getImagePath(opt.metadata),
        })),
    [getImagePath, question.options]
  );

  // Handle ranking change from FlashbackRanker
  const handleRankingChange = React.useCallback(
    (ranking: SurveyRankingItem[]) => {
      if (disabled) return;
      const orderedIds = ranking.map((item) => item.id);
      onChange(orderedIds);
    },
    [disabled, onChange]
  );

  if (disabled) {
    // Show static display when disabled
    return (
      <div className="opacity-50 pointer-events-none">
        <FlashbackRanker
          items={items}
          initialRankingIds={value ?? []}
          lineLabelTop={lineLabelTop}
          lineLabelBottom={lineLabelBottom}
          variant={variant}
        />
      </div>
    );
  }

  return (
    <FlashbackRanker
      items={items}
      initialRankingIds={value ?? []}
      lineLabelTop={lineLabelTop}
      lineLabelBottom={lineLabelBottom}
      onChange={handleRankingChange}
      variant={variant}
    />
  );
}
