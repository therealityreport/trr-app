"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { MultiSelectChoiceConfig } from "@/lib/surveys/question-config-types";

export interface MultiSelectInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export default function MultiSelectInput({
  question,
  value,
  onChange,
  disabled = false,
}: MultiSelectInputProps) {
  const config = question.config as unknown as MultiSelectChoiceConfig;
  const minSelections = config.minSelections ?? 0;
  const maxSelections = config.maxSelections ?? Infinity;

  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);
  const selectedValues = React.useMemo(() => value ?? [], [value]);

  const handleToggle = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;

      const isSelected = selectedValues.includes(optionKey);
      let newValue: string[];

      if (isSelected) {
        // Remove from selection
        newValue = selectedValues.filter((v) => v !== optionKey);
      } else {
        // Add to selection (if under max)
        if (selectedValues.length >= maxSelections) {
          // At max, don't add more
          return;
        }
        newValue = [...selectedValues, optionKey];
      }

      onChange(newValue);
    },
    [disabled, selectedValues, maxSelections, onChange]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  const hasImages = sortedOptions.some((opt) => getImagePath(opt));

  return (
    <div className="space-y-4">
      {/* Selection constraints info */}
      {(minSelections > 0 || maxSelections < Infinity) && (
        <p className="text-sm text-gray-500">
          {minSelections > 0 && maxSelections < Infinity
            ? `Select ${minSelections} to ${maxSelections} options`
            : minSelections > 0
            ? `Select at least ${minSelections} option${minSelections > 1 ? "s" : ""}`
            : `Select up to ${maxSelections} option${maxSelections > 1 ? "s" : ""}`}
          {" "}({selectedValues.length} selected)
        </p>
      )}

      {/* Options grid */}
      <div className={`grid gap-3 ${hasImages ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-1"}`}>
        {sortedOptions.map((option) => {
          const isSelected = selectedValues.includes(option.option_key);
          const isDisabledByMax = !isSelected && selectedValues.length >= maxSelections;
          const imagePath = getImagePath(option);

          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleToggle(option.option_key)}
              disabled={disabled || isDisabledByMax}
              className={`
                flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                ${isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${disabled || isDisabledByMax ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${hasImages ? "flex-col text-center" : ""}
              `}
              aria-pressed={isSelected}
            >
              {imagePath && (
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={imagePath}
                    alt={option.option_text}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={imagePath.startsWith("http")}
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Checkbox indicator */}
                <div
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300 bg-white"}
                  `}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-800">{option.option_text}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
