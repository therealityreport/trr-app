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

// Realitease SVG icon using the actual design asset
function RealiteaseIcon() {
  return (
    <div className="w-20 h-20 relative overflow-hidden">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M53.8852 27.2648H53.8723V27.2777H53.8852V27.2648Z" fill="#769F25"/>
        <path d="M53.8723 29.2277V74.9952H70.4798C72.9722 74.9952 74.9997 72.9935 74.9997 70.527V52.021V29.3311L53.8723 29.2277Z" fill="#B05988"/>
        <path d="M74.2635 9.32715V25.4439L53.8981 25.3535L53.9885 4.96219H69.8986C72.3007 4.96219 74.2635 6.92513 74.2635 9.32715Z" fill="white"/>
        <path d="M51.1603 52.6409V74.9694H29.0385V52.5377L51.1603 52.6409Z" fill="#B05988"/>
        <path d="M51.4701 27.7942L51.3539 50.9492L28.2249 50.82L28.3281 27.7039L51.4701 27.7942Z" fill="#ECC91C"/>
        <path d="M50.114 4.96219L50.0237 25.3277L29.6323 25.2502V4.96219H50.114Z" fill="white"/>
        <path d="M27.4112 52.4214V75.0855H9.56399C6.90369 75.0855 4.73413 72.916 4.73413 70.2557V52.4214H27.4112Z" fill="#B05988"/>
        <path d="M25.7452 29.2277L25.6419 49.5932H5.21179V29.2277H25.7452Z" fill="white"/>
        <path d="M25.7581 4.96219V25.3535H5.21179V9.32716C5.21179 6.92513 7.17473 4.96219 9.58966 4.96219H25.7581Z" fill="white"/>
        <path d="M69.8511 1.29032H9.54237C4.99662 1.29032 1.29028 4.98374 1.29028 9.5295V69.8382C1.29028 74.384 4.99662 78.0903 9.54237 78.0903H69.8511C74.3969 78.0903 78.0903 74.384 78.0903 69.8382V9.5295C78.0903 4.99666 74.3969 1.29032 69.8511 1.29032ZM53.8247 27.4801H53.8376V27.493H53.8247V27.4801ZM5.17742 29.443H25.7108L25.6074 49.8085H5.17742V29.443ZM25.7108 74.229H9.54237C7.12744 74.229 5.1645 72.2661 5.1645 69.8511V53.6698H25.7108V74.229ZM25.7108 25.5688H5.17742V9.5295C5.17742 7.12748 7.14036 5.16454 9.55529 5.16454H25.7237V25.5688H25.7108ZM49.9505 74.229H29.585V53.5794L49.9505 53.6827V74.229ZM49.8472 49.7956L29.4818 49.6923L29.5721 29.3268L49.9505 29.4043L49.8472 49.7956ZM49.9764 25.543L29.585 25.4654V5.16454H50.0668L49.9764 25.543ZM74.2161 69.8511C74.2161 72.2661 72.2531 74.229 69.8511 74.229H53.8247V53.6698H74.2161V69.8511ZM74.2161 49.7956H53.7343L53.8247 29.4301L74.2161 29.5205V49.7956ZM74.2161 25.6592L53.8505 25.5688L53.941 5.17746H69.8511C72.2531 5.17746 74.2161 7.1404 74.2161 9.54241V25.6592Z" fill="black"/>
      </svg>
    </div>
  );
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
  const puzzleNumber = useMemo(() => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(2024, 0, 1).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - start) / msPerDay));
  }, []);
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
    <div className="min-h-screen bg-blue-300 flex flex-col justify-start items-start overflow-hidden">
      <div className="w-full max-w-[1440px] bg-blue-300 inline-flex flex-col justify-start items-start overflow-hidden">
        <div className="self-stretch px-4 sm:px-10 pt-8 sm:pt-12 flex flex-col justify-start items-center">
          <div className="w-full max-w-[600px] h-[700px] sm:h-[850px] relative">
            
            {/* Back button */}
            <button 
              onClick={handleBack}
              className="absolute top-4 left-4 text-black hover:text-gray-700 transition-colors z-10"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Icon positioned exactly as specified */}
            <div className="absolute w-[600px] h-20 left-[-0.85px] top-[212.52px] inline-flex flex-col justify-start items-start">
              <div className="w-[600px] h-20 px-64 flex flex-col justify-center items-center overflow-hidden">
                <div className="size-20 relative overflow-hidden">
                  <RealiteaseIcon />
                </div>
              </div>
            </div>

            {/* Title with exact positioning and NYTKarnak_Condensed font */}
            <div className="absolute pb-3 left-[198.15px] top-[314.52px] inline-flex flex-col justify-start items-start">
              <div className="flex flex-col justify-start items-center">
                <h1 className="text-center justify-center text-black text-5xl font-bold font-['NYTKarnak_Condensed'] leading-[52px] tracking-wide">
                  Realitease
                </h1>
              </div>
            </div>

            {/* Subtitle with exact positioning and KarnakPro-Book font */}
            <div className="max-w-96 pb-9 left-[112.15px] top-[378.52px] absolute inline-flex flex-col justify-start items-start">
              <div className="h-20 max-w-96 min-w-96 px-[5.16px] flex flex-col justify-start items-center">
                <h2 className="w-[623px] text-center justify-center text-black text-4xl font-normal font-['KarnakPro-Book'] leading-10">
                  Get 8 chances to guess<br/>the Reality TV Star
                </h2>
              </div>
            </div>

            {/* Play Button with exact positioning and NYTFranklin font */}
            <div className="w-[600px] pb-7 left-[0.15px] top-[483.52px] absolute inline-flex flex-col justify-start items-start">
              <div className="self-stretch inline-flex justify-center items-center">
                <div className="w-48 h-14 px-2.5 pb-2 inline-flex flex-col justify-start items-start">
                  <button 
                    onClick={handlePrimaryCta}
                    disabled={isCtaDisabled}
                    className="w-44 h-12 px-8 bg-black rounded-3xl flex flex-col justify-center items-center hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="text-center justify-center text-white text-base font-medium font-['NYTFranklin'] leading-7 tracking-wide">
                      {ctaLabel}
                    </span>
                  </button>
                  {errorMessage && (
                    <p className="mt-3 w-full text-center text-sm text-red-700">
                      {errorMessage}
                    </p>
                  )}
                  {!errorMessage && dailyClue && (
                    <div className="mt-4 w-full rounded-2xl bg-white/70 px-4 py-3 text-center text-sm text-gray-700 shadow-sm backdrop-blur">
                      <p className="font-semibold uppercase tracking-wide text-gray-600">Daily Clue</p>
                      <p className="mt-1 text-gray-800">{dailyClue}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date and Info with exact positioning and specified fonts */}
            <div className="left-[241.15px] top-[577px] absolute inline-flex flex-col justify-start items-start">
              <div className="self-stretch flex flex-col justify-start items-center">
                <div className="text-center justify-center text-black text-base font-bold font-['TN_Web_Use_Only'] leading-tight tracking-tight">
                  {displayDate}
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-center">
                <div className="text-center justify-center text-black text-base font-normal font-['Helvetica_Neue'] leading-tight tracking-tight">
                  No. {puzzleNumber.toString().padStart(4, "0")}
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-center">
                <div className="text-center justify-center text-black text-base font-normal font-['Helvetica_Neue'] leading-tight tracking-tight">
                  Edited by TRR
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
