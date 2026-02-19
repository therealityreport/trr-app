"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { MultiSelectChoiceConfig } from "@/lib/surveys/question-config-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface MultiSelectInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const DEFAULT_FIGMA_OPTION_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_FIGMA_OPTION_BG = "#E2C3E9";
const DEFAULT_FIGMA_OPTION_BG_SELECTED = "#5D3167";
const DEFAULT_FIGMA_OPTION_TEXT = "#111111";
const DEFAULT_FIGMA_OPTION_TEXT_SELECTED = "#FFFFFF";
const MOBILE_BASE_WIDTH = 390;
const DESKTOP_BASE_WIDTH = 1440;

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

function getImagePath(option: QuestionOption): string | undefined {
  const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
  return metadata?.imagePath ?? metadata?.imageUrl;
}

export default function MultiSelectInput({
  question,
  value,
  onChange,
  disabled = false,
}: MultiSelectInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(MOBILE_BASE_WIDTH);
  const config = question.config as unknown as MultiSelectChoiceConfig;
  const configRecord = React.useMemo(
    () => ((question.config ?? {}) as UnknownRecord),
    [question.config],
  );
  const minSelections = config.minSelections ?? 0;
  const maxSelections = config.maxSelections ?? Infinity;

  const sortedOptions = React.useMemo(
    () => [...question.options].sort((a, b) => a.display_order - b.display_order),
    [question.options],
  );
  const selectedValues = React.useMemo(() => value ?? [], [value]);
  const selectedSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const hasImages = React.useMemo(
    () => sortedOptions.some((opt) => getImagePath(opt)),
    [sortedOptions],
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

  const figmaOptionFontFamily = React.useMemo(() => {
    const candidates: string[] = [];
    const paths: string[][] = [
      ["optionTextFontFamily"],
      ["choiceFontFamily"],
      ["optionFontFamily"],
      ["fonts", "optionText"],
      ["fonts", "choice"],
      ["fonts", "option"],
      ["typography", "optionText"],
      ["typography", "choice"],
      ["typography", "option"],
    ];
    for (const path of paths) {
      pushUnique(candidates, readFontValue(configRecord, path));
    }
    return resolveFont(candidates, DEFAULT_FIGMA_OPTION_FONT);
  }, [configRecord]);

  const figmaOptionBg = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["optionBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "optionBackgroundColor"]) ??
      DEFAULT_FIGMA_OPTION_BG,
    [configRecord],
  );
  const figmaOptionBgSelected = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBackgroundColor"]) ??
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      DEFAULT_FIGMA_OPTION_BG_SELECTED,
    [configRecord],
  );
  const figmaOptionTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["optionTextColor"]) ??
      readColorValue(configRecord, ["styles", "optionTextColor"]) ??
      DEFAULT_FIGMA_OPTION_TEXT,
    [configRecord],
  );
  const figmaOptionTextColorSelected = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionTextColor"]) ??
      readColorValue(configRecord, ["placeholderTextColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionTextColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderTextColor"]) ??
      DEFAULT_FIGMA_OPTION_TEXT_SELECTED,
    [configRecord],
  );

  const responsiveProgress = React.useMemo(
    () => clampNumber((containerWidth - MOBILE_BASE_WIDTH) / (DESKTOP_BASE_WIDTH - MOBILE_BASE_WIDTH), 0, 1),
    [containerWidth],
  );
  const figmaOptionHeight = React.useMemo(
    () => Math.round(interpolate(64, 113, responsiveProgress)),
    [responsiveProgress],
  );
  const figmaOptionRadius = React.useMemo(
    () => Math.round(interpolate(10, 13, responsiveProgress)),
    [responsiveProgress],
  );
  const figmaOptionFontSize = React.useMemo(
    () => Math.round(interpolate(18, 33, responsiveProgress)),
    [responsiveProgress],
  );
  const figmaOptionGap = React.useMemo(
    () => Math.round(interpolate(12, 21, responsiveProgress)),
    [responsiveProgress],
  );
  const figmaOptionPaddingX = React.useMemo(
    () => Math.round(interpolate(18, 29, responsiveProgress)),
    [responsiveProgress],
  );

  const handleToggle = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;

      const isSelected = selectedSet.has(optionKey);
      if (isSelected) {
        onChange(selectedValues.filter((v) => v !== optionKey));
        return;
      }

      if (selectedValues.length >= maxSelections) return;
      onChange([...selectedValues, optionKey]);
    },
    [disabled, maxSelections, onChange, selectedSet, selectedValues],
  );

  if (hasImages) {
    return (
      <div
        ref={containerRef}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4"
      >
        {sortedOptions.map((option) => {
          const isSelected = selectedSet.has(option.option_key);
          const isDisabledByMax = !isSelected && selectedValues.length >= maxSelections;
          const imagePath = getImagePath(option);

          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleToggle(option.option_key)}
              disabled={disabled || isDisabledByMax}
              className={`
                flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-all sm:gap-2 sm:p-3
                ${disabled || isDisabledByMax ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
              data-testid={`multi-select-option-${option.option_key}`}
            >
              {imagePath && (
                <div
                  className="h-14 w-14 overflow-hidden rounded-full transition-all sm:h-16 sm:w-16"
                  style={{
                    boxShadow: isSelected
                      ? "0 0 0 2px rgba(255,255,255,0.72), 0 0 18px rgba(255,255,255,0.35)"
                      : "none",
                  }}
                >
                  <Image
                    src={imagePath}
                    alt={option.option_text}
                    width={64}
                    height={64}
                    className={`h-full w-full object-cover transition-[filter] duration-200 ${
                      selectedValues.length > 0 && !isSelected ? "grayscale saturate-0 contrast-[0.9]" : ""
                    }`}
                    unoptimized={imagePath.startsWith("http")}
                  />
                </div>
              )}
              <span className="text-xs font-medium text-gray-800 sm:text-sm">{option.option_text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto grid w-full max-w-[1039px]"
      style={{ rowGap: `${figmaOptionGap}px` }}
    >
      {sortedOptions.map((option) => {
        const isSelected = selectedSet.has(option.option_key);
        const isDisabledByMax = !isSelected && selectedValues.length >= maxSelections;
        return (
          <button
            key={option.option_key}
            type="button"
            onClick={() => handleToggle(option.option_key)}
            disabled={disabled || isDisabledByMax}
            className={`
              mb-0 block w-full text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5D3167]/25
              ${(disabled || isDisabledByMax) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:brightness-[0.985]"}
            `}
            aria-pressed={isSelected}
            style={{
              minHeight: `${figmaOptionHeight}px`,
              borderRadius: `${figmaOptionRadius}px`,
              paddingLeft: `${figmaOptionPaddingX}px`,
              paddingRight: `${figmaOptionPaddingX}px`,
              backgroundColor: isSelected ? figmaOptionBgSelected : figmaOptionBg,
              color: isSelected ? figmaOptionTextColorSelected : figmaOptionTextColor,
              fontFamily: figmaOptionFontFamily,
              fontWeight: 800,
              fontSize: `${figmaOptionFontSize}px`,
              lineHeight: "1.2",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              boxShadow: isSelected ? "0 0 0 2px rgba(255, 255, 255, 0.35) inset" : "none",
            }}
            data-testid={`multi-select-option-${option.option_key}`}
          >
            {option.option_text}
          </button>
        );
      })}
      {(minSelections > 0 || maxSelections < Infinity) && (
        <p className="sr-only" aria-live="polite">
          {minSelections > 0 && maxSelections < Infinity
            ? `Select ${minSelections} to ${maxSelections} options`
            : minSelections > 0
            ? `Select at least ${minSelections} option${minSelections > 1 ? "s" : ""}`
            : `Select up to ${maxSelections} option${maxSelections > 1 ? "s" : ""}`}
          . {selectedValues.length} selected.
        </p>
      )}
    </div>
  );
}
