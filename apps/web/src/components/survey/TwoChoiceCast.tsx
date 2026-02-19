"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { TwoChoiceSliderConfig } from "@/lib/surveys/question-config-types";
import SurveyContinueButton from "./SurveyContinueButton";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface TwoChoiceCastProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DEFAULT_HEADING_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";

type UnknownRecord = Record<string, unknown>;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeScalePercent(value: unknown, fallback = 100): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampNumber(value, 40, 220);
}

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHexColor(colorValue: string): string | null {
  const match = colorValue.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match || !match[1]) return null;
  const hex = match[1];
  const expanded = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  return `#${expanded.toUpperCase()}`;
}

function toColorString(value: unknown): string | null {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return normalizeHexColor(trimmed) ?? trimmed;
  return trimmed;
}

function readPath(record: UnknownRecord, path: string[]): unknown {
  let cursor: unknown = record;
  for (const key of path) {
    const current = toRecord(cursor);
    if (!current || !(key in current)) return undefined;
    cursor = current[key];
  }
  return cursor;
}

function readFontValue(record: UnknownRecord, path: string[]): string | null {
  const value = readPath(record, path);
  const direct = toTrimmedString(value);
  if (direct) return direct;
  const nested = toRecord(value);
  if (!nested) return null;
  return (
    toTrimmedString(nested.fontFamily) ??
    toTrimmedString(nested.font) ??
    toTrimmedString(nested.family) ??
    null
  );
}

function readColorValue(record: UnknownRecord, path: string[]): string | null {
  const value = readPath(record, path);
  const direct = toColorString(value);
  if (direct) return direct;
  const nested = toRecord(value);
  if (!nested) return null;
  return toColorString(nested.color) ?? toColorString(nested.value) ?? null;
}

function pushUnique(values: string[], next: string | null) {
  if (!next || values.includes(next)) return;
  values.push(next);
}

function resolveFont(candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    const resolved = resolveCloudfrontCdnFont(candidate);
    if (resolved) return resolved.fontFamily;
    if (!isCloudfrontCdnFontCandidate(candidate)) return candidate;
  }
  return fallback;
}

