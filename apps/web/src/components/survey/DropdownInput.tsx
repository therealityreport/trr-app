"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { DropdownConfig } from "@/lib/surveys/question-config-types";

export interface DropdownInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function DropdownInput({
  question,
  value,
  onChange,
  disabled = false,
}: DropdownInputProps) {
  const config = question.config as unknown as DropdownConfig;
  const placeholder = config.placeholder ?? "Select an option";

  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (disabled) return;
      const selectedValue = event.target.value;
      if (selectedValue) {
        onChange(selectedValue);
      }
    },
    [disabled, onChange]
  );

  return (
    <div className="w-full max-w-md">
      <select
        value={value ?? ""}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-lg border-2 bg-white text-gray-800 text-sm font-medium
          appearance-none cursor-pointer
          ${value ? "border-gray-300" : "border-gray-200 text-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:border-gray-400"}
          focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
        `}
        aria-label={question.question_text}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          backgroundSize: "20px",
          paddingRight: "44px",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {sortedOptions.map((option) => (
          <option key={option.option_key} value={option.option_key}>
            {option.option_text}
          </option>
        ))}
      </select>
    </div>
  );
}
