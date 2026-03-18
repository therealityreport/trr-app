"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { FlashbackEvent } from "@/lib/flashback/types";

interface ClueCardProps {
  event: FlashbackEvent;
  isDraggable?: boolean;
  isConfirming?: boolean;
  onConfirmTap?: () => void;
  /** When true, card is placed on the timeline (smaller styling) */
  isPlaced?: boolean;
  /** Show year badge inline for placed cards */
  yearRevealed?: boolean;
  isCorrect?: boolean | null;
}

export default function ClueCard({
  event,
  isDraggable = false,
  isConfirming = false,
  onConfirmTap,
  isPlaced = false,
  yearRevealed = false,
  isCorrect = null,
}: ClueCardProps) {
  if (isDraggable) {
    return <DraggableClueCard event={event} />;
  }

  return (
    <ClueCardInner
      event={event}
      isConfirming={isConfirming}
      onConfirmTap={onConfirmTap}
      isPlaced={isPlaced}
      yearRevealed={yearRevealed}
      isCorrect={isCorrect}
    />
  );
}

// ---------------------------------------------------------------------------
// Draggable wrapper
// ---------------------------------------------------------------------------

function DraggableClueCard({ event }: { event: FlashbackEvent }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `clue-${event.id}`,
      data: { event },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.85 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    boxShadow: isDragging
      ? "0 8px 32px var(--fb-card-drag-shadow)"
      : "0 4px 16px var(--fb-card-shadow)",
    backgroundColor: "var(--fb-card)",
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="animate-fb-slide-in rounded-xl p-4 transition-shadow"
      {...listeners}
      {...attributes}
    >
      <CardContent event={event} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner card (non-draggable, used on timeline and for confirming state)
// ---------------------------------------------------------------------------

function ClueCardInner({
  event,
  isConfirming,
  onConfirmTap,
  isPlaced,
  yearRevealed,
  isCorrect,
}: Omit<ClueCardProps, "isDraggable">) {
  const borderColor = isConfirming
    ? "var(--fb-confirm-border)"
    : "transparent";

  const flashClass =
    isCorrect === false && yearRevealed ? "animate-fb-incorrect-flash" : "";
  const slideClass =
    isCorrect === true && yearRevealed ? "animate-fb-slide-correct" : "";

  return (
    <div
      className={`relative rounded-xl border-2 transition-all ${flashClass} ${slideClass}`}
      style={{
        borderColor,
        backgroundColor: "var(--fb-card)",
        boxShadow: isConfirming
          ? "0 0 0 2px var(--fb-confirm-border)"
          : `0 2px 8px var(--fb-card-shadow)`,
        padding: isPlaced ? "0.625rem 0.75rem" : "1rem",
      }}
    >
      <CardContent event={event} compact={isPlaced} />

      {/* Confirm overlay */}
      {isConfirming && onConfirmTap && (
        <button
          type="button"
          onClick={onConfirmTap}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/5 transition hover:bg-black/10"
        >
          <span
            className="rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg"
            style={{ backgroundColor: "var(--fb-confirm-border)" }}
          >
            Tap to confirm
          </span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared card content
// ---------------------------------------------------------------------------

function CardContent({
  event,
  compact = false,
}: {
  event: FlashbackEvent;
  compact?: boolean;
}) {
  return (
    <div className={`flex ${compact ? "gap-2" : "gap-3"} items-start`}>
      {event.image_url && (
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.image_url}
          alt=""
          className={`rounded-lg object-cover ${compact ? "h-10 w-10" : "h-14 w-14"}`}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className={`leading-snug ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: "var(--fb-text)" }}
        >
          {event.description}
        </p>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--fb-text-muted)" }}
        >
          {event.point_value} {event.point_value === 1 ? "pt" : "pts"}
        </span>
      </div>
    </div>
  );
}
