"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { TwoChoiceSliderConfig } from "@/lib/surveys/question-config-types";

export interface WhoseSideInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function WhoseSideInput({
  question,
  value,
  onChange,
  disabled = false,
}: WhoseSideInputProps) {
  const config = question.config as unknown as TwoChoiceSliderConfig;

  // Options: first two are the sides, third (if exists) is neutral
  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);
  const optionA = sortedOptions[0];
  const optionB = sortedOptions[1];
  const neutralOption = sortedOptions.find((opt) => opt.option_key === "neutral");

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(optionKey);
    },
    [disabled, onChange]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  return (
    <div className="space-y-6">
      {/* Main choice buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        {optionA && (
          <button
            type="button"
            onClick={() => handleSelect(optionA.option_key)}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-3 p-4 rounded-2xl border-3 transition-all
              ${value === optionA.option_key
                ? "border-indigo-500 bg-indigo-50 shadow-lg scale-105"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {getImagePath(optionA) && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                <Image
                  src={getImagePath(optionA)!}
                  alt={optionA.option_text}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized={getImagePath(optionA)!.startsWith("http")}
                />
              </div>
            )}
            <span className="text-lg font-semibold text-gray-800">{optionA.option_text}</span>
          </button>
        )}

        {/* VS divider */}
        <div className="flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-400 px-4">VS</span>
        </div>

        {optionB && (
          <button
            type="button"
            onClick={() => handleSelect(optionB.option_key)}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-3 p-4 rounded-2xl border-3 transition-all
              ${value === optionB.option_key
                ? "border-indigo-500 bg-indigo-50 shadow-lg scale-105"
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {getImagePath(optionB) && (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                <Image
                  src={getImagePath(optionB)!}
                  alt={optionB.option_text}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized={getImagePath(optionB)!.startsWith("http")}
                />
              </div>
            )}
            <span className="text-lg font-semibold text-gray-800">{optionB.option_text}</span>
          </button>
        )}
      </div>

      {/* Neutral option */}
      {(neutralOption || config.neutralOption) && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => handleSelect(neutralOption?.option_key ?? "neutral")}
            disabled={disabled}
            className={`
              px-6 py-3 rounded-full border-2 transition-all text-sm font-medium
              ${value === (neutralOption?.option_key ?? "neutral")
                ? "border-gray-500 bg-gray-100 text-gray-800"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {neutralOption?.option_text ?? config.neutralOption}
          </button>
        </div>
      )}
    </div>
  );
}