export default function TwoChoiceCast({
  question,
  value,
  onChange,
  disabled = false,
}: TwoChoiceCastProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const config = question.config as unknown as TwoChoiceSliderConfig;
  const configRecord = config as unknown as UnknownRecord;
  const headingFontFamily = React.useMemo(() => {
    const configRecord = config as unknown as UnknownRecord;
    const headingCandidates: string[] = [];
    const headingPaths: string[][] = [
      ["questionTextFontFamily"],
      ["headingFontFamily"],
      ["titleFontFamily"],
      ["fonts", "questionText"],
      ["fonts", "heading"],
      ["fonts", "title"],
      ["typography", "questionText"],
      ["typography", "heading"],
      ["typography", "title"],
    ];
    for (const path of headingPaths) {
      pushUnique(headingCandidates, readFontValue(configRecord, path));
    }
    return resolveFont(headingCandidates, DEFAULT_HEADING_FONT);
  }, [config]);
  const shapeScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.shapeScale, 100) / 100,
    [config.shapeScale],
  );
  const componentBackgroundColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      "#C8C8CB",
    [configRecord],
  );
  const questionTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["questionTextColor"]) ??
      readColorValue(configRecord, ["styles", "questionTextColor"]) ??
      "#111111",
    [configRecord],
  );
  const placeholderShapeColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      "#CBCBCD",
    [configRecord],
  );
  const selectedOutlineColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBorderColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBorderColor"]) ??
      "#FFFFFF",
    [configRecord],
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyWidth = (next: number) => {
      if (!Number.isFinite(next) || next <= 0) return;
      setContainerWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };

    applyWidth(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (typeof measured === "number") {
        applyWidth(measured);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const headingFontSize = React.useMemo(() => {
    return Math.round(clampNumber(containerWidth * 0.054, 20, 70));
  }, [containerWidth]);
  const headingMaxWidth = React.useMemo(
    () => Math.round(clampNumber(containerWidth * 0.72, 260, 720)),
    [containerWidth],
  );
  const circleSize = React.useMemo(() => {
    const base = clampNumber(containerWidth * 0.18, 78, 166);
    return clampNumber(base * shapeScaleFactor, 64, 188);
  }, [containerWidth, shapeScaleFactor]);
  const circleGapX = React.useMemo(() => {
    return Math.round(clampNumber(containerWidth * 0.016 * shapeScaleFactor, 6, 24));
  }, [containerWidth, shapeScaleFactor]);
  const circleGapY = React.useMemo(() => {
    return Math.round(clampNumber(containerWidth * 0.025 * shapeScaleFactor, 8, 18));
  }, [containerWidth, shapeScaleFactor]);
  const circleGridMarginTop = React.useMemo(
    () => Math.round(clampNumber(containerWidth * 0.052, 18, 42)),
    [containerWidth],
  );
  const innerPanelMaxWidth = React.useMemo(
    () => Math.round(clampNumber(containerWidth * 0.84, 280, 760)),
    [containerWidth],
  );

  // Options: first two are the two selectable sides.
  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);
  const optionA = sortedOptions[0];
  const optionB = sortedOptions[1];

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(value === optionKey ? "" : optionKey);
    },
    [disabled, onChange, value],
  );
  const handleContinue = React.useCallback(() => {
    if (disabled || !value) return;

    const root = containerRef.current;
    const currentCard = root?.closest<HTMLElement>("[data-survey-question-card], [data-question-preview-card]");
    const nextCard = currentCard?.nextElementSibling as HTMLElement | null;
    if (nextCard) {
      nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
      const focusTarget = nextCard.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      focusTarget?.focus({ preventScroll: true });
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("survey-question-continue", { detail: { questionId: question.id } }),
      );
    }
  }, [disabled, question.id, value]);

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  const renderOptionCircle = (option: QuestionOption) => {
    const imagePath = getImagePath(option);
    const isSelected = value === option.option_key;
    const shouldDesaturate = Boolean(value) && !isSelected;
    return (
      <button
        key={option.option_key}
        type="button"
        onClick={() => handleSelect(option.option_key)}
        disabled={disabled}
        className={`
          relative rounded-full transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        `}
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          border: "none",
          backgroundColor: "transparent",
          boxShadow: isSelected
            ? `0 0 0 2px ${selectedOutlineColor}, 0 0 18px rgba(255, 255, 255, 0.32)`
            : "none",
        }}
        aria-label={option.option_text}
        aria-pressed={isSelected}
      >
        <span className="absolute inset-0 overflow-hidden rounded-full bg-zinc-200">
          {imagePath ? (
            <Image
              src={imagePath}
              alt={option.option_text}
              fill
              sizes={`${Math.round(circleSize)}px`}
              className={`rounded-full object-cover transition-[filter] duration-200 ${
                shouldDesaturate ? "grayscale saturate-0 contrast-[0.9]" : ""
              }`}
              unoptimized={imagePath.startsWith("http")}
            />
          ) : (
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: placeholderShapeColor }}
              aria-hidden="true"
            />
          )}
        </span>
        <span className="sr-only">{option.option_text}</span>
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      data-testid="two-choice-cast-root"
      className="mx-auto w-full max-w-[1040px] rounded-[32px] border border-[#D4D4D8] bg-[#F8F8F8] px-4 py-4 sm:px-6 sm:py-6"
      style={{ backgroundColor: "#F8F8F8", borderColor: "#D4D4D8" }}
    >
      <div
        data-testid="two-choice-cast-panel"
        className="mx-auto w-full rounded-[22px] px-5 py-6 sm:px-8 sm:py-10"
        style={{
          backgroundColor: componentBackgroundColor,
          maxWidth: `${innerPanelMaxWidth}px`,
        }}
      >
        <h3
          className="mx-auto text-center leading-[0.95]"
          style={{
            fontFamily: headingFontFamily,
            fontWeight: 800,
            letterSpacing: "0.01em",
            fontSize: `${headingFontSize}px`,
            color: questionTextColor,
            maxWidth: `${headingMaxWidth}px`,
          }}
        >
          {question.question_text}
        </h3>

        <div
          className="grid grid-cols-2 justify-items-center"
          style={{
            marginTop: `${circleGridMarginTop}px`,
            columnGap: `${circleGapX}px`,
            rowGap: `${circleGapY}px`,
          }}
        >
          {optionA && renderOptionCircle(optionA)}
          {optionB && renderOptionCircle(optionB)}
        </div>

        {value && !disabled && (
          <div className="mt-5 flex w-full justify-center sm:mt-6">
            <SurveyContinueButton
              onClick={handleContinue}
              className="mx-auto"
              data-testid="two-choice-cast-continue"
            />
          </div>
        )}
      </div>
    </div>
  );
}
