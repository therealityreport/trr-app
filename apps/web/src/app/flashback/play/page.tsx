"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import type { User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useFlashbackManager } from "@/lib/flashback/manager";
import type { RoundResult } from "@/lib/flashback/manager";
import GameHeader from "@/components/GameHeader";

import ClueCard from "./clue-card";
import Timeline from "./timeline";
import ProgressBar from "./progress-bar";

// ---------------------------------------------------------------------------
// Completed view
// ---------------------------------------------------------------------------

function CompletedView({
  score,
  roundResults,
  manager,
}: {
  score: number;
  roundResults: RoundResult[];
  manager: ReturnType<typeof useFlashbackManager>;
}) {
  const correctCount = roundResults.filter((r) => r.isCorrect).length;
  const totalRounds = roundResults.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Score banner */}
      <div
        className="rounded-2xl px-6 py-6 text-center"
        style={{
          backgroundColor: "var(--fb-card)",
          boxShadow: "0 4px 24px var(--fb-card-shadow)",
        }}
      >
        <h2
          className="animate-fb-score-pop mb-1 text-3xl font-bold"
          style={{ fontFamily: "Georgia, serif", color: "var(--fb-text)" }}
        >
          {score} pts
        </h2>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--fb-text-muted)" }}
        >
          {correctCount} of {totalRounds} correct
        </p>
      </div>

      {/* Round results bar */}
      <div
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: "var(--fb-card)",
          boxShadow: "0 2px 8px var(--fb-card-shadow)",
        }}
      >
        <div className="mb-2 text-xs font-semibold" style={{ color: "var(--fb-text-muted)" }}>
          Round Results
        </div>
        <div className="flex gap-1">
          {roundResults.map((r) => (
            <div
              key={r.round}
              className="h-6 flex-1 rounded-sm"
              style={{
                backgroundColor: r.isCorrect
                  ? "var(--fb-correct)"
                  : "var(--fb-incorrect)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Timeline review */}
      <div>
        <h3
          className="mb-3 text-sm font-bold uppercase tracking-wider"
          style={{ color: "var(--fb-text-muted)" }}
        >
          Timeline Review
        </h3>
        <Timeline
          cards={manager.timeline}
          pendingCard={null}
          pendingPosition={null}
          isDragging={false}
          onConfirmTap={() => {}}
          reviewMode={true}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Play page
// ---------------------------------------------------------------------------

export default function FlashbackPlay() {
  const router = useRouter();
  const manager = useFlashbackManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tapMode, setTapMode] = useState(false);

  const userId = user?.uid ?? null;

  // -------------------------------------------------------------------------
  // Sensors for dnd-kit (pointer + touch)
  // -------------------------------------------------------------------------
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // -------------------------------------------------------------------------
  // Auth listener
  // -------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // Bootstrap on auth
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    let isActive = true;

    const run = async () => {
      try {
        await manager.bootstrap(userId);
      } catch (err) {
        if (isActive) {
          console.error("[flashback play] bootstrap failed", err);
        }
      }
    };

    run();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -------------------------------------------------------------------------
  // Auto-start game when ready (fresh game navigated from cover)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (manager.phase === "ready" && !manager.error) {
      manager.startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.phase, manager.error]);

  // -------------------------------------------------------------------------
  // DnD handlers
  // -------------------------------------------------------------------------
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      const { over } = event;
      if (!over) return;

      const position = over.data?.current?.position as number | undefined;
      if (position === undefined) return;

      if (manager.phase === "playing") {
        manager.placeCard(position);
      } else if (manager.phase === "confirming") {
        manager.repositionCard(position);
      }
    },
    [manager],
  );

  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
  }, []);

  // -------------------------------------------------------------------------
  // Tap-to-place handler (accessibility alternative to drag)
  // -------------------------------------------------------------------------
  const handleTapPosition = useCallback(
    (position: number) => {
      if (manager.phase === "playing") {
        manager.placeCard(position);
      } else if (manager.phase === "confirming") {
        manager.repositionCard(position);
      }
    },
    [manager],
  );

  // -------------------------------------------------------------------------
  // Confirm placement handler (tap overlay)
  // -------------------------------------------------------------------------
  const handleConfirm = useCallback(async () => {
    await manager.confirmPlacement();
  }, [manager]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authLoading || (userId && manager.phase === "loading")) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--fb-bg)" }}
      >
        <div className="text-center" style={{ color: "var(--fb-text)" }}>
          Loading...
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Not signed in
  // -------------------------------------------------------------------------
  if (!userId) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--fb-bg)" }}
      >
        <div className="text-center">
          <p className="mb-4" style={{ color: "var(--fb-text)" }}>
            Sign in to play Flashback
          </p>
          <button
            onClick={() => router.push("/auth/register")}
            className="rounded-full px-6 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--fb-accent)" }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (manager.error) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--fb-bg)" }}
      >
        <div className="text-center">
          <p className="mb-2" style={{ color: "var(--fb-incorrect)" }}>
            {manager.error}
          </p>
          <button
            onClick={() => router.push("/flashback/cover")}
            className="text-sm font-medium underline"
            style={{ color: "var(--fb-accent)" }}
          >
            Back to cover
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Completed view
  // -------------------------------------------------------------------------
  if (manager.phase === "completed") {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--fb-bg)" }}>
        <GameHeader showStatsButton={false} showHelpMenu={false} />
        <main className="px-4 py-6 sm:px-8">
          <div className="mx-auto w-full max-w-[480px]">
            <h1
              className="mb-6 text-center text-2xl font-bold"
              style={{ fontFamily: "Georgia, serif", color: "var(--fb-text)" }}
            >
              Flashback Complete
            </h1>
            <CompletedView
              score={manager.score}
              roundResults={manager.roundResults}
              manager={manager}
            />
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Active game (playing / confirming / revealing)
  // -------------------------------------------------------------------------
  const isConfirming = manager.phase === "confirming";
  const isRevealing = manager.phase === "revealing";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen" style={{ backgroundColor: "var(--fb-bg)" }}>
        <GameHeader showStatsButton={false} showHelpMenu={false} />

        <main className="px-4 py-4 sm:px-8">
          <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
            {/* Score + Round info */}
            <div className="flex items-center justify-between">
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--fb-text-muted)" }}
                >
                  Score
                </span>
                <p
                  className="text-xl font-bold"
                  style={{ fontFamily: "Georgia, serif", color: "var(--fb-text)" }}
                >
                  {manager.score}
                </p>
              </div>
              <div className="text-right">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--fb-text-muted)" }}
                >
                  Round
                </span>
                <p
                  className="text-xl font-bold"
                  style={{ fontFamily: "Georgia, serif", color: "var(--fb-text)" }}
                >
                  {manager.currentRound}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <ProgressBar
              currentRound={manager.currentRound}
              roundResults={manager.roundResults}
            />

            {/* Mode toggle */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setTapMode((v) => !v)}
                className="text-xs font-medium underline underline-offset-2 transition hover:opacity-70"
                style={{ color: "var(--fb-text-muted)" }}
              >
                {tapMode ? "Switch to drag mode" : "Switch to tap mode"}
              </button>
            </div>

            {/* Current clue card */}
            {manager.currentCard && !isConfirming && !isRevealing && (
              <div>
                <p
                  className="mb-2 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--fb-text-muted)" }}
                >
                  {tapMode ? "Tap a slot on the timeline below" : "Drag to place on timeline"}
                </p>
                <ClueCard event={manager.currentCard} isDraggable={!tapMode} />
              </div>
            )}

            {/* Revealing state indicator */}
            {isRevealing && (
              <div
                className="rounded-xl px-4 py-3 text-center text-sm font-medium"
                style={{
                  backgroundColor: "var(--fb-card)",
                  color: "var(--fb-text-muted)",
                  boxShadow: "0 2px 8px var(--fb-card-shadow)",
                }}
              >
                Revealing...
              </div>
            )}

            {/* Timeline */}
            <Timeline
              cards={manager.timeline}
              pendingCard={isConfirming ? manager.currentCard : null}
              pendingPosition={manager.pendingPosition}
              isDragging={isDragging}
              onConfirmTap={handleConfirm}
              tapMode={tapMode && (manager.phase === "playing" || manager.phase === "confirming")}
              onTapPosition={handleTapPosition}
            />

            {/* Confirm button in tap mode */}
            {tapMode && isConfirming && (
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-full py-3 text-center text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: "var(--fb-accent)" }}
              >
                Confirm Placement
              </button>
            )}
          </div>
        </main>
      </div>
    </DndContext>
  );
}
