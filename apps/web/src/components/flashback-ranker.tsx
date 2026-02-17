"use client";

import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { SurveyRankingItem } from "@/lib/surveys/types";

const LINE_MAX_HEIGHT = 600;
const LINE_VERTICAL_PADDING = 32; // matches py-8 padding applied to the column wrapper
const TOKEN_BASE_SIZE = 80;
const TOKEN_MIN_SIZE = 44;
const MIN_SLOT_HEIGHT = 8;
const MAX_SLOT_HEIGHT = 64;
const GRID_CIRCLE_SIZE = 92;
const GRID_TOKEN_SIZE = 68;
const FIGMA_GRID_MAX_WIDTH = 708;
const FIGMA_RECT_GRID_MAX_WIDTH = 690;

type FlashbackRankerLayoutPreset = "legacy" | "figma-rank-circles" | "figma-rank-rectangles";
type TokenVariant = "circle" | "season-card";
type SeasonCardSize = number | "fill";

type FigmaCircleLayoutMetrics = {
  containerWidth: number;
  gridWidth: number;
  columns: 2 | 4;
  gapX: number;
  gapY: number;
  slotSize: number;
  tokenSize: number;
  benchTokenSize: number;
  benchGap: number;
  benchMarginTop: number;
  benchPaddingY: number;
  benchPaddingX: number;
  rankNumberSize: number;
  rankNumberMarginBottom: number;
  removeButtonSize: number;
  removeButtonOffset: number;
  removeButtonFontSize: number;
  overlaySize: number;
};

type FigmaRectangleLayoutMetrics = {
  containerWidth: number;
  frameWidth: number;
  framePaddingX: number;
  framePaddingY: number;
  gridWidth: number;
  columns: 2 | 3;
  gapX: number;
  gapY: number;
  slotWidth: number;
  rankNumberSize: number;
  rankNumberMarginBottom: number;
  removeButtonSize: number;
  removeButtonOffset: number;
  removeButtonFontSize: number;
  overlaySize: number;
  trayCardWidth: number;
  trayGap: number;
  trayMarginTop: number;
  trayLabelFontSize: number;
  trayLabelTracking: number;
  trayPaddingX: number;
  trayPaddingY: number;
  trayWrap: boolean;
  cardLabelFontSize: number;
};

export interface FlashbackRankerFontOverrides {
  rankNumberFontFamily?: string;
  trayLabelFontFamily?: string;
  cardLabelFontFamily?: string;
  pickerTitleFontFamily?: string;
  pickerItemFontFamily?: string;
}

export interface FlashbackRankerProps {
  items: SurveyRankingItem[];
  initialRankingIds?: string[];
  lineLabelTop?: string;
  lineLabelBottom?: string;
  onChange?(ranking: SurveyRankingItem[]): void;
  variant?: "classic" | "grid";
  layoutPreset?: FlashbackRankerLayoutPreset;
  fontOverrides?: FlashbackRankerFontOverrides;
  shapeScalePercent?: number;
  buttonScalePercent?: number;
}

type LineMetrics = { slotHeight: number; tokenSize: number };

const DEFAULT_RANK_NUMBER_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_TRAY_LABEL_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_CARD_LABEL_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_PICKER_TITLE_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const DEFAULT_PICKER_ITEM_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function interpolate(min: number, max: number, progress: number): number {
  return min + (max - min) * progress;
}

function normalizeScalePercent(value: number | undefined, fallback = 100): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampNumber(value, 40, 220);
}

