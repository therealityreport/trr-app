"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";

import { AuthDebugger } from "@/lib/debug";
import { auth } from "@/lib/firebase";
import { useRealiteaseManager } from "@/lib/realitease/manager";
import {
  REALITEASE_BOARD_COLUMNS,
  type RealiteaseGameSnapshot,
  type RealiteaseGuess,
  type RealiteaseGuessField,
  type RealiteaseGuessVerdict,
  type RealiteaseBoardColumnKey,
  type RealiteaseTalentRecord,
  type RealiteaseStatsSummary,
} from "@/lib/realitease/types";
import { getRealiteaseDateKey } from "@/lib/realitease/utils";
import RealiteaseCompletedView, { buildShareText, type ShareStatus } from "./completed-view";

const BOARD_ROWS = 8;
const TILE_FLIP_DURATION_MS = 620;
const BOARD_REVEAL_STAGGER_MS = 120;
const COMPLETION_MODAL_BUFFER_MS = 180;
const COMPLETION_MODAL_DELAY_MS =
  TILE_FLIP_DURATION_MS + BOARD_REVEAL_STAGGER_MS * (REALITEASE_BOARD_COLUMNS.length - 1) + COMPLETION_MODAL_BUFFER_MS;
const BOARD_TILE_MIN_SIZE_PX = 44;
const BOARD_TILE_MAX_SIZE_PX = 75;
const BOARD_TILE_GAP_PX = 5;
const KEYBOARD_ROWS: string[][] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"],
];

const getCellId = (rowIndex: number, columnKey: RealiteaseBoardColumnKey): string => `r${rowIndex}-c${columnKey}`;

function filterRecord<T>(source: Record<string, T>, validKeys: Set<string>): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (validKeys.has(key)) {
      next[key] = value;
    }
  }
  return next;
}

const NONE_IN_COMMON_PATTERN = /^none\s+in\s+common$/i;

const REALITEASE_FEEDBACK_TARGET =
  process.env.NEXT_PUBLIC_REALITEASE_FEEDBACK_URL ?? "mailto:feedback@example.com";

type HowToPlayTabKey = "gender" | "age" | "networks" | "shows" | "wwhl";

const HOW_TO_PLAY_TABS: Array<{ key: HowToPlayTabKey; label: string }> = [
  { key: "gender", label: "GENDER" },
  { key: "age", label: "AGE" },
  { key: "networks", label: "NETWORKS" },
  { key: "shows", label: "SHOWS" },
  { key: "wwhl", label: "WWHL" },
];

function sanitizeBoardText(value: unknown): string {
  if (value == null) return "";
  const text = value.toString().trim();
  if (NONE_IN_COMMON_PATTERN.test(text)) {
    return "";
  }
  return text;
}

function sanitizeBoardVariants(variants: unknown[] | undefined): string[] {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  variants.forEach((variant) => {
    const text = sanitizeBoardText(variant);
    if (!text || seen.has(text)) {
      return;
    }
    seen.add(text);
    sanitized.push(text);
  });

  return sanitized;
}

