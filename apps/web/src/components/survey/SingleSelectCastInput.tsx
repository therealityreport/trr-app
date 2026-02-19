"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { CastSingleSelectConfig } from "@/lib/surveys/question-config-types";
import SurveyContinueButton from "./SurveyContinueButton";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface SingleSelectCastInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DEFAULT_HEADING_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_PANEL_COLOR = "#5D3167";
const DEFAULT_CIRCLE_FILL = "#EEEEEF";
const DEFAULT_CIRCLE_SELECTED_BORDER = "#FFFFFF";
const DEFAULT_TEXT_COLOR = "#FFFFFF";
const DEFAULT_COLUMNS = 4;

type UnknownRecord = Record<string, unknown>;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function interpolate(min: number, max: number, progress: number): number {
  return min + (max - min) * progress;
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

function normalizeScalePercent(value: unknown, fallback = 100): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampNumber(value, 40, 220);
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

function readNumberValue(record: UnknownRecord, path: string[]): number | null {
  const value = readPath(record, path);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
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

function resolveOptionImagePath(option: QuestionOption): string | null {
  const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
  const raw = metadata?.imagePath ?? metadata?.imageUrl;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveInitials(optionText: string): string {
  const tokens = optionText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return `${tokens[0]![0] ?? ""}${tokens[1]![0] ?? ""}`.toUpperCase();
}

export default function SingleSelectCastInput({
  question,
  value,
  onChange,
  disabled = false,
}: SingleSelectCastInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const config = question.config as unknown as CastSingleSelectConfig;
  const configRecord = config as unknown as UnknownRecord;

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

  const headingFontFamily = React.useMemo(() => {
    const candidates: string[] = [];
    const paths: string[][] = [
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
    for (const path of paths) pushUnique(candidates, readFontValue(configRecord, path));
    return resolveFont(candidates, DEFAULT_HEADING_FONT);
  }, [configRecord]);

  const panelColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      DEFAULT_PANEL_COLOR,
    [configRecord],
  );
  const headingColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["questionTextColor"]) ??
      readColorValue(configRecord, ["styles", "questionTextColor"]) ??
      DEFAULT_TEXT_COLOR,
    [configRecord],
  );
  const circleFillColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      DEFAULT_CIRCLE_FILL,
    [configRecord],
  );
  const circleSelectedBorderColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBorderColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBorderColor"]) ??
      DEFAULT_CIRCLE_SELECTED_BORDER,
    [configRecord],
  );
  const shapeScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.shapeScale, 100) / 100,
    [config.shapeScale],
  );
  const columns = React.useMemo(() => {
    const configured =
      readNumberValue(configRecord, ["columns"]) ??
      readNumberValue(configRecord, ["gridColumns"]) ??
      DEFAULT_COLUMNS;
    return clampNumber(Math.round(configured), 2, 4);
  }, [configRecord]);

  const sortedOptions = React.useMemo(
    () => [...question.options].sort((a, b) => a.display_order - b.display_order),
    [question.options],
  );

  const handleSelect = React.useCallback((optionKey: string) => {
    if (disabled) return;
    onChange(value === optionKey ? "" : optionKey);
  }, [disabled, onChange, value]);

  const handleContinue = React.useCallback(() => {
    if (disabled || !value || value.length === 0) return;
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("survey-question-continue", { detail: { questionId: question.id } }),
    );
  }, [disabled, question.id, value]);

  const progress = React.useMemo(
    () => clampNumber((containerWidth - 320) / (1200 - 320), 0, 1),
    [containerWidth],
  );
  const panelPaddingX = React.useMemo(
    () => Math.round(interpolate(16, 64, progress)),
    [progress],
  );
  const panelPaddingTop = React.useMemo(
    () => Math.round(interpolate(20, 50, progress)),
    [progress],
  );
  const panelPaddingBottom = React.useMemo(
    () => Math.round(interpolate(26, 56, progress)),
    [progress],
  );
  const headingSize = React.useMemo(
    () => Math.round(interpolate(34, 70, progress)),
    [progress],
  );
  const configuredHeadingLineHeight = React.useMemo(
    () =>
      readNumberValue(configRecord, ["questionTextLineHeight"]) ??
      readNumberValue(configRecord, ["styles", "questionTextLineHeight"]),
    [configRecord],
  );
  const headingLineHeight = React.useMemo(() => {
    if (typeof configuredHeadingLineHeight === "number") {
      if (configuredHeadingLineHeight > 0 && configuredHeadingLineHeight < 3) {
        return Math.round(headingSize * configuredHeadingLineHeight);
      }
      return Math.round(configuredHeadingLineHeight);
    }
    return Math.round(headingSize * 0.95);
  }, [configuredHeadingLineHeight, headingSize]);
  const configuredHeadingLetterSpacing = React.useMemo(
    () =>
      readNumberValue(configRecord, ["questionTextLetterSpacing"]) ??
      readNumberValue(configRecord, ["styles", "questionTextLetterSpacing"]),
    [configRecord],
  );
  const headingLetterSpacing = React.useMemo(
    () =>
      typeof configuredHeadingLetterSpacing === "number"
        ? configuredHeadingLetterSpacing
        : 0.01,
    [configuredHeadingLetterSpacing],
  );
  const headingMarginTop = React.useMemo(
    () => Math.round(interpolate(12, 20, progress)),
    [progress],
  );
  const circleGap = React.useMemo(
    () => Math.round(interpolate(10, 28, progress)),
    [progress],
  );
  const rawCircleSize = React.useMemo(
    () => interpolate(56, 154, progress) * shapeScaleFactor,
    [progress, shapeScaleFactor],
  );
  const availableGridWidth = Math.max(0, containerWidth - panelPaddingX * 2);
  const maxCircleFromWidth = Math.max(44, (availableGridWidth - circleGap * (columns - 1)) / columns);
  const circleSize = React.useMemo(
    () => clampNumber(Math.min(rawCircleSize, maxCircleFromWidth), 44, 154),
    [maxCircleFromWidth, rawCircleSize],
  );
  const gridWidth = React.useMemo(
    () => Math.round(circleSize * columns + circleGap * (columns - 1)),
    [circleGap, circleSize, columns],
  );
  const gridMarginTop = React.useMemo(
    () => Math.round(interpolate(18, 40, progress)),
    [progress],
  );
  const continueMarginTop = React.useMemo(
    () => Math.round(interpolate(26, 54, progress)),
    [progress],
  );
  const panelRadius = React.useMemo(
    () => Math.round(interpolate(20, 30, progress)),
    [progress],
  );

  return (
    <div
      ref={containerRef}
      data-testid="cast-single-select-root"
      className="mx-auto w-full max-w-[1280px] overflow-hidden"
      style={{
        borderRadius: `${panelRadius}px`,
        backgroundColor: panelColor,
        paddingLeft: `${panelPaddingX}px`,
        paddingRight: `${panelPaddingX}px`,
        paddingTop: `${panelPaddingTop}px`,
        paddingBottom: `${panelPaddingBottom}px`,
      }}
    >
      <h3
        style={{
          marginTop: `${headingMarginTop}px`,
          maxWidth: "min(100%, 1120px)",
          color: headingColor,
          fontFamily: headingFontFamily,
          fontSize: `${headingSize}px`,
          fontWeight: 800,
          lineHeight: `${headingLineHeight}px`,
          letterSpacing: `${headingLetterSpacing}em`,
        }}
      >
        {question.question_text}
      </h3>

      <div
        className="mx-auto grid justify-items-center"
        style={{
          marginTop: `${gridMarginTop}px`,
          width: `min(100%, ${gridWidth}px)`,
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: `${circleGap}px`,
          rowGap: `${circleGap}px`,
        }}
      >
        {sortedOptions.map((option) => {
          const imagePath = resolveOptionImagePath(option);
          const isSelected = value === option.option_key;
          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={option.option_text}
              data-testid={`cast-single-select-option-${option.option_key}`}
              className={`
                relative overflow-hidden rounded-full transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/45
                ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              `}
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                border: "none",
                backgroundColor: "transparent",
                transform: isSelected ? "scale(1.01)" : "none",
                boxShadow: isSelected
                  ? `0 0 0 2px ${circleSelectedBorderColor}, 0 0 18px rgba(255, 255, 255, 0.32)`
                  : "none",
              }}
            >
              <span
                className="absolute inset-0 overflow-hidden rounded-full"
                style={{ backgroundColor: circleFillColor }}
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
                    className="absolute inset-0 flex items-center justify-center rounded-full text-sm font-bold uppercase"
                    style={{ color: "#7A0C25", fontFamily: headingFontFamily }}
                  >
                    {resolveInitials(option.option_text)}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {value && value.length > 0 && !disabled && (
        <div className="flex justify-center" style={{ marginTop: `${continueMarginTop}px` }}>
          <SurveyContinueButton
            onClick={handleContinue}
            className="mx-auto"
            data-testid="cast-single-select-continue"
          />
        </div>
      )}
    </div>
  );
}
