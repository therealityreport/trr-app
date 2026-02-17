"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type {
  CastDecisionCardConfig,
  MatrixRow,
  SliderChoice,
  ThreeChoiceSliderConfig,
} from "@/lib/surveys/question-config-types";
import {
  extractPrimaryFontToken,
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface CastDecisionCardInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

interface ChoiceDescriptor {
  key: string;
  label: string;
  color: string;
  textColor: string;
}

interface TemplateFontOverrides {
  promptFontFamily: string;
  castNameFontFamily: string;
  choiceFontFamily: string;
  nextButtonFontFamily: string;
  missingFonts: string[];
}

const DEFAULT_PROMPT_FONT = '"Geometric Slabserif 703", var(--font-sans), sans-serif';
const DEFAULT_CAST_NAME_FONT = '"Geometric Slabserif 703", var(--font-sans), sans-serif';
const DEFAULT_CHOICE_FONT = '"Geometric Slabserif 703", var(--font-sans), sans-serif';
const DEFAULT_NEXT_BUTTON_FONT = '"Plymouth Serial", var(--font-sans), sans-serif';
const DEFAULT_PROMPT_TEXT = "KEEP, FIRE OR DEMOTE";

const CHOICE_COLORS: Record<string, string> = {
  fire: "#B3000B",
  demote: "#E6B903",
  keep: "#356A3B",
  bring_back: "#356A3B",
  keep_gone: "#99060A",
};

const CHOICE_TEXT_COLORS: Record<string, string> = {
  fire: "#FFFFFF",
  demote: "#FFFFFF",
  keep: "#FFFFFF",
  bring_back: "#FFFFFF",
  keep_gone: "#FFFFFF",
};

const FALLBACK_CHOICE_COLORS = ["#356A3B", "#E6B903", "#C76D00", "#99060A", "#4B5563"];

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

function normalizeChoiceKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeHexColor(value: string): string | null {
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
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
  config: CastDecisionCardConfig | ThreeChoiceSliderConfig,
): TemplateFontOverrides {
  const configRecord = config as unknown as UnknownRecord;
  const missingFonts: string[] = [];

  const promptCandidates: string[] = [];
  const castNameCandidates: string[] = [];
  const choiceCandidates: string[] = [];
  const nextButtonCandidates: string[] = [];

  const promptPaths: string[][] = [
    ["subTextHeadingFontFamily"],
    ["subtextHeadingFontFamily"],
    ["promptFontFamily"],
    ["titleFontFamily"],
    ["questionFontFamily"],
    ["fonts", "subTextHeading"],
    ["fonts", "subtextHeading"],
    ["fonts", "prompt"],
    ["fonts", "title"],
    ["fonts", "heading"],
    ["fonts", "question"],
    ["typography", "subTextHeading"],
    ["typography", "subtextHeading"],
    ["typography", "prompt"],
    ["typography", "title"],
    ["typography", "heading"],
    ["typography", "question"],
    ["canva", "fonts", "subTextHeading"],
    ["canva", "fonts", "prompt"],
    ["canva", "fonts", "title"],
  ];
  const castNamePaths: string[][] = [
    ["questionTextFontFamily"],
    ["castNameFontFamily"],
    ["nameFontFamily"],
    ["subjectFontFamily"],
    ["fonts", "questionText"],
    ["fonts", "castName"],
    ["fonts", "name"],
    ["fonts", "subject"],
    ["typography", "questionText"],
    ["typography", "castName"],
    ["typography", "name"],
    ["typography", "subject"],
    ["canva", "fonts", "questionText"],
    ["canva", "fonts", "castName"],
  ];
  const choicePaths: string[][] = [
    ["optionTextFontFamily"],
    ["choiceFontFamily"],
    ["optionFontFamily"],
    ["fonts", "optionText"],
    ["fonts", "choice"],
    ["fonts", "option"],
    ["typography", "optionText"],
    ["typography", "choice"],
    ["typography", "option"],
    ["canva", "fonts", "optionText"],
    ["canva", "fonts", "choice"],
    ["canva", "fonts", "option"],
  ];
  const nextButtonPaths: string[][] = [
    ["nextButtonFontFamily"],
    ["ctaFontFamily"],
    ["buttonFontFamily"],
    ["fonts", "nextButton"],
    ["fonts", "cta"],
    ["fonts", "button"],
    ["typography", "nextButton"],
    ["typography", "cta"],
    ["typography", "button"],
    ["canva", "fonts", "nextButton"],
    ["canva", "fonts", "cta"],
    ["canva", "fonts", "button"],
  ];

  for (const path of promptPaths) pushUnique(promptCandidates, readFontValue(configRecord, path));
  for (const path of castNamePaths) pushUnique(castNameCandidates, readFontValue(configRecord, path));
  for (const path of choicePaths) pushUnique(choiceCandidates, readFontValue(configRecord, path));
  for (const path of nextButtonPaths) pushUnique(nextButtonCandidates, readFontValue(configRecord, path));

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
    promptFontFamily: resolveTemplateFontOverride(promptCandidates, DEFAULT_PROMPT_FONT, missingFonts),
    castNameFontFamily: resolveTemplateFontOverride(castNameCandidates, DEFAULT_CAST_NAME_FONT, missingFonts),
    choiceFontFamily: resolveTemplateFontOverride(choiceCandidates, DEFAULT_CHOICE_FONT, missingFonts),
    nextButtonFontFamily: resolveTemplateFontOverride(
      nextButtonCandidates,
      DEFAULT_NEXT_BUTTON_FONT,
      missingFonts,
    ),
    missingFonts,
  };
}

