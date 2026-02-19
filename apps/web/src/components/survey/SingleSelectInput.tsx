"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface SingleSelectInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Layout mode: vertical (default), horizontal for likert-scale, or grid for images */
  layout?: "vertical" | "horizontal" | "grid";
}

const DEFAULT_FIGMA_OPTION_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_FIGMA_OPTION_BG = "#E2C3E9";
const DEFAULT_FIGMA_OPTION_BG_SELECTED = "#5D3167";
const DEFAULT_FIGMA_OPTION_TEXT = "#111111";
const DEFAULT_FIGMA_OPTION_TEXT_SELECTED = "#FFFFFF";
const MOBILE_MIN_WIDTH = 280;
const MOBILE_MAX_WIDTH = 520;
const TABLET_MAX_WIDTH = 840;
const DESKTOP_MAX_WIDTH = 1039;

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

export default function SingleSelectInput({
  question,
  value,
  onChange,
  disabled = false,
  layout = "vertical",
}: SingleSelectInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(MOBILE_MAX_WIDTH);
  const configRecord = React.useMemo(
    () => ((question.config ?? {}) as UnknownRecord),
    [question.config],
  );
  const sortedOptions = [...question.options].sort((a, b) => a.display_order - b.display_order);

  const handleSelect = React.useCallback(
    (optionKey: string) => {
      if (disabled) return;
      onChange(value === optionKey ? "" : optionKey);
    },
    [disabled, onChange, value]
  );

  const getImagePath = (option: QuestionOption): string | undefined => {
    const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return metadata?.imagePath ?? metadata?.imageUrl;
  };

  const hasImages = sortedOptions.some((opt) => getImagePath(opt));

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

  const responsiveSizing = React.useMemo(() => {
    const width = clampNumber(containerWidth, MOBILE_MIN_WIDTH, DESKTOP_MAX_WIDTH);

    if (width <= MOBILE_MAX_WIDTH) {
      const progress = clampNumber((width - MOBILE_MIN_WIDTH) / (MOBILE_MAX_WIDTH - MOBILE_MIN_WIDTH), 0, 1);
      return {
        optionHeight: Math.round(interpolate(52, 72, progress)),
        optionRadius: Math.round(interpolate(10, 11, progress)),
        optionFontSize: Math.round(interpolate(15, 20, progress)),
        optionGap: Math.round(interpolate(10, 14, progress)),
        optionPaddingX: Math.round(interpolate(14, 20, progress)),
        optionLetterSpacing: interpolate(0.022, 0.028, progress),
      };
    }

    if (width <= TABLET_MAX_WIDTH) {
      const progress = clampNumber((width - MOBILE_MAX_WIDTH) / (TABLET_MAX_WIDTH - MOBILE_MAX_WIDTH), 0, 1);
      return {
        optionHeight: Math.round(interpolate(72, 96, progress)),
        optionRadius: Math.round(interpolate(11, 12, progress)),
        optionFontSize: Math.round(interpolate(20, 27, progress)),
        optionGap: Math.round(interpolate(14, 18, progress)),
        optionPaddingX: Math.round(interpolate(20, 25, progress)),
        optionLetterSpacing: interpolate(0.028, 0.03, progress),
      };
    }

    const progress = clampNumber((width - TABLET_MAX_WIDTH) / (DESKTOP_MAX_WIDTH - TABLET_MAX_WIDTH), 0, 1);
    return {
      optionHeight: Math.round(interpolate(96, 113, progress)),
      optionRadius: Math.round(interpolate(12, 13, progress)),
      optionFontSize: Math.round(interpolate(27, 33, progress)),
      optionGap: Math.round(interpolate(18, 21, progress)),
      optionPaddingX: Math.round(interpolate(25, 29, progress)),
      optionLetterSpacing: interpolate(0.03, 0.03, progress),
    };
  }, [containerWidth]);

  if (layout === "horizontal") {
    // Horizontal layout for likert-scale
    return (
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
        {sortedOptions.map((option) => {
          const isSelected = value === option.option_key;
          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              className={`
                rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm
                ${isSelected
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
            >
              {option.option_text}
            </button>
          );
        })}
      </div>
    );
  }

  // Grid layout (explicit or when images exist)
  if (layout === "grid" || hasImages) {
    // Grid layout with images
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
        {sortedOptions.map((option) => {
          const isSelected = value === option.option_key;
          const imagePath = getImagePath(option);

          return (
            <button
              key={option.option_key}
              type="button"
              onClick={() => handleSelect(option.option_key)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 transition-all sm:gap-2 sm:p-3
                ${isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              aria-pressed={isSelected}
            >
              {imagePath && (
                <div className="h-14 w-14 overflow-hidden rounded-full sm:h-16 sm:w-16">
                  <Image
                    src={imagePath}
                    alt={option.option_text}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized={imagePath.startsWith("http")}
                  />
                </div>
              )}
              <span className="text-xs font-medium text-center text-gray-800 sm:text-sm">
                {option.option_text}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Standard vertical radio list
  return (
    <div
      ref={containerRef}
      className="mx-auto grid w-full max-w-[1039px]"
      style={{ rowGap: `${responsiveSizing.optionGap}px` }}
    >
      {sortedOptions.map((option) => {
        const isSelected = value === option.option_key;
        return (
          <button
            key={option.option_key}
            type="button"
            onClick={() => handleSelect(option.option_key)}
            disabled={disabled}
            className={`
              mb-0 block w-full text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5D3167]/25
              ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:brightness-[0.985]"}
            `}
            aria-pressed={isSelected}
            style={{
              height: `${responsiveSizing.optionHeight}px`,
              borderRadius: `${responsiveSizing.optionRadius}px`,
              paddingLeft: `${responsiveSizing.optionPaddingX}px`,
              paddingRight: `${responsiveSizing.optionPaddingX}px`,
              backgroundColor: isSelected ? figmaOptionBgSelected : figmaOptionBg,
              color: isSelected ? figmaOptionTextColorSelected : figmaOptionTextColor,
              fontFamily: figmaOptionFontFamily,
              fontWeight: 800,
              fontSize: `${responsiveSizing.optionFontSize}px`,
              lineHeight: "1.2",
              letterSpacing: `${responsiveSizing.optionLetterSpacing}em`,
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              boxShadow: isSelected ? "0 0 0 2px rgba(255, 255, 255, 0.35) inset" : "none",
            }}
            data-testid={`single-select-option-${option.option_key}`}
          >
            {option.option_text}
          </button>
        );
      })}
    </div>
  );
}
