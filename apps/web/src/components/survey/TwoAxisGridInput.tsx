"use client";

import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { TwoAxisGridConfig, MatrixRow } from "@/lib/surveys/question-config-types";
import {
  coercePlacements,
  coordToPercent,
  fanOffset,
  getExtent,
  getSubjects,
  snapFromPointToCoord,
  snapFromRectCenterToCoord,
  type TwoAxisGridAnswer,
  type TwoAxisGridCoord,
} from "./twoAxisGridUtils";

export interface TwoAxisGridInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: TwoAxisGridAnswer | null;
  onChange: (value: TwoAxisGridAnswer) => void;
  disabled?: boolean;
}

function coordKey(coord: TwoAxisGridCoord): string {
  return `${coord.x},${coord.y}`;
}

function isInsideRect(x: number, y: number, rect: Pick<DOMRect, "left" | "top" | "width" | "height">): boolean {
  return x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;
}

function getLabelForX(x: number, config: TwoAxisGridConfig): string {
  const magnitude = Math.abs(x);
  if (x === 0) return "Neutral";
  if (x < 0) return `${config.xLabelLeft} ${magnitude}`;
  return `${config.xLabelRight} ${magnitude}`;
}

function getLabelForY(y: number, config: TwoAxisGridConfig): string {
  const magnitude = Math.abs(y);
  if (y === 0) return "Neutral";
  if (y < 0) return `${config.yLabelBottom} ${magnitude}`;
  return `${config.yLabelTop} ${magnitude}`;
}

function getCoordinateSummary(coord: TwoAxisGridCoord | null | undefined, config: TwoAxisGridConfig): string {
  if (!coord) return "Unplaced";
  const xText = getLabelForX(coord.x, config);
  const yText = getLabelForY(coord.y, config);
  return `${xText}, ${yText}`;
}

function computeStacking(subjects: MatrixRow[], placements: TwoAxisGridAnswer) {
  const byCoord = new Map<string, string[]>();
  for (const s of subjects) {
    const coord = placements[s.id];
    if (!coord) continue;
    const key = coordKey(coord);
    const bucket = byCoord.get(key) ?? [];
    bucket.push(s.id);
    byCoord.set(key, bucket);
  }
  return byCoord;
}

