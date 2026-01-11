"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import FlashbackRanker from "@/components/flashback-ranker";
import SeasonRating from "@/components/season-rating";
import CastVerdict from "@/components/cast-verdict";
import { useSurveyManager } from "@/lib/surveys/manager";
import {
  RHOP_EPISODE_ID,
  RHOP_SEASON_ID,
  RHOP_SHOW_ID,
  RHOP_SURVEY_ID,
  getSurveyTheme,
} from "@/lib/surveys/config";
import type { SurveyEpisodeMeta, SurveyRankingItem, SurveyResponse, CastVerdict as CastVerdictType, CastVerdictChoice } from "@/lib/surveys/types";
import { shows } from "@/lib/admin/shows/data";
import "@/styles/realitease-fonts.css";

type SurveyStep = "ranking" | "season-rating" | "cast-verdict";

const IDENTIFIERS = {
  showId: RHOP_SHOW_ID,
  seasonId: RHOP_SEASON_ID,
  episodeId: RHOP_EPISODE_ID,
};

const rhopSeason = shows
  .find((show) => show.key === "rhop")
  ?.seasons.find((season) => season.id === "season-10");

const CAST_MEMBERS: SurveyRankingItem[] = (rhopSeason?.cast ?? []).map((member) => ({
  id: member.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  label: member.name,
  img: member.image,
}));

const surveyTheme = getSurveyTheme(RHOP_SURVEY_ID);

export default function RHOPS10PlayPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<SurveyEpisodeMeta | null>(null);
  const [, setResponse] = useState<SurveyResponse | null>(null);
  const [ranking, setRanking] = useState<SurveyRankingItem[]>([]);
  const [seasonRating, setSeasonRating] = useState<number | null>(null);
  const [castVerdicts, setCastVerdicts] = useState<Map<string, CastVerdictChoice>>(new Map());
  const [currentStep, setCurrentStep] = useState<SurveyStep>("ranking");
  const [currentVerdictIndex, setCurrentVerdictIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = user?.uid ?? null;
  const isClosed = episodeMeta?.isClosed ?? false;

  useEffect(() => {
    AuthDebugger.log("RHOP Survey Play: mounting");
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
        setSeasonRating(next?.seasonRating ?? null);
        if (next?.castVerdicts) {
          const verdictMap = new Map<string, CastVerdictChoice>();
          for (const v of next.castVerdicts) {
            verdictMap.set(v.castId, v.verdict);
          }
          setCastVerdicts(verdictMap);
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
    rating: number | null,
    verdicts: Map<string, CastVerdictChoice>,
  ) => {
    const rankingComplete = rankingItems.length === CAST_MEMBERS.length;
    const ratingComplete = rating !== null;

    let pct = 0;
    if (rankingComplete) pct += 40;
    if (ratingComplete) pct += 20;
    pct += Math.round((verdicts.size / CAST_MEMBERS.length) * 40);
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
        const completionPct = calculateCompletionPct(ranking, seasonRating, castVerdicts);
        const isComplete = options?.completed ?? (
          ranking.length === CAST_MEMBERS.length &&
          seasonRating !== null &&
          castVerdicts.size === CAST_MEMBERS.length
        );
        await manager.saveResponse(
          IDENTIFIERS,
          userId,
          {
            ranking,
            seasonRating,
            castVerdicts: verdictArray,
            completionPct,
            completed: isComplete,
          },
          { surveyKey: RHOP_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, userId, ranking, seasonRating, castVerdicts, calculateCompletionPct],
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
        const completionPct = calculateCompletionPct(nextRanking, seasonRating, castVerdicts);
        await manager.saveResponse(
          IDENTIFIERS,
          userId,
          {
            ranking: nextRanking,
            seasonRating,
            castVerdicts: verdictArray,
            completionPct,
            completed: false,
          },
          { surveyKey: RHOP_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, userId, seasonRating, castVerdicts, calculateCompletionPct],
  );

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

  const handleNextStep = useCallback(async () => {
    if (currentStep === "ranking") {
      if (ranking.length !== CAST_MEMBERS.length) return;
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
        await saveCurrentState({ completed: true });
        router.push("/surveys/rhop-s10/results");
      }
    }
  }, [currentStep, ranking, seasonRating, castVerdicts, currentVerdictIndex, saveCurrentState, router]);

  const handlePrevStep = useCallback(() => {
    if (currentStep === "season-rating") {
      setCurrentStep("ranking");
    } else if (currentStep === "cast-verdict") {
      if (currentVerdictIndex > 0) {
        setCurrentVerdictIndex((prev) => prev - 1);
      } else {
        setCurrentStep("season-rating");
      }
    }
  }, [currentStep, currentVerdictIndex]);

  const handleBack = () => {
    router.push("/surveys/rhop-s10");
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
            This week&apos;s RHOP ranking is closed. Come back next week to reset the board.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/surveys/rhop-s10/results")}
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

  const overallProgress = calculateCompletionPct(ranking, seasonRating, castVerdicts);
  const currentCastMember = CAST_MEMBERS[currentVerdictIndex];

  const getStepTitle = () => {
    if (currentStep === "ranking") return "Q1. Rank the Cast of RHOP 10.";
    if (currentStep === "season-rating") return "Q2. Rate This Season";
    return "Q3. Cast Verdicts";
  };

  const getStepInstruction = () => {
    if (currentStep === "ranking") return "Drag-and-Drop the Cast Members to their Rank.";
    if (currentStep === "season-rating") return "How would you rate Season 10 so far?";
    return `${currentVerdictIndex + 1} of ${CAST_MEMBERS.length}`;
  };

  const canProceed = () => {
    if (currentStep === "ranking") return ranking.length === CAST_MEMBERS.length;
    if (currentStep === "season-rating") return seasonRating !== null;
    if (currentStep === "cast-verdict" && currentCastMember) {
      return castVerdicts.has(currentCastMember.id);
    }
    return false;
  };

  const isFirstStep = currentStep === "ranking";
  const isLastStep = currentStep === "cast-verdict" && currentVerdictIndex === CAST_MEMBERS.length - 1;

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

        {currentStep === "season-rating" && (
          <SeasonRating
            value={seasonRating}
            onChange={handleSeasonRatingChange}
            surveyTheme={surveyTheme}
            seasonLabel="Season 10"
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
