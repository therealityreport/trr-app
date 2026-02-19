"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { AgreeLikertScaleConfig, MatrixRow } from "@/lib/surveys/question-config-types";
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
  rank: number;
}

const DEFAULT_PROMPT_TEXT = "How much do you agree with the following statement:";
const DEFAULT_HEADING_FONT = '"Gloucester", var(--font-sans), sans-serif';
const DEFAULT_STATEMENT_FONT = '"Rude Slab Condensed", var(--font-sans), sans-serif';
const DEFAULT_OPTION_FONT = '"Plymouth Serial", var(--font-sans), sans-serif';

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

function toColorString(value: unknown): string | null {
  const trimmed = toTrimmedString(value);
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return normalizeHexColor(trimmed) ?? trimmed;
  return trimmed;
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

function readColorValue(record: UnknownRecord, path: string[]): string | null {
  const value = readPath(record, path);
  const direct = toColorString(value);
  if (direct) return direct;
  const nested = toRecord(value);
  if (!nested) return null;
  return (
    toColorString(nested.color) ??
    toColorString(nested.value) ??
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

function collectFontOverrides(config: AgreeLikertScaleConfig): MatrixFontOverrides {
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
  fallbackIndex: number,
): LikertOptionTheme {
  const metadataColor = option.metadata && typeof option.metadata.color === "string"
    ? normalizeHexColor(option.metadata.color)
    : null;
  if (metadataColor) {
    return {
      bgColor: metadataColor,
      textColor: pickTextColor(metadataColor),
      rank: 10 + fallbackIndex,
    };
  }

  const key = normalizeKey(option.option_key);
  const label = normalizeKey(option.option_text);
  const token = `${key}_${label}`;

  if (token.includes("strongly_agree")) return { bgColor: "#356A3B", textColor: "#FFFFFF", rank: 0 };
  if (token.includes("somewhat_agree")) return { bgColor: "#76A34C", textColor: "#111111", rank: 1 };
  if (token.includes("strongly_disagree")) return { bgColor: "#99060A", textColor: "#FFFFFF", rank: 4 };
  if (token.includes("somewhat_disagree")) return { bgColor: "#C76D00", textColor: "#FFFFFF", rank: 3 };
  if (token.includes("agree")) return { bgColor: "#76A34C", textColor: "#111111", rank: 1 };
  if (token.includes("neither") || token.includes("neutral")) return { bgColor: "#E6B903", textColor: "#111111", rank: 2 };
  if (token.includes("disagree")) return { bgColor: "#C76D00", textColor: "#FFFFFF", rank: 3 };

  const fallbackColor = FIGMA_SCALE_COLORS[Math.min(Math.max(fallbackIndex, 0), 4)] ?? "#4B5563";
  return {
    bgColor: fallbackColor,
    textColor: pickTextColor(fallbackColor),
    rank: 10 + fallbackIndex,
  };
}

function resolvePromptText(config: AgreeLikertScaleConfig, questionText: string): string {
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

  const normalizedQuestionText = toTrimmedString(questionText);
  if (normalizedQuestionText) return normalizedQuestionText;

  return DEFAULT_PROMPT_TEXT;
}

function orderedColumns(columns: QuestionOption[]): Array<QuestionOption & { theme: LikertOptionTheme }> {
  return columns
    .map((column, index) => ({
      ...column,
      theme: resolveOptionTheme(column, index),
    }))
    .sort((a, b) => {
      if (a.theme.rank !== b.theme.rank) return a.theme.rank - b.theme.rank;
      return a.display_order - b.display_order;
    });
}

export default function MatrixLikertInput({
  question,
  value,
  onChange,
  disabled = false,
}: MatrixLikertInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const config = question.config as unknown as AgreeLikertScaleConfig;
  const configRecord = config as unknown as UnknownRecord;
  const rows = React.useMemo(() => config.rows ?? [], [config.rows]);
  const fontOverrides = React.useMemo(() => collectFontOverrides(config), [config]);
  const componentBackgroundColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      "#D9D9D9",
    [configRecord],
  );
  const promptTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["subTextHeadingColor"]) ??
      readColorValue(configRecord, ["promptTextColor"]) ??
      readColorValue(configRecord, ["styles", "subTextHeadingColor"]) ??
      "#000000",
    [configRecord],
  );
  const statementTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["questionTextColor"]) ??
      readColorValue(configRecord, ["statementTextColor"]) ??
      readColorValue(configRecord, ["styles", "questionTextColor"]) ??
      "#000000",
    [configRecord],
  );
  const continueButtonColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["continueButtonColor"]) ??
      readColorValue(configRecord, ["styles", "continueButtonColor"]) ??
      "#121212",
    [configRecord],
  );
  const continueButtonTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["continueButtonTextColor"]) ??
      readColorValue(configRecord, ["styles", "continueButtonTextColor"]) ??
      "#F8F8F8",
    [configRecord],
  );

  const shapeScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.shapeScale, 100) / 100,
    [config.shapeScale],
  );
  const buttonScaleFactor = React.useMemo(
    () => normalizeScalePercent(config.buttonScale, 100) / 100,
    [config.buttonScale],
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

  const columns = React.useMemo(
    () => orderedColumns([...question.options].sort((a, b) => a.display_order - b.display_order)),
    [question.options],
  );

  const promptText = React.useMemo(
    () => resolvePromptText(config, question.question_text),
    [config, question.question_text],
  );

  const responsiveScale = React.useMemo(
    () => clampNumber((containerWidth - 320) / 1120, 0, 1),
    [containerWidth],
  );

  const rootGap = React.useMemo(
    () => Math.round(clampNumber(interpolate(12, 34, responsiveScale), 8, 40)),
    [responsiveScale],
  );
  const rowGap = React.useMemo(
    () => Math.round(clampNumber(interpolate(18, 64, responsiveScale), 12, 72)),
    [responsiveScale],
  );
  const rowPaddingTop = React.useMemo(
    () => Math.round(clampNumber(interpolate(12, 44, responsiveScale), 8, 64)),
    [responsiveScale],
  );
  const promptFontSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(15, 30, responsiveScale), 14, 38)),
    [responsiveScale],
  );
  const promptLetterSpacing = React.useMemo(
    () => interpolate(0.03, 0.05, responsiveScale),
    [responsiveScale],
  );
  const promptLineHeight = React.useMemo(
    () => interpolate(1.28, 1.18, responsiveScale),
    [responsiveScale],
  );
  const promptToStatementGap = React.useMemo(
    () => Math.round(clampNumber(interpolate(16, 40, responsiveScale), 12, 52)),
    [responsiveScale],
  );
  const statementFontSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(30, 60, responsiveScale), 22, 68)),
    [responsiveScale],
  );
  const statementLineHeight = React.useMemo(
    () => interpolate(0.98, 0.87, responsiveScale),
    [responsiveScale],
  );
  const optionStackMarginTop = React.useMemo(
    () => Math.round(clampNumber(interpolate(20, 44, responsiveScale), 14, 56)),
    [responsiveScale],
  );
  const optionStackGap = React.useMemo(
    () => Math.round(clampNumber(interpolate(8, 18, responsiveScale), 6, 24)),
    [responsiveScale],
  );
  const optionLabelFontSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(19, 33, responsiveScale) * buttonScaleFactor, 12, 52)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionLabelLineHeight = React.useMemo(
    () => interpolate(1.28, 1.58, responsiveScale),
    [responsiveScale],
  );
  const optionMinHeight = React.useMemo(
    () => Math.round(clampNumber(interpolate(46, 103, responsiveScale) * buttonScaleFactor, 34, 140)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionBorderRadius = React.useMemo(
    () => Math.round(clampNumber(interpolate(10, 13, responsiveScale) * shapeScaleFactor, 7, 26)),
    [responsiveScale, shapeScaleFactor],
  );
  const optionPaddingX = React.useMemo(
    () => Math.round(clampNumber(interpolate(14, 26, responsiveScale) * buttonScaleFactor, 10, 42)),
    [buttonScaleFactor, responsiveScale],
  );
  const optionPaddingY = React.useMemo(
    () => Math.round(clampNumber(interpolate(8, 17, responsiveScale) * buttonScaleFactor, 6, 30)),
    [buttonScaleFactor, responsiveScale],
  );
  const continueButtonHeight = React.useMemo(
    () => Math.round(clampNumber(interpolate(42, 66, responsiveScale) * buttonScaleFactor, 36, 92)),
    [buttonScaleFactor, responsiveScale],
  );
  const continueButtonWidth = React.useMemo(
    () => Math.round(clampNumber(interpolate(138, 212, responsiveScale) * buttonScaleFactor, 116, 300)),
    [buttonScaleFactor, responsiveScale],
  );
  const continueButtonFontSize = React.useMemo(
    () => Math.round(clampNumber(interpolate(18, 30, responsiveScale) * buttonScaleFactor, 13, 40)),
    [buttonScaleFactor, responsiveScale],
  );
  const continueButtonRadius = React.useMemo(
    () => Math.round(clampNumber(interpolate(24, 96, responsiveScale) * shapeScaleFactor, 18, 116)),
    [responsiveScale, shapeScaleFactor],
  );
  const hasAnySelection = React.useMemo(
    () => rows.some((row) => Boolean(value?.[row.id])),
    [rows, value],
  );

  const handleCellSelect = React.useCallback(
    (rowId: string, optionKey: string) => {
      if (disabled) return;
      const nextValue = { ...(value ?? {}), [rowId]: optionKey };
      onChange(nextValue);
    },
    [disabled, onChange, value],
  );
  const handleContinue = React.useCallback(() => {
    if (disabled) return;

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
  }, [disabled, question.id]);

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
      className="flex flex-col rounded-[18px] bg-[#D9D9D9] px-3 py-4 sm:px-6 sm:py-8"
      style={{ gap: `${rootGap}px`, backgroundColor: componentBackgroundColor }}
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
        className="mx-auto max-w-5xl px-1 text-center uppercase text-black"
        style={{
          fontFamily: fontOverrides.headingFontFamily,
          fontWeight: 700,
          fontSize: `${promptFontSize}px`,
          lineHeight: promptLineHeight.toFixed(2),
          letterSpacing: `${promptLetterSpacing}em`,
          color: promptTextColor,
        }}
      >
        {promptText}
      </p>

      <div
        className="flex flex-col"
        style={{ marginTop: `${promptToStatementGap}px`, gap: `${rowGap}px` }}
      >
        {rows.map((row: MatrixRow, rowIndex) => (
          <section
            key={row.id}
            className={rowIndex > 0 ? "border-t border-black/10" : undefined}
            style={rowIndex > 0 ? { paddingTop: `${rowPaddingTop}px` } : undefined}
            data-testid={`agree-likert-row-${row.id}`}
          >
            <h3
              className="mx-auto max-w-[28ch] text-center leading-[0.95] text-black"
              style={{
                fontFamily: fontOverrides.statementFontFamily,
                fontWeight: 800,
                fontSize: `${statementFontSize}px`,
                lineHeight: statementLineHeight.toFixed(2),
                color: statementTextColor,
              }}
            >
              {row.label}
            </h3>

            <div
              className="mx-auto flex w-full max-w-[913px] flex-col"
              style={{
                marginTop: `${optionStackMarginTop}px`,
                gap: `${optionStackGap}px`,
              }}
            >
              {columns.map((col) => {
                const isSelected = value?.[row.id] === col.option_key;
                const theme = col.theme;
                return (
                  <button
                    key={`${row.id}-${col.option_key}`}
                    type="button"
                    onClick={() => handleCellSelect(row.id, col.option_key)}
                    disabled={disabled}
                    className={`text-left transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 ${
                      disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-[1.005] active:scale-[0.995]"
                    }`}
                    style={{
                      backgroundColor: theme.bgColor,
                      color: theme.textColor,
                      fontFamily: fontOverrides.optionFontFamily,
                      width: "100%",
                      minHeight: `${optionMinHeight}px`,
                      borderRadius: `${optionBorderRadius}px`,
                      padding: `${optionPaddingY}px ${optionPaddingX}px`,
                      boxShadow: isSelected
                        ? "0 0 0 2px rgba(255,255,255,0.92), 0 0 0 5px rgba(18,18,18,0.14)"
                        : "0 0 0 1px rgba(18,18,18,0.08)",
                    }}
                    aria-label={`Select ${col.option_text} for ${row.label}`}
                    aria-pressed={isSelected}
                  >
                    <span
                      className="block leading-[1.2] tracking-[0.015em]"
                      style={{
                        fontSize: `${optionLabelFontSize}px`,
                        fontWeight: 500,
                        lineHeight: optionLabelLineHeight.toFixed(2),
                      }}
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

      {hasAnySelection && !disabled && (
        <button
          type="button"
          onClick={handleContinue}
          className="mx-auto inline-flex items-center justify-center bg-[#121212] text-[#F8F8F8] transition hover:bg-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30"
          style={{
            minWidth: `${continueButtonWidth}px`,
            height: `${continueButtonHeight}px`,
            borderRadius: `${continueButtonRadius}px`,
            fontFamily: fontOverrides.optionFontFamily,
            fontWeight: 700,
            fontSize: `${continueButtonFontSize}px`,
            letterSpacing: "0.03em",
            backgroundColor: continueButtonColor,
            color: continueButtonTextColor,
          }}
          data-testid="agree-likert-continue"
        >
          Continue
        </button>
      )}
    </div>
  );
}
