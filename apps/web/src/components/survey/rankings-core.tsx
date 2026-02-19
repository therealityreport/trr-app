"use client";

import * as React from "react";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import {
  canonicalizeRankingVariant,
  inferUiVariant,
  type CircleRankingConfig,
  type PersonRankingsConfig,
  type PosterRankingsConfig,
  type RectangleRankingConfig,
} from "@/lib/surveys/question-config-types";
import type { SurveyRankingItem } from "@/lib/surveys/types";
import FlashbackRanker, {
  type FlashbackRankerFontOverrides,
  type FlashbackRankerStyleOverrides,
} from "@/components/flashback-ranker";
import {
  extractPrimaryFontToken,
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface RankingInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

interface RankTemplateFontOverrides extends FlashbackRankerFontOverrides {
  missingFonts: string[];
}

type UnknownRecord = Record<string, unknown>;
type RankingConfig =
  | PersonRankingsConfig
  | PosterRankingsConfig
  | CircleRankingConfig
  | RectangleRankingConfig;

type CanonicalRankingVariant = "person-rankings" | "poster-rankings";

const DEFAULT_RANK_NUMBER_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_TRAY_LABEL_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_CARD_LABEL_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_PICKER_TITLE_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_PICKER_ITEM_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";

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
  return trimmed.length ? trimmed : null;
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

function readNumberValue(record: UnknownRecord, path: string[]): number | null {
  const value = readPath(record, path);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
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

function collectRankingFontOverrides(config: RankingConfig): RankTemplateFontOverrides {
  const configRecord = config as unknown as UnknownRecord;
  const missingFonts: string[] = [];

  const rankNumberCandidates: string[] = [];
  const trayLabelCandidates: string[] = [];
  const cardLabelCandidates: string[] = [];
  const pickerTitleCandidates: string[] = [];
  const pickerItemCandidates: string[] = [];

  const rankNumberPaths: string[][] = [
    ["rankNumberFontFamily"],
    ["slotNumberFontFamily"],
    ["numberFontFamily"],
    ["fonts", "rankNumber"],
    ["fonts", "slotNumber"],
    ["fonts", "number"],
    ["typography", "rankNumber"],
    ["typography", "slotNumber"],
    ["typography", "number"],
    ["canva", "fonts", "rankNumber"],
  ];
  const trayLabelPaths: string[][] = [
    ["trayLabelFontFamily"],
    ["unrankedFontFamily"],
    ["fonts", "trayLabel"],
    ["fonts", "unranked"],
    ["typography", "trayLabel"],
    ["typography", "unranked"],
    ["canva", "fonts", "trayLabel"],
  ];
  const cardLabelPaths: string[][] = [
    ["cardLabelFontFamily"],
    ["seasonLabelFontFamily"],
    ["itemLabelFontFamily"],
    ["fonts", "cardLabel"],
    ["fonts", "seasonLabel"],
    ["fonts", "itemLabel"],
    ["typography", "cardLabel"],
    ["typography", "seasonLabel"],
    ["typography", "itemLabel"],
    ["canva", "fonts", "cardLabel"],
  ];
  const pickerTitlePaths: string[][] = [
    ["pickerTitleFontFamily"],
    ["modalTitleFontFamily"],
    ["fonts", "pickerTitle"],
    ["fonts", "modalTitle"],
    ["typography", "pickerTitle"],
    ["typography", "modalTitle"],
    ["canva", "fonts", "pickerTitle"],
  ];
  const pickerItemPaths: string[][] = [
    ["pickerItemFontFamily"],
    ["pickerLabelFontFamily"],
    ["fonts", "pickerItem"],
    ["fonts", "pickerLabel"],
    ["typography", "pickerItem"],
    ["typography", "pickerLabel"],
    ["canva", "fonts", "pickerItem"],
  ];

  for (const path of rankNumberPaths) pushUnique(rankNumberCandidates, readFontValue(configRecord, path));
  for (const path of trayLabelPaths) pushUnique(trayLabelCandidates, readFontValue(configRecord, path));
  for (const path of cardLabelPaths) pushUnique(cardLabelCandidates, readFontValue(configRecord, path));
  for (const path of pickerTitlePaths) pushUnique(pickerTitleCandidates, readFontValue(configRecord, path));
  for (const path of pickerItemPaths) pushUnique(pickerItemCandidates, readFontValue(configRecord, path));

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
    rankNumberFontFamily: resolveTemplateFontOverride(
      rankNumberCandidates,
      DEFAULT_RANK_NUMBER_FONT,
      missingFonts,
    ),
    trayLabelFontFamily: resolveTemplateFontOverride(
      trayLabelCandidates,
      DEFAULT_TRAY_LABEL_FONT,
      missingFonts,
    ),
    cardLabelFontFamily: resolveTemplateFontOverride(
      cardLabelCandidates,
      DEFAULT_CARD_LABEL_FONT,
      missingFonts,
    ),
    pickerTitleFontFamily: resolveTemplateFontOverride(
      pickerTitleCandidates,
      DEFAULT_PICKER_TITLE_FONT,
      missingFonts,
    ),
    pickerItemFontFamily: resolveTemplateFontOverride(
      pickerItemCandidates,
      DEFAULT_PICKER_ITEM_FONT,
      missingFonts,
    ),
    missingFonts,
  };
}

function collectRankingStyleOverrides(config: RankingConfig): FlashbackRankerStyleOverrides {
  const configRecord = config as unknown as UnknownRecord;

  const circlePlaceholderFillColor =
    toTrimmedString(readPath(configRecord, ["circlePlaceholderFillColor"])) ??
    toTrimmedString(readPath(configRecord, ["placeholderShapeColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "circlePlaceholderFillColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "placeholderShapeColor"])) ??
    undefined;
  const circlePlaceholderBorderColor =
    toTrimmedString(readPath(configRecord, ["circlePlaceholderBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["placeholderShapeBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "circlePlaceholderBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "placeholderShapeBorderColor"])) ??
    undefined;
  const circlePlaceholderNumberColor =
    toTrimmedString(readPath(configRecord, ["circlePlaceholderNumberColor"])) ??
    toTrimmedString(readPath(configRecord, ["placeholderTextColor"])) ??
    toTrimmedString(readPath(configRecord, ["questionTextColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "circlePlaceholderNumberColor"])) ??
    undefined;
  const rectanglePlaceholderFillColor =
    toTrimmedString(readPath(configRecord, ["rectanglePlaceholderFillColor"])) ??
    toTrimmedString(readPath(configRecord, ["placeholderShapeColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "rectanglePlaceholderFillColor"])) ??
    undefined;
  const unassignedContainerFillColor =
    toTrimmedString(readPath(configRecord, ["unassignedContainerFillColor"])) ??
    toTrimmedString(readPath(configRecord, ["unassignedContainerColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "unassignedContainerFillColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "unassignedContainerColor"])) ??
    undefined;
  const unassignedContainerBorderColor =
    toTrimmedString(readPath(configRecord, ["unassignedContainerBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "unassignedContainerBorderColor"])) ??
    undefined;
  const unassignedItemBorderColor =
    toTrimmedString(readPath(configRecord, ["unassignedItemBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["unassignedCircleBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "unassignedItemBorderColor"])) ??
    toTrimmedString(readPath(configRecord, ["styles", "unassignedCircleBorderColor"])) ??
    undefined;
  const unassignedItemSizeRaw =
    readNumberValue(configRecord, ["unassignedItemSizePercent"]) ??
    readNumberValue(configRecord, ["unassignedCircleSize"]) ??
    readNumberValue(configRecord, ["styles", "unassignedItemSizePercent"]) ??
    readNumberValue(configRecord, ["styles", "unassignedCircleSize"]);
  const unassignedItemSizePercent = typeof unassignedItemSizeRaw === "number"
    ? clampNumber(unassignedItemSizeRaw, 40, 220)
    : undefined;

  return {
    circlePlaceholderFillColor,
    circlePlaceholderBorderColor,
    circlePlaceholderNumberColor,
    rectanglePlaceholderFillColor,
    unassignedContainerFillColor,
    unassignedContainerBorderColor,
    unassignedItemBorderColor,
    unassignedItemSizePercent,
  };
}

function resolveQuestionItems(
  question: SurveyQuestion & { options: QuestionOption[] },
): SurveyRankingItem[] {
  const getImagePath = (metadata: unknown): string => {
    const record = metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
    return record?.imagePath ?? record?.imageUrl ?? "";
  };

  return question.options
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((opt) => ({
      id: opt.option_key,
      label: opt.option_text,
      img: getImagePath(opt.metadata),
    }));
}

function normalizeVariantFromConfig(
  config: RankingConfig,
  questionType: SurveyQuestion["question_type"],
  forcedVariant?: CanonicalRankingVariant,
): CanonicalRankingVariant {
  if (forcedVariant) return forcedVariant;
  const normalized = canonicalizeRankingVariant(config.uiVariant ?? inferUiVariant(questionType));
  return normalized === "poster-rankings" ? "poster-rankings" : "person-rankings";
}

export function RankingInputCore({
  question,
  value,
  onChange,
  disabled = false,
  forcedVariant,
  warningTestIdPrefix = "rank-order",
}: RankingInputProps & {
  forcedVariant?: CanonicalRankingVariant;
  warningTestIdPrefix?: string;
}) {
  const config = question.config as unknown as RankingConfig;
  const normalizedVariant = normalizeVariantFromConfig(config, question.question_type, forcedVariant);
  const fontOverrides = React.useMemo(() => collectRankingFontOverrides(config), [config]);
  const styleOverrides = React.useMemo(() => collectRankingStyleOverrides(config), [config]);
  const shapeScalePercent = React.useMemo(
    () => normalizeScalePercent(config.shapeScale, 100),
    [config.shapeScale],
  );
  const buttonScalePercent = React.useMemo(
    () => normalizeScalePercent(config.buttonScale, 100),
    [config.buttonScale],
  );
  const [fontLoadFailures, setFontLoadFailures] = React.useState<string[]>([]);
  const variant = "grid";
  const layoutPreset = normalizedVariant === "poster-rankings"
    ? "figma-rank-rectangles"
    : "figma-rank-circles";
  const lineLabelTop = config.lineLabelTop ?? "BEST";
  const lineLabelBottom = config.lineLabelBottom ?? "WORST";

  const items: SurveyRankingItem[] = React.useMemo(() => resolveQuestionItems(question), [question]);

  const handleRankingChange = React.useCallback(
    (ranking: SurveyRankingItem[]) => {
      if (disabled) return;
      const orderedIds = ranking.map((item) => item.id);
      onChange(orderedIds);
    },
    [disabled, onChange],
  );

  const ranker = (
    <FlashbackRanker
      items={items}
      initialRankingIds={value ?? []}
      lineLabelTop={lineLabelTop}
      lineLabelBottom={lineLabelBottom}
      onChange={disabled ? undefined : handleRankingChange}
      variant={variant}
      layoutPreset={layoutPreset}
      fontOverrides={fontOverrides}
      styleOverrides={styleOverrides}
      shapeScalePercent={shapeScalePercent}
      buttonScalePercent={buttonScalePercent}
    />
  );

  const fontProbeTokens = React.useMemo(() => {
    const tokens = [
      fontOverrides.rankNumberFontFamily,
      fontOverrides.trayLabelFontFamily,
      fontOverrides.cardLabelFontFamily,
      fontOverrides.pickerTitleFontFamily,
      fontOverrides.pickerItemFontFamily,
    ]
      .map((fontFamily) => extractPrimaryFontToken(fontFamily ?? ""))
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
          const result = await fontsApi.load(`700 28px "${token}"`, "Rank the Seasons");
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

  return (
    <div className="space-y-3">
      {fontOverrides.missingFonts.length > 0 && (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid={`${warningTestIdPrefix}-missing-fonts`}
        >
          Missing CloudFront CDN fonts: {fontOverrides.missingFonts.join(", ")}
        </p>
      )}
      {fontLoadFailures.length > 0 && (
        <p
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid={`${warningTestIdPrefix}-font-load-failures`}
        >
          CloudFront CDN fonts failed to load in this browser: {fontLoadFailures.join(", ")}
        </p>
      )}
      {disabled ? <div className="pointer-events-none opacity-50">{ranker}</div> : ranker}
    </div>
  );
}
