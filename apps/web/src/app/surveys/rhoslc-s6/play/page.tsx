"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import FlashbackRanker from "@/components/flashback-ranker";
import IconRatingInput from "@/components/survey/IconRatingInput";
import { useSurveyManager } from "@/lib/surveys/manager";
import { RHOSLC_EPISODE_ID, RHOSLC_SEASON_ID, RHOSLC_SHOW_ID, RHOSLC_SURVEY_ID } from "@/lib/surveys/config";
import type { SurveyEpisodeMeta, SurveyRankingItem, SurveyResponse } from "@/lib/surveys/types";
import "@/styles/realitease-fonts.css";

const IDENTIFIERS = {
  showId: RHOSLC_SHOW_ID,
  seasonId: RHOSLC_SEASON_ID,
  episodeId: RHOSLC_EPISODE_ID,
};

const CAST_MEMBERS: SurveyRankingItem[] = [
  { id: "lisa", label: "Lisa Barlow", img: "" },
  { id: "whitney", label: "Whitney Rose", img: "" },
  { id: "meredith", label: "Meredith Marks", img: "" },
  { id: "heather", label: "Heather Gay", img: "" },
  { id: "angie", label: "Angie Katsanevas", img: "" },
  { id: "monica", label: "Monica Garcia", img: "" },
  { id: "mary", label: "Mary Cosby", img: "" },
  { id: "danna", label: "Danna Bui-Negrete", img: "" },
];

const SNOWFLAKE_ICON_SRC = "/icons/snowflake-solid-ice-7.svg";

export default function RhoslcSurveyPlayPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<SurveyEpisodeMeta | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [seasonRating, setSeasonRating] = useState<number | null>(null);
  const [rankingIds, setRankingIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissingRatingDialogOpen, setIsMissingRatingDialogOpen] = useState(false);
  const ratingRowRef = useRef<HTMLDivElement | null>(null);
  const ratingCardRef = useRef<HTMLDivElement | null>(null);
  const ratingSaveTimeoutRef = useRef<number | null>(null);
  const rankingIdsRef = useRef<string[]>([]);
  const responseCompletedRef = useRef<boolean | undefined>(undefined);

  const userId = user?.uid ?? null;
  const isClosed = episodeMeta?.isClosed ?? false;

  useEffect(() => {
    rankingIdsRef.current = rankingIds;
  }, [rankingIds]);

  useEffect(() => {
    responseCompletedRef.current = response?.completed;
  }, [response?.completed]);

  useEffect(() => {
    return () => {
      if (ratingSaveTimeoutRef.current) {
        window.clearTimeout(ratingSaveTimeoutRef.current);
        ratingSaveTimeoutRef.current = null;
      }
    };
  }, []);

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
        const meta = await manager.getEpisodeMeta(IDENTIFIERS);
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
        setRankingIds([]);
        return;
      }

      unsubscribeResponse = manager.subscribeToResponse(IDENTIFIERS, userId, (next) => {
        setResponse(next);
        const ids = next?.ranking?.map((item) => item.id) ?? [];
        setRankingIds(ids);
        setSeasonRating(next?.seasonRating ?? null);
      });
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (unsubscribeResponse) unsubscribeResponse();
    };
  }, [manager, userId]);

  const handleRankingChange = useCallback(
    async (nextRanking: SurveyRankingItem[]) => {
      if (!userId) return;
      setRankingIds(nextRanking.map((item) => item.id));
      setSaveState("saving");
      try {
        const completed = nextRanking.length === CAST_MEMBERS.length ? response?.completed ?? false : false;
        await manager.saveResponse(
          IDENTIFIERS,
          userId,
          {
            ranking: nextRanking,
            seasonRating,
            completionPct: Math.round((nextRanking.length / CAST_MEMBERS.length) * 100),
            completed,
          },
          { surveyKey: RHOSLC_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, response?.completed, seasonRating, userId],
  );

  const handleSeasonRatingChange = useCallback(
    (next: number | null) => {
      setSeasonRating(next);
      if (!userId) return;

      if (ratingSaveTimeoutRef.current) {
        window.clearTimeout(ratingSaveTimeoutRef.current);
        ratingSaveTimeoutRef.current = null;
      }

      setSaveState("saving");

      ratingSaveTimeoutRef.current = window.setTimeout(async () => {
        try {
          const ids = rankingIdsRef.current;
          const ranking = ids
            .map((id) => CAST_MEMBERS.find((item) => item.id === id))
            .filter(Boolean) as SurveyRankingItem[];
          const completed = ranking.length === CAST_MEMBERS.length ? responseCompletedRef.current ?? false : false;

          await manager.saveResponse(
            IDENTIFIERS,
            userId,
            {
              ranking,
              seasonRating: next,
              completionPct: Math.round((ranking.length / CAST_MEMBERS.length) * 100),
              completed,
            },
            { surveyKey: RHOSLC_SURVEY_ID },
          );
          setSaveState("saved");
        } catch (error) {
          console.error("Failed to save season rating", error);
          setSaveState("error");
        }
      }, 450);
    },
    [manager, userId],
  );

  const focusSeasonRating = useCallback(() => {
    ratingCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => ratingRowRef.current?.focus(), 100);
  }, []);

  const handleSubmit = useCallback(async ({ allowMissingRating = false }: { allowMissingRating?: boolean } = {}) => {
    if (!userId) {
      router.push("/auth/register");
      return;
    }
    if (rankingIds.length !== CAST_MEMBERS.length) return;
    if (!allowMissingRating && seasonRating === null) {
      setIsMissingRatingDialogOpen(true);
      return;
    }
    if (ratingSaveTimeoutRef.current) {
      window.clearTimeout(ratingSaveTimeoutRef.current);
      ratingSaveTimeoutRef.current = null;
    }
    setSaveState("saving");
    try {
      const ranking = rankingIds.map((id) => CAST_MEMBERS.find((item) => item.id === id)).filter(Boolean) as SurveyRankingItem[];
      await manager.saveResponse(
        IDENTIFIERS,
        userId,
        {
          ranking,
          seasonRating,
          completionPct: 100,
          completed: true,
        },
        { surveyKey: RHOSLC_SURVEY_ID },
      );
      setSaveState("saved");
      router.push("/surveys/rhoslc-s6/results");
    } catch (error) {
      console.error("Failed to submit survey", error);
      setSaveState("error");
    }
  }, [manager, rankingIds, router, seasonRating, userId]);

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
      <div className="flex min-h-screen items-center justify-center bg-rose-100">
        <p className="text-sm font-semibold text-rose-700">Loading survey…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="font-rude-slab text-3xl font-bold uppercase tracking-wide text-rose-700">
            Something went wrong
          </h1>
          <p className="mt-4 text-sm text-rose-500">{errorMessage}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex items-center rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            Back to Cover
          </button>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="font-rude-slab text-4xl font-bold uppercase tracking-wide text-rose-800">
            Survey Closed
          </h1>
          <p className="mt-4 text-sm text-rose-600">
            This episode’s survey is no longer accepting responses. Thank you for sharing your takes!
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/surveys/rhoslc-s6/results")}
              className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              See Results
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Back to Cover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={handleBack}
            className="self-start rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 shadow hover:bg-rose-50"
          >
            Back
          </button>
          <h1 className="font-rude-slab text-4xl font-bold uppercase tracking-wide text-rose-900">
            Rank the RHOSLC Icons
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-rose-700">
            Drag each Housewife onto the line from best to worst. Think confessionals, chaos, and shade—
            this ranking is all about who carried the flashbacks.
          </p>
          <div className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-500">
            Episode {episodeMeta?.episodeId ?? ""}
          </div>
        </header>

        <section ref={ratingCardRef} className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-rude-slab text-3xl font-bold uppercase tracking-wide text-rose-900">
              Rate the season
            </h2>
            <p className="max-w-2xl text-sm text-rose-700">Pick 1 to 5 snowflakes. Halves are allowed.</p>
            <IconRatingInput
              ref={ratingRowRef}
              value={seasonRating}
              onChange={handleSeasonRatingChange}
              min={1}
              max={5}
              step={0.5}
              iconSrc={SNOWFLAKE_ICON_SRC}
              iconCount={5}
              sizePx={42}
              fillColor="#0EA5E9"
              emptyColor="#E5E7EB"
              ariaLabel="Season rating"
            />
          </div>
        </section>

        <FlashbackRanker
          items={CAST_MEMBERS}
          initialRankingIds={rankingIds}
          lineLabelTop="ICONIC"
          lineLabelBottom="SNOOZE"
          onChange={handleRankingChange}
        />

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={rankingIds.length !== CAST_MEMBERS.length || saveState === "saving"}
            className="inline-flex items-center rounded-full bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {saveState === "saving" ? "Saving…" : rankingIds.length === CAST_MEMBERS.length ? "Submit & See Results" : "Finish Ranking to Submit"}
          </button>
          {saveState === "saved" && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">Progress saved</p>
          )}
          {saveState === "error" && (
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">Failed to save. Try again.</p>
          )}
        </div>

        {isMissingRatingDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2 className="font-rude-slab text-2xl font-bold text-rose-900">
                Add a season rating?
              </h2>
              <p className="mt-2 text-sm text-rose-700">
                It’s optional, but it helps us understand the vibe of the season.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsMissingRatingDialogOpen(false);
                    focusSeasonRating();
                  }}
                  className="rounded-full border border-rose-200 px-5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Add rating
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMissingRatingDialogOpen(false);
                    void handleSubmit({ allowMissingRating: true });
                  }}
                  className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                >
                  Submit without rating
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