export default function TwoAxisGridInput({
  question,
  value,
  onChange,
  disabled = false,
}: TwoAxisGridInputProps) {
  const config = question.config as unknown as TwoAxisGridConfig;
  const extent = getExtent(config);
  const subjects = React.useMemo(() => getSubjects(question, config), [question, config]);

  const placements = React.useMemo(
    () => coercePlacements(value, subjects, extent),
    [value, subjects, extent],
  );

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [liveMessage, setLiveMessage] = React.useState<string>("");

  const boardRef = React.useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const stacking = React.useMemo(() => computeStacking(subjects, placements), [subjects, placements]);

  const unplaced = React.useMemo(
    () => subjects.filter((s) => !placements[s.id]),
    [subjects, placements],
  );
  const placed = React.useMemo(
    () => subjects.filter((s) => Boolean(placements[s.id])),
    [subjects, placements],
  );

  const placedCount = placed.length;
  const totalCount = subjects.length;

  const announce = React.useCallback((message: string) => {
    // Reset first so repeated messages still announce.
    setLiveMessage("");
    queueMicrotask(() => setLiveMessage(message));
  }, []);

  const updatePlacement = React.useCallback(
    (subjectId: string, coord: TwoAxisGridCoord) => {
      if (disabled) return;
      const next: TwoAxisGridAnswer = { ...placements, [subjectId]: coord };
      onChange(next);
      const subject = subjects.find((s) => s.id === subjectId);
      const name = subject?.label ?? "Cast member";
      announce(`Placed ${name} at ${getCoordinateSummary(coord, config)}.`);
    },
    [announce, config, disabled, onChange, placements, subjects],
  );

  const removePlacement = React.useCallback(
    (subjectId: string) => {
      if (disabled) return;
      if (!placements[subjectId]) return;
      const next: TwoAxisGridAnswer = { ...placements };
      delete next[subjectId];
      onChange(next);
      const subject = subjects.find((s) => s.id === subjectId);
      const name = subject?.label ?? "Cast member";
      announce(`Moved ${name} back to the bench.`);
    },
    [announce, disabled, onChange, placements, subjects],
  );

  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id as string);
    },
    [],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const id = event.active.id as string;
      setActiveId(null);
      if (disabled) return;

      const boardRect = boardRef.current?.getBoundingClientRect();
      const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
      const overId = event.over?.id as string | undefined;

      if (overId === "bench") {
        removePlacement(id);
        return;
      }

      if (!boardRect || !activeRect) return;

      const centerX = activeRect.left + activeRect.width / 2;
      const centerY = activeRect.top + activeRect.height / 2;
      const dropInBoard = overId === "board" || isInsideRect(centerX, centerY, boardRect);

      if (!dropInBoard) return;

      const coord = snapFromRectCenterToCoord(activeRect, boardRect, extent);
      updatePlacement(id, coord);
    },
    [disabled, extent, removePlacement, updatePlacement],
  );

  const handleBoardClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (!selectedId) return;
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      const coord = snapFromPointToCoord(event.clientX, event.clientY, boardRect, extent);
      updatePlacement(selectedId, coord);
      setSelectedId(null);
    },
    [disabled, extent, selectedId, updatePlacement],
  );

  const handleTokenClick = React.useCallback(
    (id: string) => {
      if (disabled) return;
      setSelectedId((prev) => (prev === id ? null : id));
    },
    [disabled],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;
      if (!selectedId) return;

      const current = placements[selectedId] ?? null;

      const ensurePlaced = (): TwoAxisGridCoord => current ?? { x: 0, y: 0 };

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!current) {
          updatePlacement(selectedId, { x: 0, y: 0 });
        }
        return;
      }

      let next: TwoAxisGridCoord | null = null;
      if (event.key === "ArrowLeft") next = { ...ensurePlaced(), x: ensurePlaced().x - 1 };
      if (event.key === "ArrowRight") next = { ...ensurePlaced(), x: ensurePlaced().x + 1 };
      if (event.key === "ArrowUp") next = { ...ensurePlaced(), y: ensurePlaced().y + 1 };
      if (event.key === "ArrowDown") next = { ...ensurePlaced(), y: ensurePlaced().y - 1 };

      if (next) {
        event.preventDefault();
        updatePlacement(selectedId, {
          x: Math.max(-extent, Math.min(extent, next.x)),
          y: Math.max(-extent, Math.min(extent, next.y)),
        });
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
      }
    },
    [disabled, extent, placements, selectedId, updatePlacement],
  );

  const activeSubject = activeId ? subjects.find((s) => s.id === activeId) ?? null : null;

  if (subjects.length === 0) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
        <p className="text-red-600 text-sm">
          This question is missing cast members. Add `config.rows` or question options.
        </p>
      </div>
    );
  }

  return (
    <div
      className={disabled ? "opacity-50 pointer-events-none" : ""}
      onKeyDown={handleKeyDown}
    >
      <p className="text-sm text-gray-600 mb-4">
        Place every cast member on the grid. Center is neutral; farther from center is stronger.
      </p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col items-center gap-4">
          {/* Top label */}
          <div className="text-xs sm:text-sm font-semibold tracking-[0.15em] text-gray-700 uppercase text-center">
            {config.yLabelTop ?? "TOP"}
          </div>

          <div className="w-full max-w-[560px] mx-auto">
            <div className="grid grid-cols-[28px_1fr_28px] sm:grid-cols-[40px_1fr_40px] items-stretch gap-2">
              {/* Left label */}
              <div className="flex items-center justify-center">
                <div
                  className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-gray-700"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {config.xLabelLeft ?? "LEFT"}
                </div>
              </div>

              {/* Board */}
              <Board
                ref={boardRef}
                extent={extent}
                onClick={handleBoardClick}
                selectedId={selectedId}
              >
                {placed.map((subject) => {
                  const coord = placements[subject.id]!;
                  const pos = coordToPercent(coord.x, coord.y, extent);
                  const key = coordKey(coord);
                  const bucket = stacking.get(key) ?? [];
                  const idx = bucket.indexOf(subject.id);
                  const { dx, dy } = fanOffset(idx < 0 ? 0 : idx, bucket.length, 36);

                  return (
                    <div
                      key={subject.id}
                      className="absolute"
                      style={{
                        left: `${pos.leftPct}%`,
                        top: `${pos.topPct}%`,
                        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
                      }}
                    >
                      <CastToken
                        subject={subject}
                        size="grid"
                        selected={selectedId === subject.id}
                        placement={coord}
                        config={config}
                        onClick={() => handleTokenClick(subject.id)}
                        onRemove={() => removePlacement(subject.id)}
                        disabled={disabled}
                        isActiveDrag={activeId === subject.id}
                      />
                    </div>
                  );
                })}
              </Board>

              {/* Right label */}
              <div className="flex items-center justify-center">
                <div
                  className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-gray-700"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {config.xLabelRight ?? "RIGHT"}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom label */}
          <div className="text-xs sm:text-sm font-semibold tracking-[0.15em] text-gray-700 uppercase text-center">
            {config.yLabelBottom ?? "BOTTOM"}
          </div>

          {/* Bench */}
          <Bench>
            {unplaced.map((subject) => (
              <CastToken
                key={subject.id}
                subject={subject}
                size="bench"
                selected={selectedId === subject.id}
                placement={null}
                config={config}
                onClick={() => handleTokenClick(subject.id)}
                onRemove={null}
                disabled={disabled}
                isActiveDrag={activeId === subject.id}
              />
            ))}
          </Bench>

          <div className="text-xs text-gray-500 tabular-nums">
            {placedCount}/{totalCount} placed
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeSubject ? (
            <OverlayToken subject={activeSubject} />
          ) : null}
        </DragOverlay>

        <div className="sr-only" aria-live="polite">
          {liveMessage}
        </div>
      </DndContext>
    </div>
  );
}

