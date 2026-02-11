"use client";

import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { MatrixRow, TwoAxisGridConfig } from "@/lib/surveys/question-config-types";

export type TwoAxisGridCoord = { x: number; y: number };
export type TwoAxisGridAnswer = Record<string, TwoAxisGridCoord>;

const DEFAULT_EXTENT = 5;

function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.round(value);
  return Math.max(min, Math.min(max, rounded));
}

export function getExtent(config: Pick<TwoAxisGridConfig, "extent"> | null | undefined): number {
  const raw = Number(config?.extent);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_EXTENT;
  return Math.max(1, Math.round(raw));
}

function getImagePathFromOption(option: QuestionOption): string | undefined {
  const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
  const candidate = metadata?.imagePath ?? metadata?.imageUrl;
  return typeof candidate === "string" && candidate.trim() ? candidate : undefined;
}

export function getSubjects(
  question: SurveyQuestion & { options: QuestionOption[] },
  config: Pick<TwoAxisGridConfig, "rows"> | null | undefined,
): MatrixRow[] {
  const rows = config?.rows ?? [];
  if (Array.isArray(rows) && rows.length > 0) {
    return rows
      .filter((row): row is MatrixRow => Boolean(row && typeof row.id === "string" && typeof row.label === "string"))
      .map((row) => ({
        id: row.id,
        label: row.label,
        img: typeof row.img === "string" && row.img.trim() ? row.img : undefined,
      }));
  }

  const options = [...(question.options ?? [])].sort((a, b) => a.display_order - b.display_order);
  return options.map((opt) => ({
    id: opt.option_key,
    label: opt.option_text,
    img: getImagePathFromOption(opt),
  }));
}

export function coercePlacements(
  value: unknown,
  subjects: MatrixRow[],
  extent: number,
): TwoAxisGridAnswer {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const allowed = new Set(subjects.map((s) => s.id));
  const out: TwoAxisGridAnswer = {};

  for (const [id, coord] of Object.entries(record)) {
    if (!allowed.has(id)) continue;
    if (!coord || typeof coord !== "object" || Array.isArray(coord)) continue;

    const xRaw = (coord as { x?: unknown }).x;
    const yRaw = (coord as { y?: unknown }).y;
    const xNum = typeof xRaw === "number" ? xRaw : Number(xRaw);
    const yNum = typeof yRaw === "number" ? yRaw : Number(yRaw);
    if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) continue;

    out[id] = {
      x: clampInt(xNum, -extent, extent),
      y: clampInt(yNum, -extent, extent),
    };
  }

  return out;
}

export function coordToPercent(x: number, y: number, extent: number): { leftPct: number; topPct: number } {
  const safeExtent = Math.max(1, Math.round(extent));
  const denom = 2 * safeExtent;
  const xIndex = clampInt(x, -safeExtent, safeExtent) + safeExtent;
  const yIndex = safeExtent - clampInt(y, -safeExtent, safeExtent);

  return {
    leftPct: (xIndex / denom) * 100,
    topPct: (yIndex / denom) * 100,
  };
}

export function snapFromRectCenterToCoord(
  activeRect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  boardRect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  extent: number,
): TwoAxisGridCoord {
  const safeExtent = Math.max(1, Math.round(extent));
  const boardWidth = Math.max(1, boardRect.width);
  const boardHeight = Math.max(1, boardRect.height);

  const cx = activeRect.left + activeRect.width / 2;
  const cy = activeRect.top + activeRect.height / 2;

  const xRel = (cx - boardRect.left) / boardWidth;
  const yRel = (cy - boardRect.top) / boardHeight;

  const maxIndex = 2 * safeExtent;
  const xIndex = Math.max(0, Math.min(maxIndex, Math.round(xRel * maxIndex)));
  const yIndex = Math.max(0, Math.min(maxIndex, Math.round(yRel * maxIndex)));

  return {
    x: xIndex - safeExtent,
    y: safeExtent - yIndex,
  };
}

export function snapFromPointToCoord(
  clientX: number,
  clientY: number,
  boardRect: Pick<DOMRect, "left" | "top" | "width" | "height">,
  extent: number,
): TwoAxisGridCoord {
  const safeExtent = Math.max(1, Math.round(extent));
  const boardWidth = Math.max(1, boardRect.width);
  const boardHeight = Math.max(1, boardRect.height);

  const xRel = (clientX - boardRect.left) / boardWidth;
  const yRel = (clientY - boardRect.top) / boardHeight;

  const maxIndex = 2 * safeExtent;
  const xIndex = Math.max(0, Math.min(maxIndex, Math.round(xRel * maxIndex)));
  const yIndex = Math.max(0, Math.min(maxIndex, Math.round(yRel * maxIndex)));

  return {
    x: xIndex - safeExtent,
    y: safeExtent - yIndex,
  };
}

/**
 * Offset tokens that share the same intersection so they remain individually interactive.
 * Deterministic across renders.
 */
export function fanOffset(index: number, count: number, tokenPx: number): { dx: number; dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 };

  const perRing = 8;
  const ring = Math.floor(index / perRing);
  const pos = index % perRing;
  const ringCount = Math.min(perRing, Math.max(1, count - ring * perRing));

  const base = Math.max(6, Math.round(tokenPx * 0.25));
  const ringGap = Math.max(4, Math.round(tokenPx * 0.15));
  const r = base + ring * ringGap;

  const angle = (2 * Math.PI * pos) / ringCount;
  return {
    dx: Math.round(r * Math.cos(angle)),
    dy: Math.round(r * Math.sin(angle)),
  };
}

