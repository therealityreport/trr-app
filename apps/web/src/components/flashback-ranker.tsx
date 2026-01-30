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
const GRID_CIRCLE_SIZE = 96;
const GRID_TOKEN_SIZE = 72;

export interface FlashbackRankerProps {
  items: SurveyRankingItem[];
  initialRankingIds?: string[];
  lineLabelTop?: string;
  lineLabelBottom?: string;
  onChange?(ranking: SurveyRankingItem[]): void;
  variant?: "classic" | "grid";
}

type LineMetrics = { slotHeight: number; tokenSize: number };

export default function FlashbackRanker({
  items,
  initialRankingIds = [],
  lineLabelTop = "BEST",
  lineLabelBottom = "WORST",
  onChange,
  variant = "classic",
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
      <div className="flex items-center justify-center sm:justify-between gap-4 px-4 py-3">
        <div className="text-sm font-semibold text-gray-600">{donePct}% Done</div>
        <Progress value={donePct} />
        <div className="text-sm font-semibold text-gray-600">100%</div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        {isGridMode ? (
          <>
            <Bench items={benchItems} className="hidden sm:block" />
            <RankingGrid
              totalSlots={totalSlots}
              slotItems={slotItems}
              activeId={activeId}
              onSlotClick={handleSlotClick}
              onRemoveItem={handleSlotClear}
            />
            <SelectionPicker
              open={pickerSlotIndex !== null}
              onClose={closePicker}
              items={gridBench}
              onSelect={handlePickerSelect}
              position={pickerPosition}
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

function RankingGrid({
  totalSlots,
  slotItems,
  activeId,
  onSlotClick,
  onRemoveItem,
}: {
  totalSlots: number;
  slotItems: (SurveyRankingItem | null)[];
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
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
}: {
  item: SurveyRankingItem;
  dragging?: boolean;
  overlay?: boolean;
  asPlaceholder?: boolean;
  size?: number;
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

  const base =
    "rounded-full overflow-hidden ring-2 ring-transparent transition shadow-sm bg-white select-none touch-none";
  const state = dragging || isDragging ? "ring-blue-600 scale-[1.05]" : "hover:ring-gray-300";
  const imageSize = Math.max(1, Math.round(size));

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
}: {
  index: number;
  number: number;
  item: SurveyRankingItem | null;
  activeId: string | null;
  onSlotClick?(index: number, anchor?: DOMRect): void;
  onRemoveItem?(item: SurveyRankingItem): void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` });
  const isActive = Boolean(item && item.id === activeId);

  return (
    <div ref={setNodeRef} className="relative flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center rounded-full border-2 bg-white shadow-lg transition ${
          isOver || isActive ? "border-[#5C0F4F]" : "border-transparent"
        }`}
        style={{ width: GRID_CIRCLE_SIZE, height: GRID_CIRCLE_SIZE }}
      >
        {item ? (
          <>
            <Token item={item} size={GRID_TOKEN_SIZE} />
            <button
              type="button"
              onClick={() => onRemoveItem?.(item)}
              className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#5C0F4F] shadow"
              aria-label={`Remove ${item.label} from rank ${number}`}
            >
              ×
            </button>
          </>
        ) : (
          <span
            className="text-3xl font-semibold text-[#5C0F4F]"
            style={{ fontFamily: "var(--font-gloucester)" }}
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
}: {
  open: boolean;
  items: SurveyRankingItem[];
  onSelect?(item: SurveyRankingItem): void;
  onClose(): void;
  position: { top: number; left: number } | null;
}) {
  if (!open || !position) return null;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
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
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5C0F4F]/70">Pick a cast member</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5C0F4F]/10 text-sm font-bold text-[#5C0F4F]"
            aria-label="Close picker"
          >
            ×
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Everyone is placed. Drag a portrait out to swap someone else in.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item)}
                className="flex items-center gap-3 rounded-xl border border-[#5C0F4F]/10 bg-white p-2 text-left shadow-sm transition hover:border-[#5C0F4F]/60"
              >
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#FDF5FB]">
                  {item.img ? (
                    <Image
                      src={item.img}
                      alt={item.label}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#5C0F4F]">{item.label.slice(0, 2)}</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-[#5C0F4F]">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
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
