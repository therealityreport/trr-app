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
import type { SurveyRankingItem } from "@/lib/surveys/types";

export interface FlashbackRankerProps {
  items: SurveyRankingItem[];
  initialRankingIds?: string[];
  lineLabelTop?: string;
  lineLabelBottom?: string;
  onChange?(ranking: SurveyRankingItem[]): void;
}

export default function FlashbackRanker({
  items,
  initialRankingIds = [],
  lineLabelTop = "BEST",
  lineLabelBottom = "WORST",
  onChange,
}: FlashbackRankerProps) {
  const itemMap = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const [bench, setBench] = React.useState<SurveyRankingItem[]>(items);
  const [line, setLine] = React.useState<SurveyRankingItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [previewLine, setPreviewLine] = React.useState<SurveyRankingItem[] | null>(null);

  React.useEffect(() => {
    const initialLine = initialRankingIds
      .map((id) => itemMap.get(id))
      .filter((item): item is SurveyRankingItem => Boolean(item));
    const initialBench = items.filter((item) => !initialRankingIds.includes(item.id));
    setLine(initialLine);
    setBench(initialBench);
  }, [initialRankingIds, itemMap, items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const total = items.length;
  const placed = line.length;
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

  const insertAt = React.useCallback(
    (index: number, item: SurveyRankingItem) => {
      const next = buildLineWithItem(line, item, index);
      setLine(next);
      setBench((prev) => prev.filter((entry) => entry.id !== item.id));
      onChange?.(next);
    },
    [buildLineWithItem, line, onChange],
  );

  const moveBackToBench = React.useCallback(
    (item: SurveyRankingItem) => {
      setLine((prev) => {
        const next = prev.filter((entry) => entry.id !== item.id);
        onChange?.(next);
        return next;
      });
      setBench((prev) => {
        if (prev.some((entry) => entry.id === item.id)) return prev;
        const next = [...prev, item];
        next.sort((a, b) => items.findIndex((x) => x.id === a.id) - items.findIndex((x) => x.id === b.id));
        return next;
      });
    },
    [items, onChange],
  );

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setPreviewLine(line);
  }, [line]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { over, active } = event;
      setActiveId(null);
      setPreviewLine(null);
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
    [insertAt, itemMap, moveBackToBench],
  );

  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { over, active } = event;
      if (!over || !active) {
        setPreviewLine(null);
        return;
      }

      const activeKey = active.id as string;
      const overId = over.id as string;
      const item = itemMap.get(activeKey);
      if (!item) {
        setPreviewLine(null);
        return;
      }

      if (overId === "bench") {
        if (line.some((entry) => entry.id === activeKey)) {
          setPreviewLine(line.filter((entry) => entry.id !== activeKey));
        } else {
          setPreviewLine(line);
        }
        return;
      }

      if (overId.startsWith("slot-")) {
        const index = Number.parseInt(overId.split("-")[1] ?? "0", 10);
        const next = buildLineWithItem(line, item, index);
        setPreviewLine(next);
        return;
      }

      setPreviewLine(null);
    },
    [buildLineWithItem, itemMap, line],
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto">
      <div className="flex items-center justify-center sm:justify-between gap-4 px-4 py-3">
        <div className="text-sm font-semibold text-gray-600">{donePct}% Done</div>
        <Progress value={donePct} />
        <div className="text-sm font-semibold text-gray-600">100%</div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        <Bench items={bench} />
        <RankingLine items={previewLine ?? line} labelTop={lineLabelTop} labelBottom={lineLabelBottom} activeId={activeId} />
        <DragOverlay dropAnimation={null}>{activeItem ? <Token item={activeItem} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Bench({ items }: { items: SurveyRankingItem[] }) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div className="px-4">
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

function RankingLine({
  items,
  labelTop,
  labelBottom,
  activeId,
}: {
  items: SurveyRankingItem[];
  labelTop: string;
  labelBottom: string;
  activeId: string | null;
}) {
  return (
    <div className="relative my-8">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-black">{labelTop}</div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-black">{labelBottom}</div>

      <div className="mx-auto h-[64vh] max-h-[620px] min-h-[400px] w-1 bg-gray-300" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <Slot index={0} />
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <Token item={item} asPlaceholder={activeId === item.id} />
              <Slot index={index + 1} />
            </React.Fragment>
          ))}
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
}: {
  item: SurveyRankingItem;
  dragging?: boolean;
  overlay?: boolean;
  asPlaceholder?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: asPlaceholder,
  });

  if (asPlaceholder) {
    return <div className="size-20 rounded-full bg-gray-200 opacity-60" aria-hidden />;
  }

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const base =
    "size-16 sm:size-20 rounded-full overflow-hidden ring-2 ring-transparent transition shadow-sm bg-white select-none touch-none";
  const state = dragging || isDragging ? "ring-blue-600 scale-[1.05]" : "hover:ring-gray-300";

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

function Slot({ index }: { index: number }) {
  const id = `slot-${index}`;
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="relative flex h-12 w-28 items-center justify-center" aria-label={`Insert position ${index + 1}`}>
      <div
        className={`h-5 w-5 rounded-full border-2 transition ${
          isOver ? "border-blue-600 bg-blue-100" : "border-transparent bg-transparent"
        }`}
      />
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
