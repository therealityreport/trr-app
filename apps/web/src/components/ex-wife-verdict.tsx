"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyTheme, ExWifeVerdictChoice, SurveyRankingItem } from "@/lib/surveys/types";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

export interface ExWifeVerdictProps {
  castMember: SurveyRankingItem;
  value: ExWifeVerdictChoice | null;
  onChange?(verdict: ExWifeVerdictChoice): void;
  surveyTheme?: SurveyTheme;
}

const VERDICT_OPTIONS: { value: ExWifeVerdictChoice; label: string }[] = [
  { value: "bring-back", label: "Bring Back" },
  { value: "stay-gone", label: "Stay Gone" },
];

export default function ExWifeVerdict({
  castMember,
  value,
  onChange,
  surveyTheme = DEFAULT_SURVEY_THEME,
}: ExWifeVerdictProps) {
  // Map value to slider position (0 or 1)
  const valueToPosition = (v: ExWifeVerdictChoice | null): number => {
    if (v === "bring-back") return 0;
    if (v === "stay-gone") return 1;
    return 0.5; // Default to middle if no selection
  };

  // Map slider position to value
  const positionToValue = (pos: number): ExWifeVerdictChoice => {
    return pos < 0.5 ? "bring-back" : "stay-gone";
  };

  const handleSliderChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const pos = Number.parseFloat(event.target.value);
      const verdict = positionToValue(pos);
      onChange?.(verdict);
    },
    [onChange],
  );

  const handleSelect = React.useCallback(
    (verdict: ExWifeVerdictChoice) => {
      onChange?.(verdict);
    },
    [onChange],
  );

  const sliderPosition = valueToPosition(value);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <div
        className="rounded-3xl p-6 sm:p-8 shadow-lg"
        style={{ backgroundColor: surveyTheme.slotBg }}
      >
        <h2
          className="text-xl sm:text-2xl font-bold text-center mb-2"
          style={{
            fontFamily: surveyTheme.questionFont,
            color: surveyTheme.questionColor,
          }}
        >
          Bring Back or Stay Gone?
        </h2>

        <div className="flex flex-col items-center mt-6 mb-8">
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-lg"
            style={{
              boxShadow: `0 0 0 4px ${surveyTheme.benchTokenRing}`,
            }}
          >
            {castMember.img ? (
              <Image
                src={castMember.img}
                alt={castMember.label}
                width={160}
                height={160}
                className="h-full w-full object-cover"
                unoptimized
                draggable={false}
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-2xl font-bold uppercase"
                style={{
                  backgroundColor: surveyTheme.benchBg,
                  color: surveyTheme.questionColor,
                }}
              >
                {castMember.label
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
            )}
          </div>

          <p
            className="mt-4 text-lg sm:text-xl font-medium text-center"
            style={{
              fontFamily: surveyTheme.instructionFont,
              color: surveyTheme.questionColor,
            }}
          >
            {castMember.label}
          </p>
        </div>

        <div className="relative mt-8">
          <div className="relative h-8 mb-3">
            {VERDICT_OPTIONS.map((option, index) => {
              const leftPos = index === 0 ? "24px" : "calc(100% - 24px)";
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="absolute -translate-x-1/2 text-sm sm:text-base font-semibold transition-colors"
                  style={{
                    left: leftPos,
                    fontFamily: surveyTheme.instructionFont,
                    color:
                      value === option.value
                        ? surveyTheme.questionColor
                        : surveyTheme.instructionColor,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="relative h-16 flex items-center">
            {/* Track background */}
            <div
              className="absolute left-[24px] right-[24px] h-1 rounded-full top-1/2 -translate-y-1/2"
              style={{ backgroundColor: surveyTheme.progressFill }}
            />

            {/* Dot markers */}
            {VERDICT_OPTIONS.map((option, index) => {
              const isSelected = value === option.value;
              const leftPos = index === 0 ? "24px" : "calc(100% - 24px)";

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: leftPos }}
                  aria-label={option.label}
                  aria-pressed={isSelected}
                >
                  <div
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: isSelected ? 28 : 20,
                      height: isSelected ? 28 : 20,
                      backgroundColor: isSelected ? surveyTheme.progressFill : surveyTheme.slotBg,
                      border: `3px solid ${surveyTheme.progressFill}`,
                      boxShadow: isSelected ? "0 2px 8px rgba(0, 0, 0, 0.2)" : "none",
                    }}
                  />
                </button>
              );
            })}

            {/* Slider input - invisible, just for dragging */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sliderPosition}
              onChange={handleSliderChange}
              className="absolute left-0 right-0 w-full h-16 appearance-none cursor-pointer z-20 opacity-0"
              aria-label="Select verdict"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
