"use client";

import * as React from "react";
import type { SurveyTheme } from "@/lib/surveys/types";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

export interface EpisodeRatingProps {
  value: number | null;
  onChange?(value: number): void;
  surveyTheme?: SurveyTheme;
  episodeLabel?: string;
  /** Hide the title and description (useful when embedded in a form with its own labels) */
  hideHeader?: boolean;
}

export default function EpisodeRating({
  value,
  onChange,
  surveyTheme = DEFAULT_SURVEY_THEME,
  episodeLabel = "this episode",
  hideHeader = false,
}: EpisodeRatingProps) {
  const [localValue, setLocalValue] = React.useState<number>(value ?? 5.0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>((value ?? 5.0).toFixed(1));
  const uniqueId = React.useId();

  React.useEffect(() => {
    if (value !== null) {
      setLocalValue(value);
      setInputValue(value.toFixed(1));
    }
  }, [value]);

  const handleChange = React.useCallback(
    (newValue: number) => {
      const clamped = Math.max(0, Math.min(10, newValue));
      const rounded = Math.round(clamped * 10) / 10;
      setLocalValue(rounded);
      setInputValue(rounded.toFixed(1));
      onChange?.(rounded);
    },
    [onChange],
  );

  const handleSliderChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(Number.parseFloat(event.target.value));
    },
    [handleChange],
  );

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let val = event.target.value;

      // Strip non-numeric except decimal point
      val = val.replace(/[^\d.]/g, "");

      // If user typed two digits without a decimal, auto-format
      // e.g., "88" -> "8.8", "75" -> "7.5"
      // But "10" stays as "10" (valid rating)
      if (/^\d{2}$/.test(val) && val !== "10") {
        val = `${val[0]}.${val[1]}`;
        // Apply the change immediately
        const parsed = Number.parseFloat(val);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 10) {
          handleChange(parsed);
          return;
        }
      }

      setInputValue(val);
    },
    [handleChange],
  );

  const handleInputBlur = React.useCallback(() => {
    const parsed = Number.parseFloat(inputValue);
    if (Number.isFinite(parsed)) {
      handleChange(parsed);
    } else {
      setInputValue(localValue.toFixed(1));
    }
  }, [inputValue, localValue, handleChange]);

  const handleInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      }
    },
    [],
  );

  const getStarFillPercent = (starIndex: number): number => {
    const starNumber = starIndex + 1;
    if (localValue >= starNumber) return 100;
    if (localValue <= starNumber - 1) return 0;
    return (localValue - (starNumber - 1)) * 100;
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <div
        className="rounded-3xl p-6 sm:p-8 shadow-lg"
        style={{ backgroundColor: surveyTheme.slotBg }}
      >
        {!hideHeader && (
          <>
            <h2
              className="text-2xl sm:text-3xl font-bold text-center mb-2"
              style={{
                fontFamily: surveyTheme.questionFont,
                color: surveyTheme.questionColor,
              }}
            >
              Rate {episodeLabel}
            </h2>
            <p
              className="text-center mb-8"
              style={{
                fontFamily: surveyTheme.instructionFont,
                color: surveyTheme.instructionColor,
              }}
            >
              How would you rate this week&apos;s episode?
            </p>
          </>
        )}

        <div className="flex flex-col items-center gap-6">
          {/* Stars above the input */}
          <div className="flex gap-1">
            <svg width="0" height="0" style={{ position: "absolute" }}>
              <defs>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                  <linearGradient key={i} id={`ep-star-fill-${uniqueId}-${i}`}>
                    <stop
                      offset={`${getStarFillPercent(i)}%`}
                      stopColor={surveyTheme.progressFill}
                    />
                    <stop
                      offset={`${getStarFillPercent(i)}%`}
                      stopColor="transparent"
                    />
                  </linearGradient>
                ))}
              </defs>
            </svg>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star, index) => (
              <button
                key={star}
                type="button"
                onClick={() => handleChange(star)}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center transition-transform hover:scale-110"
                aria-label={`Rate ${star}`}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full">
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    fill={`url(#ep-star-fill-${uniqueId}-${index})`}
                    stroke={surveyTheme.progressFill}
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            ))}
          </div>

          {/* Number input */}
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="text-6xl sm:text-7xl font-bold tabular-nums text-center bg-transparent border-b-2 w-40 outline-none focus:border-current transition-colors"
            style={{
              fontFamily: surveyTheme.slotNumberFont,
              color: surveyTheme.questionColor,
              borderColor: surveyTheme.progressBg,
            }}
            aria-label="Rating value"
          />

          {/* Slider */}
          <div className="w-full max-w-xs">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={localValue}
                onChange={handleSliderChange}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onTouchStart={() => setIsDragging(true)}
                onTouchEnd={() => setIsDragging(false)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${surveyTheme.progressFill} 0%, ${surveyTheme.progressFill} ${(localValue / 10) * 100}%, ${surveyTheme.progressBg} ${(localValue / 10) * 100}%, ${surveyTheme.progressBg} 100%)`,
                }}
              />
              <style jsx>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: ${surveyTheme.submitBg};
                  cursor: pointer;
                  border: 3px solid ${surveyTheme.slotBg};
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                  transition: transform 0.15s ease;
                  transform: scale(${isDragging ? 1.15 : 1});
                }
                input[type="range"]::-moz-range-thumb {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: ${surveyTheme.submitBg};
                  cursor: pointer;
                  border: 3px solid ${surveyTheme.slotBg};
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                  transition: transform 0.15s ease;
                  transform: scale(${isDragging ? 1.15 : 1});
                }
              `}</style>
            </div>

            <div
              className="flex justify-between mt-2 text-sm font-medium"
              style={{
                fontFamily: surveyTheme.instructionFont,
                color: surveyTheme.instructionColor,
              }}
            >
              <span>0</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
