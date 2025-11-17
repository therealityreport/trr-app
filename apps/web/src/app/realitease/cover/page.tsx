"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthDebugger } from "@/lib/debug";
import { auth } from "@/lib/firebase";
import { useRealiteaseManager } from "@/lib/realitease/manager";
import { formatRealiteaseDisplayDate, getRealiteaseDateKey } from "@/lib/realitease/utils";
import type { RealiteaseGameSnapshot } from "@/lib/realitease/types";
import { User } from "firebase/auth";
import "@/styles/realitease-fonts.css";
import GameHeader from "@/components/GameHeader";

function RealiteaseIcon() {
  return <img src="/icons/Realitease-Icon.svg" alt="Realitease icon" className="w-20 h-20" />;
}

export default function RealiteaseCover() {
  const router = useRouter();
  const manager = useRealiteaseManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [gameSnapshot, setGameSnapshot] = useState<RealiteaseGameSnapshot | null>(null);
  const [cta, setCta] = useState<"loading" | "start" | "continue" | "stats">("loading");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const puzzleDateKey = useMemo(() => getRealiteaseDateKey(), []);
  const displayDate = useMemo(() => formatRealiteaseDisplayDate(), []);
  const [puzzleNumber, setPuzzleNumber] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const userId = user?.uid ?? null;
  const ctaLabel = useMemo(() => {
    switch (cta) {
      case "stats":
        return "See Stats";
      case "continue":
        return "Continue";
      case "start":
        return "Start";
      default:
        return "Loading...";
    }
  }, [cta]);
  const isCtaDisabled = isBootstrapping || cta === "loading";
  const dailyClue = useMemo(() => {
    const clue = gameSnapshot?.answerKey?.clue;
    if (clue && clue.trim().length > 0) return clue.trim();
    const metadata = gameSnapshot?.answerKey?.metadata ?? {};
    const metadataClueRaw =
      (metadata as Record<string, unknown>)["clue"] ??
      (metadata as Record<string, unknown>)["dailyClue"] ??
      (metadata as Record<string, unknown>)["daily_clue"];
    return typeof metadataClueRaw === "string" && metadataClueRaw.trim().length > 0 ? metadataClueRaw.trim() : null;
  }, [gameSnapshot?.answerKey]);

  const resolveCta = useCallback((snapshot: RealiteaseGameSnapshot | null): "start" | "continue" | "stats" => {
    if (!snapshot) return "start";
    if (snapshot.gameCompleted) {
      return snapshot.guessNumberSolved !== null ? "stats" : "continue";
    }
    if (snapshot.hasExistingDoc && snapshot.guesses.length > 0) return "continue";
    return "start";
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isActive = true;
    setIsBootstrapping(true);
    setErrorMessage(null);

    const bootstrap = async () => {
      try {
        AuthDebugger.log("Realitease Cover: Bootstrapping game state", {
          uid: userId,
          puzzleDateKey,
        });

        const initial = await manager.startGame({ uid: userId, gameDate: puzzleDateKey });
        if (!isActive) return;
        setGameSnapshot(initial);
        setCta(resolveCta(initial));

        const refreshed = await manager.updateGameStatus({ uid: userId, gameDate: puzzleDateKey });
        if (!isActive) return;
        if (refreshed) {
          setGameSnapshot(refreshed);
          setCta(resolveCta(refreshed));
        }
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "Unable to start today's puzzle";
        AuthDebugger.log("Realitease Cover: Failed to bootstrap game", { message });
        setErrorMessage(message);
        setCta("start");
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [manager, puzzleDateKey, resolveCta, userId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const displayNumber = await manager.getPuzzleNumber(puzzleDateKey);
        if (isMounted) {
          setPuzzleNumber(displayNumber);
        }
      } catch (error) {
        AuthDebugger.log("Realitease Cover: Unable to compute puzzle number", {
          message: error instanceof Error ? error.message : error,
        });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [manager, puzzleDateKey]);

  useEffect(() => {
    AuthDebugger.log("Realitease Cover: Component mounted");
    
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      AuthDebugger.log("Realitease Cover: Auth state changed", { 
        hasUser: !!authUser,
        email: authUser?.email 
      });
      
      setUser(authUser);
      setAuthLoading(false);
      setErrorMessage(null);

      if (!authUser) {
        setGameSnapshot(null);
        setCta("start");
        setIsBootstrapping(false);
      }
      
      // Don't redirect if no user - let them access the cover page
      // This matches the behavior of the hub page
    });

    return () => {
      AuthDebugger.log("Realitease Cover: Component unmounting");
      unsubscribe();
    };
  }, []);

  const handlePrimaryCta = async () => {
    if (!userId) {
      AuthDebugger.log("Realitease Cover: No user logged in, redirecting to register");
      router.push("/auth/register");
      return;
    }

    if (cta === "stats") {
      AuthDebugger.log("Realitease Cover: CTA 'See Stats' selected, navigating to stats", {
        uid: userId,
      });
      router.push("/realitease/play?show=stats");
      return;
    }

    if (cta === "start") {
      try {
        await manager.markGameStarted(userId, puzzleDateKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to prepare game";
        AuthDebugger.log("Realitease Cover: Failed to mark game as started", { message });
      }
    }

    AuthDebugger.log("Realitease Cover: CTA pressed, navigating to play", {
      uid: userId,
      cta,
    });
    router.push("/realitease/play");
  };

  const handleBack = () => {
    AuthDebugger.log("Realitease Cover: Back button clicked, going back");
    router.back();
  };
  // Show loading state while auth is being checked
  if (authLoading || (userId && isBootstrapping && !gameSnapshot)) {
    return (
      <div className="min-h-screen bg-blue-300 flex items-center justify-center">
        <div className="text-center text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#94aed1]">
      <GameHeader showStatsButton={false} showHelpMenu={false} onSettingsClick={() => setSettingsOpen(true)} />
      <main className="px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-12">
        <button
          onClick={handleBack}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/40 bg-black/10 text-black hover:bg-black/20"
          aria-label="Go back"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
          <div className="size-20">
            <RealiteaseIcon />
          </div>
          <div className="space-y-3 px-2">
            <h1 className="text-4xl font-bold tracking-wide text-white sm:text-5xl" style={{ fontFamily: "var(--font-rude-slab)" }}>
              Realitease
            </h1>
            <p className="text-3xl leading-snug text-white" style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}>
              Get 8 chances to guess the Reality TV Star
            </p>
          </div>

          <div className="w-full space-y-4 px-2">
            <button
              onClick={handlePrimaryCta}
              disabled={isCtaDisabled}
              className="mx-auto inline-flex w-full max-w-[240px] items-center justify-center rounded-full bg-black px-8 py-3 text-base font-semibold text-white shadow hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {ctaLabel}
            </button>

            {errorMessage ? (
              <p className="text-sm text-white/90">{errorMessage}</p>
            ) : dailyClue ? (
              <div className="mx-auto w-full max-w-[380px] rounded-2xl border border-white/20 bg-white/20 px-4 py-3 text-sm text-white shadow-sm backdrop-blur">
                <p className="font-semibold uppercase tracking-wide text-white/90">Daily Clue</p>
                <p className="mt-1 text-white">{dailyClue}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-1 text-sm font-semibold text-white">
            <p className="font-['TN_Web_Use_Only'] uppercase tracking-[0.2em]">{displayDate}</p>
            <p className="font-['Helvetica_Neue'] uppercase tracking-[0.3em]">No. {(puzzleNumber ?? "---").padStart(3, "0")}</p>
            <p className="font-['Helvetica_Neue'] uppercase tracking-[0.2em]">Created by The Reality Reporter</p>
          </div>
        </div>
      </div>
      </main>
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={() => setSettingsOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-rude-slab)" }}>Realitease Settings</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-2 hover:bg-black/5"
                aria-label="Close settings"
              >
                <svg width="24" height="24" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24.0249 8.84795L22.2624 7.08545L15.2749 14.0729L8.28743 7.08545L6.52493 8.84795L13.5124 15.8354L6.52493 22.8229L8.28743 24.5854L15.2749 17.5979L22.2624 24.5854L24.0249 22.8229L17.0374 15.8354L24.0249 8.84795Z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <p className="text-lg" style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}>
              More settings coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
