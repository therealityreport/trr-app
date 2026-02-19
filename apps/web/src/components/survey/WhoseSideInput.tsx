"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { TwoChoiceSliderConfig } from "@/lib/surveys/question-config-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface WhoseSideInputProps {
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

export default function WhoseSideInput({
  question,
  value,
  onChange,
  disabled = false,
}: WhoseSideInputProps) {
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
  const buttonScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.buttonScale, 100) / 100,
    [config.buttonScale],
  );
  const componentBackgroundColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      "#000000",
    [configRecord],
  );
  const questionTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["questionTextColor"]) ??
      readColorValue(configRecord, ["styles", "questionTextColor"]) ??
      "#FFFFFF",
    [configRecord],
  );
  const placeholderShapeColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      "#D9D9D9",
    [configRecord],
  );
  const placeholderShapeBorderColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeBorderColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeBorderColor"]) ??
      "rgba(255,255,255,0.12)",
    [configRecord],
  );
  const neutralButtonTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["optionTextColor"]) ??
      readColorValue(configRecord, ["styles", "optionTextColor"]) ??
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
    return Math.max(28, Math.min(70, containerWidth * 0.082));
  }, [containerWidth]);
  const circleSize = React.useMemo(() => {
    const base = Math.max(72, Math.min(300, containerWidth * 0.24));
    return clampNumber(base * shapeScaleFactor, 52, 340);
  }, [containerWidth, shapeScaleFactor]);
  const circleGapX = React.useMemo(() => {
    return Math.max(6, Math.min(40, containerWidth * 0.03 * shapeScaleFactor));
  }, [containerWidth, shapeScaleFactor]);
  const circleGapY = React.useMemo(() => {
    return Math.max(8, Math.min(26, containerWidth * 0.04 * shapeScaleFactor));
  }, [containerWidth, shapeScaleFactor]);
  const neutralButtonHeight = React.useMemo(
    () => Math.round(clampNumber(40 * buttonScaleFactor, 30, 68)),
    [buttonScaleFactor],
  );
  const neutralButtonFontSize = React.useMemo(
    () => Math.round(clampNumber(12 * buttonScaleFactor, 10, 20)),
    [buttonScaleFactor],
  );
  const neutralButtonPaddingX = React.useMemo(
    () => Math.round(clampNumber(16 * buttonScaleFactor, 10, 30)),
    [buttonScaleFactor],
  );
  const neutralButtonRadius = React.useMemo(
    () => Math.round(clampNumber(999 * shapeScaleFactor, 16, 9999)),
    [shapeScaleFactor],
  );

  // Options: first two are the sides, third (if exists) is neutral
  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);
  const optionA = sortedOptions[0];
  const optionB = sortedOptions[1];
  const neutralOption = sortedOptions.find((opt) => opt.option_key === "neutral");

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(optionKey);
    },
    [disabled, onChange]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  const renderOptionCircle = (option: QuestionOption) => {
    const imagePath = getImagePath(option);
    const isSelected = value === option.option_key;
    return (
      <button
        key={option.option_key}
        type="button"
        onClick={() => handleSelect(option.option_key)}
        disabled={disabled}
        className={`
          relative rounded-full transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${isSelected ? "ring-4 ring-white shadow-[0_0_0_6px_rgba(255,255,255,0.24)]" : "ring-1"}
        `}
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          borderColor: placeholderShapeBorderColor,
        }}
        aria-label={option.option_text}
        aria-pressed={isSelected}
      >
        {imagePath ? (
          <Image
            src={imagePath}
            alt={option.option_text}
            fill
            sizes={`${Math.round(circleSize)}px`}
            className="rounded-full object-cover"
            unoptimized={imagePath.startsWith("http")}
          />
        ) : (
          <span
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: placeholderShapeColor }}
            aria-hidden="true"
          />
        )}
        <span className="sr-only">{option.option_text}</span>
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className="rounded-[18px] bg-black px-3 py-5 sm:px-8 sm:py-10"
      style={{ backgroundColor: componentBackgroundColor }}
    >
      <h3
        className="mx-auto max-w-5xl text-center leading-[0.94]"
        style={{
          fontFamily: headingFontFamily,
          fontWeight: 800,
          letterSpacing: "0.01em",
          fontSize: `${headingFontSize}px`,
          color: questionTextColor,
        }}
      >
        {question.question_text}
      </h3>

      <div
        className="mt-5 grid grid-cols-2 justify-items-center sm:mt-10"
        style={{ columnGap: `${circleGapX}px`, rowGap: `${circleGapY}px` }}
      >
        {optionA && renderOptionCircle(optionA)}
        {optionB && renderOptionCircle(optionB)}
      </div>

      {(neutralOption || config.neutralOption) && (
        <div className="mt-5 flex justify-center sm:mt-6">
          <button
            type="button"
            onClick={() => handleSelect(neutralOption?.option_key ?? "neutral")}
            disabled={disabled}
            className={`
              border font-semibold uppercase tracking-[0.08em] transition-colors
              ${value === (neutralOption?.option_key ?? "neutral")
                ? "border-white bg-white text-black"
                : "border-white/40 bg-transparent text-white hover:border-white/70"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
            style={{
              height: `${neutralButtonHeight}px`,
              paddingInline: `${neutralButtonPaddingX}px`,
              borderRadius: `${neutralButtonRadius}px`,
              fontSize: `${neutralButtonFontSize}px`,
              color: value === (neutralOption?.option_key ?? "neutral") ? "#000000" : neutralButtonTextColor,
            }}
          >
            {neutralOption?.option_text ?? config.neutralOption}
          </button>
        </div>
      )}
    </div>
  );
}
