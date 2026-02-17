"use client";

import * as React from "react";
import Image from "next/image";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { MatrixRow, SliderChoice, ThreeChoiceSliderConfig } from "@/lib/surveys/question-config-types";
import {
  extractPrimaryFontToken,
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface ThreeChoiceSliderInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: Record<string, string> | null;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

interface ChoiceDescriptor {
  key: string;
  label: string;
  color: string;
}

interface TemplateFontOverrides {
  promptFontFamily: string;
  castNameFontFamily: string;
  choiceFontFamily: string;
  nextButtonFontFamily: string;
  missingFonts: string[];
}

const CIRCLE_SIZE_CLASS = "h-[120px] w-[120px] sm:h-[168px] sm:w-[168px] lg:h-[218px] lg:w-[218px]";
const PROMPT_TEXT = "KEEP, FIRE OR DEMOTE";
const DEFAULT_PROMPT_FONT = "\"Geometric Slabserif 703\", var(--font-sans), sans-serif";
const DEFAULT_CAST_NAME_FONT = "\"Geometric Slabserif 703\", var(--font-sans), sans-serif";
const DEFAULT_CHOICE_FONT = "\"Geometric Slabserif 703\", var(--font-sans), sans-serif";
const DEFAULT_NEXT_BUTTON_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";

const CHOICE_COLORS: Record<string, string> = {
  fire: "#B20008",
  demote: "#E4BA00",
  keep: "#3B7A43",
};

function normalizeChoiceKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveChoiceColor(
  optionKey: string,
  option: QuestionOption | undefined,
): string {
  const normalized = normalizeChoiceKey(optionKey);
  const metadataColor = option?.metadata && typeof option.metadata.color === "string"
    ? option.metadata.color
    : null;
  return metadataColor ?? CHOICE_COLORS[normalized] ?? "#4B5563";
}

function resolveRowImage(row: MatrixRow): string | null {
  const rowRecord = row as MatrixRow & { imagePath?: string; imageUrl?: string };
  const candidate = row.img ?? rowRecord.imagePath ?? rowRecord.imageUrl;
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed.length ? trimmed : null;
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
    ? configChoices.map((choice) => ({
      key: choice.value,
      label: choice.label || choice.value,
    }))
    : sortedOptions.map((option) => ({
      key: option.option_key,
      label: option.option_text || option.option_key,
    })));

  const deduped = new Set<string>();
  return seed.reduce<ChoiceDescriptor[]>((acc, entry) => {
    const normalized = normalizeChoiceKey(entry.key);
    if (!normalized || deduped.has(normalized)) return acc;
    deduped.add(normalized);
    const option = optionByKey.get(normalized);
    acc.push({
      key: normalized,
      label: entry.label,
      color: resolveChoiceColor(normalized, option),
    });
    return acc;
  }, []);
}

type UnknownRecord = Record<string, unknown>;

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

function collectFontOverrides(config: ThreeChoiceSliderConfig): TemplateFontOverrides {
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
    ["fonts", "prompt"],
    ["fonts", "title"],
    ["fonts", "heading"],
    ["fonts", "question"],
    ["typography", "prompt"],
    ["typography", "title"],
    ["typography", "heading"],
    ["typography", "question"],
    ["canva", "fonts", "prompt"],
    ["canva", "fonts", "title"],
    ["fonts", "subTextHeading"],
    ["fonts", "subtextHeading"],
    ["typography", "subTextHeading"],
    ["typography", "subtextHeading"],
  ];
  const castNamePaths: string[][] = [
    ["questionTextFontFamily"],
    ["castNameFontFamily"],
    ["nameFontFamily"],
    ["subjectFontFamily"],
    ["fonts", "castName"],
    ["fonts", "name"],
    ["fonts", "subject"],
    ["typography", "castName"],
    ["typography", "name"],
    ["typography", "subject"],
    ["canva", "fonts", "castName"],
    ["canva", "fonts", "name"],
    ["fonts", "questionText"],
    ["typography", "questionText"],
  ];
  const choicePaths: string[][] = [
    ["optionTextFontFamily"],
    ["choiceFontFamily"],
    ["optionFontFamily"],
    ["fonts", "choice"],
    ["fonts", "option"],
    ["typography", "choice"],
    ["typography", "option"],
    ["canva", "fonts", "choice"],
    ["canva", "fonts", "option"],
    ["fonts", "optionText"],
    ["typography", "optionText"],
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
    nextButtonFontFamily: resolveTemplateFontOverride(nextButtonCandidates, DEFAULT_NEXT_BUTTON_FONT, missingFonts),
    missingFonts,
  };
}

