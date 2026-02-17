"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type {
  AgreeLikertScaleConfig,
  MatrixRow,
  ThreeChoiceSliderConfig,
} from "@/lib/surveys/question-config-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface MatrixLikertInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

interface MatrixFontOverrides {
  headingFontFamily: string;
  statementFontFamily: string;
  optionFontFamily: string;
  missingFonts: string[];
}

interface LikertOptionTheme {
  bgColor: string;
  textColor: string;
}

const DEFAULT_PROMPT_TEXT = "How much do you agree with the following statement:";
const DEFAULT_HEADING_FONT = "\"Gloucester\", var(--font-sans), sans-serif";
const DEFAULT_STATEMENT_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_OPTION_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";

const FIGMA_SCALE_COLORS = ["#356A3B", "#76A34C", "#E6B903", "#C76D00", "#99060A"];

type UnknownRecord = Record<string, unknown>;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function interpolate(min: number, max: number, progress: number): number {
  return min + (max - min) * progress;
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => toTrimmedString(entry))
    .filter((entry): entry is string => Boolean(entry));
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

function pushUnique(values: string[], next: string | null) {
  if (!next || values.includes(next)) return;
  values.push(next);
}

function resolveTemplateFontOverride(
  candidates: string[],
  fallback: string,
  missingFonts: string[],
): string {
  for (const candidate of candidates) {
    const resolved = resolveCloudfrontCdnFont(candidate);
    if (resolved) return resolved.fontFamily;

    if (!isCloudfrontCdnFontCandidate(candidate)) {
      return candidate;
    }

    if (!missingFonts.includes(candidate)) {
      missingFonts.push(candidate);
    }
  }
  return fallback;
}

function collectFontOverrides(
  config: AgreeLikertScaleConfig | ThreeChoiceSliderConfig,
): MatrixFontOverrides {
  const configRecord = config as unknown as UnknownRecord;
  const missingFonts: string[] = [];

  const headingCandidates: string[] = [];
  const statementCandidates: string[] = [];
  const optionCandidates: string[] = [];

  const headingPaths: string[][] = [
    ["subTextHeadingFontFamily"],
    ["subtextHeadingFontFamily"],
    ["promptFontFamily"],
    ["headingFontFamily"],
    ["headerFontFamily"],
    ["columnLabelFontFamily"],
    ["optionTextFontFamily"],
    ["fonts", "subTextHeading"],
    ["fonts", "subtextHeading"],
    ["fonts", "prompt"],
    ["fonts", "heading"],
    ["fonts", "header"],
    ["typography", "subTextHeading"],
    ["typography", "subtextHeading"],
    ["typography", "prompt"],
    ["typography", "heading"],
    ["typography", "header"],
    ["canva", "fonts", "subTextHeading"],
    ["canva", "fonts", "prompt"],
  ];
  const statementPaths: string[][] = [
    ["questionTextFontFamily"],
    ["rowLabelFontFamily"],
    ["statementFontFamily"],
    ["labelFontFamily"],
    ["fonts", "questionText"],
    ["fonts", "rowLabel"],
    ["fonts", "statement"],
    ["fonts", "label"],
    ["typography", "questionText"],
    ["typography", "rowLabel"],
    ["typography", "statement"],
    ["typography", "label"],
    ["canva", "fonts", "questionText"],
    ["canva", "fonts", "rowLabel"],
    ["canva", "fonts", "statement"],
  ];
  const optionPaths: string[][] = [
    ["optionTextFontFamily"],
    ["columnLabelFontFamily"],
    ["scaleLabelFontFamily"],
    ["choiceFontFamily"],
    ["optionLabelFontFamily"],
    ["headerFontFamily"],
    ["fonts", "columnLabel"],
    ["fonts", "scale"],
    ["fonts", "choice"],
    ["fonts", "option"],
    ["fonts", "header"],
    ["fonts", "optionText"],
    ["typography", "columnLabel"],
    ["typography", "scale"],
    ["typography", "choice"],
    ["typography", "option"],
    ["typography", "header"],
    ["typography", "optionText"],
    ["canva", "fonts", "columnLabel"],
    ["canva", "fonts", "scale"],
    ["canva", "fonts", "choice"],
    ["canva", "fonts", "option"],
    ["canva", "fonts", "optionText"],
  ];

  for (const path of headingPaths) pushUnique(headingCandidates, readFontValue(configRecord, path));
  for (const path of statementPaths) pushUnique(statementCandidates, readFontValue(configRecord, path));
  for (const path of optionPaths) pushUnique(optionCandidates, readFontValue(configRecord, path));

  const extraRequestedFonts = [
    ...toStringArray(configRecord.canvaFonts),
    ...toStringArray(configRecord.requiredFonts),
    ...toStringArray(readPath(configRecord, ["canva", "requiredFonts"])),
  ];
  for (const requested of extraRequestedFonts) {
    if (resolveCloudfrontCdnFont(requested)) continue;
    if (isCloudfrontCdnFontCandidate(requested) && !missingFonts.includes(requested)) {
      missingFonts.push(requested);
    }
  }

  return {
    headingFontFamily: resolveTemplateFontOverride(
      headingCandidates,
      DEFAULT_HEADING_FONT,
      missingFonts,
    ),
    statementFontFamily: resolveTemplateFontOverride(
      statementCandidates,
      DEFAULT_STATEMENT_FONT,
      missingFonts,
    ),
    optionFontFamily: resolveTemplateFontOverride(
      optionCandidates,
      DEFAULT_OPTION_FONT,
      missingFonts,
    ),
    missingFonts,
  };
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeHexColor(color: string): string | null {
  const match = color.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match || !match[1]) return null;
  return `#${match[1].toUpperCase()}`;
}

