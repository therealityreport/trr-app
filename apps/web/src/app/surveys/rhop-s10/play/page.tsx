"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import FlashbackRanker from "@/components/flashback-ranker";
import { useSurveyManager } from "@/lib/surveys/manager";
import {
  RHOP_EPISODE_ID,
  RHOP_SEASON_ID,
  RHOP_SHOW_ID,
  RHOP_SURVEY_ID,
} from "@/lib/surveys/config";
import type { SurveyEpisodeMeta, SurveyRankingItem, SurveyResponse } from "@/lib/surveys/types";
import { shows } from "@/lib/admin/shows/data";
import "@/styles/realitease-fonts.css";

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

export default function RHOPS10PlayPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [episodeMeta, setEpisodeMeta] = useState<SurveyEpisodeMeta | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [rankingIds, setRankingIds] = useState<string[]>([]);
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
        setRankingIds([]);
        return;
      }

      unsubscribeResponse = manager.subscribeToResponse(IDENTIFIERS, userId, (next) => {
        setResponse(next);
        const ids = next?.ranking?.map((item) => item.id) ?? [];
        setRankingIds(ids);
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
            completionPct: Math.round((nextRanking.length / (CAST_MEMBERS.length || 1)) * 100),
            completed,
          },
          { surveyKey: RHOP_SURVEY_ID },
        );
        setSaveState("saved");
      } catch (error) {
        console.error("Failed to save survey response", error);
        setSaveState("error");
      }
    },
    [manager, response?.completed, userId],
  );

  const handleSubmit = useCallback(async () => {
    if (!userId) {
      router.push("/auth/register");
      return;
    }
    if (rankingIds.length !== CAST_MEMBERS.length) return;
    setSaveState("saving");
    try {
      const ranking = rankingIds
        .map((id) => CAST_MEMBERS.find((item) => item.id === id))
        .filter(Boolean) as SurveyRankingItem[];
      await manager.saveResponse(
        IDENTIFIERS,
        userId,
        {
          ranking,
          completionPct: 100,
          completed: true,
        },
        { surveyKey: RHOP_SURVEY_ID },
      );
      setSaveState("saved");
      router.push("/surveys/rhop-s10/results");
    } catch (error) {
      console.error("Failed to submit survey", error);
      setSaveState("error");
    }
  }, [manager, rankingIds, router, userId]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#5C0F4F]/10">
        <p className="text-sm font-semibold text-[#5C0F4F]">Loading survey…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5C0F4F]/5 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#5C0F4F]">Something went wrong</h1>
          <p className="mt-4 text-sm text-[#5C0F4F]/70">{errorMessage}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-6 inline-flex items-center rounded-full bg-[#5C0F4F] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b0a3f]"
          >
            Back to Cover
          </button>
        </div>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5C0F4F]/5 px-4">
        <div className="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="text-4xl font-bold uppercase tracking-wide text-[#5C0F4F]">Survey Closed</h1>
          <p className="mt-4 text-sm text-[#5C0F4F]/70">
            This week’s RHOP ranking is closed. Come back next week to reset the board.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/surveys/rhop-s10/results")}
              className="rounded-full bg-[#5C0F4F] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b0a3f]"
            >
              See Results
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-[#5C0F4F]/30 px-5 py-2 text-sm font-semibold text-[#5C0F4F] hover:bg-[#5C0F4F]/5"
            >
              Back to Cover
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDF5FB] px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs font-semibold uppercase tracking-[0.4em] text-[#5C0F4F]"
          >
            RHOP · Season 10
          </button>
          <div className="w-full text-left">
            <h1
              className="text-[#1B0017]"
              style={{
                fontFamily: "var(--font-rude-slab)",
                fontWeight: 800,
                fontSize: "48.828px",
                letterSpacing: "0.488px",
                textTransform: "none",
              }}
            >
              Q1. Rank the Cast of RHOP 10.
            </h1>
            <p
              className="text-[#1B0017]"
              style={{
                fontFamily: "var(--font-plymouth-serial)",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "1.1px",
                textTransform: "uppercase",
                marginTop: "0.4rem",
              }}
            >
              Tap a number or drag a portrait
            </p>
          </div>
        </header>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                void handleRankingChange([]);
              }}
              disabled={rankingIds.length === 0 || saveState === "saving"}
              className="inline-flex items-center rounded-full border border-[#5C0F4F]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#5C0F4F] transition hover:bg-[#5C0F4F]/5 disabled:cursor-not-allowed disabled:border-[#5C0F4F]/10 disabled:text-[#5C0F4F]/40"
            >
              Reset selections
            </button>
          </div>
          <FlashbackRanker
            items={CAST_MEMBERS}
            initialRankingIds={rankingIds}
            onChange={handleRankingChange}
            variant="grid"
          />
        </div>

        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rankingIds.length !== CAST_MEMBERS.length || saveState === "saving"}
            className="inline-flex items-center rounded-full bg-[#5C0F4F] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#4b0a3f] disabled:cursor-not-allowed disabled:bg-[#5C0F4F]/40"
          >
            {saveState === "saving" ? "Saving…" : "Submit Rankings"}
          </button>
          {saveState === "error" && <p className="text-sm text-red-600">Couldn’t save. Please try again.</p>}
          {saveState === "saved" && <p className="text-sm text-emerald-600">Saved! Catch the fan ranking soon.</p>}
        </div>
      </div>
    </main>
  );
}
