"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";

export interface SingleSelectInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Layout mode: vertical (default), horizontal for likert-scale, or grid for images */
  layout?: "vertical" | "horizontal" | "grid";
}

export default function SingleSelectInput({
  question,
  value,
  onChange,
  disabled = false,
  layout = "vertical",
}: SingleSelectInputProps) {
  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(value === optionKey ? "" : optionKey);
    },
    [disabled, onChange, value]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  const hasImages = sortedOptions.some((opt) => getImagePath(opt));

  if (layout === "horizontal") {
    // Horizontal layout for likert-scale
    return (
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
        {sortedOptions.map((option) => {
          const isSelected = value === option.option_key;
          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              className={`
                rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm
                ${isSelected
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
            >
              {option.option_text}
            </button>
          );
        })}
      </div>
    );
  }

  // Grid layout (explicit or when images exist)
  if (layout === "grid" || hasImages) {
    // Grid layout with images
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
        {sortedOptions.map((option) => {
          const isSelected = value === option.option_key;
          const imagePath = getImagePath(option);

          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all sm:gap-2 sm:p-3
                ${isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
            >
              {imagePath && (
                <div className="h-14 w-14 overflow-hidden rounded-full sm:h-16 sm:w-16">
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
              <span className="text-xs font-medium text-center text-gray-800 sm:text-sm">
                {option.option_text}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Standard vertical radio list
  return (
    <div className="space-y-1.5 sm:space-y-2">
      {sortedOptions.map((option) => {
        const isSelected = value === option.option_key;
        return (
          <button
            key={option.option_key}
            type="button"
            onClick={() => handleSelect(option.option_key)}
            disabled={disabled}
            className={`
              w-full rounded-lg border-2 p-2.5 text-left transition-all sm:p-3
              flex items-center gap-2.5 sm:gap-3
              ${isSelected
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 bg-white hover:border-gray-300"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            aria-pressed={isSelected}
          >
            {/* Radio indicator */}
            <div
              className={`
                h-4 w-4 flex-shrink-0 rounded-full border-2 sm:h-5 sm:w-5
                flex items-center justify-center
                ${isSelected ? "border-indigo-500" : "border-gray-300"}
              `}
            >
              {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-500 sm:h-2.5 sm:w-2.5" />}
            </div>
            <span className="text-xs font-medium text-gray-800 sm:text-sm">{option.option_text}</span>
          </button>
        );
      })}
    </div>
  );
}