const Board = React.forwardRef(function Board(
  {
    extent,
    onClick,
    selectedId,
    children,
  }: {
    extent: number;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    selectedId: string | null;
    children?: React.ReactNode;
  },
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { setNodeRef } = useDroppable({ id: "board" });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={`relative aspect-square w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden ${
        selectedId ? "ring-2 ring-indigo-300" : ""
      }`}
      onClick={onClick}
      role="application"
      aria-label="Two axis grid board"
    >
      <GridUnderlay extent={extent} />
      {children}
    </div>
  );
});

function Bench({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "bench" });
  return (
    <div ref={setNodeRef} className="w-full">
      <div className="flex gap-3 overflow-x-auto sm:flex-wrap sm:justify-center sm:overflow-visible py-2 px-1">
        {children}
      </div>
    </div>
  );
}

function CastToken({
  subject,
  size,
  selected,
  placement,
  config,
  onClick,
  onRemove,
  disabled,
  isActiveDrag,
}: {
  subject: MatrixRow;
  size: "bench" | "grid";
  selected: boolean;
  placement: TwoAxisGridCoord | null;
  config: TwoAxisGridConfig;
  onClick: () => void;
  onRemove: (() => void) | null;
  disabled: boolean;
  isActiveDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: subject.id,
    disabled,
  });
  // dnd-kit provides an `aria-pressed` attribute, but we want selection state
  // to control that value; omit it to avoid duplicate props in JSX.
  const { ["aria-pressed"]: _ariaPressed, ...draggableAttributes } = attributes;

  const dims = size === "bench"
    ? "w-12 h-12 sm:w-14 sm:h-14"
    : "w-7 h-7 sm:w-9 sm:h-9";

  const ring = selected ? "ring-2 ring-indigo-500" : "ring-1 ring-gray-200 hover:ring-gray-300";
  const opacity = isDragging || isActiveDrag ? "opacity-0" : "opacity-100";

  const summary = getCoordinateSummary(placement, config);
  const ariaLabel = `${subject.label}. ${summary}. ${selected ? "Selected." : ""}`;

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={setNodeRef}
        type="button"
        className={`${dims} ${ring} ${opacity} relative rounded-full overflow-hidden bg-white shadow-sm transition-transform motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label={ariaLabel}
        aria-pressed={selected}
        title={summary}
        {...listeners}
        {...draggableAttributes}
      >
        {subject.img ? (
          <Image
            src={subject.img}
            alt={subject.label}
            fill
            className="object-cover"
            sizes={size === "bench" ? "56px" : "36px"}
            unoptimized={subject.img.startsWith("http")}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] font-bold text-gray-600">
            {subject.label.split(" ").map((p) => p[0]).join("").slice(0, 3)}
          </div>
        )}
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-700 shadow border border-gray-200 hover:bg-gray-50"
          aria-label={`Remove ${subject.label} from grid`}
        >
          ×
        </button>
      )}
    </div>
  );
}

function OverlayToken({ subject }: { subject: MatrixRow }) {
  return (
    <div className="h-14 w-14 rounded-full overflow-hidden bg-white shadow-xl ring-2 ring-indigo-500">
      {subject.img ? (
        <Image
          src={subject.img}
          alt={subject.label}
          width={56}
          height={56}
          className="h-full w-full object-cover"
          unoptimized={subject.img.startsWith("http")}
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs font-bold text-gray-600">
          {subject.label.split(" ").map((p) => p[0]).join("").slice(0, 3)}
        </div>
      )}
    </div>
  );
}

function GridUnderlay({ extent }: { extent: number }) {
  const safeExtent = Math.max(1, Math.round(extent));
  const max = 2 * safeExtent;
  const center = safeExtent;

  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= max; i += 1) {
    const isCenter = i === center;
    const stroke = isCenter ? "#9ca3af" : "#e5e7eb"; // gray-400 / gray-200
    const strokeWidth = isCenter ? 0.08 : 0.04;

    // Vertical line at x=i
    lines.push(
      <line
        key={`v-${i}`}
        x1={i}
        y1={0}
        x2={i}
        y2={max}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />,
    );

    // Horizontal line at y=i
    lines.push(
      <line
        key={`h-${i}`}
        x1={0}
        y1={i}
        x2={max}
        y2={i}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />,
    );
  }

  const points: React.ReactNode[] = [];
  for (let x = 0; x <= max; x += 1) {
    for (let y = 0; y <= max; y += 1) {
      const isCenter = x === center && y === center;
      points.push(
        <circle
          key={`p-${x}-${y}`}
          cx={x}
          cy={y}
          r={isCenter ? 0.12 : 0.06}
          fill={isCenter ? "#6366f1" : "#d1d5db"} // indigo-500 / gray-300
          opacity={isCenter ? 0.9 : 0.6}
        />,
      );
    }
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${max} ${max}`}
      aria-hidden="true"
    >
      {lines}
      {points}
    </svg>
  );
}
