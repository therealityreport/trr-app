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
      onChange(optionKey);
    },
    [disabled, onChange]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    return (option.metadata as { imagePath?: string })?.imagePath;
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
                px-4 py-2 rounded-full border-2 transition-all text-sm font-medium
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                ${isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
            >
              {imagePath && (
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={imagePath}
                    alt={option.option_text}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <span className="text-sm font-medium text-gray-800 text-center">
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
    <div className="space-y-2">
      {sortedOptions.map((option) => {
        const isSelected = value === option.option_key;
        return (
          <button
            key={option.option_key}
            type="button"
            onClick={() => handleSelect(option.option_key)}
            disabled={disabled}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
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
                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${isSelected ? "border-indigo-500" : "border-gray-300"}
              `}
            >
              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </div>
            <span className="text-sm font-medium text-gray-800">{option.option_text}</span>
          </button>
        );
      })}
    </div>
  );
}
