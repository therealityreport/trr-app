"use client";

import type { TimelineCard } from "@/lib/flashback/types";
import type { FlashbackEvent } from "@/lib/flashback/types";
import ClueCard from "./clue-card";
import DropZone from "./drop-zone";
import YearBadge from "./year-badge";

interface TimelineProps {
  cards: TimelineCard[];
  pendingCard: FlashbackEvent | null;
  pendingPosition: number | null;
  isDragging: boolean;
  onConfirmTap: () => void;
  /** When true, show the timeline in read-only review mode (no drop zones) */
  reviewMode?: boolean;
  /** When true, show tap-target buttons instead of dnd-kit drop zones */
  tapMode?: boolean;
  /** Called when a tap-target position is tapped */
  onTapPosition?: (position: number) => void;
}

export default function Timeline({
  cards,
  pendingCard,
  pendingPosition,
  isDragging,
  onConfirmTap,
  reviewMode = false,
  tapMode = false,
  onTapPosition,
}: TimelineProps) {
  const showDropZones = isDragging && !reviewMode && !tapMode;
  const showTapTargets = tapMode && !reviewMode;
  const showPending = pendingCard !== null && pendingPosition !== null && !isDragging && !reviewMode;

  // Build the display list: placed cards interspersed with drop zones
  // and optionally the pending card at its position
  const displayItems: React.ReactNode[] = [];

  // BEFORE label
  displayItems.push(
    <div
      key="label-before"
      className="flex items-center justify-center py-1"
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "var(--fb-text-muted)" }}
      >
        Before
      </span>
    </div>,
  );

  // Build list of timeline entries with interleaved drop zones
  for (let i = 0; i <= cards.length; i++) {
    // Drop zone before each card (and after last card)
    if (showDropZones) {
      displayItems.push(
        <DropZone
          key={`drop-${i}`}
          id={`drop-${i}`}
          position={i}
          isActive={true}
        />,
      );
    }

    // Tap-target button (accessibility alternative to drag)
    if (showTapTargets && onTapPosition) {
      const labelBefore = i < cards.length ? cards[i].event.description : "all events";
      const labelAfter = i > 0 ? cards[i - 1].event.description : "all events";
      const ariaLabel = i === 0
        ? `Place before ${labelBefore}`
        : i === cards.length
          ? `Place after ${labelAfter}`
          : `Place between ${labelAfter} and ${labelBefore}`;

      displayItems.push(
        <button
          key={`tap-${i}`}
          type="button"
          onClick={() => onTapPosition(i)}
          aria-label={ariaLabel}
          className="flex w-full items-center justify-center rounded-lg border-2 border-dashed transition-all duration-150 hover:border-solid active:scale-[0.98]"
          style={{
            minHeight: 44,
            borderColor: "var(--fb-accent)",
            backgroundColor: "rgba(107, 107, 160, 0.06)",
            color: "var(--fb-accent)",
          }}
        >
          <span className="text-xs font-semibold">Place here</span>
        </button>,
      );
    }

    // Insert pending card at its position
    if (showPending && i === pendingPosition) {
      displayItems.push(
        <div key="pending" className="animate-fb-slide-in">
          <ClueCard
            event={pendingCard}
            isConfirming={true}
            onConfirmTap={onConfirmTap}
          />
        </div>,
      );
    }

    // The actual timeline card
    if (i < cards.length) {
      const card = cards[i];
      displayItems.push(
        <div key={`card-${card.event.id}`} className="flex items-center gap-3">
          {/* Year badge column */}
          <div className="flex w-12 shrink-0 items-center justify-center">
            <YearBadge
              year={card.event.year}
              isCorrect={card.isCorrect}
              revealed={card.yearRevealed}
            />
          </div>

          {/* Vertical line connector */}
          <div
            className="flex w-0.5 self-stretch"
            style={{ backgroundColor: "var(--fb-timeline)" }}
          />

          {/* Card */}
          <div className="flex-1 py-1">
            <ClueCard
              event={card.event}
              isPlaced={true}
              yearRevealed={card.yearRevealed}
              isCorrect={card.isCorrect}
            />
          </div>
        </div>,
      );
    }
  }

  // AFTER label
  displayItems.push(
    <div
      key="label-after"
      className="flex items-center justify-center py-1"
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "var(--fb-text-muted)" }}
      >
        After
      </span>
    </div>,
  );

  return (
    <div className="flex flex-col gap-1">
      {displayItems}
    </div>
  );
}