function pickTextColor(backgroundHex: string): string {
  const hex = backgroundHex.replace("#", "");
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? "#111111" : "#FFFFFF";
}

function resolveOptionTheme(
  option: QuestionOption,
  index: number,
  totalOptions: number,
): LikertOptionTheme {
  const metadataColor = option.metadata && typeof option.metadata.color === "string"
    ? normalizeHexColor(option.metadata.color)
    : null;
  if (metadataColor) {
    return {
      bgColor: metadataColor,
      textColor: pickTextColor(metadataColor),
    };
  }

  const key = normalizeKey(option.option_key);
  const label = normalizeKey(option.option_text);
  const token = `${key}_${label}`;

  if (token.includes("strongly_disagree")) return { bgColor: "#99060A", textColor: "#FFFFFF" };
  if (token.includes("somewhat_disagree")) return { bgColor: "#C76D00", textColor: "#FFFFFF" };
  if (token.includes("neither") || token.includes("neutral")) return { bgColor: "#E6B903", textColor: "#111111" };
  if (token.includes("somewhat_agree")) return { bgColor: "#76A34C", textColor: "#111111" };
  if (token.includes("strongly_agree")) return { bgColor: "#356A3B", textColor: "#FFFFFF" };
  if (token.includes("fire")) return { bgColor: "#B3000B", textColor: "#FFFFFF" };
  if (token.includes("demote")) return { bgColor: "#E6B903", textColor: "#FFFFFF" };
  if (token.includes("keep")) return { bgColor: "#3A7640", textColor: "#FFFFFF" };
  if (token.includes("disagree")) return { bgColor: "#C76D00", textColor: "#FFFFFF" };
  if (token.includes("agree")) return { bgColor: "#76A34C", textColor: "#111111" };

  const fallbackColor = totalOptions === 5
    ? FIGMA_SCALE_COLORS[Math.min(Math.max(index, 0), 4)] ?? "#4B5563"
    : "#4B5563";
  return {
    bgColor: fallbackColor,
    textColor: pickTextColor(fallbackColor),
  };
}

function buildThreeChoicePrompt(columns: QuestionOption[]): string {
  const keys = columns.map((column) => normalizeKey(column.option_text || column.option_key));
  if (
    keys.some((key) => key.includes("keep")) &&
    keys.some((key) => key.includes("fire")) &&
    keys.some((key) => key.includes("demote"))
  ) {
    return "KEEP, FIRE OR DEMOTE";
  }
  if (columns.length === 3) {
    const first = columns[0]?.option_text?.trim() ?? "";
    const second = columns[1]?.option_text?.trim() ?? "";
    const third = columns[2]?.option_text?.trim() ?? "";
    return `${first}, ${second} OR ${third}`.replace(/\s+/g, " ").trim().toUpperCase();
  }
  return "RATE EACH ITEM";
}

function resolvePromptText(config: AgreeLikertScaleConfig | ThreeChoiceSliderConfig): string {
  const configRecord = config as unknown as UnknownRecord;
  const candidates: unknown[] = [
    readPath(configRecord, ["promptText"]),
    readPath(configRecord, ["prompt"]),
    readPath(configRecord, ["subTextHeading"]),
    readPath(configRecord, ["subtextHeading"]),
    readPath(configRecord, ["headingText"]),
    readPath(configRecord, ["titleText"]),
  ];

  for (const candidate of candidates) {
    const value = toTrimmedString(candidate);
    if (value) return value;
  }

  return DEFAULT_PROMPT_TEXT;
}

