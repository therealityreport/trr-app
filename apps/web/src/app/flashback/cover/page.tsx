"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { useFlashbackManager } from "@/lib/flashback/manager";
import type { GamePhase } from "@/lib/flashback/manager";
import type { User } from "firebase/auth";
import GameHeader from "@/components/GameHeader";

// ---------------------------------------------------------------------------
// How to Play modal
// ---------------------------------------------------------------------------

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "Georgia, serif" }}
          >
            How to Play
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-black/5"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24.0249 8.84795L22.2624 7.08545L15.2749 14.0729L8.28743 7.08545L6.52493 8.84795L13.5124 15.8354L6.52493 22.8229L8.28743 24.5854L15.2749 17.5979L22.2624 24.5854L24.0249 22.8229L17.0374 15.8354L24.0249 8.84795Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <ul className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--fb-text)" }}>
          <li className="flex gap-2">
            <span className="mt-0.5 text-base font-bold" style={{ color: "var(--fb-accent)" }}>1.</span>
            <span>You will be shown a series of <strong>8 reality TV moments</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-base font-bold" style={{ color: "var(--fb-accent)" }}>2.</span>
            <span>An <strong>anchor card</strong> is placed on the timeline first with its year revealed.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-base font-bold" style={{ color: "var(--fb-accent)" }}>3.</span>
            <span>Place each new card where you think it belongs in <strong>chronological order</strong>.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-base font-bold" style={{ color: "var(--fb-accent)" }}>4.</span>
            <span>After you confirm, the correct year is revealed. <strong style={{ color: "var(--fb-correct)" }}>Green</strong> = correct, <strong style={{ color: "var(--fb-incorrect)" }}>Red</strong> = wrong.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-base font-bold" style={{ color: "var(--fb-accent)" }}>5.</span>
            <span>Earn points for each correct placement. Harder cards are worth more!</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA helpers
// ---------------------------------------------------------------------------

type CoverCta = "loading" | "start" | "continue" | "results";

function resolveCta(phase: GamePhase): CoverCta {
  switch (phase) {
    case "loading":
      return "loading";
    case "completed":
      return "results";
    case "playing":
    case "confirming":
    case "revealing":
      return "continue";
    case "ready":
    default:
      return "start";
  }
}

function ctaLabel(cta: CoverCta): string {
  switch (cta) {
    case "results":
      return "View Results";
    case "continue":
      return "Continue";
    case "start":
      return "Start the quiz";
    default:
      return "Loading...";
  }
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

export default function FlashbackCover() {
  const router = useRouter();
  const manager = useFlashbackManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  const userId = user?.uid ?? null;
  const cta = useMemo(() => resolveCta(manager.phase), [manager.phase]);
  const isCtaDisabled = cta === "loading";

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
          console.error("[flashback cover] bootstrap failed", err);
        }
      }
    };

    run();

    return () => {
      isActive = false;
    };
    // manager.bootstrap is stable (useCallback), userId is the trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -------------------------------------------------------------------------
  // Primary CTA handler
  // -------------------------------------------------------------------------
  const handlePrimaryCta = useCallback(() => {
    if (!userId) {
      router.push("/auth/register");
      return;
    }

    if (cta === "start") {
      manager.startGame();
    }

    // For start, continue, and results — navigate to the play route
    router.push("/flashback/play");
  }, [userId, cta, manager, router]);

  // -------------------------------------------------------------------------
  // Back button
  // -------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authLoading || (userId && manager.phase === "loading")) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--fb-bg)" }}>
        <div className="text-center" style={{ color: "var(--fb-text)" }}>Loading...</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--fb-bg)" }}>
      <GameHeader
        showStatsButton={false}
        showHelpMenu={true}
        onHowToPlay={() => setHowToPlayOpen(true)}
      />

      <main className="px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/20 bg-black/5 hover:bg-black/10"
            style={{ color: "var(--fb-text)" }}
            aria-label="Go back"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Card container */}
          <div
            className="mx-auto w-full max-w-[480px] rounded-2xl bg-white px-6 py-10 shadow-md"
            style={{ boxShadow: "0 4px 24px var(--fb-card-shadow)" }}
          >
            <div className="flex flex-col items-center gap-8 text-center">
              {/* Title */}
              <div className="space-y-3">
                <h1
                  className="text-4xl font-bold tracking-wide sm:text-5xl"
                  style={{ fontFamily: "Georgia, serif", color: "var(--fb-text)" }}
                >
                  Flashback
                </h1>
                <p
                  className="text-lg leading-relaxed"
                  style={{ color: "var(--fb-text-muted)" }}
                >
                  Place reality TV moments in chronological order
                </p>
              </div>

              {/* CTA button */}
              <button
                onClick={handlePrimaryCta}
                disabled={isCtaDisabled}
                className="inline-flex w-full max-w-[260px] items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-white shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "var(--fb-accent)" }}
              >
                {ctaLabel(cta)} {cta === "start" ? "\u2192" : ""}
              </button>

              {/* Error message */}
              {manager.error && (
                <p className="text-sm" style={{ color: "var(--fb-incorrect)" }}>
                  {manager.error}
                </p>
              )}

              {/* Score summary for completed games */}
              {cta === "results" && manager.gameState && (
                <div
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "var(--fb-timeline)",
                    color: "var(--fb-text)",
                  }}
                >
                  <p className="font-semibold">Your score: {manager.score} pts</p>
                  <p style={{ color: "var(--fb-text-muted)" }}>
                    {manager.roundResults.filter((r) => r.isCorrect).length} of{" "}
                    {manager.roundResults.length} correct
                  </p>
                </div>
              )}

              {/* How to Play link */}
              <button
                type="button"
                onClick={() => setHowToPlayOpen(true)}
                className="text-sm font-medium underline underline-offset-2 transition hover:opacity-70"
                style={{ color: "var(--fb-accent)" }}
              >
                How to Play
              </button>
            </div>
          </div>

          {/* Footer info */}
          <div className="space-y-1 text-center text-xs font-medium" style={{ color: "var(--fb-text-muted)" }}>
            <p className="uppercase tracking-[0.2em]">Created by The Reality Reporter</p>
          </div>
        </div>
      </main>

      {/* How to Play modal */}
      {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}
    </div>
  );
}