export default function ThreeChoiceSliderInput({
  question,
  value,
  onChange,
  disabled = false,
}: ThreeChoiceSliderInputProps) {
  const config = question.config as unknown as ThreeChoiceSliderConfig;
  const rows = config.rows ?? [];
  const fontOverrides = React.useMemo(() => collectFontOverrides(config), [config]);
  const [fontLoadFailures, setFontLoadFailures] = React.useState<string[]>([]);
  const choices = React.useMemo(
    () => buildChoices(config.choices, question.options),
    [config.choices, question.options],
  );
  const [currentRowIndex, setCurrentRowIndex] = React.useState(0);

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
            prev.every((value, index) => value === uniqueFailed[index])
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
        Add `config.rows` and three options (`fire`, `demote`, `keep`) to render this template.
      </div>
    );
  }

  const currentSelection = value?.[currentRow.id] ? normalizeChoiceKey(value[currentRow.id]) : null;
  const currentImage = resolveRowImage(currentRow);
  const showNextButton = Boolean(currentSelection) && !disabled;

  return (
    <div className="rounded-[28px] bg-[#D9D9D9] px-3 py-5 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl text-center">
        <p
          data-testid="three-choice-prompt"
          className="text-[18px] uppercase tracking-[0.04em] text-black sm:text-[32px] sm:tracking-[0.05em] lg:text-[45px]"
          style={{
            fontFamily: fontOverrides.promptFontFamily,
            fontWeight: 400,
            letterSpacing: "0.05em",
            lineHeight: "1.15",
          }}
        >
          {PROMPT_TEXT}
        </p>
        <h3
          data-testid="three-choice-cast-name"
          className="mt-1 text-[36px] uppercase leading-[0.92] text-black sm:mt-2 sm:text-[72px] lg:text-[120px]"
          style={{ fontFamily: fontOverrides.castNameFontFamily, fontWeight: 800 }}
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-6 lg:gap-8">
          {choices.map((choice) => {
            const isSelected = currentSelection === choice.key;
            const showImageOverlay = isSelected && Boolean(currentImage);
            return (
              <button
                key={choice.key}
                type="button"
                onClick={() => handleChoiceSelect(currentRow.id, choice.key)}
                disabled={disabled}
                className={`group relative rounded-full transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/30 ${CIRCLE_SIZE_CLASS} ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-[1.02] active:scale-[0.99]"
                }`}
                style={{
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(255,255,255,0.85), 0 0 0 6px rgba(18,18,18,0.18)"
                    : "0 0 0 1px rgba(18,18,18,0.08)",
                }}
                aria-label={`Set ${currentRow.label} to ${choice.label}`}
                aria-pressed={isSelected}
                data-testid={`three-choice-${choice.key}`}
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
                      width={218}
                      height={218}
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
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 text-center uppercase text-white ${
                    showImageOverlay ? "bottom-[18%]" : "top-1/2 -translate-y-1/2"
                  }`}
                  style={{
                    fontFamily: fontOverrides.choiceFontFamily,
                    fontWeight: 700,
                    fontSize: showImageOverlay
                      ? "clamp(28px, 6.2vw, 40px)"
                      : "clamp(22px, 5.2vw, 40px)",
                    lineHeight: "35px",
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
            className="mx-auto mt-6 inline-flex h-12 min-w-[152px] items-center justify-center rounded-[104px] bg-[#121212] px-6 text-[#F8F8F8] transition hover:bg-black sm:mt-10 sm:h-[64px] sm:min-w-[190px] sm:px-8"
            style={{
              fontFamily: fontOverrides.nextButtonFontFamily,
              fontSize: "clamp(20px, 4.6vw, 30px)",
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
