"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  type DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

type UnknownRecord = Record<string, unknown>;

export interface RankTextFieldsProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: string[] | null;
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

const DEFAULT_OPTION_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_OPTION_BG = "#E2C3E9";
const DEFAULT_OPTION_BG_ACTIVE = "#5D3167";
const DEFAULT_OPTION_TEXT = "#111111";
const DEFAULT_OPTION_TEXT_ACTIVE = "#FFFFFF";

const MOBILE_MIN_WIDTH = 280;
const MOBILE_MAX_WIDTH = 520;
const TABLET_MAX_WIDTH = 840;
const DESKTOP_MAX_WIDTH = 1039;

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

function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...array];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return array;
  next.splice(toIndex, 0, moved);
  return next;
}

function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  if (!activeId || !overId || activeId === overId) return ids;
  const fromIndex = ids.indexOf(activeId);
  const toIndex = ids.indexOf(overId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return ids;
  return arrayMove(ids, fromIndex, toIndex);
}

function MenuHandleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="21"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M7.93156 22.3358C7.61245 22.3358 7.34316 22.226 7.12367 22.0066C6.90418 21.7871 6.79443 21.5178 6.79443 21.1987C6.79443 20.8796 6.90418 20.6103 7.12367 20.3909C7.34316 20.1714 7.61245 20.0616 7.93156 20.0616H24.0573C24.3764 20.0616 24.6457 20.1714 24.8652 20.3909C25.0847 20.6103 25.1944 20.8796 25.1944 21.1987C25.1944 21.5178 25.0847 21.7871 24.8652 22.0066C24.6457 22.226 24.3764 22.3358 24.0573 22.3358H7.93156ZM7.93156 17.1822C7.61245 17.1822 7.34316 17.0725 7.12367 16.8529C6.90418 16.6335 6.79443 16.3642 6.79443 16.0451C6.79443 15.726 6.90418 15.4567 7.12367 15.2372C7.34316 15.0178 7.61245 14.908 7.93156 14.908H24.0573C24.3764 14.908 24.6457 15.0178 24.8652 15.2372C25.0847 15.4567 25.1944 15.726 25.1944 16.0451C25.1944 16.3642 25.0847 16.6335 24.8652 16.8529C24.6457 17.0725 24.3764 17.1822 24.0573 17.1822H7.93156ZM7.93156 12.0286C7.61245 12.0286 7.34316 11.9189 7.12367 11.6994C6.90418 11.4799 6.79443 11.2106 6.79443 10.8915C6.79443 10.5724 6.90418 10.3031 7.12367 10.0836C7.34316 9.86414 7.61245 9.75439 7.93156 9.75439H24.0573C24.3764 9.75439 24.6457 9.86414 24.8652 10.0836C25.0847 10.3031 25.1944 10.5724 25.1944 10.8915C25.1944 11.2106 25.0847 11.4799 24.8652 11.6994C24.6457 11.9189 24.3764 12.0286 24.0573 12.0286H7.93156Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RankRow({
  id,
  label,
  disabled,
  textColor,
  backgroundColor,
  optionHeight,
  optionRadius,
  optionPaddingX,
  optionFontSize,
  optionLineHeight,
  optionLetterSpacing,
  optionFontFamily,
}: {
  id: string;
  label: string;
  disabled: boolean;
  textColor: string;
  backgroundColor: string;
  optionHeight: number;
  optionRadius: number;
  optionPaddingX: number;
  optionFontSize: number;
  optionLineHeight: number;
  optionLetterSpacing: number;
  optionFontFamily: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    disabled,
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  const setNodeRef = React.useCallback((node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  }, [setDraggableRef, setDroppableRef]);

  const transformStyle = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;
  const isSourcePlaceholder = isDragging;

  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        height: `${optionHeight}px`,
        borderRadius: `${optionRadius}px`,
        transform: isSourcePlaceholder ? undefined : transformStyle,
        zIndex: isSourcePlaceholder ? 0 : 1,
        opacity: isSourcePlaceholder ? 0 : 1,
        backgroundColor: backgroundColor,
        color: textColor,
        boxShadow: isOver && !isDragging ? "0 0 0 2px rgba(17,17,17,0.28) inset" : "none",
        transition: isDragging ? "none" : "box-shadow 120ms ease",
        paddingLeft: `${optionPaddingX}px`,
        paddingRight: `${optionPaddingX}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
      data-testid={`rank-text-fields-row-${id}`}
    >
      <span
        style={{
          fontFamily: optionFontFamily,
          fontWeight: 800,
          fontSize: `${optionFontSize}px`,
          lineHeight: optionLineHeight <= 3
            ? `${(optionFontSize * optionLineHeight).toFixed(2)}px`
            : `${optionLineHeight}px`,
          letterSpacing: `${optionLetterSpacing}em`,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={disabled}
        className={disabled ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing"}
        style={{ touchAction: "none" }}
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <MenuHandleIcon className="text-current" />
      </button>
    </div>
  );
}

export default function RankTextFields({
  question,
  value,
  onChange,
  disabled = false,
}: RankTextFieldsProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(MOBILE_MAX_WIDTH);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const configRecord = React.useMemo(
    () => ((question.config ?? {}) as UnknownRecord),
    [question.config],
  );
  const sortedOptions = React.useMemo(
    () => [...question.options].sort((a, b) => a.display_order - b.display_order),
    [question.options],
  );
  const optionMap = React.useMemo(
    () => new Map(sortedOptions.map((option) => [option.option_key, option])),
    [sortedOptions],
  );
  const optionIds = React.useMemo(
    () => sortedOptions.map((option) => option.option_key),
    [sortedOptions],
  );

  const normalizeOrder = React.useCallback((candidate: unknown): string[] => {
    const normalized: string[] = [];
    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (typeof entry !== "string") continue;
        if (!optionMap.has(entry) || normalized.includes(entry)) continue;
        normalized.push(entry);
      }
    }
    if (normalized.length === 0 && typeof candidate === "string") {
      const key = candidate.trim();
      if (key.length > 0 && optionMap.has(key)) normalized.push(key);
    }
    for (const optionId of optionIds) {
      if (!normalized.includes(optionId)) normalized.push(optionId);
    }
    return normalized;
  }, [optionIds, optionMap]);

  const [orderedIds, setOrderedIds] = React.useState<string[]>(() => normalizeOrder(value));
  const orderedIdsRef = React.useRef<string[]>(orderedIds);
  const dragStartOrderRef = React.useRef<string[] | null>(null);
  const dragPreviewReorderedRef = React.useRef(false);

  React.useEffect(() => {
    orderedIdsRef.current = orderedIds;
  }, [orderedIds]);

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

  React.useEffect(() => {
    if (Array.isArray(value)) {
      const normalized = normalizeOrder(value);
      setOrderedIds((prev) => (prev.join("|") === normalized.join("|") ? prev : normalized));
      return;
    }
    setOrderedIds((prev) => {
      const normalized = normalizeOrder(prev);
      return prev.join("|") === normalized.join("|") ? prev : normalized;
    });
  }, [normalizeOrder, optionIds, value]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const optionFontFamily = React.useMemo(() => {
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
    return resolveFont(candidates, DEFAULT_OPTION_FONT);
  }, [configRecord]);

  const optionBg = React.useMemo(
    () =>
      readColorValue(configRecord, ["componentBackgroundColor"]) ??
      readColorValue(configRecord, ["optionBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "componentBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "optionBackgroundColor"]) ??
      DEFAULT_OPTION_BG,
    [configRecord],
  );
  const optionBgActive = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionBackgroundColor"]) ??
      readColorValue(configRecord, ["placeholderShapeColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionBackgroundColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderShapeColor"]) ??
      DEFAULT_OPTION_BG_ACTIVE,
    [configRecord],
  );
  const optionTextColor = React.useMemo(
    () =>
      readColorValue(configRecord, ["optionTextColor"]) ??
      readColorValue(configRecord, ["styles", "optionTextColor"]) ??
      DEFAULT_OPTION_TEXT,
    [configRecord],
  );
  const optionTextColorActive = React.useMemo(
    () =>
      readColorValue(configRecord, ["selectedOptionTextColor"]) ??
      readColorValue(configRecord, ["placeholderTextColor"]) ??
      readColorValue(configRecord, ["styles", "selectedOptionTextColor"]) ??
      readColorValue(configRecord, ["styles", "placeholderTextColor"]) ??
      DEFAULT_OPTION_TEXT_ACTIVE,
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

  const optionLineHeight = React.useMemo(
    () =>
      readNumberValue(configRecord, ["optionTextLineHeight"]) ??
      readNumberValue(configRecord, ["styles", "optionTextLineHeight"]) ??
      1.2,
    [configRecord],
  );
  const optionLetterSpacing = React.useMemo(
    () =>
      readNumberValue(configRecord, ["optionTextLetterSpacing"]) ??
      readNumberValue(configRecord, ["styles", "optionTextLetterSpacing"]) ??
      responsiveSizing.optionLetterSpacing,
    [configRecord, responsiveSizing.optionLetterSpacing],
  );

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    dragStartOrderRef.current = [...orderedIdsRef.current];
    dragPreviewReorderedRef.current = false;
  }, []);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const active = event.active.id as string;
    const over = event.over?.id as string | undefined;
    if (!over) return;
    setOrderedIds((prev) => {
      const next = reorderIds(prev, active, over);
      const changed = next.join("|") !== prev.join("|");
      if (changed) dragPreviewReorderedRef.current = true;
      orderedIdsRef.current = next;
      return changed ? next : prev;
    });
  }, []);

  const handleDragCancel = React.useCallback(() => {
    setActiveId(null);
    const startedOrder = dragStartOrderRef.current;
    dragStartOrderRef.current = null;
    dragPreviewReorderedRef.current = false;
    if (!startedOrder) return;
    orderedIdsRef.current = startedOrder;
    setOrderedIds(startedOrder);
  }, []);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const startedOrder = dragStartOrderRef.current;
    const hadPreviewReorder = dragPreviewReorderedRef.current;
    dragStartOrderRef.current = null;
    dragPreviewReorderedRef.current = false;
    const active = event.active.id as string;
    const over = event.over?.id as string | undefined;
    if (!over) {
      if (!startedOrder) return;
      orderedIdsRef.current = startedOrder;
      setOrderedIds(startedOrder);
      return;
    }
    const latest = orderedIdsRef.current;
    const next = hadPreviewReorder ? latest : reorderIds(latest, active, over);
    if (!hadPreviewReorder) {
      orderedIdsRef.current = next;
      setOrderedIds(next);
    }

    const baseline = startedOrder ?? latest;
    if (next.join("|") !== baseline.join("|")) {
      onChange(next);
    }
  }, [onChange]);

  const activeOption = activeId ? optionMap.get(activeId) : undefined;

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[1039px]"
      aria-describedby={`rank-text-fields-help-${question.id}`}
    >
      <p className="sr-only" id={`rank-text-fields-help-${question.id}`}>
        Drag using the menu icon to reorder
      </p>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="grid w-full" style={{ rowGap: `${responsiveSizing.optionGap}px` }}>
          {orderedIds.map((optionKey) => {
            const option = optionMap.get(optionKey);
            if (!option) return null;
            return (
              <RankRow
                key={`${question.id}-${option.option_key}`}
                id={option.option_key}
                label={option.option_text}
                disabled={disabled}
                textColor={optionTextColor}
                backgroundColor={optionBg}
                optionHeight={responsiveSizing.optionHeight}
                optionRadius={responsiveSizing.optionRadius}
                optionPaddingX={responsiveSizing.optionPaddingX}
                optionFontSize={responsiveSizing.optionFontSize}
                optionLineHeight={optionLineHeight}
                optionLetterSpacing={optionLetterSpacing}
                optionFontFamily={optionFontFamily}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOption ? (
            <div
              style={{
                height: `${responsiveSizing.optionHeight}px`,
                width: `${Math.max(MOBILE_MIN_WIDTH, containerWidth)}px`,
                borderRadius: `${responsiveSizing.optionRadius}px`,
                backgroundColor: optionBgActive,
                color: optionTextColorActive,
                paddingLeft: `${responsiveSizing.optionPaddingX}px`,
                paddingRight: `${responsiveSizing.optionPaddingX}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 18px 36px rgba(0,0,0,0.18)",
              }}
            >
              <span
                style={{
                  fontFamily: optionFontFamily,
                  fontWeight: 800,
                  fontSize: `${responsiveSizing.optionFontSize}px`,
                  lineHeight: optionLineHeight <= 3
                    ? `${(responsiveSizing.optionFontSize * optionLineHeight).toFixed(2)}px`
                    : `${optionLineHeight}px`,
                  letterSpacing: `${optionLetterSpacing}em`,
                  textTransform: "uppercase",
                }}
              >
                {activeOption.option_text}
              </span>
              <MenuHandleIcon className="text-current" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
