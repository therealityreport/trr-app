"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import FlashbackRanker from "@/components/flashback-ranker";
import EpisodeRating from "@/components/episode-rating";
import SeasonRating from "@/components/season-rating";
import CastVerdict from "@/components/cast-verdict";
import ExWifeVerdict from "@/components/ex-wife-verdict";
import { useSurveyManager } from "@/lib/surveys/manager";
import {
  RHOSLC_EPISODE_ID,
  RHOSLC_SEASON_ID,
  RHOSLC_SHOW_ID,
  RHOSLC_SURVEY_ID,
  getSurveyTheme,
} from "@/lib/surveys/config";
import type { SurveyEpisodeMeta, SurveyRankingItem, SurveyResponse, CastVerdict as CastVerdictType, CastVerdictChoice, ExWifeVerdict as ExWifeVerdictType, ExWifeVerdictChoice } from "@/lib/surveys/types";
import { shows } from "@/lib/admin/shows/data";
import "@/styles/realitease-fonts.css";

type SurveyStep = "ranking" | "episode-rating" | "season-rating" | "cast-verdict" | "ex-wife-verdict";

const IDENTIFIERS = {
  showId: RHOSLC_SHOW_ID,
  seasonId: RHOSLC_SEASON_ID,
  episodeId: RHOSLC_EPISODE_ID,
};

const rhoslcSeason = shows
  .find((show) => show.key === "rhoslc")
  ?.seasons.find((season) => season.id === "season-6");

const CAST_MEMBERS: SurveyRankingItem[] = (rhoslcSeason?.cast ?? []).map((member) => ({
  id: member.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label: member.name,
  img: member.image,
}));

const EX_WIVES: SurveyRankingItem[] = [
  { id: "jen-shah", label: "Jen Shah", img: "/images/shows/rhoslc/ex-wives/jen-shah.png" },
  { id: "monica-garcia", label: "Monica Garcia", img: "/images/shows/rhoslc/ex-wives/monica-garcia.png" },
  { id: "bad-weather", label: "Bad Weather", img: "/images/shows/rhoslc/ex-wives/bad-weather.png" },
];

const surveyTheme = getSurveyTheme(RHOSLC_SURVEY_ID);

export default function RhoslcSurveyPlayPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<SurveyEpisodeMeta | null>(null);
  const [, setResponse] = useState<SurveyResponse | null>(null);
  const [ranking, setRanking] = useState<SurveyRankingItem[]>([]);
  const [episodeRating, setEpisodeRating] = useState<number | null>(null);
  const [seasonRating, setSeasonRating] = useState<number | null>(null);
  const [castVerdicts, setCastVerdicts] = useState<Map<string, CastVerdictChoice>>(new Map());
  const [exWifeVerdicts, setExWifeVerdicts] = useState<Map<string, ExWifeVerdictChoice>>(new Map());
  const [currentStep, setCurrentStep] = useState<SurveyStep>("ranking");
  const [currentVerdictIndex, setCurrentVerdictIndex] = useState(0);
  const [currentExWifeIndex, setCurrentExWifeIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = user?.uid ?? null;
  const isClosed = episodeMeta?.isClosed ?? false;


  useEffect(() => {
    AuthDebugger.log("RHOSLC Survey Play: mounting");
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeResponse: (() => void) | null = null;
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const meta = await manager.getEpisodeMeta(IDENTIFIERS, {
          episodeLabel: "Weekly",
          opensAt: null,
          closesAt: null,
          isClosed: false,
        });
        if (!isMounted) return;
        setEpisodeMeta(meta);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load survey";
        setErrorMessage(message);
        return;
      }

      if (!userId) {
        setResponse(null);
        setRanking([]);
        return;
      }

      unsubscribeResponse = manager.subscribeToResponse(IDENTIFIERS, userId, (next) => {
        setResponse(next);
        setRanking(next?.ranking ?? []);
        setEpisodeRating(next?.episodeRating ?? null);
        setSeasonRating(next?.seasonRating ?? null);
        if (next?.castVerdicts) {
          const verdictMap = new Map<string, CastVerdictChoice>();
          for (const v of next.castVerdicts) {
            verdictMap.set(v.castId, v.verdict);
          }
          setCastVerdicts(verdictMap);
        }
        if (next?.exWifeVerdicts) {
          const exWifeMap = new Map<string, ExWifeVerdictChoice>();
          for (const v of next.exWifeVerdicts) {
            exWifeMap.set(v.castId, v.verdict);
          }
          setExWifeVerdicts(exWifeMap);
        }
      });
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (unsubscribeResponse) unsubscribeResponse();
    };
  }, [manager, userId]);

  const calculateCompletionPct = useCallback((
    rankingItems: SurveyRankingItem[],
    epRating: number | null,
    szRating: number | null,
    verdicts: Map<string, CastVerdictChoice>,
    exWifes: Map<string, ExWifeVerdictChoice>,
  ) => {
    const rankingComplete = rankingItems.length === CAST_MEMBERS.length;
    const episodeRatingComplete = epRating !== null;
    const seasonRatingComplete = szRating !== null;

    // 25% ranking, 10% episode, 10% season, 35% cast verdicts, 20% ex-wife verdicts
    let pct = 0;
    if (rankingComplete) pct += 25;
    if (episodeRatingComplete) pct += 10;
    if (seasonRatingComplete) pct += 10;
    pct += Math.round((verdicts.size / CAST_MEMBERS.length) * 35);
    pct += Math.round((exWifes.size / EX_WIVES.length) * 20);
    return pct;
  }, []);

  const saveCurrentState = useCallback(
    async (options?: { completed?: boolean }) => {
      if (!userId) return;
      setSaveState("saving");
      try {
        const verdictArray: CastVerdictType[] = Array.from(castVerdicts.entries()).map(([castId, verdict]) => ({
          castId,
          verdict,
        }));
        const exWifeVerdictArray: ExWifeVerdictType[] = Array.from(exWifeVerdicts.entries()).map(([castId, verdict]) => ({
          castId,
          verdict,
        }));
        const completionPct = calculateCompletionPct(ranking, episodeRating, seasonRating, castVerdicts, exWifeVerdicts);
        const isComplete = options?.completed ?? (
          ranking.length === CAST_MEMBERS.length &&
          episodeRating !== null &&
          seasonRating !== null &&
          castVerdicts.size === CAST_MEMBERS.length &&
          exWifeVerdicts.size === EX_WIVES.length
        );
        await manager.saveResponse(
          IDENTIFIERS,
          userId,
          {
            ranking,
            episodeRating,
            seasonRating,
            castVerdicts: verdictArray,
            exWifeVerdicts: exWifeVerdictArray,
            completionPct,
            completed: isComplete,
          },
          { surveyKey: RHOSLC_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, userId, ranking, episodeRating, seasonRating, castVerdicts, exWifeVerdicts, calculateCompletionPct],
  );

  const handleRankingChange = useCallback(
    async (nextRanking: SurveyRankingItem[]) => {
      if (!userId) return;
      setRanking(nextRanking);
      setSaveState("saving");
      try {
        const verdictArray: CastVerdictType[] = Array.from(castVerdicts.entries()).map(([castId, verdict]) => ({
          castId,
          verdict,
        }));
        const exWifeVerdictArray: ExWifeVerdictType[] = Array.from(exWifeVerdicts.entries()).map(([castId, verdict]) => ({
          castId,
          verdict,
        }));
        const completionPct = calculateCompletionPct(nextRanking, episodeRating, seasonRating, castVerdicts, exWifeVerdicts);
        await manager.saveResponse(
          IDENTIFIERS,
          userId,
          {
            ranking: nextRanking,
            episodeRating,
            seasonRating,
            castVerdicts: verdictArray,
            exWifeVerdicts: exWifeVerdictArray,
            completionPct,
            completed: false,
          },
          { surveyKey: RHOSLC_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, userId, episodeRating, seasonRating, castVerdicts, exWifeVerdicts, calculateCompletionPct],
  );

  const handleEpisodeRatingChange = useCallback((value: number) => {
    setEpisodeRating(value);
  }, []);

  const handleSeasonRatingChange = useCallback((value: number) => {
    setSeasonRating(value);
  }, []);

  const handleVerdictChange = useCallback((castId: string, verdict: CastVerdictChoice) => {
    setCastVerdicts((prev) => {
      const next = new Map(prev);
      next.set(castId, verdict);
      return next;
    });
  }, []);

  const handleExWifeVerdictChange = useCallback((castId: string, verdict: ExWifeVerdictChoice) => {
    setExWifeVerdicts((prev) => {
      const next = new Map(prev);
      next.set(castId, verdict);
      return next;
    });
  }, []);

  const handleNextStep = useCallback(async () => {
    if (currentStep === "ranking") {
      if (ranking.length !== CAST_MEMBERS.length) return;
      await saveCurrentState();
      setCurrentStep("episode-rating");
    } else if (currentStep === "episode-rating") {
      if (episodeRating === null) return;
      await saveCurrentState();
      setCurrentStep("season-rating");
    } else if (currentStep === "season-rating") {
      if (seasonRating === null) return;
      await saveCurrentState();
      setCurrentStep("cast-verdict");
      setCurrentVerdictIndex(0);
    } else if (currentStep === "cast-verdict") {
      const currentMember = CAST_MEMBERS[currentVerdictIndex];
      if (!currentMember || !castVerdicts.has(currentMember.id)) return;

      if (currentVerdictIndex < CAST_MEMBERS.length - 1) {
        setCurrentVerdictIndex((prev) => prev + 1);
        await saveCurrentState();
      } else {
        await saveCurrentState();
        setCurrentStep("ex-wife-verdict");
        setCurrentExWifeIndex(0);
      }
    } else if (currentStep === "ex-wife-verdict") {
      const currentExWife = EX_WIVES[currentExWifeIndex];
      if (!currentExWife || !exWifeVerdicts.has(currentExWife.id)) return;

      if (currentExWifeIndex < EX_WIVES.length - 1) {
        setCurrentExWifeIndex((prev) => prev + 1);
        await saveCurrentState();
      } else {
        await saveCurrentState({ completed: true });
        router.push("/surveys/rhoslc-s6/results");
      }
    }
  }, [currentStep, ranking, episodeRating, seasonRating, castVerdicts, exWifeVerdicts, currentVerdictIndex, currentExWifeIndex, saveCurrentState, router]);

  const handlePrevStep = useCallback(() => {
    if (currentStep === "episode-rating") {
      setCurrentStep("ranking");
    } else if (currentStep === "season-rating") {
      setCurrentStep("episode-rating");
    } else if (currentStep === "cast-verdict") {
      if (currentVerdictIndex > 0) {
        setCurrentVerdictIndex((prev) => prev - 1);
      } else {
        setCurrentStep("season-rating");
      }
    } else if (currentStep === "ex-wife-verdict") {
      if (currentExWifeIndex > 0) {
        setCurrentExWifeIndex((prev) => prev - 1);
      } else {
        setCurrentStep("cast-verdict");
        setCurrentVerdictIndex(CAST_MEMBERS.length - 1);
      }
    }
  }, [currentStep, currentVerdictIndex, currentExWifeIndex]);

  const handleBack = () => {
    router.push("/surveys/rhoslc-s6");
  };

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      router.push("/auth/register");
    }
  }, [authLoading, router, userId]);

  if (authLoading || !userId) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: surveyTheme.pageBg }}
      >
        <p className="text-sm font-semibold" style={{ color: surveyTheme.pageText }}>
          Loading survey…
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: surveyTheme.pageBg }}
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-3xl font-bold uppercase tracking-wide" style={{ color: surveyTheme.pageText }}>
            Something went wrong
          </h1>
          <p className="mt-4 text-sm" style={{ color: surveyTheme.instructionColor }}>
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition"
            style={{ backgroundColor: surveyTheme.submitBg, color: surveyTheme.submitText }}
          >
            Back to Cover
          </button>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: surveyTheme.pageBg }}
      >
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="text-4xl font-bold uppercase tracking-wide" style={{ color: surveyTheme.pageText }}>
            Survey Closed
          </h1>
          <p className="mt-4 text-sm" style={{ color: surveyTheme.instructionColor }}>
            This week&apos;s RHOSLC ranking is closed. Come back next week to reset the board.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/surveys/rhoslc-s6/results")}
              className="rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition"
              style={{ backgroundColor: surveyTheme.submitBg, color: surveyTheme.submitText }}
            >
              See Results
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border px-5 py-2 text-sm font-semibold"
              style={{ borderColor: surveyTheme.resetBorder, color: surveyTheme.resetText }}
            >
              Back to Cover
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = calculateCompletionPct(ranking, episodeRating, seasonRating, castVerdicts, exWifeVerdicts);
  const currentCastMember = CAST_MEMBERS[currentVerdictIndex];
  const currentExWife = EX_WIVES[currentExWifeIndex];

  const getStepTitle = () => {
    if (currentStep === "ranking") return "Q1. Rank the Cast of RHOSLC 6.";
    if (currentStep === "episode-rating") return "Q2. Rate This Episode";
    if (currentStep === "season-rating") return "Q3. Rate This Season";
    if (currentStep === "cast-verdict") return "Q4. Cast Verdicts";
    return "Q5. Ex-Wife Verdicts";
  };

  const getStepInstruction = () => {
    if (currentStep === "ranking") return "Drag-and-Drop the Cast Members to their Rank.";
    if (currentStep === "episode-rating") return "How would you rate this week's episode?";
    if (currentStep === "season-rating") return "How would you rate Season 6 so far?";
    if (currentStep === "cast-verdict") return `${currentVerdictIndex + 1} of ${CAST_MEMBERS.length}`;
    return `${currentExWifeIndex + 1} of ${EX_WIVES.length}`;
  };

  const canProceed = () => {
    if (currentStep === "ranking") return ranking.length === CAST_MEMBERS.length;
    if (currentStep === "episode-rating") return episodeRating !== null;
    if (currentStep === "season-rating") return seasonRating !== null;
    if (currentStep === "cast-verdict" && currentCastMember) {
      return castVerdicts.has(currentCastMember.id);
    }
    if (currentStep === "ex-wife-verdict" && currentExWife) {
      return exWifeVerdicts.has(currentExWife.id);
    }
    return false;
  };

  const isFirstStep = currentStep === "ranking";
  const isLastStep = currentStep === "ex-wife-verdict" && currentExWifeIndex === EX_WIVES.length - 1;

  return (
    <main className="min-h-screen px-4 py-8" style={{ backgroundColor: surveyTheme.pageBg }}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4">
          <button
            type="button"
            onClick={isFirstStep ? handleBack : handlePrevStep}
            className="self-start text-xs font-semibold uppercase tracking-[0.4em] transition"
            style={{ color: surveyTheme.resetText }}
          >
            ← {isFirstStep ? "Back" : "Previous"}
          </button>
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold" style={{ color: surveyTheme.progressText }}>
              {overallProgress}%
            </div>
            <div
              className="h-2 flex-1 max-w-[600px] overflow-hidden rounded-full"
              style={{ backgroundColor: surveyTheme.progressBg }}
            >
              <div
                className="h-full transition-[width]"
                style={{ backgroundColor: surveyTheme.progressFill, width: `${overallProgress}%` }}
              />
            </div>
            <div className="text-sm font-semibold" style={{ color: surveyTheme.progressText }}>
              100%
            </div>
          </div>
          <div className="w-full">
            <h1
              style={{
                fontFamily: surveyTheme.questionFont,
                fontWeight: 800,
                fontSize: "clamp(28px, 5vw, 44px)",
                letterSpacing: "0.5px",
                lineHeight: 1.1,
                color: surveyTheme.questionColor,
              }}
            >
              {getStepTitle()}
            </h1>
            <p
              style={{
                fontFamily: surveyTheme.instructionFont,
                fontSize: "clamp(14px, 2.5vw, 20px)",
                fontWeight: 400,
                letterSpacing: "1px",
                marginTop: "0.75rem",
                color: surveyTheme.instructionColor,
              }}
            >
              {getStepInstruction()}
            </p>
          </div>
        </header>

        {currentStep === "ranking" && (
          <FlashbackRanker
            items={CAST_MEMBERS}
            initialRanking={ranking}
            onChange={handleRankingChange}
            variant="grid"
            surveyTheme={surveyTheme}
          />
        )}

        {currentStep === "episode-rating" && (
          <EpisodeRating
            value={episodeRating}
            onChange={handleEpisodeRatingChange}
            surveyTheme={surveyTheme}
            episodeLabel="this episode"
          />
        )}

        {currentStep === "season-rating" && (
          <SeasonRating
            value={seasonRating}
            onChange={handleSeasonRatingChange}
            surveyTheme={surveyTheme}
            seasonLabel="Season 6"
          />
        )}

        {currentStep === "cast-verdict" && currentCastMember && (
          <CastVerdict
            castMember={currentCastMember}
            value={castVerdicts.get(currentCastMember.id) ?? null}
            onChange={(verdict) => handleVerdictChange(currentCastMember.id, verdict)}
            surveyTheme={surveyTheme}
          />
        )}

        {currentStep === "ex-wife-verdict" && currentExWife && (
          <ExWifeVerdict
            castMember={currentExWife}
            value={exWifeVerdicts.get(currentExWife.id) ?? null}
            onChange={(verdict) => handleExWifeVerdictChange(currentExWife.id, verdict)}
            surveyTheme={surveyTheme}
          />
        )}

        <div className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={handleNextStep}
            disabled={!canProceed() || saveState === "saving"}
            className="inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: surveyTheme.submitBg, color: surveyTheme.submitText }}
          >
            {saveState === "saving" ? "Saving…" : isLastStep ? "Submit Survey" : "Next"}
          </button>
          {saveState === "error" && (
            <p className="text-sm" style={{ color: surveyTheme.errorColor }}>
              Could not save. Please try again.
            </p>
          )}
          {saveState === "saved" && currentStep === "ranking" && (
            <p className="text-sm" style={{ color: surveyTheme.successColor }}>
              Progress saved!
            </p>
          )}
          {currentStep === "ranking" && (
            <button
              type="button"
              onClick={() => {
                void handleRankingChange([]);
              }}
              disabled={ranking.length === 0 || saveState === "saving"}
              className="inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: surveyTheme.resetBorder, color: surveyTheme.resetText }}
            >
              Reset selections
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