function resolveChoiceColor(
  key: string,
  option: QuestionOption | undefined,
  fallbackIndex: number,
): string {
  const metadataColor = option?.metadata && typeof option.metadata.color === "string"
    ? normalizeHexColor(option.metadata.color)
    : null;
  if (metadataColor) return metadataColor;
  return CHOICE_COLORS[key] ?? FALLBACK_CHOICE_COLORS[fallbackIndex % FALLBACK_CHOICE_COLORS.length] ?? "#4B5563";
}

function buildChoices(
  configChoices: SliderChoice[] | undefined,
  options: QuestionOption[],
): ChoiceDescriptor[] {
  const sortedOptions = [...options].sort((a, b) => a.display_order - b.display_order);
  const optionByKey = new Map(
    sortedOptions.map((option) => [normalizeChoiceKey(option.option_key), option]),
  );

  const seed = (configChoices?.length
    ? configChoices.map((choice) => ({ key: choice.value, label: choice.label || choice.value }))
    : sortedOptions.map((option) => ({ key: option.option_key, label: option.option_text || option.option_key })));

  const deduped = new Set<string>();
  return seed.reduce<ChoiceDescriptor[]>((acc, entry, index) => {
    const normalized = normalizeChoiceKey(entry.key);
    if (!normalized || deduped.has(normalized)) return acc;
    deduped.add(normalized);

    const option = optionByKey.get(normalized);
    const color = resolveChoiceColor(normalized, option, index);
    acc.push({
      key: normalized,
      label: entry.label,
      color,
      textColor: CHOICE_TEXT_COLORS[normalized] ?? pickTextColor(color),
    });
    return acc;
  }, []);
}

function resolveRowImage(row: MatrixRow): string | null {
  const rowRecord = row as MatrixRow & { imagePath?: string; imageUrl?: string };
  const candidate = row.img ?? rowRecord.imagePath ?? rowRecord.imageUrl;
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed.length ? trimmed : null;
}

function resolvePromptText(
  config: CastDecisionCardConfig | ThreeChoiceSliderConfig,
  choices: ChoiceDescriptor[],
): string {
  const configRecord = config as unknown as UnknownRecord;
  const explicitCandidates = [
    readPath(configRecord, ["subTextHeading"]),
    readPath(configRecord, ["subtextHeading"]),
    readPath(configRecord, ["promptText"]),
    readPath(configRecord, ["prompt"]),
    readPath(configRecord, ["titleText"]),
    readPath(configRecord, ["headingText"]),
  ];

  for (const candidate of explicitCandidates) {
    const value = toTrimmedString(candidate);
    if (value) return value.toUpperCase();
  }

  const keys = choices.map((choice) => choice.key);
  if (keys.includes("keep") && keys.includes("fire") && keys.includes("demote")) {
    return DEFAULT_PROMPT_TEXT;
  }

  if (choices.length === 2) {
    return `${choices[0]?.label ?? "Option A"} OR ${choices[1]?.label ?? "Option B"}`.toUpperCase();
  }

  if (choices.length === 3) {
    return `${choices[0]?.label ?? "Option A"}, ${choices[1]?.label ?? "Option B"} OR ${choices[2]?.label ?? "Option C"}`.toUpperCase();
  }

  return "MAKE YOUR PICK";
}