export default function MatrixLikertInput({
  question,
  value,
  onChange,
  disabled = false,
}: MatrixLikertInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const config = question.config as unknown as AgreeLikertScaleConfig | ThreeChoiceSliderConfig;
  const isThreeChoiceMatrix = config.uiVariant === "three-choice-slider";
  const rows = config.rows ?? [];
  const fontOverrides = React.useMemo(() => collectFontOverrides(config), [config]);
  const shapeScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.shapeScale, 100) / 100,
    [config.shapeScale],
  );
  const buttonScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.buttonScale, 100) / 100,
    [config.buttonScale],
  );
  const responsiveScale = React.useMemo(
    () => clampNumber((containerWidth - 320) / 880, 0, 1),
    [containerWidth],
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

  const columns = [...question.options].sort((a, b) => a.display_order - b.display_order);
  const promptText = React.useMemo(() => {
    if (isThreeChoiceMatrix) {
      return buildThreeChoicePrompt(columns);
    }
    const questionPrompt = question.question_text?.trim();
    if (questionPrompt?.length) return question.question_text;
    return resolvePromptText(config);
  }, [columns, config, isThreeChoiceMatrix, question.question_text]);

  const rootGap = React.useMemo(
    () => Math.round(interpolate(10, 22, responsiveScale)),
    [responsiveScale],
  );
  const rowGap = React.useMemo(
    () => Math.round(interpolate(16, 50, responsiveScale)),
    [responsiveScale],
  );
  const rowPaddingTop = React.useMemo(
    () => Math.round(interpolate(12, 48, responsiveScale)),
    [responsiveScale],
  );
  const promptFontSize = React.useMemo(
    () => Math.round(interpolate(12, 30, responsiveScale)),
    [responsiveScale],
  );
  const promptLetterSpacing = React.useMemo(
    () => interpolate(0.03, 0.06, responsiveScale),
    [responsiveScale],
  );
  const statementFontSize = React.useMemo(
    () => Math.round(interpolate(18, 60, responsiveScale)),
    [responsiveScale],
  );
  const optionStackMarginTop = React.useMemo(
    () => Math.round(interpolate(10, 24, responsiveScale)),
    [responsiveScale],
  );
  const optionStackGap = React.useMemo(
    () => Math.round(interpolate(6, 14, responsiveScale)),
    [responsiveScale],
  );
  const optionLabelFontSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(16, 33, responsiveScale) * buttonScaleFactor, 10, 64)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionMinHeight = React.useMemo(
    () => Math.round(clampNumber(interpolate(40, 72, responsiveScale) * buttonScaleFactor, 28, 130)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionBorderRadius = React.useMemo(
    () => Math.round(clampNumber(interpolate(10, 14, responsiveScale) * shapeScaleFactor, 6, 26)),
    [responsiveScale, shapeScaleFactor],
  );
  const optionPaddingX = React.useMemo(
    () => Math.round(clampNumber(interpolate(12, 26, responsiveScale) * buttonScaleFactor, 8, 40)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionPaddingY = React.useMemo(
    () => Math.round(clampNumber(interpolate(8, 19, responsiveScale) * buttonScaleFactor, 5, 32)),
    [buttonScaleFactor, responsiveScale],
  );
  const verdictScale = React.useMemo(
    () => clampNumber((containerWidth - 320) / 1120, 0, 1),
    [containerWidth],
  );
  const verdictPromptSize = React.useMemo(
    () => Math.round(interpolate(18, 45, verdictScale)),
    [verdictScale],
  );
  const verdictPromptTracking = React.useMemo(
    () => interpolate(0.03, 0.05, verdictScale),
    [verdictScale],
  );
  const verdictNameSize = React.useMemo(
    () => Math.round(interpolate(44, 120, verdictScale)),
    [verdictScale],
  );
  const verdictRowGap = React.useMemo(
    () => Math.round(interpolate(24, 84, verdictScale)),
    [verdictScale],
  );
  const verdictCircleGap = React.useMemo(
    () => Math.round(interpolate(9, 26, verdictScale)),
    [verdictScale],
  );
  const verdictCircleSize = React.useMemo(() => {
    const intrinsic = interpolate(92, 220, verdictScale) * shapeScaleFactor;
    const count = Math.max(columns.length, 1);
    const maxByContainer = (containerWidth - verdictCircleGap * (count - 1) - 24) / count;
    const minSize = clampNumber(68 * shapeScaleFactor, 44, 120);
    return Math.round(clampNumber(Math.min(intrinsic, maxByContainer), minSize, 240));
  }, [columns.length, containerWidth, shapeScaleFactor, verdictCircleGap, verdictScale]);
  const verdictOptionTextSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(16, 40, verdictScale) * buttonScaleFactor, 11, 58)),
    [buttonScaleFactor, verdictScale],
  );
  const verdictCircleMarginTop = React.useMemo(
    () => Math.round(interpolate(14, 40, verdictScale)),
    [verdictScale],
  );

  const handleCellSelect = React.useCallback(
    (rowId: string, optionKey: string) => {
      if (disabled) return;
      const newValue = { ...(value ?? {}), [rowId]: optionKey };
      onChange(newValue);
    },
    [disabled, value, onChange]
  );

  if (!rows.length || !columns.length) {
    return (
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
        Add `config.rows` and scale options to render this agree/disagree template.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={isThreeChoiceMatrix ? "flex flex-col rounded-[18px] bg-[#D9D9D9] px-3 py-5 sm:px-6 sm:py-8" : "flex flex-col"}
      style={{ gap: `${rootGap}px` }}
    >
      {fontOverrides.missingFonts.length > 0 && (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="matrix-likert-missing-fonts"
        >
          Missing CloudFront CDN fonts: {fontOverrides.missingFonts.join(", ")}
        </p>
      )}

      <p
        data-testid="agree-likert-prompt"
        className="mx-auto max-w-5xl px-1 text-center uppercase leading-[1.3] text-black"
        style={{
          fontFamily: fontOverrides.headingFontFamily,
          fontSize: `${isThreeChoiceMatrix ? verdictPromptSize : promptFontSize}px`,
          letterSpacing: `${isThreeChoiceMatrix ? verdictPromptTracking : promptLetterSpacing}em`,
        }}
      >
        {promptText}
      </p>

      <div className="flex flex-col" style={{ gap: `${isThreeChoiceMatrix ? verdictRowGap : rowGap}px` }}>
        {rows.map((row: MatrixRow, rowIndex) => (
          <section
            key={row.id}
            className={rowIndex > 0 ? "border-t border-black/10" : undefined}
            style={rowIndex > 0 ? { paddingTop: `${rowPaddingTop}px` } : undefined}
            data-testid={`agree-likert-row-${row.id}`}
          >
            <h3
              className={isThreeChoiceMatrix
                ? "mx-auto max-w-[24ch] text-center uppercase leading-[0.95] tracking-[0.01em] text-black"
                : "mx-auto max-w-[40ch] text-center leading-[1.02] text-black"}
              style={{
                fontFamily: fontOverrides.statementFontFamily,
                fontWeight: 800,
                fontSize: `${isThreeChoiceMatrix ? verdictNameSize : statementFontSize}px`,
              }}
            >
              {row.label}
            </h3>

            <div
              className={isThreeChoiceMatrix
                ? "mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center"
                : "mx-auto flex w-full max-w-5xl flex-col"}
              style={{
                marginTop: `${isThreeChoiceMatrix ? verdictCircleMarginTop : optionStackMarginTop}px`,
                gap: `${isThreeChoiceMatrix ? verdictCircleGap : optionStackGap}px`,
              }}
            >
              {columns.map((col, columnIndex) => {
                const isSelected = value?.[row.id] === col.option_key;
                const theme = resolveOptionTheme(col, columnIndex, columns.length);
                return (
                  <button
                    key={`${row.id}-${col.option_key}`}
                    type="button"
                    onClick={() => handleCellSelect(row.id, col.option_key)}
                    disabled={disabled}
                    className={`
                      transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25
                      ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-[1.01] active:scale-[0.995]"}
                    `}
                    style={{
                      backgroundColor: theme.bgColor,
                      color: theme.textColor,
                      fontFamily: fontOverrides.optionFontFamily,
                      width: isThreeChoiceMatrix ? `${verdictCircleSize}px` : "100%",
                      minHeight: isThreeChoiceMatrix ? `${verdictCircleSize}px` : `${optionMinHeight}px`,
                      borderRadius: isThreeChoiceMatrix ? "9999px" : `${optionBorderRadius}px`,
                      padding: isThreeChoiceMatrix ? "0" : `${optionPaddingY}px ${optionPaddingX}px`,
                      boxShadow: isSelected
                        ? (isThreeChoiceMatrix
                          ? "0 0 0 2px rgba(255,255,255,0.95), 0 0 0 6px rgba(16,16,16,0.18)"
                          : "0 0 0 2px rgba(255,255,255,0.92), 0 0 0 5px rgba(18,18,18,0.14)")
                        : "0 0 0 1px rgba(18,18,18,0.08)",
                    }}
                    aria-label={`Select ${col.option_text} for ${row.label}`}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={isThreeChoiceMatrix
                        ? "block text-center uppercase leading-[1]"
                        : "block leading-[1.2] tracking-[0.015em]"}
                      style={{ fontSize: `${isThreeChoiceMatrix ? verdictOptionTextSize : optionLabelFontSize}px` }}
                    >
                      {col.option_text}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
