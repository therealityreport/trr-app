"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { TextEntryConfig } from "@/lib/surveys/question-config-types";

export interface TextEntryInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function TextEntryInput({
  question,
  value,
  onChange,
  disabled = false,
}: TextEntryInputProps) {
  const config = question.config as unknown as TextEntryConfig;
  const inputType = config.inputType ?? "text";
  const placeholder = config.placeholder ?? "";
  const validation = config.validation;

  const [localValue, setLocalValue] = React.useState(value ?? "");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  const validate = React.useCallback(
    (val: string): string | null => {
      if (!validation) return null;

      if (validation.minLength && val.length < validation.minLength) {
        return validation.errorMessage ?? `Minimum ${validation.minLength} characters required`;
      }

      if (validation.maxLength && val.length > validation.maxLength) {
        return validation.errorMessage ?? `Maximum ${validation.maxLength} characters allowed`;
      }

      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(val)) {
          return validation.errorMessage ?? "Invalid format";
        }
      }

      return null;
    },
    [validation]
  );

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = event.target.value;
      setLocalValue(newValue);

      // Validate on change
      const validationError = validate(newValue);
      setError(validationError);

      // Always emit the value (validation is for UI feedback)
      onChange(newValue);
    },
    [disabled, onChange, validate]
  );

  const handleBlur = React.useCallback(() => {
    const validationError = validate(localValue);
    setError(validationError);
  }, [localValue, validate]);

  return (
    <div className="w-full max-w-md space-y-2">
      <input
        type={inputType}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        minLength={validation?.minLength}
        maxLength={validation?.maxLength}
        pattern={validation?.pattern}
        className={`
          w-full px-4 py-3 rounded-lg border-2 bg-white text-gray-800 text-sm
          ${error ? "border-red-400" : "border-gray-200"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
          focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
          placeholder:text-gray-400
        `}
        aria-label={question.question_text}
        aria-invalid={!!error}
        aria-describedby={error ? `${question.id}-error` : undefined}
      />
      {error && (
        <p
          id={`${question.id}-error`}
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