export default function CastDecisionCardInput({
  question,
  value,
  onChange,
  disabled = false,
}: CastDecisionCardInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);
  const config = question.config as unknown as CastDecisionCardConfig | ThreeChoiceSliderConfig;
  const rows = config.rows ?? [];
  const fontOverrides = React.useMemo(() => collectFontOverrides(config), [config]);
  const [fontLoadFailures, setFontLoadFailures] = React.useState<string[]>([]);
  const choices = React.useMemo(
    () => buildChoices(config.choices, question.options),
    [config.choices, question.options],
  );
  const [currentRowIndex, setCurrentRowIndex] = React.useState(0);

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

  React.useEffect(() => {
    setCurrentRowIndex((prev) => {
      if (!rows.length) return 0;
      return Math.min(prev, rows.length - 1);
    });
  }, [rows.length]);

  React.useEffect(() => {
    if (!rows.length) return;
    if (!value || Object.keys(value).length === 0) {
      setCurrentRowIndex(0);
    }
  }, [rows.length, value]);

  const handleChoiceSelect = React.useCallback(
    (rowId: string, choiceKey: string) => {
      if (disabled) return;
      onChange({
        ...(value ?? {}),
        [rowId]: choiceKey,
      });
    },
    [disabled, onChange, value],
  );

  const handleNext = React.useCallback(() => {
    setCurrentRowIndex((prev) => Math.min(prev + 1, rows.length - 1));
  }, [rows.length]);

  const promptText = React.useMemo(() => resolvePromptText(config, choices), [choices, config]);

  const fontProbeTokens = React.useMemo(() => {
    const tokens = [
      fontOverrides.promptFontFamily,
      fontOverrides.castNameFontFamily,
      fontOverrides.choiceFontFamily,
      fontOverrides.nextButtonFontFamily,
    ]
      .map((fontFamily) => extractPrimaryFontToken(fontFamily))
      .map((token) => token.trim())
      .filter((token) => token.length > 0 && isCloudfrontCdnFontCandidate(token));
    return Array.from(new Set(tokens));
  }, [fontOverrides]);

  React.useEffect(() => {
    let cancelled = false;
    const fontsApi = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fontsApi?.load) {
      setFontLoadFailures((prev) => (prev.length ? [] : prev));
      return;
    }

    const run = async () => {
      const failed: string[] = [];
      for (const token of fontProbeTokens) {
        try {
          const result = await fontsApi.load(`700 28px "${token}"`, "KEEP FIRE DEMOTE");
          if (!result.length) {
            failed.push(token);
          }
        } catch {
          failed.push(token);
        }
      }
      if (!cancelled) {
        const uniqueFailed = Array.from(new Set(failed));
        setFontLoadFailures((prev) => {
          if (
            prev.length === uniqueFailed.length &&
            prev.every((entry, index) => entry === uniqueFailed[index])
          ) {
            return prev;
          }
          return uniqueFailed;
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [fontProbeTokens]);

  const currentRow = rows[currentRowIndex];
  if (!currentRow || choices.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
        Add `config.rows` and at least two decision choices to render this template.
      </div>
    );
  }

  const currentSelection = value?.[currentRow.id] ? normalizeChoiceKey(value[currentRow.id]) : null;
  const currentImage = resolveRowImage(currentRow);
  const showNextButton = Boolean(currentSelection) && !disabled && currentRowIndex < rows.length - 1;
  const responsiveScale = clampNumber((containerWidth - 320) / 920, 0, 1);
  const promptFontSize = Math.round(clampNumber(interpolate(16, 45, responsiveScale), 15, 50));
  const promptLetterSpacing = interpolate(0.035, 0.05, responsiveScale);
  const nameFontSize = Math.round(clampNumber(interpolate(44, 120, responsiveScale), 32, 132));
  const circlesGap = Math.round(clampNumber(interpolate(8, 28, responsiveScale) * shapeScaleFactor, 6, 44));
  const circleSize = (() => {
    const intrinsic = interpolate(88, 220, responsiveScale) * shapeScaleFactor;
    const count = Math.max(choices.length, 1);
    const maxByContainer = (containerWidth - circlesGap * (count - 1) - 24) / count;
    const minSize = clampNumber(64 * shapeScaleFactor, 44, 124);
    return Math.round(clampNumber(Math.min(intrinsic, maxByContainer), minSize, 240));
  })();
  const choiceFontSize = Math.round(
    clampNumber(interpolate(18, 40, responsiveScale) * buttonScaleFactor, 12, 52),
  );
  const nextButtonHeight = Math.round(clampNumber(interpolate(42, 64, responsiveScale) * buttonScaleFactor, 36, 84));
  const nextButtonWidth = Math.round(clampNumber(interpolate(124, 190, responsiveScale) * buttonScaleFactor, 100, 280));
  const nextButtonFontSize = Math.round(clampNumber(interpolate(18, 30, responsiveScale) * buttonScaleFactor, 12, 40));
  const nextButtonRadius = Math.round(clampNumber(interpolate(26, 104, responsiveScale) * shapeScaleFactor, 18, 120));

  return (
    <div
      ref={containerRef}
      className="rounded-[18px] bg-[#D9D9D9] px-3 py-5 sm:px-6 sm:py-8"
      data-testid="cast-decision-card"
    >
      <div className="mx-auto w-full max-w-5xl text-center">
        <p
          data-testid="three-choice-prompt"
          className="mx-auto max-w-[32ch] uppercase leading-[1.15] text-black"
          style={{
            fontFamily: fontOverrides.promptFontFamily,
            fontWeight: 500,
            fontSize: `${promptFontSize}px`,
            letterSpacing: `${promptLetterSpacing}em`,
          }}
        >
          {promptText}
        </p>
        <h3
          data-testid="three-choice-cast-name"
          className="mx-auto mt-1 max-w-[16ch] uppercase leading-[0.9] text-black sm:mt-2"
          style={{
            fontFamily: fontOverrides.castNameFontFamily,
            fontWeight: 800,
            fontSize: `${nameFontSize}px`,
          }}
        >
          {currentRow.label}
        </h3>

        {fontOverrides.missingFonts.length > 0 && (
          <p
            className="mx-auto mt-3 max-w-4xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900"
            data-testid="three-choice-missing-fonts"
          >
            Missing CloudFront CDN fonts: {fontOverrides.missingFonts.join(", ")}
          </p>
        )}
        {fontLoadFailures.length > 0 && (
          <p
            className="mx-auto mt-3 max-w-4xl rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900"
            data-testid="three-choice-font-load-failures"
          >
            CloudFront CDN fonts failed to load in this browser: {fontLoadFailures.join(", ")}
          </p>
        )}

        <div
          className="mt-5 flex flex-wrap items-center justify-center"
          style={{ gap: `${circlesGap}px` }}
        >
          {choices.map((choice) => {
            const isSelected = currentSelection === choice.key;
            const showImageOverlay = isSelected && Boolean(currentImage);
            const testId = `three-choice-${choice.key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            const shrinkOnSelect = isSelected && choice.key.includes("demote") ? 1 : 0;
            const resolvedChoiceFontSize = Math.max(10, choiceFontSize - shrinkOnSelect);

            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => handleChoiceSelect(currentRow.id, choice.key)}
                disabled={disabled}
                className={`group relative rounded-full transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-[1.02] active:scale-[0.99]"
                }`}
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`,
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(255,255,255,0.88), 0 0 0 6px rgba(18,18,18,0.18)"
                    : "0 0 0 1px rgba(18,18,18,0.08)",
                }}
                aria-label={`Set ${currentRow.label} to ${choice.label}`}
                aria-pressed={isSelected}
                data-testid={testId}
              >
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: choice.color }}
                  aria-hidden="true"
                />

                {showImageOverlay && currentImage && (
                  <>
                    <Image
                      src={currentImage}
                      alt={currentRow.label}
                      width={circleSize}
                      height={circleSize}
                      className="absolute inset-0 h-full w-full rounded-full object-cover grayscale contrast-125 brightness-95"
                      unoptimized={currentImage.startsWith("http")}
                      draggable={false}
                    />
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: choice.color,
                        mixBlendMode: "multiply",
                        opacity: 0.58,
                      }}
                      aria-hidden="true"
                    />
                    <span className="absolute inset-0 rounded-full ring-2 ring-white/35" aria-hidden="true" />
                  </>
                )}

                <span
                  className={`pointer-events-none absolute left-1/2 text-center uppercase ${
                    showImageOverlay ? "bottom-[16%] -translate-x-1/2" : "top-1/2 -translate-x-1/2 -translate-y-1/2"
                  }`}
                  style={{
                    color: choice.textColor,
                    fontFamily: fontOverrides.choiceFontFamily,
                    fontWeight: 700,
                    fontSize: `${resolvedChoiceFontSize}px`,
                    lineHeight: "0.9",
                    letterSpacing: "0.02em",
                    textShadow: showImageOverlay ? "0 2px 8px rgba(0, 0, 0, 0.35)" : "none",
                  }}
                >
                  {choice.label}
                </span>
              </button>
            );
          })}
        </div>

        {showNextButton && (
          <button
            type="button"
            onClick={handleNext}
            className="mx-auto mt-5 inline-flex items-center justify-center bg-[#121212] px-6 text-[#F8F8F8] transition hover:bg-black"
            style={{
              minWidth: `${nextButtonWidth}px`,
              height: `${nextButtonHeight}px`,
              borderRadius: `${nextButtonRadius}px`,
              fontFamily: fontOverrides.nextButtonFontFamily,
              fontSize: `${nextButtonFontSize}px`,
              fontWeight: 800,
              letterSpacing: "0.033em",
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