export default function FlashbackRanker({
  items,
  initialRankingIds = [],
  lineLabelTop = "BEST",
  lineLabelBottom = "WORST",
  onChange,
  variant = "classic",
  layoutPreset = "legacy",
  fontOverrides,
  shapeScalePercent = 100,
  buttonScalePercent = 100,
}: FlashbackRankerProps) {
  const isGridMode = variant === "grid";
  const isFigmaRankCircles = isGridMode && layoutPreset === "figma-rank-circles";
  const isFigmaRankRectangles = isGridMode && layoutPreset === "figma-rank-rectangles";
  const isFigmaPreset = isFigmaRankCircles || isFigmaRankRectangles;
  const shapeScaleFactor = normalizeScalePercent(shapeScalePercent, 100) / 100;
  const buttonScaleFactor = normalizeScalePercent(buttonScalePercent, 100) / 100;
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const syncedRankingRef = React.useRef<string[] | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(() =>
    typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 960,
  );

  const [bench, setBench] = React.useState<SurveyRankingItem[]>(items);
  const [line, setLine] = React.useState<SurveyRankingItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [previewLine, setPreviewLine] = React.useState<SurveyRankingItem[] | null>(null);
  const [pickerSlotIndex, setPickerSlotIndex] = React.useState<number | null>(null);
  const [pickerPosition, setPickerPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [slots, setSlots] = React.useState<(SurveyRankingItem | null)[]>(() =>
    Array.from({ length: items.length }, () => null),
  );
  const updatePreviewLine = React.useCallback((next: SurveyRankingItem[] | null) => {
    setPreviewLine((prev) => {
      if (areLinesEqual(prev, next)) {
        return prev;
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    const incomingKey = initialRankingIds.join("|");
    const previousKey = syncedRankingRef.current ? syncedRankingRef.current.join("|") : null;
    if (previousKey !== null && incomingKey === previousKey) {
      return;
    }
    const initialLine = initialRankingIds
      .map((id) => itemMap.get(id))
      .filter((item): item is SurveyRankingItem => Boolean(item));
    const initialBench = items.filter((item) => !initialRankingIds.includes(item.id));
    const slotSeed = Array.from({ length: items.length }, (_, index) => initialLine[index] ?? null);
    setLine(initialLine);
    setBench(initialBench);
    setSlots(slotSeed);
    syncedRankingRef.current = initialLine.map((item) => item.id);
  }, [initialRankingIds, itemMap, items]);

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const total = items.length;
  const rankingItems = isGridMode
    ? (slots.filter((entry): entry is SurveyRankingItem => Boolean(entry)))
    : previewLine ?? line;
  const placed = rankingItems.length;
  const donePct = total === 0 ? 0 : Math.round((placed / total) * 100);

  const activeItem = activeId ? itemMap.get(activeId) ?? null : null;

  const buildLineWithItem = React.useCallback(
    (current: SurveyRankingItem[], item: SurveyRankingItem, index: number) => {
      const next = current.filter((entry) => entry.id !== item.id);
      const targetIndex = Math.max(0, Math.min(index, next.length));
      next.splice(targetIndex, 0, item);
      return next;
    },
    [],
  );

  const rankingFromSlots = React.useCallback(
    (payload: (SurveyRankingItem | null)[]) => payload.filter((entry): entry is SurveyRankingItem => Boolean(entry)),
    [],
  );

  const emitChange = React.useCallback(
    (next: SurveyRankingItem[]) => {
      onChange?.(next);
      syncedRankingRef.current = next.map((item) => item.id);
    },
    [onChange],
  );

  const placeInSlot = React.useCallback(
    (index: number, item: SurveyRankingItem) => {
      setSlots((prev) => {
        const next = [...prev];
        const existingIndex = prev.findIndex((entry) => entry?.id === item.id);
        if (existingIndex !== -1) {
          next[existingIndex] = null;
        }
        next[index] = item;
        queueMicrotask(() => {
          emitChange(rankingFromSlots(next));
        });
        return next;
      });
    },
    [emitChange, rankingFromSlots],
  );

  const clearSlotByItem = React.useCallback(
    (itemId: string) => {
      setSlots((prev) => {
        const next = prev.map((entry) => (entry?.id === itemId ? null : entry));
        queueMicrotask(() => {
          emitChange(rankingFromSlots(next));
        });
        return next;
      });
    },
    [emitChange, rankingFromSlots],
  );

  const insertAt = React.useCallback(
    (index: number, item: SurveyRankingItem) => {
      if (isGridMode) {
        placeInSlot(index, item);
        return;
      }
      const next = buildLineWithItem(line, item, index);
      setLine(next);
      setBench((prev) => prev.filter((entry) => entry.id !== item.id));
      queueMicrotask(() => emitChange(next));
    },
    [buildLineWithItem, emitChange, isGridMode, line, placeInSlot],
  );

  const moveBackToBench = React.useCallback(
    (item: SurveyRankingItem) => {
      if (isGridMode) {
        clearSlotByItem(item.id);
        return;
      }
      setLine((prev) => {
        const next = prev.filter((entry) => entry.id !== item.id);
        queueMicrotask(() => emitChange(next));
        return next;
      });
      setBench((prev) => {
        if (prev.some((entry) => entry.id === item.id)) return prev;
        const next = [...prev, item];
        next.sort((a, b) => items.findIndex((x) => x.id === a.id) - items.findIndex((x) => x.id === b.id));
        return next;
      });
    },
    [clearSlotByItem, emitChange, isGridMode, items],
  );

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id as string);
      if (!isGridMode) {
        updatePreviewLine(line);
      }
    },
    [isGridMode, line, updatePreviewLine],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event;
      setActiveId(null);
      if (!isGridMode) {
        updatePreviewLine(null);
      }
      if (!over || !active) return;

      const overId = over.id as string;
      const activeId = active.id as string;
      const item = itemMap.get(activeId);
      if (!item) return;

      if (overId.startsWith("slot-")) {
        const index = Number.parseInt(overId.split("-")[1] ?? "0", 10);
        insertAt(index, item);
        return;
      }

      if (overId === "bench") {
        moveBackToBench(item);
      }
    },
    [insertAt, isGridMode, itemMap, moveBackToBench, updatePreviewLine],
  );

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      if (!over || !active) {
        if (!isGridMode) updatePreviewLine(null);
        return;
      }

      const activeKey = active.id as string;
      const overId = over.id as string;
      const item = itemMap.get(activeKey);
      if (!item) {
        if (!isGridMode) updatePreviewLine(null);
        return;
      }

      if (overId === "bench") {
        if (!isGridMode) {
          if (line.some((entry) => entry.id === activeKey)) {
            updatePreviewLine(line.filter((entry) => entry.id !== activeKey));
          } else {
            updatePreviewLine(line);
          }
        }
        return;
      }

      if (overId.startsWith("slot-")) {
        if (!isGridMode) {
          const index = Number.parseInt(overId.split("-")[1] ?? "0", 10);
          const next = buildLineWithItem(line, item, index);
          updatePreviewLine(next);
        }
        return;
      }

      if (!isGridMode) {
        updatePreviewLine(null);
      }
    },
    [buildLineWithItem, isGridMode, itemMap, line, updatePreviewLine],
  );

  const handleSlotClick = React.useCallback(
    (index: number, anchor?: DOMRect) => {
      if (!isGridMode) return;
      setPickerSlotIndex(index);
      if (anchor) {
        const offsetTop = anchor.bottom + 12;
        const offsetLeft = anchor.left + anchor.width / 2;
        setPickerPosition({ top: offsetTop, left: offsetLeft });
      } else {
        setPickerPosition(null);
      }
    },
    [isGridMode],
  );

  const closePicker = React.useCallback(() => {
    setPickerSlotIndex(null);
    setPickerPosition(null);
  }, []);

  const handlePickerSelect = React.useCallback(
    (item: SurveyRankingItem) => {
      if (pickerSlotIndex === null) return;
      insertAt(pickerSlotIndex, item);
      closePicker();
    },
    [closePicker, insertAt, pickerSlotIndex],
  );

  const handleSlotClear = React.useCallback(
    (item: SurveyRankingItem) => {
      moveBackToBench(item);
    },
    [moveBackToBench],
  );

  const lineItems = previewLine ?? line;
  const lineLength = lineItems.length;
  const lineMetrics = React.useMemo(() => computeLineMetrics(lineLength), [lineLength]);
  const circleLayout = React.useMemo(
    () => computeFigmaCircleLayoutMetrics(containerWidth, shapeScaleFactor, buttonScaleFactor),
    [buttonScaleFactor, containerWidth, shapeScaleFactor],
  );
  const rectangleLayout = React.useMemo(
    () => computeFigmaRectangleLayoutMetrics(containerWidth, shapeScaleFactor, buttonScaleFactor),
    [buttonScaleFactor, containerWidth, shapeScaleFactor],
  );
  const shouldForceMobilePicker = isFigmaPreset && containerWidth < 640;
  const activeIsOnLine = React.useMemo(
    () => lineItems.some((entry) => entry.id === activeId),
    [activeId, lineItems],
  );
  const activeOverlaySize: number = isFigmaRankCircles
    ? circleLayout.overlaySize
    : isFigmaRankRectangles
      ? rectangleLayout.overlaySize
      : isGridMode
        ? Math.round(clampNumber(GRID_TOKEN_SIZE * shapeScaleFactor, 36, 148))
        : activeIsOnLine
          ? lineMetrics.tokenSize
          : Math.round(clampNumber(TOKEN_BASE_SIZE * shapeScaleFactor, 42, 160));
  const activeOverlayVariant: TokenVariant = isFigmaRankRectangles ? "season-card" : "circle";
  const resolvedFontOverrides = React.useMemo<Required<FlashbackRankerFontOverrides>>(
    () => ({
      rankNumberFontFamily: fontOverrides?.rankNumberFontFamily ?? DEFAULT_RANK_NUMBER_FONT,
      trayLabelFontFamily: fontOverrides?.trayLabelFontFamily ?? DEFAULT_TRAY_LABEL_FONT,
      cardLabelFontFamily: fontOverrides?.cardLabelFontFamily ?? DEFAULT_CARD_LABEL_FONT,
      pickerTitleFontFamily: fontOverrides?.pickerTitleFontFamily ?? DEFAULT_PICKER_TITLE_FONT,
      pickerItemFontFamily: fontOverrides?.pickerItemFontFamily ?? DEFAULT_PICKER_ITEM_FONT,
    }),
    [fontOverrides],
  );
  const totalSlots = items.length;
  const slotItems = slots;
  const gridBench = React.useMemo(() => {
    const assigned = new Set(slotItems.filter(Boolean).map((item) => (item as SurveyRankingItem).id));
    return items.filter((item) => !assigned.has(item.id));
  }, [items, slotItems]);
  const benchItems = isGridMode ? gridBench : bench;

  React.useEffect(() => {
    if (!isGridMode) {
      setPickerSlotIndex(null);
      setPickerPosition(null);
    }
  }, [isGridMode]);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[1440px]">
      {!isFigmaPreset && (
        <div className="flex items-center justify-center sm:justify-between gap-4 px-4 py-3">
          <div className="text-sm font-semibold text-gray-600">{donePct}% Done</div>
          <Progress value={donePct} />
          <div className="text-sm font-semibold text-gray-600">100%</div>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        {isFigmaRankCircles ? (
          <>
            <FigmaRankingGrid
              totalSlots={totalSlots}
              slotItems={slotItems}
              activeId={activeId}
              onSlotClick={handleSlotClick}
              onRemoveItem={handleSlotClear}
              fontOverrides={resolvedFontOverrides}
              layout={circleLayout}
            />
            <FigmaCircleBench
              items={benchItems}
              layout={circleLayout}
            />
            <SelectionPicker
              open={pickerSlotIndex !== null}
              onClose={closePicker}
              items={gridBench}
              onSelect={handlePickerSelect}
              position={pickerPosition}
              mobileSheet
              forceMobileSheet={shouldForceMobilePicker}
              titleFontFamily={resolvedFontOverrides.pickerTitleFontFamily}
              itemFontFamily={resolvedFontOverrides.pickerItemFontFamily}
              shapeScaleFactor={shapeScaleFactor}
              buttonScaleFactor={buttonScaleFactor}
            />
          </>
        ) : isFigmaRankRectangles ? (
          <section
            className="mx-auto w-full rounded-[18px] bg-black"
            style={{
              maxWidth: `${rectangleLayout.frameWidth}px`,
              padding: `${rectangleLayout.framePaddingY}px ${rectangleLayout.framePaddingX}px`,
            }}
          >
            <FigmaRectangleRankingGrid
              totalSlots={totalSlots}
              slotItems={slotItems}
              activeId={activeId}
              onSlotClick={handleSlotClick}
              onRemoveItem={handleSlotClear}
              fontOverrides={resolvedFontOverrides}
              layout={rectangleLayout}
            />
            <FigmaRectangleBench
              items={benchItems}
              fontOverrides={resolvedFontOverrides}
              layout={rectangleLayout}
            />
            <SelectionPicker
              open={pickerSlotIndex !== null}
              onClose={closePicker}
              items={gridBench}
              onSelect={handlePickerSelect}
              position={pickerPosition}
              mobileSheet
              forceMobileSheet={shouldForceMobilePicker}
              pickerVariant="season-card"
              title="Pick a season"
              titleFontFamily={resolvedFontOverrides.pickerTitleFontFamily}
              itemFontFamily={resolvedFontOverrides.pickerItemFontFamily}
              shapeScaleFactor={shapeScaleFactor}
              buttonScaleFactor={buttonScaleFactor}
            />
          </section>
        ) : isGridMode ? (
          <>
            <Bench items={benchItems} className="hidden sm:block" />
            <RankingGrid
              totalSlots={totalSlots}
              slotItems={slotItems}
              activeId={activeId}
              onSlotClick={handleSlotClick}
              onRemoveItem={handleSlotClear}
              shapeScaleFactor={shapeScaleFactor}
              buttonScaleFactor={buttonScaleFactor}
            />
            <SelectionPicker
              open={pickerSlotIndex !== null}
              onClose={closePicker}
              items={gridBench}
              onSelect={handlePickerSelect}
              position={pickerPosition}
              shapeScaleFactor={shapeScaleFactor}
              buttonScaleFactor={buttonScaleFactor}
            />
          </>
        ) : (
          <>
            <Bench items={benchItems} />
            <RankingLine
              items={lineItems}
              labelTop={lineLabelTop}
              labelBottom={lineLabelBottom}
              activeId={activeId}
              metrics={lineMetrics}
            />
          </>
        )}
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <Token
              item={activeItem}
              overlay
              size={activeOverlaySize}
              variant={activeOverlayVariant}
              seasonCardLabelFontFamily={resolvedFontOverrides.cardLabelFontFamily}
              seasonCardLabelSize={rectangleLayout.cardLabelFontSize}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Bench({ items, className = "" }: { items: SurveyRankingItem[]; className?: string }) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div className={`px-4 ${className}`}>
      <div
        ref={setNodeRef}
        className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 py-3"
        aria-label="Drag from here"
      >
        {items.map((item) => (
          <Token key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function FigmaRectangleBench({
  items,
  fontOverrides,
  layout,
}: {
  items: SurveyRankingItem[];
  fontOverrides: Required<FlashbackRankerFontOverrides>;
  layout: FigmaRectangleLayoutMetrics;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench" });

  return (
    <section
      className="mx-auto w-full"
      style={{ marginTop: `${layout.trayMarginTop}px`, paddingInline: "2px" }}
    >
      <div
        ref={setNodeRef}
        className={`rounded-[12px] border transition ${
          isOver ? "border-white bg-white/20" : "border-white/20 bg-white/8"
        }`}
        style={{
          padding: `${layout.trayPaddingY}px ${layout.trayPaddingX}px`,
        }}
        aria-label="Unassigned seasons"
        data-testid="figma-rectangle-unranked-tray"
      >
        <div
          className={`flex ${layout.trayWrap ? "flex-wrap overflow-visible" : "overflow-x-auto snap-x snap-mandatory pb-1"}`}
          style={{ gap: `${layout.trayGap}px` }}
        >
          {items.map((item) => (
            <div key={item.id} className="shrink-0 snap-start">
              <Token
                item={item}
                variant="season-card"
                size={layout.trayCardWidth}
                seasonCardLabelFontFamily={fontOverrides.cardLabelFontFamily}
                seasonCardLabelSize={layout.cardLabelFontSize}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FigmaCircleBench({
  items,
  layout,
}: {
  items: SurveyRankingItem[];
  layout: FigmaCircleLayoutMetrics;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench" });

  return (
    <section
      className="mx-auto w-full px-1"
      style={{ maxWidth: `${layout.gridWidth}px`, marginTop: `${layout.benchMarginTop}px` }}
    >
      <div
        ref={setNodeRef}
        className={`rounded-[12px] border transition ${
          isOver ? "border-black/20 bg-black/5" : "border-black/10 bg-black/[0.02]"
        }`}
        style={{
          padding: `${layout.benchPaddingY}px ${layout.benchPaddingX}px`,
        }}
        aria-label="Unassigned cast members"
        data-testid="figma-circle-unassigned-bank"
      >
        <div
          className="flex overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible"
          style={{ gap: `${layout.benchGap}px` }}
        >
          {items.map((item) => (
            <div key={item.id} className="shrink-0">
              <Token item={item} size={layout.benchTokenSize} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FigmaRectangleRankingGrid({
  totalSlots,
  slotItems,
  activeId,
  onSlotClick,
  onRemoveItem,
  fontOverrides,
  layout,
}: {
  totalSlots: number;
  slotItems: (SurveyRankingItem | null)[];
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  fontOverrides: Required<FlashbackRankerFontOverrides>;
  layout: FigmaRectangleLayoutMetrics;
}) {
  return (
    <section
      className="mx-auto w-full px-1"
      style={{ maxWidth: `${layout.gridWidth}px` }}
      data-testid="figma-rectangle-grid-wrap"
    >
      <div
        className="grid justify-center"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, ${layout.slotWidth}px))`,
          columnGap: `${layout.gapX}px`,
          rowGap: `${layout.gapY}px`,
        }}
        data-columns={layout.columns}
        data-testid="figma-rectangle-grid"
      >
        {Array.from({ length: totalSlots }, (_, index) => (
          <GridSlot
            key={index}
            index={index}
            number={index + 1}
            item={slotItems[index] ?? null}
            activeId={activeId}
            onSlotClick={onSlotClick}
            onRemoveItem={onRemoveItem}
            preset="figma-rank-rectangles"
            fontOverrides={fontOverrides}
            rectangleLayout={layout}
          />
        ))}
      </div>
    </section>
  );
}

function FigmaRankingGrid({
  totalSlots,
  slotItems,
  activeId,
  onSlotClick,
  onRemoveItem,
  fontOverrides,
  layout,
}: {
  totalSlots: number;
  slotItems: (SurveyRankingItem | null)[];
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  fontOverrides: Required<FlashbackRankerFontOverrides>;
  layout: FigmaCircleLayoutMetrics;
}) {
  return (
    <section
      className="mx-auto w-full overflow-hidden px-1"
      style={{ maxWidth: `${layout.gridWidth}px` }}
      data-testid="figma-rank-grid-wrap"
    >
      <div
        className="grid justify-center"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, ${layout.slotSize}px))`,
          columnGap: `${layout.gapX}px`,
          rowGap: `${layout.gapY}px`,
        }}
        data-columns={layout.columns}
        data-testid="figma-rank-grid"
      >
        {Array.from({ length: totalSlots }, (_, index) => (
          <GridSlot
            key={index}
            index={index}
            number={index + 1}
            item={slotItems[index] ?? null}
            activeId={activeId}
            onSlotClick={onSlotClick}
            onRemoveItem={onRemoveItem}
            preset="figma-rank-circles"
            fontOverrides={fontOverrides}
            circleLayout={layout}
          />
        ))}
      </div>
    </section>
  );
}

function RankingGrid({
  totalSlots,
  slotItems,
  activeId,
  onSlotClick,
  onRemoveItem,
  shapeScaleFactor,
  buttonScaleFactor,
}: {
  totalSlots: number;
  slotItems: (SurveyRankingItem | null)[];
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  shapeScaleFactor: number;
  buttonScaleFactor: number;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-6">
        {Array.from({ length: totalSlots }, (_, index) => (
          <GridSlot
            key={index}
            index={index}
            number={index + 1}
            item={slotItems[index] ?? null}
            activeId={activeId}
            onSlotClick={onSlotClick}
            onRemoveItem={onRemoveItem}
            shapeScaleFactor={shapeScaleFactor}
            buttonScaleFactor={buttonScaleFactor}
          />
        ))}
      </div>
    </div>
  );
}

function RankingLine({
  items,
  labelTop,
  labelBottom,
  activeId,
  metrics,
}: {
  items: SurveyRankingItem[];
  labelTop: string;
  labelBottom: string;
  activeId: string | null;
  metrics: LineMetrics;
}) {
  const { slotHeight, tokenSize } = metrics;

  return (
    <div className="my-10 flex w-full justify-center px-4">
      <div className="w-full max-w-[420px] rounded-3xl border border-gray-200 bg-white/70 px-6 py-8 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-600">{labelTop}</div>
          <div className="relative mt-4 flex min-h-[400px] max-h-[600px] w-full max-w-[260px] justify-center overflow-hidden">
            <div className="absolute inset-0 mx-auto w-1 rounded-full bg-gray-300" />
            <div className="relative z-10 flex h-full w-full flex-col items-center py-8">
              <Slot index={0} height={slotHeight} />
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <div className="flex items-center justify-center">
                    <Token item={item} asPlaceholder={activeId === item.id} size={tokenSize} />
                  </div>
                  <Slot index={index + 1} height={slotHeight} />
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="mt-4 text-sm font-semibold uppercase tracking-wide text-gray-600">{labelBottom}</div>
        </div>
      </div>
    </div>
  );
}

function Token({
  item,
  dragging = false,
  overlay = false,
  asPlaceholder = false,
  size = TOKEN_BASE_SIZE,
  variant = "circle",
  seasonCardLabelFontFamily = DEFAULT_CARD_LABEL_FONT,
  seasonCardLabelSize,
}: {
  item: SurveyRankingItem;
  dragging?: boolean;
  overlay?: boolean;
  asPlaceholder?: boolean;
  size?: SeasonCardSize;
  variant?: TokenVariant;
  seasonCardLabelFontFamily?: string;
  seasonCardLabelSize?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: asPlaceholder || overlay,
  });

  if (asPlaceholder) {
    if (variant === "season-card") {
      const placeholderStyle = resolveSeasonCardStyle(size);
      return <div className="rounded-[9px] bg-gray-200 opacity-60" aria-hidden style={placeholderStyle} />;
    }
    return <div className="rounded-full bg-gray-200 opacity-60" aria-hidden style={{ width: size, height: size }} />;
  }

  if (variant === "season-card") {
    const seasonCardStyle = resolveSeasonCardStyle(size);
    const style: React.CSSProperties | undefined = transform
      ? { ...seasonCardStyle, transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : seasonCardStyle;
    const state = dragging || isDragging ? "ring-2 ring-white scale-[1.02]" : "hover:ring-2 hover:ring-white/60";
    const widthForImage = typeof seasonCardStyle.width === "number" ? seasonCardStyle.width : 512;
    const heightForImage = typeof seasonCardStyle.height === "number" ? seasonCardStyle.height : 640;
    const resolvedLabelSize = Math.round(
      clampNumber(
        seasonCardLabelSize ?? (typeof seasonCardStyle.width === "number" ? seasonCardStyle.width * 0.145 : 24),
        14,
        30,
      ),
    );

    const contents = (
      <>
        {item.img ? (
          <Image
            src={item.img}
            alt={item.label}
            width={Math.max(1, Math.round(widthForImage))}
            height={Math.max(1, Math.round(heightForImage))}
            className="h-full w-full object-cover"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-[#D9D9D9]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-[16.4%] min-h-[34px] bg-[#ECECEC]">
          <div
            className="flex h-full items-center justify-center px-1 text-center text-black uppercase"
            style={{
              fontFamily: seasonCardLabelFontFamily,
              fontSize: `${resolvedLabelSize}px`,
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: "0.9",
            }}
          >
            {item.label}
          </div>
        </div>
      </>
    );

    if (overlay) {
      return (
        <div className={`relative overflow-hidden rounded-[9px] bg-[#D9D9D9] select-none touch-none shadow-sm ${state}`} style={style}>
          {contents}
        </div>
      );
    }

    return (
      <button
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${item.label}`}
        className={`relative overflow-hidden rounded-[9px] bg-[#D9D9D9] select-none touch-none shadow-sm ${state} focus:outline-none focus:ring-2 focus:ring-white`}
        type="button"
      >
        {contents}
      </button>
    );
  }

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, width: size, height: size }
    : { width: size, height: size };

  const base =
    "rounded-full overflow-hidden ring-2 ring-transparent transition shadow-sm bg-white select-none touch-none";
  const state = dragging || isDragging ? "ring-blue-600 scale-[1.05]" : "hover:ring-gray-300";
  const imageSize = typeof size === "number" ? Math.max(1, Math.round(size)) : 512;

  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-rose-200 text-xs font-bold uppercase text-rose-700">
      {item.label.split(" ").map((part) => part[0]).join("")}
    </div>
  );

  const image = item.img ? (
    <Image
      src={item.img}
      alt={item.label}
      width={imageSize}
      height={imageSize}
      className="h-full w-full object-cover"
      unoptimized
      draggable={false}
    />
  ) : (
    fallback
  );

  if (overlay) {
    return (
      <div className={`${base} ${state}`} style={style}>
        {image}
      </div>
    );
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${item.label}`}
      className={`${base} ${state} focus:outline-none focus:ring-blue-600`}
      type="button"
    >
      {image}
    </button>
  );
}

function resolveSeasonCardStyle(size: SeasonCardSize): React.CSSProperties {
  if (typeof size === "number") {
    return { width: size, height: Math.round(size * (257 / 205)) };
  }
  if (size === "fill") {
    return { width: "100%", height: "100%" };
  }
  return {
    width: size,
    aspectRatio: "205 / 257",
  };
}

function Slot({ index, height }: { index: number; height: number }) {
  const id = `slot-${index}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="relative flex w-28 items-center justify-center"
      style={{ height }}
      aria-label={`Insert position ${index + 1}`}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 transition ${
          isOver ? "border-blue-600 bg-blue-100" : "border-transparent bg-transparent"
        }`}
      />
    </div>
  );
}

function GridSlot({
  index,
  number,
  item,
  activeId,
  onSlotClick,
  onRemoveItem,
  preset = "legacy",
  fontOverrides,
  circleLayout,
  rectangleLayout,
  shapeScaleFactor = 1,
  buttonScaleFactor = 1,
}: {
  index: number;
  number: number;
  item: SurveyRankingItem | null;
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  preset?: FlashbackRankerLayoutPreset;
  fontOverrides?: Required<FlashbackRankerFontOverrides>;
  circleLayout?: FigmaCircleLayoutMetrics;
  rectangleLayout?: FigmaRectangleLayoutMetrics;
  shapeScaleFactor?: number;
  buttonScaleFactor?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` });
  const isActive = Boolean(item && item.id === activeId);
  const isFigmaPreset = preset === "figma-rank-circles";
  const isFigmaRectanglePreset = preset === "figma-rank-rectangles";
  const resolvedCircleLayout = circleLayout ?? computeFigmaCircleLayoutMetrics(390);
  const resolvedRectangleLayout = rectangleLayout ?? computeFigmaRectangleLayoutMetrics(390);
  const legacyCircleSize = Math.round(clampNumber(GRID_CIRCLE_SIZE * shapeScaleFactor, 54, 188));
  const legacyTokenSize = Math.round(clampNumber(GRID_TOKEN_SIZE * shapeScaleFactor, 36, legacyCircleSize - 10));
  const legacyRemoveButtonSize = Math.round(clampNumber(24 * buttonScaleFactor, 18, 44));
  const legacyRemoveOffset = Math.round(clampNumber(4 * buttonScaleFactor, 2, 10));
  const legacyRemoveFontSize = Math.round(clampNumber(12 * buttonScaleFactor, 10, 20));
  const legacyNumberSize = Math.round(clampNumber(30 * buttonScaleFactor, 16, 50));

  if (isFigmaPreset) {
    return (
      <div
        ref={setNodeRef}
        className="relative flex min-w-0 flex-col items-center"
        style={{ width: `${resolvedCircleLayout.slotSize}px` }}
      >
        <span
          className="font-bold leading-none text-black"
          style={{
            fontFamily: fontOverrides?.rankNumberFontFamily ?? DEFAULT_RANK_NUMBER_FONT,
            letterSpacing: "0.01em",
            fontSize: `${resolvedCircleLayout.rankNumberSize}px`,
            marginBottom: `${resolvedCircleLayout.rankNumberMarginBottom}px`,
          }}
        >
          {number}
        </span>
        <div
          className={`relative flex aspect-square w-full items-center justify-center rounded-full transition ${
            isOver || isActive ? "ring-4 ring-black/20" : ""
          } ${item ? "bg-black/5" : "bg-black"}`}
          style={{ width: `${resolvedCircleLayout.slotSize}px` }}
        >
          {item ? (
            <>
              <Token item={item} size={resolvedCircleLayout.tokenSize} />
              <button
                type="button"
                onClick={() => onRemoveItem?.(item)}
                className="absolute inline-flex items-center justify-center rounded-full bg-white font-bold text-black shadow ring-1 ring-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                style={{
                  width: `${resolvedCircleLayout.removeButtonSize}px`,
                  height: `${resolvedCircleLayout.removeButtonSize}px`,
                  top: `-${resolvedCircleLayout.removeButtonOffset}px`,
                  right: `-${resolvedCircleLayout.removeButtonOffset}px`,
                  fontSize: `${resolvedCircleLayout.removeButtonFontSize}px`,
                }}
                aria-label={`Remove ${item.label} from rank ${number}`}
              >
                ×
              </button>
            </>
          ) : (
            <button
              type="button"
              className="absolute inset-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={(event) => onSlotClick?.(index, event.currentTarget.getBoundingClientRect())}
              aria-label={`Select cast member for rank ${number}`}
            />
          )}
        </div>
      </div>
    );
  }

  if (isFigmaRectanglePreset) {
    return (
      <div ref={setNodeRef} className="relative flex w-full min-w-0 flex-col items-center">
        <span
          className="font-bold leading-none text-white"
          style={{
            fontFamily: fontOverrides?.rankNumberFontFamily ?? DEFAULT_RANK_NUMBER_FONT,
            fontSize: `${resolvedRectangleLayout.rankNumberSize}px`,
            marginBottom: `${resolvedRectangleLayout.rankNumberMarginBottom}px`,
          }}
        >
          {number}
        </span>
        <div
          className={`relative aspect-[205/257] w-full rounded-[9px] transition ${
            isOver || isActive ? "ring-4 ring-white/30" : ""
          } ${item ? "bg-[#D9D9D9]" : "bg-[#D9D9D9]"}`}
        >
          {item ? (
            <>
              <Token
                item={item}
                variant="season-card"
                size="fill"
                seasonCardLabelFontFamily={fontOverrides?.cardLabelFontFamily ?? DEFAULT_CARD_LABEL_FONT}
                seasonCardLabelSize={resolvedRectangleLayout.cardLabelFontSize}
              />
              <button
                type="button"
                onClick={() => onRemoveItem?.(item)}
                className="absolute inline-flex items-center justify-center rounded-full bg-white font-bold text-black shadow ring-1 ring-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  width: `${resolvedRectangleLayout.removeButtonSize}px`,
                  height: `${resolvedRectangleLayout.removeButtonSize}px`,
                  top: `-${resolvedRectangleLayout.removeButtonOffset}px`,
                  right: `-${resolvedRectangleLayout.removeButtonOffset}px`,
                  fontSize: `${resolvedRectangleLayout.removeButtonFontSize}px`,
                }}
                aria-label={`Remove ${item.label} from rank ${number}`}
              >
                ×
              </button>
            </>
          ) : (
            <button
              type="button"
              className="absolute inset-0 rounded-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={(event) => onSlotClick?.(index, event.currentTarget.getBoundingClientRect())}
              aria-label={`Select season for rank ${number}`}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className="relative flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center rounded-full border-2 bg-white shadow-lg transition ${
          isOver || isActive ? "border-[#5C0F4F]" : "border-transparent"
        }`}
        style={{ width: legacyCircleSize, height: legacyCircleSize }}
      >
        {item ? (
          <>
            <Token item={item} size={legacyTokenSize} />
            <button
              type="button"
              onClick={() => onRemoveItem?.(item)}
              className="absolute flex items-center justify-center rounded-full bg-white font-bold text-[#5C0F4F] shadow"
              style={{
                top: -legacyRemoveOffset,
                right: -legacyRemoveOffset,
                width: legacyRemoveButtonSize,
                height: legacyRemoveButtonSize,
                fontSize: `${legacyRemoveFontSize}px`,
              }}
              aria-label={`Remove ${item.label} from rank ${number}`}
            >
              ×
            </button>
          </>
        ) : (
          <span
            className="font-semibold text-[#5C0F4F]"
            style={{
              fontFamily: fontOverrides?.rankNumberFontFamily ?? DEFAULT_RANK_NUMBER_FONT,
              fontSize: `${legacyNumberSize}px`,
            }}
          >
            {number}
          </span>
        )}
        {!item && (
          <button
            type="button"
            className="absolute inset-0 rounded-full"
            onClick={(event) => onSlotClick?.(index, event.currentTarget.getBoundingClientRect())}
            aria-label={`Select cast member for rank ${number}`}
          />
        )}
      </div>
    </div>
  );
}

function SelectionPicker({
  open,
  items,
  onSelect,
  onClose,
  position,
  mobileSheet = false,
  forceMobileSheet = false,
  pickerVariant = "circle",
  title = "Pick a cast member",
  titleFontFamily = DEFAULT_PICKER_TITLE_FONT,
  itemFontFamily = DEFAULT_PICKER_ITEM_FONT,
  shapeScaleFactor = 1,
  buttonScaleFactor = 1,
}: {
  open: boolean;
  items: SurveyRankingItem[];
  onSelect?(item: SurveyRankingItem): void;
  onClose(): void;
  position: { top: number; left: number } | null;
  mobileSheet?: boolean;
  forceMobileSheet?: boolean;
  pickerVariant?: TokenVariant;
  title?: string;
  titleFontFamily?: string;
  itemFontFamily?: string;
  shapeScaleFactor?: number;
  buttonScaleFactor?: number;
}) {
  if (!open) return null;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const showMobileSheet = mobileSheet && (forceMobileSheet || (viewportWidth > 0 && viewportWidth < 640));
  const isSeasonPicker = pickerVariant === "season-card";
  const closeButtonSize = Math.round(clampNumber(36 * buttonScaleFactor, 28, 56));
  const pickerLabelFontSize = Math.round(clampNumber(12 * buttonScaleFactor, 10, 20));
  const pickerNameFontSize = Math.round(clampNumber(14 * buttonScaleFactor, 11, 22));
  const pickerRowMinHeight = Math.round(clampNumber(40 * buttonScaleFactor, 34, 84));
  const pickerGap = Math.round(clampNumber(10 * shapeScaleFactor, 6, 20));
  const seasonPickerCardSize = Math.round(clampNumber(84 * shapeScaleFactor, 60, 168));
  const avatarSizeMobile = Math.round(clampNumber(40 * shapeScaleFactor, 28, 86));
  const avatarSizeDesktop = Math.round(clampNumber(48 * shapeScaleFactor, 32, 94));

  if (showMobileSheet) {
    return (
      <div className="fixed inset-0 z-50 bg-black/35" onClick={onClose}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-black/10 bg-white px-3 pt-3 shadow-2xl sm:px-4 sm:pt-4"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          onClick={(event) => event.stopPropagation()}
          data-testid="selection-picker-mobile"
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />
          <div className="mb-3 flex items-center justify-between">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70 sm:text-xs sm:tracking-[0.24em]"
              style={{ fontFamily: titleFontFamily }}
            >
              {title}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full bg-black/5 font-bold text-black"
              style={{
                width: `${closeButtonSize}px`,
                height: `${closeButtonSize}px`,
                fontSize: `${Math.round(clampNumber(16 * buttonScaleFactor, 12, 24))}px`,
              }}
              aria-label="Close picker"
            >
              ×
            </button>
          </div>
          {items.length === 0 ? (
            <p className="pb-3 text-sm text-gray-600">
              {isSeasonPicker
                ? "Everything is placed. Drag a ranked card back out to swap in another season."
                : "Everyone is placed. Drag a portrait out to swap someone else in."}
            </p>
          ) : (
            <div
              className={`grid max-h-[60vh] gap-2.5 overflow-y-auto pb-1 ${
                isSeasonPicker ? "grid-cols-1" : "grid-cols-2"
              }`}
              style={{ gap: `${pickerGap}px` }}
            >
              {items.map((item) => (
                isSeasonPicker ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect?.(item)}
                    className="flex items-center rounded-2xl border border-black/10 bg-white px-2 py-2 text-left shadow-sm transition hover:border-black/40"
                    style={{ minHeight: `${pickerRowMinHeight}px`, gap: `${pickerGap}px` }}
                  >
                    <Token
                      item={item}
                      variant="season-card"
                      size={seasonPickerCardSize}
                      overlay
                      seasonCardLabelFontFamily={itemFontFamily}
                    />
                    <span
                      className="font-semibold text-black"
                      style={{ fontFamily: itemFontFamily, fontSize: `${pickerNameFontSize}px` }}
                    >
                      {item.label}
                    </span>
                  </button>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect?.(item)}
                    className="flex items-center rounded-2xl border border-black/10 bg-white px-2 py-2 text-left shadow-sm transition hover:border-black/40"
                    style={{ minHeight: `${pickerRowMinHeight}px`, gap: `${pickerGap}px` }}
                  >
                    <span
                      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-black"
                      style={{ width: `${avatarSizeMobile}px`, height: `${avatarSizeMobile}px` }}
                    >
                      {item.img ? (
                        <Image
                          src={item.img}
                          alt={item.label}
                          width={avatarSizeMobile}
                          height={avatarSizeMobile}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span
                          className="font-semibold text-white"
                          style={{ fontSize: `${Math.round(clampNumber(13 * buttonScaleFactor, 10, 20))}px` }}
                        >
                          {item.label.slice(0, 2)}
                        </span>
                      )}
                    </span>
                    <span
                      className="font-semibold text-black"
                      style={{ fontFamily: itemFontFamily, fontSize: `${pickerNameFontSize}px` }}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!position) return null;
  const cardWidth = viewportWidth ? Math.min(320, Math.max(240, viewportWidth * 0.9)) : 320;
  const rows = Math.ceil(items.length / 2);
  const estimatedHeight = Math.max(160, Math.min(360, rows * 72 + 80));
  const halfWidth = cardWidth / 2;
  const centeredLeft =
    viewportWidth && viewportWidth > 0
      ? Math.min(viewportWidth - 16 - halfWidth, Math.max(16 + halfWidth, position.left))
      : position.left;
  const left = centeredLeft - halfWidth;
  const topLimit = viewportHeight ? viewportHeight - 120 : undefined;
  const top =
    viewportHeight && topLimit
      ? Math.min(topLimit, Math.max(16, position.top))
      : position.top;
  return (
    <div className="fixed inset-0 z-50 bg-transparent" onClick={onClose}>
      <div
        className="absolute z-50 rounded-2xl border border-[#5C0F4F]/20 bg-white p-4 shadow-2xl"
        style={{
          top,
          left,
          width: cardWidth,
          height: estimatedHeight,
          maxHeight: viewportHeight ? Math.min(estimatedHeight, viewportHeight - 32) : estimatedHeight,
          overflowY: items.length > 4 ? "auto" : "hidden",
        }}
        onClick={(event) => event.stopPropagation()}
        data-testid="selection-picker-popover"
      >
        <div className="mb-3 flex items-center justify-between">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.35em] ${
              isSeasonPicker ? "text-black/75" : "text-[#5C0F4F]/70"
            }`}
            style={{ fontFamily: titleFontFamily, fontSize: `${pickerLabelFontSize}px` }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center justify-center rounded-full font-bold ${
              isSeasonPicker ? "bg-black/10 text-black" : "bg-[#5C0F4F]/10 text-[#5C0F4F]"
            }`}
            style={{
              width: `${Math.round(clampNumber(28 * buttonScaleFactor, 22, 46))}px`,
              height: `${Math.round(clampNumber(28 * buttonScaleFactor, 22, 46))}px`,
              fontSize: `${Math.round(clampNumber(14 * buttonScaleFactor, 10, 22))}px`,
            }}
            aria-label="Close picker"
          >
            ×
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            {isSeasonPicker
              ? "Everything is placed. Drag a ranked card back out to swap in another season."
              : "Everyone is placed. Drag a portrait out to swap someone else in."}
          </p>
        ) : (
          <div className={`grid gap-3 ${isSeasonPicker ? "grid-cols-1" : "grid-cols-2"}`}>
            {items.map((item) => (
              isSeasonPicker ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className="flex items-center rounded-xl border border-black/15 bg-white p-2 text-left shadow-sm transition hover:border-black/60"
                  style={{ gap: `${pickerGap}px`, minHeight: `${pickerRowMinHeight}px` }}
                >
                  <Token
                    item={item}
                    variant="season-card"
                    size={Math.round(clampNumber(86 * shapeScaleFactor, 62, 172))}
                    overlay
                    seasonCardLabelFontFamily={itemFontFamily}
                  />
                  <span
                    className="font-semibold text-black"
                    style={{ fontFamily: itemFontFamily, fontSize: `${pickerNameFontSize}px` }}
                  >
                    {item.label}
                  </span>
                </button>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect?.(item)}
                  className="flex items-center rounded-xl border border-[#5C0F4F]/10 bg-white p-2 text-left shadow-sm transition hover:border-[#5C0F4F]/60"
                  style={{ gap: `${pickerGap}px`, minHeight: `${pickerRowMinHeight}px` }}
                >
                  <span
                    className="flex items-center justify-center overflow-hidden rounded-full bg-[#FDF5FB]"
                    style={{ width: `${avatarSizeDesktop}px`, height: `${avatarSizeDesktop}px` }}
                  >
                    {item.img ? (
                      <Image
                        src={item.img}
                        alt={item.label}
                        width={avatarSizeDesktop}
                        height={avatarSizeDesktop}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span
                        className="font-semibold text-[#5C0F4F]"
                        style={{ fontSize: `${Math.round(clampNumber(13 * buttonScaleFactor, 10, 20))}px` }}
                      >
                        {item.label.slice(0, 2)}
                      </span>
                    )}
                  </span>
                  <span
                    className="font-semibold text-[#5C0F4F]"
                    style={{ fontFamily: itemFontFamily, fontSize: `${pickerNameFontSize}px` }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function computeFigmaCircleLayoutMetrics(
  containerWidth: number,
  shapeScaleFactor = 1,
  buttonScaleFactor = 1,
): FigmaCircleLayoutMetrics {
  const clampedContainerWidth = clampNumber(containerWidth, 280, FIGMA_GRID_MAX_WIDTH);
  const columns: 2 | 4 = clampedContainerWidth < 560 ? 2 : 4;
  const horizontalScale = clampNumber((clampedContainerWidth - 280) / 428, 0, 1);
  const gapX = Math.round(
    columns === 2
      ? interpolate(8, 16, horizontalScale)
      : interpolate(16, 26, horizontalScale),
  );
  const gapY = Math.round(
    columns === 2
      ? interpolate(16, 34, horizontalScale)
      : interpolate(28, 54, horizontalScale),
  );
  const available = clampedContainerWidth - gapX * (columns - 1);
  const baseSlotSize = clampNumber(
    available / columns,
    columns === 2 ? 82 : 112,
    columns === 2 ? 136 : 156,
  );
  const maxSlotByContainer = Math.max(52, Math.floor(available / columns));
  const slotSize = Math.round(clampNumber(
    baseSlotSize * shapeScaleFactor,
    columns === 2 ? 56 : 80,
    maxSlotByContainer,
  ));
  const tokenInset = clampNumber(slotSize * 0.07, 6, 14);
  const tokenSize = Math.round(clampNumber(slotSize - tokenInset * 2, 48, 170));
  const benchTokenSize = Math.round(clampNumber(tokenSize * 0.74, 36, Math.max(36, tokenSize - 8)));
  const benchGap = Math.round(clampNumber(interpolate(8, 14, horizontalScale) * shapeScaleFactor, 6, 22));
  const benchMarginTop = Math.round(interpolate(14, 22, horizontalScale));
  const benchPaddingY = Math.round(interpolate(6, 10, horizontalScale));
  const benchPaddingX = Math.round(interpolate(4, 8, horizontalScale));
  const rankNumberSize = Math.round(clampNumber(slotSize * 0.16 * buttonScaleFactor, 12, 32));
  const rankNumberMarginBottom = Math.round(clampNumber(slotSize * 0.08, 5, 12));
  const removeButtonSize = Math.round(clampNumber(slotSize * 0.27 * buttonScaleFactor, 18, 52));
  const removeButtonOffset = Math.round(clampNumber(removeButtonSize * 0.22, 3, 12));
  const removeButtonFontSize = Math.round(clampNumber(removeButtonSize * 0.48, 10, 24));
  const overlaySize = Math.round(clampNumber(tokenSize + 16 * shapeScaleFactor, 70, 198));

  return {
    containerWidth: clampedContainerWidth,
    gridWidth: clampedContainerWidth,
    columns,
    gapX,
    gapY,
    slotSize,
    tokenSize,
    benchTokenSize,
    benchGap,
    benchMarginTop,
    benchPaddingY,
    benchPaddingX,
    rankNumberSize,
    rankNumberMarginBottom,
    removeButtonSize,
    removeButtonOffset,
    removeButtonFontSize,
    overlaySize,
  };
}

function computeFigmaRectangleLayoutMetrics(
  containerWidth: number,
  shapeScaleFactor = 1,
  buttonScaleFactor = 1,
): FigmaRectangleLayoutMetrics {
  const frameWidth = clampNumber(containerWidth, 280, 920);
  const horizontalScale = clampNumber((frameWidth - 280) / 640, 0, 1);
  const framePaddingX = Math.round(interpolate(10, 24, horizontalScale));
  const framePaddingY = Math.round(interpolate(12, 24, horizontalScale));
  const gridWidth = clampNumber(frameWidth - framePaddingX * 2 - 4, 220, FIGMA_RECT_GRID_MAX_WIDTH);
  const columns: 2 | 3 = gridWidth < 560 ? 2 : 3;
  const gapX = Math.round(columns === 2 ? interpolate(8, 12, horizontalScale) : interpolate(9, 16, horizontalScale));
  const gapY = Math.round(interpolate(14, 24, horizontalScale));
  const baseSlotWidth = clampNumber((gridWidth - gapX * (columns - 1)) / columns, 88, 204);
  const maxSlotWidthByGrid = Math.max(72, Math.floor((gridWidth - gapX * (columns - 1)) / columns));
  const slotWidth = Math.round(clampNumber(baseSlotWidth * shapeScaleFactor, 72, maxSlotWidthByGrid));
  const rankNumberSize = Math.round(clampNumber(slotWidth * 0.16 * buttonScaleFactor, 12, 30));
  const rankNumberMarginBottom = Math.round(clampNumber(slotWidth * 0.07, 4, 10));
  const removeButtonSize = Math.round(clampNumber(slotWidth * 0.2 * buttonScaleFactor, 18, 44));
  const removeButtonOffset = Math.round(clampNumber(removeButtonSize * 0.22, 3, 10));
  const removeButtonFontSize = Math.round(clampNumber(removeButtonSize * 0.5, 10, 22));
  const overlaySize = Math.round(clampNumber(slotWidth * 1.05, 106, 240));
  const trayCardWidth = Math.round(clampNumber(slotWidth * (columns === 2 ? 0.78 : 0.84), 72, 188));
  const trayGap = Math.round(interpolate(8, 12, horizontalScale));
  const trayMarginTop = Math.round(interpolate(14, 24, horizontalScale));
  const trayLabelFontSize = Math.round(clampNumber(interpolate(10, 12, horizontalScale) * buttonScaleFactor, 8, 18));
  const trayLabelTracking = interpolate(0.2, 0.24, horizontalScale);
  const trayPaddingX = Math.round(interpolate(10, 16, horizontalScale));
  const trayPaddingY = Math.round(interpolate(10, 12, horizontalScale));
  const trayWrap = columns === 3;
  const cardLabelFontSize = Math.round(clampNumber(slotWidth * 0.145 * buttonScaleFactor, 12, 34));

  return {
    containerWidth: frameWidth,
    frameWidth,
    framePaddingX,
    framePaddingY,
    gridWidth,
    columns,
    gapX,
    gapY,
    slotWidth,
    rankNumberSize,
    rankNumberMarginBottom,
    removeButtonSize,
    removeButtonOffset,
    removeButtonFontSize,
    overlaySize,
    trayCardWidth,
    trayGap,
    trayMarginTop,
    trayLabelFontSize,
    trayLabelTracking,
    trayPaddingX,
    trayPaddingY,
    trayWrap,
    cardLabelFontSize,
  };
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full max-w-[600px] overflow-hidden rounded-full bg-gray-200">
      <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function computeLineMetrics(count: number): LineMetrics {
  if (count <= 0) {
    return { slotHeight: MAX_SLOT_HEIGHT, tokenSize: TOKEN_BASE_SIZE };
  }

  const slotCount = count + 1;
  const available = LINE_MAX_HEIGHT - LINE_VERTICAL_PADDING * 2;

  const maxTokenSizeWithMinSlots = Math.floor((available - slotCount * MIN_SLOT_HEIGHT) / count);
  const tokenSize = Math.max(
    TOKEN_MIN_SIZE,
    Math.min(TOKEN_BASE_SIZE, maxTokenSizeWithMinSlots),
  );

  const usedByTokens = count * tokenSize;
  const remaining = Math.max(0, available - usedByTokens);
  const slotHeight = Math.max(
    MIN_SLOT_HEIGHT,
    Math.min(MAX_SLOT_HEIGHT, Math.floor(remaining / slotCount)),
  );

  return { slotHeight, tokenSize };
}

function areLinesEqual(
  a: SurveyRankingItem[] | null,
  b: SurveyRankingItem[] | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}
