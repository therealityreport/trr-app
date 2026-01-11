"use client";

import * as React from "react";
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
import type { SurveyRankingItem, SurveyTheme } from "@/lib/surveys/types";
import { DEFAULT_SURVEY_THEME } from "@/lib/surveys/types";

const LINE_MAX_HEIGHT = 600;
const LINE_VERTICAL_PADDING = 32; // matches py-8 padding applied to the column wrapper
const TOKEN_BASE_SIZE = 80;
const TOKEN_MIN_SIZE = 44;
const MIN_SLOT_HEIGHT = 8;
const MAX_SLOT_HEIGHT = 64;
const GRID_CIRCLE_SIZE = 96;
const GRID_TOKEN_SIZE = 88; // Slightly smaller than circle for ring visibility

export interface FlashbackRankerProps {
  items: SurveyRankingItem[];
  initialRankingIds?: string[];
  initialRanking?: SurveyRankingItem[]; // Use this for grid variant to preserve positions
  lineLabelTop?: string;
  lineLabelBottom?: string;
  onChange?(ranking: SurveyRankingItem[]): void;
  variant?: "classic" | "grid";
  surveyTheme?: SurveyTheme;
}

type LineMetrics = { slotHeight: number; tokenSize: number };

export default function FlashbackRanker({
  items,
  initialRankingIds = [],
  initialRanking = [],
  lineLabelTop = "BEST",
  lineLabelBottom = "WORST",
  onChange,
  variant = "classic",
  surveyTheme = DEFAULT_SURVEY_THEME,
}: FlashbackRankerProps) {
  const isGridMode = variant === "grid";
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const syncedRankingRef = React.useRef<string[] | null>(null);

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
    // Use initialRanking if provided (has position data), otherwise fall back to initialRankingIds
    const usePositionData = isGridMode && initialRanking.length > 0;
    const incomingKey = usePositionData
      ? initialRanking.map((r) => `${r.id}:${r.position ?? 0}`).join("|")
      : initialRankingIds.join("|");
    const previousKey = syncedRankingRef.current ? syncedRankingRef.current.join("|") : null;
    if (previousKey !== null && incomingKey === previousKey) {
      return;
    }

    if (usePositionData) {
      // Grid mode with position data - place items in their exact slots
      const slotSeed: (SurveyRankingItem | null)[] = Array.from({ length: items.length }, () => null);
      const placedIds = new Set<string>();
      for (const item of initialRanking) {
        const pos = item.position ?? 0;
        if (pos >= 0 && pos < items.length) {
          const fullItem = itemMap.get(item.id);
          if (fullItem) {
            slotSeed[pos] = { ...fullItem, position: pos };
            placedIds.add(item.id);
          }
        }
      }
      const initialBench = items.filter((item) => !placedIds.has(item.id));
      setSlots(slotSeed);
      setBench(initialBench);
      setLine(slotSeed.filter((s): s is SurveyRankingItem => Boolean(s)));
      syncedRankingRef.current = initialRanking.map((r) => `${r.id}:${r.position ?? 0}`);
    } else {
      // Classic mode or no position data - use ordered array
      const initialLine = initialRankingIds
        .map((id) => itemMap.get(id))
        .filter((item): item is SurveyRankingItem => Boolean(item));
      const initialBench = items.filter((item) => !initialRankingIds.includes(item.id));
      const slotSeed = Array.from({ length: items.length }, (_, index) => initialLine[index] ?? null);
      setLine(initialLine);
      setBench(initialBench);
      setSlots(slotSeed);
      syncedRankingRef.current = initialLine.map((item) => item.id);
    }
  }, [initialRankingIds, initialRanking, isGridMode, itemMap, items]);

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
    (payload: (SurveyRankingItem | null)[]): SurveyRankingItem[] => {
      const result: SurveyRankingItem[] = [];
      payload.forEach((entry, index) => {
        if (entry) {
          result.push({ ...entry, position: index });
        }
      });
      return result;
    },
    [],
  );

  const emitChange = React.useCallback(
    (next: SurveyRankingItem[]) => {
      onChange?.(next);
      syncedRankingRef.current = next.map((item) => `${item.id}:${item.position ?? 0}`);
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
        next[index] = { ...item, position: index };
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
  const activeIsOnLine = React.useMemo(
    () => lineItems.some((entry) => entry.id === activeId),
    [activeId, lineItems],
  );
  const activeOverlaySize = isGridMode ? GRID_TOKEN_SIZE : activeIsOnLine ? lineMetrics.tokenSize : TOKEN_BASE_SIZE;
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
    <div className="w-full max-w-[1440px] mx-auto">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        {isGridMode ? (
          <>
            <RankingGrid
              totalSlots={totalSlots}
              slotItems={slotItems}
              activeId={activeId}
              onSlotClick={handleSlotClick}
              onRemoveItem={handleSlotClear}
              surveyTheme={surveyTheme}
            />
            {benchItems.length > 0 && <Bench items={benchItems} surveyTheme={surveyTheme} />}
            <SelectionPicker
              open={pickerSlotIndex !== null}
              onClose={closePicker}
              items={gridBench}
              onSelect={handlePickerSelect}
              position={pickerPosition}
              surveyTheme={surveyTheme}
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
          {activeItem ? <Token item={activeItem} overlay size={activeOverlaySize} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Bench({
  items,
  className = "",
  surveyTheme = DEFAULT_SURVEY_THEME,
}: {
  items: SurveyRankingItem[];
  className?: string;
  surveyTheme?: SurveyTheme;
}) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div className={`px-4 ${className}`}>
      <div
        ref={setNodeRef}
        className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 py-4 px-4 rounded-2xl"
        style={{ backgroundColor: surveyTheme.benchBg }}
        aria-label="Drag from here"
      >
        {items.map((item) => (
          <Token key={item.id} item={item} surveyTheme={surveyTheme} />
        ))}
      </div>
    </div>
  );
}

function RankingGrid({
  totalSlots,
  slotItems,
  activeId,
  onSlotClick,
  onRemoveItem,
  surveyTheme = DEFAULT_SURVEY_THEME,
}: {
  totalSlots: number;
  slotItems: (SurveyRankingItem | null)[];
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  surveyTheme?: SurveyTheme;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-2 sm:px-6 py-4 sm:py-6">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-6">
        {Array.from({ length: totalSlots }, (_, index) => (
          <GridSlot
            key={index}
            index={index}
            number={index + 1}
            item={slotItems[index] ?? null}
            activeId={activeId}
            onSlotClick={onSlotClick}
            onRemoveItem={onRemoveItem}
            surveyTheme={surveyTheme}
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
  surveyTheme = DEFAULT_SURVEY_THEME,
}: {
  item: SurveyRankingItem;
  dragging?: boolean;
  overlay?: boolean;
  asPlaceholder?: boolean;
  size?: number;
  surveyTheme?: SurveyTheme;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: asPlaceholder,
  });

  if (asPlaceholder) {
    return <div className="rounded-full bg-gray-200 opacity-60" aria-hidden style={{ width: size, height: size }} />;
  }

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, width: size, height: size }
    : { width: size, height: size };

  const ringColor = dragging || isDragging ? surveyTheme.slotActiveBorder : surveyTheme.benchTokenRing;

  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-rose-200 text-xs font-bold uppercase text-rose-700">
      {item.label.split(" ").map((part) => part[0]).join("")}
    </div>
  );

  const image = item.img ? (
    <img src={item.img} alt={item.label} className="h-full w-full object-cover" draggable={false} />
  ) : (
    fallback
  );

  const baseStyle: React.CSSProperties = {
    ...style,
    backgroundColor: surveyTheme.slotBg,
    boxShadow: `0 0 0 2px ${ringColor}`,
  };

  if (overlay) {
    return (
      <div
        className="rounded-full overflow-hidden transition shadow-sm select-none touch-none"
        style={baseStyle}
      >
        {image}
      </div>
    );
  }

  return (
    <button
      ref={setNodeRef}
      style={baseStyle}
      {...listeners}
      {...attributes}
      aria-label={`Drag ${item.label}`}
      className="rounded-full overflow-hidden transition shadow-sm select-none touch-none focus:outline-none"
      type="button"
    >
      {image}
    </button>
  );
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
  surveyTheme = DEFAULT_SURVEY_THEME,
}: {
  index: number;
  number: number;
  item: SurveyRankingItem | null;
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
  surveyTheme?: SurveyTheme;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` });
  const isActive = Boolean(item && item.id === activeId);

  return (
    <div ref={setNodeRef} className="relative flex flex-col items-center justify-center">
      <div
        className="relative aspect-square w-full max-w-[96px] flex items-center justify-center rounded-full border-2 shadow-lg transition"
        style={{
          backgroundColor: surveyTheme.slotBg,
          borderColor: isOver || isActive ? surveyTheme.slotActiveBorder : surveyTheme.slotBorder,
        }}
      >
        {item ? (
          <>
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {item.img ? (
                <img src={item.img} alt={item.label} className="h-full w-full object-cover" draggable={false} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-rose-200 text-xs font-bold uppercase text-rose-700">
                  {item.label.split(" ").map((part) => part[0]).join("")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem?.(item)}
              className="absolute -top-1 -right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full shadow text-xs font-bold"
              style={{
                backgroundColor: surveyTheme.slotBg,
                color: surveyTheme.slotActiveBorder,
              }}
              aria-label={`Remove ${item.label} from rank ${number}`}
            >
              ×
            </button>
          </>
        ) : (
          <span
            className="text-2xl sm:text-4xl font-extrabold"
            style={{
              fontFamily: surveyTheme.slotNumberFont,
              color: surveyTheme.slotNumberColor,
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
  surveyTheme = DEFAULT_SURVEY_THEME,
}: {
  open: boolean;
  items: SurveyRankingItem[];
  onSelect?(item: SurveyRankingItem): void;
  onClose(): void;
  position: { top: number; left: number } | null;
  surveyTheme?: SurveyTheme;
}) {
  if (!open || !position) return null;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const cardWidth = viewportWidth ? Math.min(360, Math.max(280, viewportWidth * 0.9)) : 360;
  const rows = Math.ceil(items.length / 4);
  const estimatedHeight = Math.max(180, Math.min(400, rows * 100 + 100));
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
    <div className="fixed inset-0 z-50 bg-black/20" onClick={onClose}>
      <div
        className="absolute z-50 rounded-2xl p-3 shadow-2xl"
        style={{
          top,
          left,
          width: cardWidth,
          maxHeight: viewportHeight ? Math.min(estimatedHeight, viewportHeight - 32) : estimatedHeight,
          overflowY: items.length > 8 ? "auto" : "hidden",
          backgroundColor: surveyTheme.benchBg,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center text-lg font-bold"
          style={{ color: surveyTheme.pageText }}
          aria-label="Close picker"
        >
          ×
        </button>
        {items.length === 0 ? (
          <p className="text-sm text-center pt-4" style={{ color: surveyTheme.resetText }}>
            Everyone is placed. Tap a portrait to swap someone else in.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item)}
                className="rounded-full overflow-hidden transition shadow-sm select-none touch-none focus:outline-none hover:scale-105"
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: surveyTheme.slotBg,
                  boxShadow: `0 0 0 2px ${surveyTheme.benchTokenRing}`,
                }}
                aria-label={`Select ${item.label}`}
              >
                {item.img ? (
                  <img src={item.img} alt={item.label} className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-rose-200 text-xs font-bold uppercase text-rose-700">
                    {item.label.split(" ").map((part) => part[0]).join("")}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Progress({ value, theme = "light" }: { value: number; theme?: "light" | "dark" }) {
  const isDark = theme === "dark";
  return (
    <div className={`h-2 w-full max-w-[600px] overflow-hidden rounded-full ${isDark ? "bg-white/20" : "bg-gray-200"}`}>
      <div className={`h-full transition-[width] ${isDark ? "bg-white" : "bg-blue-600"}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
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
