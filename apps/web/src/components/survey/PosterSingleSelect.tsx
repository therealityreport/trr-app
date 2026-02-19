"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";
import SurveyContinueButton from "./SurveyContinueButton";

export interface PosterSingleSelectProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DEFAULT_PANEL_BG = "#000000";
const DEFAULT_HEADING_COLOR = "#F3F4F6";
const DEFAULT_HEADING_FONT = "\"Geometric Slabserif 712\", var(--font-sans), serif";
const DEFAULT_CARD_FILL = "#D9D9D9";
const DEFAULT_CARD_BORDER = "#D9D9D9";
const DEFAULT_CARD_SELECTED_FILL = "#D9D9D9";
const DEFAULT_CARD_SELECTED_BORDER = "#FFFFFF";
const DEFAULT_PLACEHOLDER_LABEL = "#111111";
const DEFAULT_OPTION_COLUMNS = 3;
const CARD_ASPECT_RATIO = 205.393 / 257.121;

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

function resolveImagePath(option: QuestionOption): string | null {
  const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
  const raw = metadata?.imagePath ?? metadata?.imageUrl;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function PosterSingleSelect({
  question,
  value,
  onChange,
  disabled = false,
}: PosterSingleSelectProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const configRecord = React.useMemo(
    () => ((question.config ?? {}) as UnknownRecord),
    [question.config],
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
      if (typeof measured === "number") applyWidth(measured);
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
    for (const path of paths) {
      pushUnique(candidates, readFontValue(configRecord, path));
    }
    return resolveFont(candidates, DEFAULT_HEADING_FONT);
  }, [configRecord]);

  const panelColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      DEFAULT_PANEL_BG,
    [configRecord],
  );
  const headingColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["questionTextColor"]) ??
      readColorValue(configRecord, ["styles", "questionTextColor"]) ??
      DEFAULT_HEADING_COLOR,
    [configRecord],
  );
  const cardFillColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      DEFAULT_CARD_FILL,
    [configRecord],
  );
  const cardBorderColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["placeholderShapeBorderColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeBorderColor"]) ??
      DEFAULT_CARD_BORDER,
    [configRecord],
  );
  const cardSelectedFillColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBackgroundColor"]) ??
      DEFAULT_CARD_SELECTED_FILL,
    [configRecord],
  );
  const cardSelectedBorderColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBorderColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBorderColor"]) ??
      DEFAULT_CARD_SELECTED_BORDER,
    [configRecord],
  );
  const placeholderLabelColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["optionTextColor"]) ??
      readColorValue(configRecord, ["styles", "optionTextColor"]) ??
      DEFAULT_PLACEHOLDER_LABEL,
    [configRecord],
  );

  const columns = React.useMemo(() => {
    const configured =
      readNumberValue(configRecord, ["columns"]) ??
      readNumberValue(configRecord, ["gridColumns"]) ??
      DEFAULT_OPTION_COLUMNS;
    return clampNumber(Math.round(configured), 2, 4);
  }, [configRecord]);

  const sortedOptions = React.useMemo(
    () => [...question.options].sort((a, b) => a.display_order - b.display_order),
    [question.options],
  );

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(value === optionKey ? "" : optionKey);
    },
    [disabled, onChange, value],
  );

  const progress = React.useMemo(
    () => clampNumber((containerWidth - 320) / (1280 - 320), 0, 1),
    [containerWidth],
  );
  const panelRadius = React.useMemo(
    () => Math.round(interpolate(16, 22, progress)),
    [progress],
  );
  const panelPaddingX = React.useMemo(
    () => Math.round(interpolate(16, 42, progress)),
    [progress],
  );
  const panelPaddingTop = React.useMemo(
    () => Math.round(interpolate(20, 36, progress)),
    [progress],
  );
  const panelPaddingBottom = React.useMemo(
    () => Math.round(interpolate(22, 38, progress)),
    [progress],
  );
  const headingSize = React.useMemo(
    () => Math.round(interpolate(24, 49, progress)),
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
      // Supports unitless multipliers in config (e.g. 1.06).
      if (configuredHeadingLineHeight > 0 && configuredHeadingLineHeight < 3) {
        return Math.round(headingSize * configuredHeadingLineHeight);
      }
      return Math.round(configuredHeadingLineHeight);
    }
    // Figma text is tight; keep a compact default line-height.
    return Math.round(headingSize * interpolate(1.02, 0.94, progress));
  }, [configuredHeadingLineHeight, headingSize, progress]);
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
        : interpolate(0.008, 0.01, progress),
    [configuredHeadingLetterSpacing, progress],
  );
  const headingMarginBottom = React.useMemo(
    () => Math.round(interpolate(16, 24, progress)),
    [progress],
  );
  const gridGap = React.useMemo(
    () => Math.round(interpolate(8, 11, progress)),
    [progress],
  );
  const cardRadius = React.useMemo(
    () => Math.round(interpolate(7, 9, progress)),
    [progress],
  );

  const availableGridWidth = Math.max(120, containerWidth - panelPaddingX * 2);
  const preferredCardWidth = Math.round(interpolate(86, 205, progress));
  const maxCardWidthFromContainer = Math.floor((availableGridWidth - gridGap * (columns - 1)) / columns);
  const cardWidth = clampNumber(Math.min(preferredCardWidth, maxCardWidthFromContainer), 70, 205);
  const gridWidth = cardWidth * columns + gridGap * (columns - 1);
  const cardHeight = Math.round(cardWidth / CARD_ASPECT_RATIO);

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[1280px] overflow-hidden"
      style={{
        borderRadius: `${panelRadius}px`,
        backgroundColor: panelColor,
        paddingLeft: `${panelPaddingX}px`,
        paddingRight: `${panelPaddingX}px`,
        paddingTop: `${panelPaddingTop}px`,
        paddingBottom: `${panelPaddingBottom}px`,
      }}
      data-testid="poster-single-select-root"
    >
      <h3
        className="max-w-[1000px]"
        style={{
          color: headingColor,
          fontFamily: headingFontFamily,
          fontSize: `${headingSize}px`,
          fontWeight: 700,
          lineHeight: `${headingLineHeight}px`,
          letterSpacing: `${headingLetterSpacing}em`,
        }}
      >
        {question.question_text}
      </h3>

      <div
        className="mx-auto grid"
        style={{
          marginTop: `${headingMarginBottom}px`,
          width: `${gridWidth}px`,
          maxWidth: "100%",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gridGap}px`,
        }}
      >
        {sortedOptions.map((option) => {
          const isSelected = value === option.option_key;
          const imagePath = resolveImagePath(option);
          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              className="relative overflow-hidden text-left transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              style={{
                height: `${cardHeight}px`,
                borderRadius: `${cardRadius}px`,
                border: `2px solid ${isSelected ? cardSelectedBorderColor : cardBorderColor}`,
                backgroundColor: isSelected ? cardSelectedFillColor : cardFillColor,
                transform: isSelected ? "scale(1.01)" : "none",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
              }}
              aria-pressed={isSelected}
              aria-label={option.option_text}
              data-testid={`poster-single-select-option-${option.option_key}`}
            >
              {imagePath ? (
                <Image
                  src={imagePath}
                  alt={option.option_text}
                  fill
                  className="object-cover"
                  unoptimized={imagePath.startsWith("http")}
                />
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center px-2 text-center uppercase"
                  style={{
                    color: placeholderLabelColor,
                    fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
                    fontSize: `${Math.max(11, Math.round(cardHeight * 0.12))}px`,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {option.option_text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {value && value.length > 0 && !disabled && (
        <div className="mt-5 flex justify-center">
          <SurveyContinueButton
            onClick={() => {
              if (typeof window === "undefined") return;
              window.dispatchEvent(
                new CustomEvent("survey-question-continue", { detail: { questionId: question.id } }),
              );
            }}
            className="mx-auto"
            data-testid={`survey-question-continue-${question.id}`}
          />
        </div>
      )}
    </div>
  );
}
