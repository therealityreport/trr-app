"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { NumericScaleSliderConfig } from "@/lib/surveys/question-config-types";

export interface SliderInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function SliderInput({
  question,
  value,
  onChange,
  disabled = false,
}: SliderInputProps) {
  const config = question.config as unknown as NumericScaleSliderConfig;
  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const step = config.step ?? 1;
  const minLabel = config.minLabel ?? String(min);
  const maxLabel = config.maxLabel ?? String(max);
  const subject = config.subject;

  const [localValue, setLocalValue] = React.useState<number>(value ?? Math.round((min + max) / 2));
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (value !== null) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const newValue = Number(event.target.value);
      setLocalValue(newValue);
      onChange(newValue);
    },
    [disabled, onChange]
  );

  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      {/* Subject header with image */}
      {subject && (
        <div className="flex items-center justify-center gap-3 mb-4">
          {subject.img && (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
              <Image
                src={subject.img}
                alt={subject.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                unoptimized={subject.img.startsWith("http")}
              />
            </div>
          )}
          <span className="text-lg font-semibold text-gray-700">{subject.name}</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {/* Current value display */}
        <div className="text-4xl font-bold text-gray-800 tabular-nums">
          {localValue}
        </div>

        {/* Slider */}
        <div className="w-full max-w-md px-2">
          <div className="relative">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={localValue}
              onChange={handleChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              disabled={disabled}
              className="w-full h-3 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
              }}
              aria-label={question.question_text}
            />
            <style jsx>{`
              input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #6366f1;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.15s ease;
                transform: scale(${isDragging ? 1.15 : 1});
              }
              input[type="range"]::-moz-range-thumb {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #6366f1;
                cursor: pointer;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.15s ease;
                transform: scale(${isDragging ? 1.15 : 1});
              }
              input[type="range"]:disabled::-webkit-slider-thumb {
                cursor: not-allowed;
                background: #9ca3af;
              }
              input[type="range"]:disabled::-moz-range-thumb {
                cursor: not-allowed;
                background: #9ca3af;
              }
            `}</style>
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-2 text-sm font-medium text-gray-500">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
