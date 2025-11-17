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
import GameHeader from "@/components/GameHeader";
import { getUserPreferences, updateUserPreferences } from "@/lib/preferences";

const BOARD_ROWS = 8; // maximum guesses
const BOARD_MIN_ROWS = 7; // initial visible rows
const TILE_FLIP_DURATION_MS = 620;
const BOARD_REVEAL_STAGGER_MS = 120;
const COMPLETION_MODAL_BUFFER_MS = 180;
const COMPLETION_MODAL_DELAY_MS =
  TILE_FLIP_DURATION_MS + BOARD_REVEAL_STAGGER_MS * (REALITEASE_BOARD_COLUMNS.length - 1) + COMPLETION_MODAL_BUFFER_MS;
const BOARD_TILE_MIN_SIZE_PX = 55; // fixed tile size (width/height)
const BOARD_TILE_MAX_SIZE_PX = 55; // fixed tile size (width/height)
const BOARD_TILE_GAP_PX = 5;
const BOARD_ROW_GAP_PX = 5; // vertical spacing between board rows (matches space-y-[5px])
const BOARD_HEADER_MARGIN_BOTTOM_PX = 10; // matches mb-[10px]
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
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [completionStats, setCompletionStats] = useState<RealiteaseStatsSummary | null>(null);
  const [completionStatsLoading, setCompletionStatsLoading] = useState(false);
  const [completionStatsError, setCompletionStatsError] = useState<string | null>(null);
  const [completionShareStatus, setCompletionShareStatus] = useState<ShareStatus>("idle");
  const [completionLoadedSignature, setCompletionLoadedSignature] = useState<string | null>(null);
  const [forceStatsRequested, setForceStatsRequested] = useState(false);
  const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("technical");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const shareResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionSignatureRef = useRef<string | null>(null);
  const previousGuessCountRef = useRef<number>(0);
  const hasInitializedGuessCountRef = useRef(false);
  const completionAnimationNeededRef = useRef(false);

  const puzzleDateKey = useMemo(() => getRealiteaseDateKey(), []);
  const userId = user?.uid ?? null;

  // Column preferences (must be declared before any JSX that uses them)
  const [ageOrZodiac, setAgeOrZodiac] = useState<"age" | "zodiac">(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("realitease:ageOrZodiac") as "age" | "zodiac")
        : null) || "age",
  );
  const [serviceMode, setServiceMode] = useState<"networks" | "streamers">(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("realitease:serviceMode") as "networks" | "streamers")
        : null) || "networks",
  );

  // Persist locally (non‑blocking)
  useEffect(() => {
    try {
      localStorage.setItem("realitease:ageOrZodiac", ageOrZodiac);
    } catch {}
  }, [ageOrZodiac]);
  useEffect(() => {
    try {
      localStorage.setItem("realitease:serviceMode", serviceMode);
    } catch {}
  }, [serviceMode]);

  // Compute board columns from current preferences
  const activeColumns = useMemo(
    () => [
      { key: "guess" as RealiteaseBoardColumnKey, label: "NAME" },
      { key: "gender" as RealiteaseBoardColumnKey, label: "GENDER" },
      {
        key: (ageOrZodiac === "age" ? "age" : "zodiac") as RealiteaseBoardColumnKey,
        label: ageOrZodiac === "age" ? "AGE" : "ZODIAC",
      },
      {
        key: (serviceMode === "networks" ? "network" : "streamers") as RealiteaseBoardColumnKey,
        label: serviceMode === "networks" ? "NETWORKS" : "STREAMERS",
      },
      { key: "shows" as RealiteaseBoardColumnKey, label: "SHOWS" },
      { key: "wwhl" as RealiteaseBoardColumnKey, label: "WWHL" },
    ],
    [ageOrZodiac, serviceMode],
  );

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
  }, []);

  const handleOpenReportProblem = useCallback(() => {
    setReportCategory("technical");
    setReportDescription("");
    setReportError(null);
    setReportSubmitted(false);
    setIsReportProblemOpen(true);
  }, []);

  const handleFeedback = useCallback(() => {
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
    if (completionShowTimeoutRef.current) {
      clearTimeout(completionShowTimeoutRef.current);
      completionShowTimeoutRef.current = null;
    }
    completionAnimationNeededRef.current = false;
    setIsCompletionOpen(true);
  }, []);

  const handleSubmitReportProblem = useCallback(() => {
    const trimmedDescription = reportDescription.trim();
    if (!trimmedDescription) {
      setReportError("Please let us know what went wrong.");
      return;
    }

    setReportSubmitting(true);
    setReportError(null);

    try {
      AuthDebugger.log("Realitease Game: Report problem", {
        category: reportCategory,
        description: trimmedDescription,
        userId,
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReportProblemOpen(false);
        setReportSubmitting(false);
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send report.";
      setReportError(message);
      setReportSubmitting(false);
    }
  }, [reportCategory, reportDescription, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("show") === "stats") {
      setForceStatsRequested(true);
      url.searchParams.delete("show");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
  }, []);

  // Load user preferences
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const prefs = await getUserPreferences(userId);
        if (prefs?.realitease?.ageOrZodiac) setAgeOrZodiac(prefs.realitease.ageOrZodiac);
        if (prefs?.realitease?.serviceMode) setServiceMode(prefs.realitease.serviceMode);
      } catch {}
    })();
  }, [userId]);

  const handleShareResults = useCallback(async () => {
    if (!gameSnapshot) return;
    if (typeof navigator === "undefined") return;

    const shareText = buildShareText(
      gameSnapshot.puzzleDate ?? puzzleDateKey,
      gameSnapshot.guesses ?? [],
      BOARD_ROWS,
      gameSnapshot.guessNumberSolved ?? null,
      activeColumns.filter((c) => c.key !== "guess"),
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
  }, [gameSnapshot, puzzleDateKey, activeColumns]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSnapshot?.puzzleDate]);

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

    const statsOptions = !gameSnapshot.gameCompleted ? { excludePuzzleDate: dateKey } : undefined;

    manager
      .getUserStatsSummary(userId, statsOptions)
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
  const isViewingHistoricalStats = Boolean(gameSnapshot && !gameSnapshot.gameCompleted);

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
        <GameHeader
          onStatsClick={handleOpenStatsModal}
          onHowToPlay={handleOpenHowToPlay}
          onFeedback={handleFeedback}
          onReportProblem={handleOpenReportProblem}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <main className="flex flex-1 justify-center px-4 pb-12 pt-10">
          <div className="flex w-full max-w-[480px] flex-col items-center gap-8">
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
              <RealiteaseBoard
                guesses={orderedGuesses}
                solvedGuessNumber={gameSnapshot?.guessNumberSolved ?? null}
                columns={activeColumns}
              />
            </div>

            {/* Inline keyboard (non-overlay) */}
            <div id="realitease-keyboard" className="w-full flex justify-center">
              <div className="w-full max-w-[480px] px-0 py-2">
                <RealiteaseKeyboard
                  disabled={gameSnapshot?.gameCompleted || isSubmittingGuess || maxGuessesReached}
                  onKey={handleKeyboardInput}
                  onBackspace={handleKeyboardBackspace}
                  onEnter={handleSubmitGuess}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Safe-area spacer for iOS bottom inset when needed */}
        <div className="pb-[env(safe-area-inset-bottom)]" aria-hidden />

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
          hideGuessDistribution={isViewingHistoricalStats}
        />

        <ReportProblemModal
          open={isReportProblemOpen}
          onClose={() => {
            if (reportSubmitting) return;
            setIsReportProblemOpen(false);
          }}
          onSubmit={handleSubmitReportProblem}
          submitting={reportSubmitting}
          category={reportCategory}
          onCategoryChange={setReportCategory}
          description={reportDescription}
          onDescriptionChange={setReportDescription}
          error={reportError}
          submitted={reportSubmitted}
          gameTitle="Realitease"
        />

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
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800" style={{ fontFamily: "var(--font-plymouth-serial)" }}>Column preferences</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-zinc-300 p-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">AGE vs ZODIAC</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={async () => { setAgeOrZodiac("age"); if (userId) { try { await updateUserPreferences(userId, { realitease: { ageOrZodiac: "age" } }); } catch (e) { console.warn("Pref save failed", e); } } }} className={`flex-1 rounded-sm px-3 py-1 text-sm font-semibold ${ageOrZodiac === "age" ? "bg-black text-white" : "bg-zinc-100 text-gray-800"}`}>AGE</button>
                      <button type="button" onClick={async () => { setAgeOrZodiac("zodiac"); if (userId) { try { await updateUserPreferences(userId, { realitease: { ageOrZodiac: "zodiac" } }); } catch (e) { console.warn("Pref save failed", e); } } }} className={`flex-1 rounded-sm px-3 py-1 text-sm font-semibold ${ageOrZodiac === "zodiac" ? "bg-black text-white" : "bg-zinc-100 text-gray-800"}`}>ZODIAC</button>
                    </div>
                  </div>
                  <div className="rounded-md border border-zinc-300 p-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-600">NETWORKS vs STREAMERS</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={async () => { setServiceMode("networks"); if (userId) { try { await updateUserPreferences(userId, { realitease: { serviceMode: "networks" } }); } catch (e) { console.warn("Pref save failed", e); } } }} className={`flex-1 rounded-sm px-3 py-1 text-sm font-semibold ${serviceMode === "networks" ? "bg-black text-white" : "bg-zinc-100 text-gray-800"}`}>NETWORKS</button>
                      <button type="button" onClick={async () => { setServiceMode("streamers"); if (userId) { try { await updateUserPreferences(userId, { realitease: { serviceMode: "streamers" } }); } catch (e) { console.warn("Pref save failed", e); } } }} className={`flex-1 rounded-sm px-3 py-1 text-sm font-semibold ${serviceMode === "streamers" ? "bg-black text-white" : "bg-zinc-100 text-gray-800"}`}>STREAMERS</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          className="w-full rounded-[2px] border border-white px-4 py-2 text-sm font-extrabold tracking-[0.01em] text-gray-800 focus:border-black focus:outline-none"
          style={{ fontFamily: "var(--font-plymouth-serial)" }}
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
                  {matches.map(({ talent }) => (
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
                        <span className="text-sm font-bold text-gray-900 tracking-[0.01em]" style={{ fontFamily: "var(--font-plymouth-serial)" }}>{talent.name}</span>
                        {/* Hide the "matches alternative" label but still use the alternative for matching */}
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

function ReportProblemModal({
  open,
  onClose,
  onSubmit,
  submitting,
  category,
  onCategoryChange,
  description,
  onDescriptionChange,
  error,
  submitted,
  gameTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  category: string;
  onCategoryChange: (next: string) => void;
  description: string;
  onDescriptionChange: (next: string) => void;
  error: string | null;
  submitted: boolean;
  gameTitle: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-10">
      <div className="w-full max-w-lg rounded-lg bg-white px-6 pb-8 pt-6 shadow-[0px_4px_23px_rgba(0,0,0,0.2)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-['NYTKarnak_Condensed'] text-2xl font-bold leading-none text-black">Report a Problem</h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-black/70">{gameTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-black transition hover:bg-black/5"
            aria-label="Close report a problem"
            disabled={submitting}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.2364 6.05781L15.0614 4.88281L10.4031 9.54115L5.74475 4.88281L4.56975 6.05781L9.22808 10.7161L4.56975 15.3745L5.74475 16.5495L10.4031 11.8911L15.0614 16.5495L16.2364 15.3745L11.5781 10.7161L16.2364 6.05781Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-gray-700">
              What kind of issue are you seeing?
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="technical">Technical Issue</option>
                <option value="incorrect-info">Incorrect Info</option>
                <option value="accessibility">Accessibility</option>
                <option value="content">Content Concern</option>
                <option value="other">Something Else</option>
              </select>
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M2.34315 4.34326L6 8.00011L9.65685 4.34326" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.24em] text-gray-700">
              Tell us more
            </label>
            <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              rows={5}
              placeholder="What happened?"
              className="w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {submitted && !error && !submitting && (
            <p className="text-sm text-green-600">Thanks! We’ll take a look.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-zinc-100"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RealiteaseBoard({
  guesses,
  solvedGuessNumber,
  columns,
}: {
  guesses: RealiteaseGuess[];
  solvedGuessNumber: number | null;
  columns: Array<{ key: RealiteaseBoardColumnKey; label: string }>;
}) {
  const rows = useMemo(() => {
    const rowCount = Math.max(BOARD_MIN_ROWS, Math.min(BOARD_ROWS, (guesses?.length ?? 0) + 1));
    const grid: Array<RealiteaseGuess | null> = Array.from({ length: rowCount }, () => null);
    guesses.slice(0, BOARD_ROWS).forEach((guess, index) => {
      if (index < grid.length) {
        grid[index] = guess;
      }
    });
    return grid;
  }, [guesses]);

  const [variantIndices, setVariantIndices] = useState<Record<string, number>>({});
  const [manualFlipCounters, setManualFlipCounters] = useState<Record<string, number>>({});
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});
  const [cellDelays, setCellDelays] = useState<Record<string, number>>({});
  const [tileSize, setTileSize] = useState<number>(52);
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
      // Width-constrained tile size
      const parentWidth = element.parentElement?.clientWidth ?? element.clientWidth;
      const availableWidth = Math.max(parentWidth, BOARD_TILE_MIN_SIZE_PX * columns.length);
      const available = availableWidth - BOARD_TILE_GAP_PX * (columns.length - 1);
      const widthConstrained = Math.max(
        BOARD_TILE_MIN_SIZE_PX,
        Math.min(BOARD_TILE_MAX_SIZE_PX, available / columns.length || BOARD_TILE_MIN_SIZE_PX),
      );

      // Height-constrained tile size: ensure the entire board + keyboard is visible.
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const boardTop = element.getBoundingClientRect().top;
      const keyboardEl = document.getElementById("realitease-keyboard");
      const keyboardH = keyboardEl ? keyboardEl.getBoundingClientRect().height : 200; // fallback
      const headerEl = element.querySelector('[data-board-header]') as HTMLElement | null;
      const headerH = headerEl?.offsetHeight ?? 24;
      const verticalGaps = (rows.length - 1) * BOARD_ROW_GAP_PX + BOARD_HEADER_MARGIN_BOTTOM_PX;
      const availableHeightForTiles = Math.max(0, viewportH - boardTop - keyboardH - verticalGaps - headerH - 24);
      const heightConstrained = Math.max(
        BOARD_TILE_MIN_SIZE_PX,
        Math.min(BOARD_TILE_MAX_SIZE_PX, Math.floor(availableHeightForTiles / rows.length) || BOARD_TILE_MIN_SIZE_PX),
      );

      const computedSize = Math.min(widthConstrained, heightConstrained);
      setTileSize((prev) => {
        const next = Number.isFinite(computedSize) ? computedSize : prev;
        return Math.round(next) === Math.round(prev) ? prev : next;
      });
    };

    computeSize();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => computeSize()) : null;
    observer?.observe(element);

    window.addEventListener("resize", computeSize);
    window.addEventListener("scroll", computeSize, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", computeSize);
      window.removeEventListener("scroll", computeSize);
    };
  }, [rows.length, columns.length]);

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
      columns.forEach(({ key }) => {
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
  }, [rows, columns]);

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

  // (moved column preference state above to ensure it's defined before JSX uses it)

  const boardStyle = useMemo(() => {
    return {
      "--realitease-tile-size": `${tileSize}px`,
    } as CSSProperties;
  }, [tileSize]);

  const gridTemplateStyle = useMemo(() => {
    return {
      gridTemplateColumns: `repeat(${columns.length}, var(--realitease-tile-size))`,
    } as CSSProperties;
  }, [columns.length]);

  const tileSizeForText = Math.max(BOARD_TILE_MIN_SIZE_PX, Math.min(tileSize, BOARD_TILE_MAX_SIZE_PX));

  return (
    <div className="w-full">
      <div ref={boardRef} className="space-y-[5px] realitease-board mx-auto w-min" style={boardStyle}>
        <div data-board-header className="grid justify-center gap-[5px] mb-[10px] text-[10px] sm:text-[11px]" style={gridTemplateStyle}>
          {columns.map((column) => (
            <div
              key={column.key}
              className="flex items-center justify-center text-center font-['HamburgSerial'] font-extrabold uppercase tracking-[0.2px] text-black"
            >
              {column.label}
            </div>
          ))}
        </div>
        <div className="space-y-[5px]">
          {rows.map((guess, rowIndex) => {
            const isWinningRow = Boolean(
              solvedGuessNumber !== null && guess && guess.guessNumber === solvedGuessNumber,
            );

            return (
              <div key={`row-${rowIndex}`} className="grid justify-center gap-[5px]" style={gridTemplateStyle}>
              {columns.map(({ key, label }) => {
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
                    isWinningRow={isWinningRow}
                  />
                );
              })}
            </div>
            );
          })}
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
    <div className="w-full max-w-[480px]">
      <div className="flex flex-col gap-2">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={`keyboard-row-${rowIndex}`} className="flex justify-center gap-1">
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
  const isBackspace = label === "backspace";
  const display = isBackspace ? (
    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M19.1732 2.5H6.67318C6.09818 2.5 5.64818 2.79167 5.34818 3.23333L0.839844 10L5.34818 16.7583C5.64818 17.2 6.09818 17.5 6.67318 17.5H19.1732C20.0898 17.5 20.8398 16.75 20.8398 15.8333V4.16667C20.8398 3.25 20.0898 2.5 19.1732 2.5ZM19.1732 15.8333H6.73151L2.83984 10L6.72318 4.16667H19.1732V15.8333ZM9.51484 14.1667L12.5065 11.175L15.4982 14.1667L16.6732 12.9917L13.6815 10L16.6732 7.00833L15.4982 5.83333L12.5065 8.825L9.51484 5.83333L8.33984 7.00833L11.3315 10L8.33984 12.9917L9.51484 14.1667Z" fill="black"/>
    </svg>
  ) : (
    label.toUpperCase()
  );

  const sizeClasses = isEnter || isBackspace ? "h-12 w-14" : "h-12 w-10";
  const baseClasses = `flex ${sizeClasses} items-center justify-center rounded-sm bg-[#94aed1] uppercase text-black transition`;
  const textClasses = isEnter ? "text-xs leading-3" : "text-lg";
  const stateClasses = disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-95 active:brightness-90";

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={`${baseClasses} ${textClasses} ${stateClasses}`}
      style={{ fontFamily: "var(--font-plymouth-serial)", fontWeight: 800 }}
      tabIndex={-1}
    >
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
  isWinningRow,
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
  isWinningRow: boolean;
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
  const winningClasses = "bg-[#004b80] text-white border-[#004b80]";
  const backBaseClasses = isWinningRow
    ? winningClasses
    : isGuessColumn
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
  const INNER_PADDING = 6; // px on each side (increased for better spacing)
  const effectiveSize = Math.max(BOARD_TILE_MIN_SIZE_PX, Math.min(tileSize, BOARD_TILE_MAX_SIZE_PX));
  const CHAR_WIDTH_FACTOR = 0.58; // approx uppercase width
  const SPACE_WIDTH_FACTOR = 0.32;
  const LETTER_SPACING_EM = 0.01; // 1% letter spacing

  const horizontalPadding = isGuessColumn ? INNER_PADDING + 4 : INNER_PADDING;
  const verticalPadding = isGuessColumn ? INNER_PADDING + 4 : INNER_PADDING;
  const innerWidthBase = Math.max(1, effectiveSize - horizontalPadding * 2);
  const innerHeightBase = Math.max(1, effectiveSize - verticalPadding * 2);

  const words = value
    .split(/\s+/)
    .flatMap((token) => token.length ? [token] : [])
    .map((token) => token.normalize("NFC"));
  if (words.length === 0) {
    words.push(value);
  }

  const computeLetterSpacingPx = () => fontPx * LETTER_SPACING_EM;

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
    const lines = calculateLines(fontPx, innerWidthBase);
    if (!Number.isFinite(lines)) return false;
    const requiredHeight = lines * fontPx * LINE_HEIGHT;
    return requiredHeight <= innerHeightBase + 0.1;
  };

  let fontPx = MAX_FONT_PX;
  while (fontPx > MIN_FONT_PX && !fitsAllSizes(fontPx)) {
    fontPx -= 0.5;
  }
  if (fontPx < MIN_FONT_PX) {
    fontPx = MIN_FONT_PX;
  }

  return {
    fontSize: `${(fontPx / 16).toFixed(4)}rem`,
    lineHeight: LINE_HEIGHT,
    letterSpacing: `${LETTER_SPACING_EM}em`,
    textTransform: "uppercase",
    wordBreak: "normal",
    overflowWrap: "normal",
    whiteSpace: isGuessColumn ? "pre-line" : "normal",
    overflow: "hidden",
    textAlign: "center",
    paddingInline: `${horizontalPadding}px`,
    paddingBlock: `${verticalPadding}px`,
  };
}