function resolveFieldDisplay(field: RealiteaseGuessField | undefined | null): {
  sanitizedValue: string;
  sanitizedVariants: string[];
  isNoneInCommon: boolean;
} {
  if (!field) {
    return { sanitizedValue: "", sanitizedVariants: [], isNoneInCommon: false };
  }

  const rawValue = field.value ?? "";
  const isNoneInCommon = NONE_IN_COMMON_PATTERN.test(rawValue.toString().trim());

  if (isNoneInCommon) {
    return { sanitizedValue: "", sanitizedVariants: [], isNoneInCommon };
  }

  return {
    sanitizedValue: sanitizeBoardText(rawValue),
    sanitizedVariants: sanitizeBoardVariants(field.variants),
    isNoneInCommon,
  };
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<HowToPlayTabKey>("shows");

  const renderTile = (label: string, className: string) => (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-sm text-[10px] font-bold uppercase leading-tight text-white ${className}`}
    >
      {label}
    </div>
  );

  const renderTabContent = (tab: HowToPlayTabKey) => {
    switch (tab) {
      case "gender":
        return (
          <div className="space-y-3 text-sm leading-relaxed text-black">
            <p className="font-['HamburgSerial']">
              Gender tiles flip green only when your guess matches the answer exactly.
            </p>
            <ul className="list-disc space-y-1 pl-4 font-['HamburgSerial']">
              <li>
                <span className="font-semibold">Green</span> = same gender.
              </li>
              <li>
                <span className="font-semibold">Gray</span> = no match yet.
              </li>
              <li>Unknown genders stay white until we can verify them.</li>
            </ul>
          </div>
        );
      case "age":
        return (
          <div className="space-y-3 text-sm leading-relaxed text-black">
            <p className="font-['HamburgSerial']">
              The age tile compares current ages (or age on the air date when available).
            </p>
            <ul className="list-disc space-y-1 pl-4 font-['HamburgSerial']">
              <li>
                <span className="font-semibold">Green</span> = exact match.
              </li>
              <li>
                <span className="font-semibold">Yellow</span> = within five years.
              </li>
              <li>
                <span className="font-semibold">Gray</span> = more than five years apart or missing data.
              </li>
            </ul>
            <p className="text-xs text-gray-500">Tip: we handle rounding, so think in whole numbers.</p>
          </div>
        );
      case "networks":
        return (
          <div className="space-y-3 text-sm leading-relaxed text-black">
            <p className="font-['HamburgSerial']">
              Networks highlight when both personalities aired on the same network during overlapping seasons.
            </p>
            <ul className="list-disc space-y-1 pl-4 font-['HamburgSerial']">
              <li>
                <span className="font-semibold">Green</span> = shared network with shared seasons/episodes.
              </li>
              <li>
                <span className="font-semibold">Yellow</span> = same show on the same network, but different seasons.
              </li>
              <li>
                <span className="font-semibold">Purple</span> = multiple matches—tap to cycle through each one.
              </li>
              <li>
                <span className="font-semibold">Gray</span> = no overlap yet.
              </li>
            </ul>
          </div>
        );
      case "shows":
        return (
          <div className="space-y-5 text-sm text-black">
            <p className="font-['HamburgSerial'] text-base font-bold uppercase leading-tight">
              Shows reveal where your guess and the answer co-starred.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {renderTile("RHOA", "bg-slate-500")}
                <div className="font-['HamburgSerial'] text-[15px] leading-tight">
                  <p className="font-bold uppercase">GUESS: SHEREÉ WHITFIELD</p>
                  <p className="font-bold uppercase">MULTIPLE CO-STARRED SHOWS</p>
                  <p className="mt-1">
                    Phaedra and Shereé appeared on <span className="font-semibold">The Traitors</span> (Season 2) and
                    shared several seasons on <span className="font-semibold">RHOA</span>. Because they share more
                    episodes of RHOA, that show owns the tile. <span className="font-semibold text-[#28578A]">Blue</span>{" "}
                    variants call out additional shared shows.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderTile("RHUGT", "bg-[#60811F]")}
                <div className="font-['HamburgSerial'] text-[15px] leading-tight">
                  <p className="font-bold uppercase">GUESS: VICKI GUNVALSON</p>
                  <p className="font-bold uppercase">ONE CO-STARRED SHOW; 1+ SEASON</p>
                  <p className="mt-1">
                    Vicki and Phaedra both starred in <span className="font-semibold">RHUGT</span> Season 2.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderTile("DWTS", "bg-[#E6B903]")}
                <div className="font-['HamburgSerial'] text-[15px] leading-tight">
                  <p className="font-bold uppercase">GUESS: DYLAN EFRON</p>
                  <p className="font-bold uppercase">SAME SHOW, DIFFERENT SEASONS</p>
                  <p className="mt-1">
                    They both appeared on <span className="font-semibold">The Traitors</span> and
                    <span className="font-semibold"> Dancing with the Stars</span>—just not in the same seasons, so the
                    tile turns gold for a partial match.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {renderTile("—", "bg-[#5D5F63]")}
                <div className="font-['HamburgSerial'] text-[15px] leading-tight">
                  <p className="font-bold uppercase">GUESS: KIM RICHARDS</p>
                  <p className="font-bold uppercase">NO SHARED SHOWS (OR SEASONS)</p>
                </div>
              </div>
            </div>

            <p className="font-['TN_Web_Use_Only'] text-sm font-bold uppercase tracking-[0.3em] text-black">
              ANSWER: PHAEDRA PARKS
            </p>
          </div>
        );
      case "wwhl":
        return (
          <div className="space-y-3 text-sm leading-relaxed text-black">
            <p className="font-['HamburgSerial']">Watch What Happens Live can be a secret weapon.</p>
            <ul className="list-disc space-y-1 pl-4 font-['HamburgSerial']">
              <li>
                <span className="font-semibold">Green</span> = same total number of appearances.
              </li>
              <li>
                <span className="font-semibold">Yellow</span> = within two episodes.
              </li>
              <li>
                <span className="font-semibold text-[#28578A]">Blue</span> = same episode—tap to cycle through them.
              </li>
              <li>
                <span className="font-semibold">Gray</span> = no overlap yet.
              </li>
            </ul>
            <p className="text-xs text-gray-500">Tap a blue tile to browse every shared appearance.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="BackgroundBorderShadow relative z-10 w-full max-w-[520px] rounded-lg bg-white px-8 pt-2 pb-8 shadow-[0px_4px_23px_rgba(0,0,0,0.2)] outline outline-1 outline-offset-[-1px] outline-gray-200"
      >
        <button
          type="button"
          onClick={onClose}
          className="ButtonClose absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-black transition hover:bg-black/5"
          aria-label="Close How to Play"
        >
          <svg width="24" height="24" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24.0249 8.84795L22.2624 7.08545L15.2749 14.0729L8.28743 7.08545L6.52493 8.84795L13.5124 15.8354L6.52493 22.8229L8.28743 24.5854L15.2749 17.5979L22.2624 24.5854L24.0249 22.8229L17.0374 15.8354L24.0249 8.84795Z" fill="currentColor" />
          </svg>
        </button>

        <div className="Container flex max-h-[820px] flex-col gap-6 overflow-y-auto px-4 pt-6 pb-4">
          <div className="space-y-4 text-left">
            <h2 className="font-['NYTKarnak_Condensed'] text-3xl font-bold leading-none text-black">How To Play</h2>
            <p className="font-['NYTKarnak_Condensed'] text-xl font-bold leading-tight text-black">
              Guess the Reality Personality in 8 tries.
            </p>
            <ul className="space-y-1 text-base font-medium leading-tight text-black">
              <li className="font-['TN_Web_Use_Only']">
                Each guess must be a valid Reality TV personality from our list of shows.
              </li>
              <li className="font-['TN_Web_Use_Only']">
                The color of the tiles will change to show how close your guess was to the correct person.
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {HOW_TO_PLAY_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`text-base uppercase tracking-[0.25em] transition-colors font-['TN_Web_Use_Only'] ${
                      isActive ? "font-bold text-slate-500" : "font-medium text-black"
                    }`}
                    aria-pressed={isActive}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div>{renderTabContent(activeTab)}</div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RealiteaseGamePage() {
  const router = useRouter();
  const manager = useRealiteaseManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [gameSnapshot, setGameSnapshot] = useState<RealiteaseGameSnapshot | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [talentQuery, setTalentQuery] = useState("");
  const [talentIndex, setTalentIndex] = useState<RealiteaseTalentRecord[] | null>(null);
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentError, setTalentError] = useState<string | null>(null);
  const [selectedTalent, setSelectedTalent] = useState<RealiteaseTalentRecord | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [completionStats, setCompletionStats] = useState<RealiteaseStatsSummary | null>(null);
  const [completionStatsLoading, setCompletionStatsLoading] = useState(false);
  const [completionStatsError, setCompletionStatsError] = useState<string | null>(null);
  const [completionShareStatus, setCompletionShareStatus] = useState<ShareStatus>("idle");
  const [completionLoadedSignature, setCompletionLoadedSignature] = useState<string | null>(null);
  const [forceStatsRequested, setForceStatsRequested] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const helpMenuRef = useRef<HTMLDivElement | null>(null);
  const shareResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionSignatureRef = useRef<string | null>(null);
  const previousGuessCountRef = useRef<number>(0);
  const hasInitializedGuessCountRef = useRef(false);
  const completionAnimationNeededRef = useRef(false);

  const puzzleDateKey = useMemo(() => getRealiteaseDateKey(), []);
  const userId = user?.uid ?? null;

  useEffect(() => {
    if (!isHelpMenuOpen) return;
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!helpMenuRef.current || (target && helpMenuRef.current.contains(target))) {
        return;
      }
      setIsHelpMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHelpMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHelpMenuOpen]);

  useEffect(() => {
    if (!isHowToPlayOpen) return;
    if (typeof document === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHowToPlayOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHowToPlayOpen]);

  const handleOpenHowToPlay = useCallback(() => {
    setIsHowToPlayOpen(true);
    setIsHelpMenuOpen(false);
  }, []);

  const handleFeedback = useCallback(() => {
    setIsHelpMenuOpen(false);
    if (typeof window === "undefined") return;

    const target = REALITEASE_FEEDBACK_TARGET;
    if (!target) return;

    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = target;
  }, []);

  const handleOpenStatsModal = useCallback(() => {
    setIsHelpMenuOpen(false);
    if (completionShowTimeoutRef.current) {
      clearTimeout(completionShowTimeoutRef.current);
      completionShowTimeoutRef.current = null;
    }
    completionAnimationNeededRef.current = false;
    setIsCompletionOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("show") === "stats") {
      setForceStatsRequested(true);
      url.searchParams.delete("show");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, []);

  const handleShareResults = useCallback(async () => {
    if (!gameSnapshot) return;
    if (typeof navigator === "undefined") return;

    const shareText = buildShareText(
      gameSnapshot.puzzleDate ?? puzzleDateKey,
      gameSnapshot.guesses ?? [],
      BOARD_ROWS,
      gameSnapshot.guessNumberSolved ?? null,
    );

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(shareText);
      } else {
        throw new Error("Sharing not supported");
      }
      setCompletionShareStatus("success");
    } catch (error) {
      console.error("Realitease share failed", error);
      setCompletionShareStatus("error");
    } finally {
      if (shareResetTimeoutRef.current) {
        clearTimeout(shareResetTimeoutRef.current);
      }
      shareResetTimeoutRef.current = setTimeout(() => {
        setCompletionShareStatus("idle");
        shareResetTimeoutRef.current = null;
      }, 2500);
    }
  }, [gameSnapshot, puzzleDateKey]);

  useEffect(() => {
    AuthDebugger.log("Realitease Game: Component mounted");
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      AuthDebugger.log("Realitease Game: Auth state changed", {
        hasUser: !!authUser,
        email: authUser?.email,
      });
      setUser(authUser);
      setAuthLoading(false);
      setErrorMessage(null);
    });

    return () => {
      AuthDebugger.log("Realitease Game: Component unmounting");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentCount = gameSnapshot?.guesses?.length ?? 0;
    if (!hasInitializedGuessCountRef.current) {
      previousGuessCountRef.current = currentCount;
      hasInitializedGuessCountRef.current = true;
      return;
    }
    if (currentCount > previousGuessCountRef.current) {
      completionAnimationNeededRef.current = true;
    }
    previousGuessCountRef.current = currentCount;
  }, [gameSnapshot?.guesses?.length]);

  useEffect(() => {
    hasInitializedGuessCountRef.current = false;
    previousGuessCountRef.current = gameSnapshot?.guesses?.length ?? 0;
    completionAnimationNeededRef.current = false;
  }, [gameSnapshot?.puzzleDate, gameSnapshot?.guesses?.length]);

  useEffect(() => {
    if (!authLoading && !userId) {
      AuthDebugger.log("Realitease Game: No user, redirecting to register");
      router.replace("/auth/register");
    }
  }, [authLoading, router, userId]);

  useEffect(() => {
    if (!userId) return;

    let isActive = true;
    let unsubscribe: (() => void) | null = null;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setErrorMessage(null);

      try {
        AuthDebugger.log("Realitease Game: Starting bootstrap", {
          uid: userId,
          puzzleDateKey,
        });

        const snapshot = await manager.startGame({ uid: userId, gameDate: puzzleDateKey });
        if (!isActive) return;

        setGameSnapshot(snapshot);

        unsubscribe = manager.subscribeToGame({
          uid: userId,
          gameDate: puzzleDateKey,
          onChange: (next) => {
            if (!next || !isActive) return;
            setGameSnapshot(next);
          },
        });
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "Unable to load today's puzzle";
        AuthDebugger.log("Realitease Game: Bootstrap failed", { message });
        setErrorMessage(message);
      } finally {
        if (isActive) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [manager, puzzleDateKey, userId]);

  useEffect(() => {
    if (!gameSnapshot?.gameCompleted) {
      setIsCompletionOpen(false);
      return;
    }
  }, [gameSnapshot?.gameCompleted]);

  useEffect(() => {
    if (!gameSnapshot) return;
    if (!userId) return;
    if (!manager) return;
    if (!gameSnapshot.gameCompleted && !forceStatsRequested) return;

    const dateKey = gameSnapshot.puzzleDate ?? puzzleDateKey;
    const solvedGuessNumber = gameSnapshot?.guessNumberSolved ?? null;
    const signature = `${dateKey}:${solvedGuessNumber ?? "X"}`;

    if (completionLoadedSignature === signature && completionStats) {
      return;
    }

    let isCancelled = false;
    setCompletionStatsLoading(true);
    setCompletionStatsError(null);
    if (completionLoadedSignature !== signature) {
      setCompletionStats(null);
    }

    manager
      .getUserStatsSummary(userId)
      .then((summary) => {
        if (isCancelled) return;
        setCompletionStats(summary);
        setCompletionLoadedSignature(signature);
      })
      .catch((error) => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : "Unable to load stats";
        setCompletionStatsError(message);
      })
      .finally(() => {
        if (!isCancelled) {
          setCompletionStatsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [
    completionLoadedSignature,
    completionStats,
    forceStatsRequested,
    gameSnapshot,
    manager,
    puzzleDateKey,
    userId,
  ]);

  useEffect(() => {
    if (!forceStatsRequested) return;
    handleOpenStatsModal();
    setForceStatsRequested(false);
  }, [forceStatsRequested, handleOpenStatsModal]);

  useEffect(() => {
    if (completionShowTimeoutRef.current) {
      clearTimeout(completionShowTimeoutRef.current);
      completionShowTimeoutRef.current = null;
    }

    if (!gameSnapshot?.gameCompleted) {
      completionAnimationNeededRef.current = false;
      return;
    }

    const dateKey = gameSnapshot.puzzleDate ?? puzzleDateKey;
    const solvedGuessNumber = gameSnapshot.guessNumberSolved ?? null;
    const signature = `${dateKey}:${solvedGuessNumber ?? "X"}`;
    const isNewCompletion = completionSignatureRef.current !== signature;
    if (isNewCompletion) {
      completionSignatureRef.current = signature;
    }

    const shouldDelay = isNewCompletion && completionAnimationNeededRef.current && !forceStatsRequested;
    const delay = shouldDelay ? COMPLETION_MODAL_DELAY_MS : 0;

    completionShowTimeoutRef.current = setTimeout(() => {
      setIsCompletionOpen(true);
      completionAnimationNeededRef.current = false;
    }, delay);

    return () => {
      if (completionShowTimeoutRef.current) {
        clearTimeout(completionShowTimeoutRef.current);
        completionShowTimeoutRef.current = null;
      }
    };
  }, [gameSnapshot?.gameCompleted, gameSnapshot?.guessNumberSolved, gameSnapshot?.puzzleDate, puzzleDateKey, forceStatsRequested]);

  useEffect(() => {
    if (!isCompletionOpen && completionShareStatus !== "idle") {
      setCompletionShareStatus("idle");
    }
  }, [isCompletionOpen, completionShareStatus]);

  useEffect(() => {
    return () => {
      if (shareResetTimeoutRef.current) {
        clearTimeout(shareResetTimeoutRef.current);
        shareResetTimeoutRef.current = null;
      }
      if (completionShowTimeoutRef.current) {
        clearTimeout(completionShowTimeoutRef.current);
        completionShowTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setTalentError(null);
    setTalentLoading(true);

    manager
      .getTalentIndex()
      .then((talents) => {
        if (!isMounted) return;
        setTalentIndex(talents);
      })
      .catch((error) => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load talent list";
        AuthDebugger.log("Realitease Game: Talent index fetch failed", { message });
        setTalentError(message);
      })
      .finally(() => {
        if (isMounted) setTalentLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [manager]);

  const findTalentByQuery = useCallback(
    (value: string): RealiteaseTalentRecord | null => {
      if (!talentIndex) return null;
      const normalized = value.trim().toLowerCase();
      if (!normalized) return null;

      for (const talent of talentIndex) {
        if (talent.name.toLowerCase() === normalized) {
          return talent;
        }
        if (talent.alternativeNames.some((alt) => alt.toLowerCase() === normalized)) {
          return talent;
        }
        if (talent.id.toLowerCase() === normalized) {
          return talent;
        }
        if (talent.imdbId && talent.imdbId.toLowerCase() === normalized) {
          return talent;
        }
      }

      return null;
    },
    [talentIndex],
  );

  const applyQueryValue = useCallback(
    (
      nextValue: string,
      options: { openDropdown?: boolean; selectedTalent?: RealiteaseTalentRecord | null } = {},
    ) => {
      setTalentQuery(nextValue);
      setSearchError(null);

      const trimmed = nextValue.trim();
      if (options.openDropdown === false) {
        setIsSearchDropdownOpen(false);
      } else {
        setIsSearchDropdownOpen(trimmed.length >= 3);
      }

      if (options.selectedTalent !== undefined) {
        setSelectedTalent(options.selectedTalent);
      } else {
        setSelectedTalent(findTalentByQuery(nextValue));
      }
    },
    [findTalentByQuery],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      applyQueryValue(value, { openDropdown: true });
    },
    [applyQueryValue],
  );

  const handleSelectTalent = useCallback(
    (talent: RealiteaseTalentRecord) => {
      applyQueryValue(talent.name, { openDropdown: false, selectedTalent: talent });
      setSearchError(null);
      setIsSearchDropdownOpen(false);
      searchInputRef.current?.focus();
    },
    [applyQueryValue],
  );

  const handleDropdownToggle = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsSearchDropdownOpen(false);
        return;
      }
      setIsSearchDropdownOpen(talentQuery.trim().length >= 3);
    },
    [talentQuery],
  );

  const guessesCount = gameSnapshot?.guesses?.length ?? 0;
  const maxGuessesReached = guessesCount >= BOARD_ROWS;
  const todaySolvedGuessNumber = gameSnapshot?.guessNumberSolved ?? null;
  const didWinToday = todaySolvedGuessNumber !== null;

  const handleSubmitGuess = useCallback(async () => {
    if (!userId || !manager) return;
    if (gameSnapshot?.gameCompleted || maxGuessesReached) {
      if (maxGuessesReached) {
        setSearchError("You have used all guesses for today.");
        setIsSearchDropdownOpen(true);
      }
      return;
    }
    if (isSubmittingGuess) return;

    const talentToSubmit = selectedTalent ?? findTalentByQuery(talentQuery);
    if (!talentToSubmit) {
      setSearchError("No talent found. Try another name.");
      setIsSearchDropdownOpen(true);
      return;
    }

    const existingGuess = gameSnapshot?.guesses?.some((guess) => {
      const normalizedCastName = guess.castName?.trim().toLowerCase();
      const normalizedTalentName = talentToSubmit.name.trim().toLowerCase();
      if (normalizedCastName === normalizedTalentName) return true;
      if (guess.derived?.castId && talentToSubmit.id) {
        return guess.derived.castId === talentToSubmit.id;
      }
      return false;
    });

    if (existingGuess) {
      setSearchError("You already guessed that talent today.");
      setIsSearchDropdownOpen(true);
      return;
    }

    setIsSubmittingGuess(true);
    setSearchError(null);
    try {
      await manager.submitGuess({ uid: userId, talent: talentToSubmit, gameDate: puzzleDateKey });
      applyQueryValue("", { openDropdown: false, selectedTalent: null });
      searchInputRef.current?.focus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit guess";
      setSearchError(message);
      setIsSearchDropdownOpen(true);
    } finally {
      setIsSubmittingGuess(false);
    }
  }, [
    applyQueryValue,
    findTalentByQuery,
    gameSnapshot?.gameCompleted,
    gameSnapshot?.guesses,
    isSubmittingGuess,
    manager,
    maxGuessesReached,
    puzzleDateKey,
    selectedTalent,
    talentQuery,
    userId,
  ]);

  const handleKeyboardInput = useCallback(
    (key: string) => {
      if (gameSnapshot?.gameCompleted || maxGuessesReached || isSubmittingGuess) return;
      applyQueryValue(`${talentQuery}${key.toUpperCase()}`, { openDropdown: true });
      searchInputRef.current?.focus();
    },
    [applyQueryValue, gameSnapshot?.gameCompleted, isSubmittingGuess, maxGuessesReached, talentQuery],
  );

  const handleKeyboardBackspace = useCallback(() => {
    if (gameSnapshot?.gameCompleted || maxGuessesReached || isSubmittingGuess) return;
    if (!talentQuery.length) return;
    applyQueryValue(talentQuery.slice(0, -1), { openDropdown: true });
    searchInputRef.current?.focus();
  }, [applyQueryValue, gameSnapshot?.gameCompleted, isSubmittingGuess, maxGuessesReached, talentQuery]);

  const talentMatches = useMemo(() => {
    const query = talentQuery.trim().toLowerCase();
    if (query.length < 3 || !talentIndex) {
      return [] as Array<{ talent: RealiteaseTalentRecord; matchedAlternative?: string }>;
    }

    const matches: Array<{ talent: RealiteaseTalentRecord; matchedAlternative?: string }> = [];

    for (const talent of talentIndex) {
      const normalizedName = talent.name.toLowerCase();
      if (normalizedName.includes(query)) {
        matches.push({ talent });
      } else {
        const matchedAlternative = talent.alternativeNames.find((alt) => alt.toLowerCase().includes(query));
        if (matchedAlternative) {
          matches.push({ talent, matchedAlternative });
        }
      }

      if (matches.length >= 3) break;
    }

    return matches;
  }, [talentIndex, talentQuery]);

  const orderedGuesses = useMemo(() => {
    if (!gameSnapshot?.guesses) return [] as RealiteaseGuess[];
    return [...gameSnapshot.guesses].sort((a, b) => a.guessNumber - b.guessNumber);
  }, [gameSnapshot?.guesses]);

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

  if (authLoading || (isBootstrapping && !gameSnapshot)) {
    return (
      <div className="min-h-screen bg-blue-300 flex items-center justify-center">
        <p className="text-black">Loading Realitease...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-blue-300 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="text-gray-600">{errorMessage}</p>
          <button
            onClick={() => router.push("/realitease/cover")}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-white hover:bg-gray-800"
          >
            Back to Cover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col">
        <header className="flex h-16 w-full items-center justify-between border-b-2 border-zinc-400 px-3 pr-6">
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push("/hub")}
              className="rounded-full p-2 transition hover:bg-zinc-100"
              aria-label="More games"
            >
              <svg width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.93156 22.3358C7.61245 22.3358 7.34316 22.226 7.12367 22.0066C6.90418 21.7871 6.79443 21.5178 6.79443 21.1987C6.79443 20.8796 6.90418 20.6103 7.12367 20.3909C7.34316 20.1714 7.61245 20.0616 7.93156 20.0616H24.0573C24.3764 20.0616 24.6457 20.1714 24.8652 20.3909C25.0847 20.6103 25.1944 20.8796 25.1944 21.1987C25.1944 21.5178 25.0847 21.7871 24.8652 22.0066C24.6457 22.226 24.3764 22.3358 24.0573 22.3358H7.93156ZM7.93156 17.1822C7.61245 17.1822 7.34316 17.0725 7.12367 16.8529C6.90418 16.6335 6.79443 16.3642 6.79443 16.0451C6.79443 15.726 6.90418 15.4567 7.12367 15.2372C7.34316 15.0178 7.61245 14.908 7.93156 14.908H24.0573C24.3764 14.908 24.6457 15.0178 24.8652 15.2372C25.0847 15.4567 25.1944 15.726 25.1944 16.0451C25.1944 16.3642 25.0847 16.6335 24.8652 16.8529C24.6457 17.0725 24.3764 17.1822 24.0573 17.1822H7.93156ZM7.93156 12.0286C7.61245 12.0286 7.34316 11.9189 7.12367 11.6994C6.90418 11.4799 6.79443 11.2106 6.79443 10.8915C6.79443 10.5724 6.90418 10.3031 7.12367 10.0836C7.34316 9.86414 7.61245 9.75439 7.93156 9.75439H24.0573C24.3764 9.75439 24.6457 9.86414 24.8652 10.0836C25.0847 10.3031 25.1944 10.5724 25.1944 10.8915C25.1944 11.2106 25.0847 11.4799 24.8652 11.6994C24.6457 11.9189 24.3764 12.0286 24.0573 12.0286H7.93156Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenStatsModal}
              className="rounded-full p-2 transition hover:bg-zinc-100"
              aria-label="View statistics"
            >
              <svg width="29" height="24" viewBox="0 0 29 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.0623 10.662V-0.00195312H9.39836V7.99601H1.40039V23.9919H28.0603V10.662H20.0623ZM12.0644 2.66404H17.3963V21.3259H12.0644V2.66404ZM4.06638 10.662H9.39836V21.3259H4.06638V10.662ZM25.3943 21.3259H20.0623V13.328H25.3943V21.3259Z" fill="currentColor" />
              </svg>
            </button>
            <div className="relative" ref={helpMenuRef}>
              <button
                type="button"
                onClick={() => setIsHelpMenuOpen((prev) => !prev)}
                className="rounded-full p-2 transition hover:bg-zinc-100"
                aria-label="Help"
                aria-haspopup="menu"
                aria-expanded={isHelpMenuOpen}
              >
                <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.6955 23.9923H18.3613V21.3265H15.6955V23.9923ZM17.0284 2.66565C9.67068 2.66565 3.69922 8.63711 3.69922 15.9948C3.69922 23.3525 9.67068 29.324 17.0284 29.324C24.3861 29.324 30.3576 23.3525 30.3576 15.9948C30.3576 8.63711 24.3861 2.66565 17.0284 2.66565ZM17.0284 26.6582C11.1502 26.6582 6.36506 21.873 6.36506 15.9948C6.36506 10.1167 11.1502 5.33148 17.0284 5.33148C22.9065 5.33148 27.6917 10.1167 27.6917 15.9948C27.6917 21.873 22.9065 26.6582 17.0284 26.6582ZM17.0284 7.99731C14.0827 7.99731 11.6967 10.3833 11.6967 13.329H14.3626C14.3626 11.8628 15.5622 10.6632 17.0284 10.6632C18.4946 10.6632 19.6942 11.8628 19.6942 13.329C19.6942 15.9948 15.6955 15.6616 15.6955 19.9936H18.3613C18.3613 16.9945 22.3601 16.6613 22.3601 13.329C22.3601 10.3833 19.9741 7.99731 17.0284 7.99731Z" fill="currentColor" />
                </svg>
              </button>
              {isHelpMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-2 shadow-xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleOpenHowToPlay}
                    className="flex w-full items-center justify-start px-4 py-2 text-left text-sm font-medium text-gray-800 transition hover:bg-black/5"
                  >
                    How to Play
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleFeedback}
                    className="flex w-full items-center justify-start px-4 py-2 text-left text-sm font-medium text-gray-800 transition hover:bg-black/5"
                  >
                    Feedback
                  </button>
                </div>
              )}
            </div>
            <button
              className="rounded-full p-2 transition hover:bg-zinc-100"
              aria-label="Settings"
            >
              <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M27.5292 17.3316C27.5806 16.9032 27.6148 16.4576 27.6148 15.9949C27.6148 15.5321 27.5806 15.0865 27.512 14.6581L30.4083 12.3959C30.6654 12.1902 30.734 11.8133 30.5797 11.5219L27.8377 6.77467C27.6662 6.4662 27.3063 6.36337 26.9978 6.4662L23.5874 7.83723C22.8676 7.28881 22.1136 6.84323 21.2738 6.50047L20.7597 2.86723C20.7083 2.52448 20.4169 2.28455 20.0742 2.28455H14.59C14.2473 2.28455 13.9731 2.52448 13.9216 2.86723L13.4075 6.50047C12.5677 6.84323 11.7966 7.30596 11.0939 7.83723L7.68346 6.4662C7.37498 6.34623 7.01508 6.4662 6.8437 6.77467L4.10164 11.5219C3.93026 11.8304 3.99881 12.1902 4.27302 12.3959L7.16932 14.6581C7.10077 15.0865 7.04936 15.5493 7.04936 15.9949C7.04936 16.4404 7.08363 16.9032 7.15219 17.3316L4.25587 19.5938C3.99881 19.7995 3.93026 20.1766 4.0845 20.4679L6.82656 25.2151C6.99795 25.5236 7.35783 25.6263 7.66632 25.5236L11.0768 24.1525C11.7966 24.7009 12.5507 25.1465 13.3904 25.4893L13.9045 29.1225C13.9731 29.4653 14.2473 29.7052 14.59 29.7052H20.0742C20.4169 29.7052 20.7083 29.4653 20.7426 29.1225L21.2566 25.4893C22.0965 25.1465 22.8676 24.6837 23.5703 24.1525L26.9807 25.5236C27.2892 25.6435 27.6491 25.5236 27.8205 25.2151L30.5625 20.4679C30.734 20.1594 30.6654 19.7995 30.3912 19.5938L27.5292 17.3316ZM17.3321 21.1363C14.5043 21.1363 12.1908 18.8226 12.1908 15.9949C12.1908 13.1671 14.5043 10.8535 17.3321 10.8535C20.1599 10.8535 22.4734 13.1671 22.4734 15.9949C22.4734 18.8226 20.1599 21.1363 17.3321 21.1363Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </header>

        <main className="flex flex-1 justify-center px-4 pb-12 pt-10">
          <div className="flex w-full max-w-[500px] flex-col items-center gap-8">
            <TalentSearch
              query={talentQuery}
              onQueryChange={handleQueryChange}
              matches={talentMatches}
              loading={talentLoading}
              rosterError={talentError}
              searchError={searchError}
              clue={dailyClue}
              dropdownOpen={isSearchDropdownOpen}
              onDropdownToggle={handleDropdownToggle}
              onSelect={handleSelectTalent}
              onSubmit={handleSubmitGuess}
              inputRef={searchInputRef}
            />

            <div className="w-full">
              <RealiteaseBoard guesses={orderedGuesses} />
            </div>

            <RealiteaseKeyboard
              disabled={gameSnapshot?.gameCompleted || isSubmittingGuess || maxGuessesReached}
              onKey={handleKeyboardInput}
              onBackspace={handleKeyboardBackspace}
              onEnter={handleSubmitGuess}
            />
          </div>
        </main>

        <RealiteaseCompletedView
          open={isCompletionOpen}
          loading={completionStatsLoading}
          error={completionStatsError}
          onClose={() => setIsCompletionOpen(false)}
          stats={completionStats}
          todayGuessNumber={todaySolvedGuessNumber}
          maxGuesses={BOARD_ROWS}
          isWin={didWinToday}
          onShare={handleShareResults}
          shareStatus={completionShareStatus}
          shareDisabled={!gameSnapshot || completionStatsLoading}
        />

        {isHowToPlayOpen && <HowToPlayModal onClose={() => setIsHowToPlayOpen(false)} />}
      </div>
    </div>
  );
}

interface TalentSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  matches: Array<{ talent: RealiteaseTalentRecord; matchedAlternative?: string }>;
  loading: boolean;
  rosterError: string | null;
  searchError: string | null;
  clue: string | null;
  dropdownOpen: boolean;
  onDropdownToggle: (open: boolean) => void;
  onSelect: (talent: RealiteaseTalentRecord) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

function TalentSearch({
  query,
  onQueryChange,
  matches,
  loading,
  rosterError,
  searchError,
  clue,
  dropdownOpen,
  onDropdownToggle,
  onSelect,
  onSubmit,
  inputRef,
}: TalentSearchProps) {
  const trimmedQuery = query.trim();
  const showDropdown = dropdownOpen && (trimmedQuery.length >= 3 || Boolean(searchError));
  const hasResults = matches.length > 0;

  return (
    <div className="relative w-full max-w-[384px]">
      <div className="rounded-[3px] border border-zinc-500">
        <input
          id="realitease-talent-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={() => onDropdownToggle(true)}
          onBlur={() => onDropdownToggle(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
            if (event.key === "Escape") {
              onDropdownToggle(false);
            }
          }}
          ref={inputRef}
          placeholder="Start typing a reality star’s name..."
          className="w-full rounded-[2px] border border-white px-4 py-2 text-sm font-medium text-gray-800 focus:border-black focus:outline-none"
          aria-label="Search roster"
        />
      </div>
      {clue && (
        <div className="mt-3 rounded-[6px] border border-zinc-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
          <p className="font-semibold uppercase tracking-[0.25em] text-zinc-500">Daily Clue</p>
          <p className="mt-2 text-gray-800">{clue}</p>
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-600">Loading roster…</div>
          ) : rosterError ? (
            <div className="px-4 py-3 text-sm text-red-600">{rosterError}</div>
          ) : (
            <>
              {searchError && <div className="px-4 py-3 text-sm text-red-600">{searchError}</div>}
              {hasResults ? (
                <ul className="divide-y divide-zinc-100">
                  {matches.map(({ talent, matchedAlternative }) => (
                    <li key={talent.id}>
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          onSelect(talent);
                          onDropdownToggle(false);
                        }}
                        className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-black/5"
                      >
                        <span className="text-sm font-semibold text-gray-900">{talent.name}</span>
                        {matchedAlternative && (
                          <span className="text-xs text-gray-500">Matches alternative: {matchedAlternative}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500">
                  {searchError ?? "No talent found. Try another name."}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RealiteaseBoard({ guesses }: { guesses: RealiteaseGuess[] }) {
  const rows = useMemo(() => {
    const grid: Array<RealiteaseGuess | null> = Array.from({ length: BOARD_ROWS }, () => null);
    guesses.slice(0, BOARD_ROWS).forEach((guess, index) => {
      grid[index] = guess;
    });
    return grid;
  }, [guesses]);

  const [variantIndices, setVariantIndices] = useState<Record<string, number>>({});
  const [manualFlipCounters, setManualFlipCounters] = useState<Record<string, number>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [cellDelays, setCellDelays] = useState<Record<string, number>>({});
  const [tileSize, setTileSize] = useState<number>(58);
  const revealedCellsRef = useRef<Record<string, boolean>>({});
  const cellDelaysRef = useRef<Record<string, number>>({});
  const initialGuessNumbersRef = useRef<Set<number>>(new Set());
  const hasCapturedInitialGuessesRef = useRef(false);
  const previousGuessCountRef = useRef<number>(guesses.length);
  const revealTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const element = boardRef.current;
    if (!element) return;

    const computeSize = () => {
      if (!element) return;
      const parentWidth = element.parentElement?.clientWidth ?? element.clientWidth;
      const availableWidth = Math.max(parentWidth, BOARD_TILE_MIN_SIZE_PX * REALITEASE_BOARD_COLUMNS.length);
      const available = availableWidth - BOARD_TILE_GAP_PX * (REALITEASE_BOARD_COLUMNS.length - 1);
      const computedSize = Math.max(
        BOARD_TILE_MIN_SIZE_PX,
        Math.min(BOARD_TILE_MAX_SIZE_PX, available / REALITEASE_BOARD_COLUMNS.length || BOARD_TILE_MIN_SIZE_PX),
      );
      setTileSize((prev) => {
        const next = Number.isFinite(computedSize) ? computedSize : prev;
        return Math.round(next) === Math.round(prev) ? prev : next;
      });
    };

    computeSize();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => computeSize()) : null;
    observer?.observe(element);

    window.addEventListener("resize", computeSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", computeSize);
    };
  }, []);

  useEffect(() => {
    setVariantIndices({});
  }, [guesses]);

  useEffect(() => {
    if (!hasCapturedInitialGuessesRef.current || guesses.length < previousGuessCountRef.current) {
      initialGuessNumbersRef.current = new Set(guesses.map((guess) => guess.guessNumber));
      hasCapturedInitialGuessesRef.current = true;
    }
    previousGuessCountRef.current = guesses.length;
  }, [guesses]);

  useEffect(() => {
    return () => {
      revealTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      revealTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const validIds = new Set<string>();
    rows.forEach((_, rowIndex) => {
      REALITEASE_BOARD_COLUMNS.forEach(({ key }) => {
        validIds.add(getCellId(rowIndex, key));
      });
    });

    setVariantIndices((prev) => {
      if (Object.keys(prev).every((key) => validIds.has(key))) return prev;
      return filterRecord(prev, validIds);
    });

    setManualFlipCounters((prev) => {
      if (Object.keys(prev).every((key) => validIds.has(key))) return prev;
      return filterRecord(prev, validIds);
    });

    setCellDelays((prev) => {
      if (Object.keys(prev).every((key) => validIds.has(key))) return prev;
      const filtered = filterRecord(prev, validIds);
      cellDelaysRef.current = filtered;
      return filtered;
    });

    setRevealedCells((prev) => {
      if (Object.keys(prev).every((key) => validIds.has(key))) return prev;
      const filtered = filterRecord(prev, validIds);
      revealedCellsRef.current = filtered;
      return filtered;
    });
  }, [rows]);

  useEffect(() => {
    const sortedGuesses = [...guesses]
      .slice(0, BOARD_ROWS)
      .sort((a, b) => a.guessNumber - b.guessNumber);

    if (sortedGuesses.length === 0) {
      return;
    }

    const rowIndexMap = new Map<number, number>();
    rows.forEach((rowGuess, rowIndex) => {
      if (rowGuess) {
        rowIndexMap.set(rowGuess.guessNumber, rowIndex);
      }
    });

    const initialGuessNumbers = initialGuessNumbersRef.current;
    const initialRevealCells: string[] = [];
    const animatedCells: string[] = [];

    sortedGuesses.forEach((guess) => {
      const rowIndex = rowIndexMap.get(guess.guessNumber);
      if (rowIndex == null) return;

      REALITEASE_BOARD_COLUMNS.forEach(({ key }) => {
        const field = guess.fields.find((item) => item.key === key);
        if (!field) return;
        const { sanitizedVariants, sanitizedValue } = resolveFieldDisplay(field);
        const candidate = sanitizedVariants[0] ?? sanitizedValue;
        const shouldRevealEmptyValue =
          candidate.length === 0 &&
          field.verdict === "incorrect" &&
          (key === "network" || key === "shows");
        if (candidate.length === 0 && !shouldRevealEmptyValue) return;

        const cellId = getCellId(rowIndex, key);
        if (revealedCellsRef.current[cellId]) return;

        if (initialGuessNumbers.has(guess.guessNumber)) {
          initialRevealCells.push(cellId);
        } else {
          animatedCells.push(cellId);
        }
      });
    });

    if (initialRevealCells.length > 0) {
      const nextRevealed = { ...revealedCellsRef.current };
      initialRevealCells.forEach((cellId) => {
        nextRevealed[cellId] = true;
      });

      revealedCellsRef.current = nextRevealed;
      setRevealedCells(nextRevealed);

      const delayPatch: Record<string, number> = {};
      initialRevealCells.forEach((cellId) => {
        if (cellDelaysRef.current[cellId] == null) {
          delayPatch[cellId] = 0;
        }
      });

      if (Object.keys(delayPatch).length > 0) {
        setCellDelays((prev) => {
          const next = { ...prev, ...delayPatch };
          cellDelaysRef.current = next;
          return next;
        });
      }
    }

    if (animatedCells.length === 0) {
      return;
    }

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];

    animatedCells.forEach((cellId, index) => {
      const delay = index * 120;

      if (cellDelaysRef.current[cellId] == null) {
        setCellDelays((prev) => {
          if (prev[cellId] !== undefined) return prev;
          const next = { ...prev, [cellId]: delay };
          cellDelaysRef.current = next;
          return next;
        });
      }

      const timeout = setTimeout(() => {
        setRevealedCells((prev) => {
          if (prev[cellId]) return prev;
          const next = { ...prev, [cellId]: true };
          revealedCellsRef.current = next;
          return next;
        });
      }, delay);

      timeouts.push(timeout);
    });

    revealTimeoutsRef.current.push(...timeouts);

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      revealTimeoutsRef.current = revealTimeoutsRef.current.filter((timeout) => !timeouts.includes(timeout));
    };
  }, [guesses, rows]);

  const handleCycle = useCallback(
    (cellKey: string, variantLength: number) => {
      setVariantIndices((prev) => {
        const current = prev[cellKey] ?? 0;
        return {
          ...prev,
          [cellKey]: (current + 1) % variantLength,
        };
      });
    },
    [],
  );

  const boardStyle = useMemo(() => {
    return {
      "--realitease-tile-size": `${tileSize}px`,
    } as CSSProperties;
  }, [tileSize]);

  const gridTemplateStyle = useMemo(() => {
    return {
      gridTemplateColumns: `repeat(${REALITEASE_BOARD_COLUMNS.length}, var(--realitease-tile-size))`,
    } as CSSProperties;
  }, []);

  const tileSizeForText = Math.max(BOARD_TILE_MIN_SIZE_PX, Math.min(tileSize, BOARD_TILE_MAX_SIZE_PX));

  return (
    <div className="w-full">
      <div ref={boardRef} className="space-y-[5px] realitease-board" style={boardStyle}>
        <div
          className="grid gap-[5px] mb-[10px] text-[10px] sm:text-[11px]"
          style={gridTemplateStyle}
        >
          {REALITEASE_BOARD_COLUMNS.map((column) => (
            <div
              key={column.key}
              className="flex items-center justify-center text-center font-['HamburgSerial'] font-extrabold uppercase tracking-[0.2px] text-black"
            >
              {column.label}
            </div>
          ))}
        </div>
        <div className="space-y-[5px]">
          {rows.map((guess, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-[5px]"
              style={gridTemplateStyle}
            >
              {REALITEASE_BOARD_COLUMNS.map(({ key, label }) => {
                const field = guess?.fields.find((item) => item.key === key);
                const { sanitizedVariants, sanitizedValue, isNoneInCommon } = resolveFieldDisplay(field);
                const cellId = getCellId(rowIndex, key);
                const variantIndex = variantIndices[cellId] ?? 0;
                const displayValue = sanitizedVariants.length
                  ? sanitizedVariants[variantIndex % sanitizedVariants.length]
                  : sanitizedValue;
                const trimmedValue = displayValue;
                const numericWwhl =
                  key === "wwhl" && trimmedValue.length > 0 && /^\d+$/.test(trimmedValue.replace(/\s+/g, ""));
                const isGuessColumn = key === "guess";
                const isRevealed = Boolean(revealedCells[cellId]);
                const actualVerdict = field?.verdict ?? "unknown";
                const backValue = displayValue;
                const frontValue = isRevealed ? backValue : "";
                const hasVariants = sanitizedVariants.length > 0;
                const interactive = isRevealed && hasVariants;
                const handleClick = interactive
                  ? () => {
                      handleCycle(cellId, sanitizedVariants.length);
                      setManualFlipCounters((prev) => ({
                        ...prev,
                        [cellId]: (prev[cellId] ?? 0) + 1,
                      }));
                    }
                  : undefined;

                return (
                  <BoardCell
                    key={cellId}
                    frontValue={frontValue}
                    backValue={backValue}
                    backVerdict={actualVerdict}
                    label={label}
                    guessNumber={guess?.guessNumber ?? rowIndex + 1}
                    isGuessColumn={isGuessColumn}
                    columnKey={key}
                    frontIsNumericWwhl={false}
                    backIsNumericWwhl={numericWwhl}
                    hasVariants={interactive}
                    onCycle={handleClick}
                    isRevealed={isRevealed}
                    flipDelay={cellDelays[cellId] ?? 0}
                    manualFlipCount={manualFlipCounters[cellId] ?? 0}
                    tileSize={tileSizeForText}
                    isNoneInCommon={isNoneInCommon}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RealiteaseKeyboard({
  onKey,
  onEnter,
  onBackspace,
  disabled,
}: {
  onKey?: (value: string) => void;
  onEnter?: () => void;
  onBackspace?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="w-full max-w-[680px]">
      <div className="flex flex-col gap-[5px]">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={`keyboard-row-${rowIndex}`} className="flex justify-center gap-[5px]">
            {row.map((keyValue) => {
              const handlePress = () => {
                if (disabled) return;
                if (keyValue === "enter") {
                  onEnter?.();
                  return;
                }
                if (keyValue === "backspace") {
                  onBackspace?.();
                  return;
                }
                if (keyValue.length === 1) {
                  onKey?.(keyValue);
                }
              };

              return <KeyboardKey key={keyValue} label={keyValue} onPress={handlePress} disabled={disabled} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function KeyboardKey({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const isEnter = label === "enter";
  const display = label === "backspace" ? "⌫" : label.toUpperCase();

  const baseClasses =
    "flex h-[58px] w-[58px] items-center justify-center rounded-sm bg-gray-300 font-bold uppercase text-black transition font-['TN_Web_Use_Only']";
  const textClasses = isEnter ? "text-xs leading-3 tracking-[0.35em]" : "text-lg";
  const stateClasses = disabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-200";

  return (
    <button type="button" onClick={onPress} disabled={disabled} className={`${baseClasses} ${textClasses} ${stateClasses}`} tabIndex={-1}>
      {display}
    </button>
  );
}

function BoardCell({
  frontValue,
  backValue,
  backVerdict,
  label,
  guessNumber,
  isGuessColumn,
  columnKey,
  frontIsNumericWwhl,
  backIsNumericWwhl,
  hasVariants,
  onCycle,
  isRevealed,
  flipDelay,
  manualFlipCount,
  tileSize,
  isNoneInCommon,
}: {
  frontValue: string;
  backValue: string;
  backVerdict: RealiteaseGuessVerdict;
  label: string;
  guessNumber: number;
  isGuessColumn: boolean;
  columnKey: RealiteaseBoardColumnKey;
  frontIsNumericWwhl: boolean;
  backIsNumericWwhl: boolean;
  hasVariants: boolean;
  onCycle?: () => void;
  isRevealed: boolean;
  flipDelay: number;
  manualFlipCount: number;
  tileSize: number;
  isNoneInCommon: boolean;
}) {
  const trimmedFrontValue = frontValue?.toString().trim() ?? "";
  const trimmedBackValue = backValue?.toString().trim() ?? "";
  const frontFaceValue = isRevealed ? "" : trimmedFrontValue;
  const frontHasValue = frontFaceValue.length > 0;
  const manualFlipPrevCountRef = useRef(manualFlipCount);
  const manualFlipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [manualFlipActive, setManualFlipActive] = useState(false);
  const frontShouldUseAgeStyle = columnKey === "age" || frontIsNumericWwhl;
  const backShouldUseAgeStyle = columnKey === "age" || backIsNumericWwhl;
  const fontClasses = "font-['HamburgSerial'] font-extrabold";
  const interactiveClasses = hasVariants ? "cursor-pointer" : "cursor-default";
  const frontValueForDisplay = isGuessColumn ? frontFaceValue.replace(/\s+/g, "\n") : frontFaceValue;
  const backValueForDisplay = isGuessColumn ? trimmedBackValue.replace(/\s+/g, "\n") : trimmedBackValue;
  const frontTextStyle = getCellTextStyle(frontFaceValue, isGuessColumn, columnKey, frontShouldUseAgeStyle, tileSize);
  const backTextStyle = getCellTextStyle(trimmedBackValue, isGuessColumn, columnKey, backShouldUseAgeStyle, tileSize);

  const ariaValue = isRevealed ? trimmedBackValue : trimmedFrontValue;
  const aria = ariaValue
    ? `${label}: ${ariaValue}`
    : `${label}: empty for guess ${guessNumber}`;

  const flipStyle = {
    "--flip-delay": `${flipDelay}ms`,
    "--flip-start": isRevealed ? "180deg" : "0deg",
  } as CSSProperties;
  const neutralFrontClasses = getFrontFaceClasses(frontHasValue, isGuessColumn, frontShouldUseAgeStyle);
  const frontClasses = `${fontClasses} ${neutralFrontClasses}`;
  const shouldUseBlankIncorrectStyle =
    !isGuessColumn &&
    isRevealed &&
    backVerdict === "incorrect" &&
    (isNoneInCommon || trimmedBackValue.length === 0);
  const blankIncorrectClasses = "bg-[#5D5F63] text-transparent border-[#5D5F63]";
  const backBaseClasses = isGuessColumn
    ? "bg-black text-white border-black"
    : shouldUseBlankIncorrectStyle
      ? blankIncorrectClasses
      : getVerdictClasses(backVerdict, Boolean(trimmedBackValue), columnKey, backShouldUseAgeStyle);
  const backClasses = `${fontClasses} ${backBaseClasses}`;
  const tileClasses = `realitease-tile relative flex select-none items-center justify-center ${interactiveClasses} ${
    isRevealed ? "realitease-tile--revealed" : ""
  } rounded-none border-none bg-transparent p-0 text-center uppercase transition disabled:opacity-100 disabled:cursor-default`;

  const frontContent = frontValueForDisplay.length > 0 ? frontValueForDisplay : " ";
  const backContent = backValueForDisplay.length > 0 ? backValueForDisplay : " ";

  useEffect(() => {
    return () => {
      if (manualFlipTimerRef.current) {
        clearTimeout(manualFlipTimerRef.current);
        manualFlipTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasVariants || !isRevealed) {
      manualFlipPrevCountRef.current = manualFlipCount;
      if (manualFlipTimerRef.current) {
        clearTimeout(manualFlipTimerRef.current);
        manualFlipTimerRef.current = null;
      }
      if (manualFlipActive) {
        setManualFlipActive(false);
      }
      return;
    }

    if (manualFlipCount === manualFlipPrevCountRef.current) {
      return;
    }

    manualFlipPrevCountRef.current = manualFlipCount;
    setManualFlipActive(true);
    if (manualFlipTimerRef.current) {
      clearTimeout(manualFlipTimerRef.current);
    }
    manualFlipTimerRef.current = setTimeout(() => {
      setManualFlipActive(false);
      manualFlipTimerRef.current = null;
    }, TILE_FLIP_DURATION_MS);
  }, [hasVariants, isRevealed, manualFlipCount, manualFlipActive]);

  return (
    <button
      type="button"
      onClick={hasVariants ? onCycle : undefined}
      disabled={!hasVariants}
      tabIndex={hasVariants ? 0 : -1}
      className={`${tileClasses} ${manualFlipActive ? "realitease-tile--manual" : ""}`.trim()}
      aria-label={aria}
      data-manual-flip-count={manualFlipCount}
    >
      <span className="realitease-tile__inner" style={flipStyle}>
        <span className={`realitease-tile__face realitease-tile__face--front ${frontClasses}`}>
          <span className="realitease-tile__value" style={frontTextStyle}>
            {frontContent}
          </span>
        </span>
        <span className={`realitease-tile__face realitease-tile__face--back ${backClasses}`}>
          <span className="realitease-tile__value" style={backTextStyle}>
            {backContent}
          </span>
        </span>
      </span>
    </button>
  );
}

function getVerdictClasses(
  verdict: RealiteaseGuessVerdict,
  hasValue: boolean,
  columnKey: RealiteaseBoardColumnKey,
  treatAsAge: boolean,
): string {
  if (!hasValue) {
    return treatAsAge ? "bg-white text-zinc-300 border-[#D3D6DA]" : "bg-white text-zinc-300 border-[#D3D6DA]";
  }

  switch (verdict) {
    case "correct":
      return treatAsAge ? "bg-[#60811F] text-white border-[#60811F]" : "bg-[#60811F] text-white border-[#60811F]";
    case "partial":
      return treatAsAge ? "bg-[#E6B903] text-white border-[#E6B903]" : "bg-[#E6B903] text-[#111827] border-[#E6B903]";
    case "incorrect":
      return "bg-[#5D5F63] text-white border-[#5D5F63]";
    case "multi":
      if (columnKey === "network" || columnKey === "shows") {
        return "bg-[#644073] text-white border-[#644073]";
      }
      return "bg-[#28578A] text-white border-[#28578A]";
    default:
      return treatAsAge ? "bg-white text-white border-[#D3D6DA]" : "bg-white text-gray-900 border-[#D3D6DA]";
  }
}

function getFrontFaceClasses(
  hasValue: boolean,
  isGuessColumn: boolean,
  treatAsAge: boolean,
): string {
  if (isGuessColumn) {
    return "bg-white text-zinc-300 border-[#D3D6DA]";
  }

  if (!hasValue) {
    return treatAsAge ? "bg-white text-zinc-300 border-[#D3D6DA]" : "bg-white text-zinc-300 border-[#D3D6DA]";
  }

  return treatAsAge ? "bg-white text-gray-900 border-[#D3D6DA]" : "bg-white text-gray-900 border-[#D3D6DA]";
}

function getCellTextStyle(
  value: string,
  isGuessColumn: boolean,
  columnKey: RealiteaseBoardColumnKey,
  treatAsAge: boolean,
  tileSize: number,
): CSSProperties {
  const MAX_FONT_PX = treatAsAge ? 40 : 26;
  const MIN_FONT_PX = treatAsAge ? 18 : 8;
  const LINE_HEIGHT = treatAsAge ? 0.9 : 1.08;
  const INNER_PADDING = 4; // px on each side
  const effectiveSize = Math.max(BOARD_TILE_MIN_SIZE_PX, Math.min(tileSize, BOARD_TILE_MAX_SIZE_PX));
  const CHAR_WIDTH_FACTOR = 0.58; // approx uppercase width
  const SPACE_WIDTH_FACTOR = 0.32;
  const LETTER_SPACING_PX = 0.2;

  const words = value
    .split(/\s+/)
    .flatMap((token) => token.length ? [token] : [])
    .map((token) => token.normalize("NFC"));
  if (words.length === 0) {
    words.push(value);
  }

  const computeLetterSpacingPx = () => LETTER_SPACING_PX;

  const measureWordWidth = (word: string, fontPx: number, lsPx: number) => {
    return word.length * CHAR_WIDTH_FACTOR * fontPx + Math.max(word.length - 1, 0) * lsPx;
  };

  const calculateLines = (fontPx: number, innerWidth: number): number => {
    const letterSpacingPx = computeLetterSpacingPx();

    if (isGuessColumn) {
      for (const word of words) {
        if (measureWordWidth(word, fontPx, letterSpacingPx) > innerWidth) {
          return Number.POSITIVE_INFINITY;
        }
      }
      return words.length; // one word per line
    }

    const spaceWidthPx = SPACE_WIDTH_FACTOR * fontPx;
    let currentWidth = 0;
    let lines = 1;

    for (const word of words) {
      const wordWidth = measureWordWidth(word, fontPx, letterSpacingPx);
      if (wordWidth > innerWidth) {
        return Number.POSITIVE_INFINITY;
      }

      if (currentWidth === 0) {
        currentWidth = wordWidth;
        continue;
      }

      if (currentWidth + spaceWidthPx + wordWidth <= innerWidth) {
        currentWidth += spaceWidthPx + wordWidth;
      } else {
        lines += 1;
        currentWidth = wordWidth;
      }
    }

    return lines;
  };

  const fitsAllSizes = (fontPx: number): boolean => {
    const innerWidth = Math.max(1, effectiveSize - INNER_PADDING * 2);
    const innerHeight = Math.max(1, effectiveSize - INNER_PADDING * 2);
    const lines = calculateLines(fontPx, innerWidth);
    if (!Number.isFinite(lines)) return false;
    const requiredHeight = lines * fontPx * LINE_HEIGHT;
    return requiredHeight <= innerHeight + 0.1;
  };

  let fontPx = MAX_FONT_PX;
  while (fontPx > MIN_FONT_PX && !fitsAllSizes(fontPx)) {
    fontPx -= 0.5;
  }
  if (fontPx < MIN_FONT_PX) {
    fontPx = MIN_FONT_PX;
  }

  const letterSpacingPx = computeLetterSpacingPx();

  return {
    fontSize: `${(fontPx / 16).toFixed(4)}rem`,
    lineHeight: LINE_HEIGHT,
    letterSpacing: `${letterSpacingPx}px`,
    textTransform: "uppercase",
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: isGuessColumn ? "pre-line" : "normal",
    overflow: "hidden",
    textAlign: "center",
  };
}
