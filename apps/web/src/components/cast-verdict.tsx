"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyTheme, CastVerdictChoice, SurveyRankingItem } from "@/lib/surveys/types";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

export interface CastVerdictProps {
  castMember: SurveyRankingItem;
  value: CastVerdictChoice | null;
  onChange?(verdict: CastVerdictChoice): void;
  surveyTheme?: SurveyTheme;
}

const VERDICT_OPTIONS: { value: CastVerdictChoice; label: string }[] = [
  { value: "fire", label: "Fire" },
  { value: "demote", label: "Demote" },
  { value: "keep", label: "Keep" },
];

export default function CastVerdict({
  castMember,
  value,
  onChange,
  surveyTheme = DEFAULT_SURVEY_THEME,
}: CastVerdictProps) {
  // Map value to slider position (0, 1, 2)
  const valueToPosition = (v: CastVerdictChoice | null): number => {
    if (v === "fire") return 0;
    if (v === "demote") return 1;
    if (v === "keep") return 2;
    return 1; // Default to middle if no selection
  };

  // Map slider position to value
  const positionToValue = (pos: number): CastVerdictChoice => {
    const rounded = Math.round(pos);
    if (rounded <= 0) return "fire";
    if (rounded >= 2) return "keep";
    return "demote";
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
    (verdict: CastVerdictChoice) => {
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
          Would you Keep, Demote, or Fire?
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
              const leftPos = index === 0 ? "24px" : index === 1 ? "50%" : "calc(100% - 24px)";
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
              // Position dots at 0%, 50%, 100% within the track area
              const leftPos = index === 0 ? "24px" : index === 1 ? "calc(50%)" : "calc(100% - 24px)";

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
              max="2"
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

export interface CastVerdictFlowProps {
  castMembers: SurveyRankingItem[];
  verdicts: Map<string, CastVerdictChoice>;
  onVerdictChange?(castId: string, verdict: CastVerdictChoice): void;
  onComplete?(): void;
  surveyTheme?: SurveyTheme;
}

export function CastVerdictFlow({
  castMembers,
  verdicts,
  onVerdictChange,
  onComplete,
  surveyTheme = DEFAULT_SURVEY_THEME,
}: CastVerdictFlowProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const currentMember = castMembers[currentIndex];
  const currentVerdict = currentMember ? verdicts.get(currentMember.id) ?? null : null;
  const isLast = currentIndex === castMembers.length - 1;
  const progress = ((currentIndex + 1) / castMembers.length) * 100;

  const handleVerdictChange = React.useCallback(
    (verdict: CastVerdictChoice) => {
      if (currentMember) {
        onVerdictChange?.(currentMember.id, verdict);
      }
    },
    [currentMember, onVerdictChange],
  );

  const handleNext = React.useCallback(() => {
    if (isLast) {
      onComplete?.();
    } else {
      setCurrentIndex((prev) => Math.min(prev + 1, castMembers.length - 1));
    }
  }, [isLast, castMembers.length, onComplete]);

  const handlePrev = React.useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (!currentMember) {
    return null;
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="px-4 mb-4">
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: surveyTheme.progressBg }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: surveyTheme.progressFill,
            }}
          />
        </div>
        <p
          className="text-sm mt-2 text-center"
          style={{
            fontFamily: surveyTheme.instructionFont,
            color: surveyTheme.progressText,
          }}
        >
          {currentIndex + 1} of {castMembers.length}
        </p>
      </div>

      <CastVerdict
        castMember={currentMember}
        value={currentVerdict}
        onChange={handleVerdictChange}
        surveyTheme={surveyTheme}
      />

      <div className="flex justify-between gap-4 px-4 mt-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-3 rounded-full font-medium transition-opacity disabled:opacity-40"
          style={{
            fontFamily: surveyTheme.instructionFont,
            border: `2px solid ${surveyTheme.resetBorder}`,
            color: surveyTheme.resetText,
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!currentVerdict}
          className="px-6 py-3 rounded-full font-medium transition-opacity disabled:opacity-40"
          style={{
            fontFamily: surveyTheme.instructionFont,
            backgroundColor: surveyTheme.submitBg,
            color: surveyTheme.submitText,
          }}
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
