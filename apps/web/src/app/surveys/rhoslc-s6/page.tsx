"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthDebugger } from "@/lib/debug";
import { useSurveyManager } from "@/lib/surveys/manager";
import { RHOSLC_EPISODE_ID, RHOSLC_SEASON_ID, RHOSLC_SHOW_ID, RHOSLC_SURVEY_ID } from "@/lib/surveys/config";
import type { SurveyEpisodeMeta } from "@/lib/surveys/types";
import "@/styles/realitease-fonts.css";

const IDENTIFIERS = {
  showId: RHOSLC_SHOW_ID,
  seasonId: RHOSLC_SEASON_ID,
  episodeId: RHOSLC_EPISODE_ID,
};

function SurveyIcon() {
  return (
    <div className="relative h-20 w-20 overflow-hidden">
      <div className="absolute inset-0 rounded-2xl bg-rose-200" />
      <div className="absolute inset-2 rounded-xl bg-white" />
      <div className="absolute inset-4 flex flex-col justify-between">
        <span className="h-2 w-12 rounded-full bg-rose-500" />
        <span className="h-2 w-14 rounded-full bg-rose-500" />
        <span className="h-2 w-10 rounded-full bg-rose-500" />
      </div>
    </div>
  );
}

export default function RhoslcCoverPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<SurveyEpisodeMeta | null>(null);
  const [cta, setCta] = useState<"loading" | "start" | "continue" | "results">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const userId = user?.uid ?? null;

  const ctaLabel = useMemo(() => {
    switch (cta) {
      case "results":
        return "See Results";
      case "continue":
        return "Continue";
      case "start":
        return "Start";
      default:
        return "Loading...";
    }
  }, [cta]);

  useEffect(() => {
    AuthDebugger.log("RHOSLC Cover: mounting");
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      AuthDebugger.log("RHOSLC Cover: auth state changed", { hasUser: Boolean(authUser) });
      setUser(authUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeResponse: (() => void) | null = null;
    let isMounted = true;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      try {
        const episodeMeta = await manager.getEpisodeMeta(IDENTIFIERS, {
          surveyId: RHOSLC_SURVEY_ID,
          episodeLabel: "RHOSLC Season 6",
        });
        if (!isMounted) return;
        setMeta(episodeMeta);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load survey";
        setErrorMessage(message);
        setIsBootstrapping(false);
        return;
      }

      if (!userId) {
        setCta("start");
        setIsBootstrapping(false);
        return;
      }

      unsubscribeResponse = manager.subscribeToResponse(IDENTIFIERS, userId, (next) => {
        setCta(manager.resolveCta(next));
        setIsBootstrapping(false);
      });
    };

    bootstrap();

    return () => {
      isMounted = false;
      if (unsubscribeResponse) unsubscribeResponse();
    };
  }, [manager, userId]);

  const handlePrimaryCta = async () => {
    if (!userId) {
      router.push("/auth/register");
      return;
    }

    if (cta === "results") {
      router.push("/surveys/rhoslc-s6/results");
      return;
    }

    router.push("/surveys/rhoslc-s6/play");
  };

  const handleBack = () => {
    router.push("/hub");
  };

  if (authLoading || isBootstrapping) {
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
            Back to Hub
          </button>
        </div>
      </div>
    );
  }

  const isClosed = meta?.isClosed ?? false;
  const subtitle = isClosed
    ? "This survey is closed."
    : "Rank the RHOSLC Season 6 cast from best to worst each week.";
  const isResultsCta = cta === "results";
  const isButtonDisabled = cta === "loading" || !userId || (isClosed && !isResultsCta);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-xl">
        <div className="relative flex flex-col items-center gap-4 bg-rose-200 px-4 py-8 text-center sm:px-8 sm:py-12">
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 shadow hover:bg-rose-50 sm:left-6 sm:top-6"
          >
            Back
          </button>
          <SurveyIcon />
          <div className="space-y-1">
            <p className="font-rude-slab text-sm uppercase tracking-[0.4em] text-rose-600">Survey</p>
            <h1 className="font-rude-slab text-4xl font-bold text-rose-900">
              RHOSLC Season 6 Flashback Ranking
            </h1>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-700">Episode {meta?.episodeId ?? ""}</p>
            <p className="text-xs uppercase tracking-[0.35em] text-rose-600">Created by The Reality Reporter</p>
          </div>
        </div>

        <div className="space-y-10 px-5 py-8 sm:px-10 sm:py-12">
          <section className="space-y-4 text-center">
            <p className="font-['TN_Web_Use_Only'] text-lg leading-relaxed text-rose-900">
              Drag each Salt Lake City Housewife from the bench onto the line. Place them from your
              favorite at the top to your least favorite at the bottom. You can reorder or remove a cast
              member at any time before submitting.
            </p>
            {subtitle && <p className="text-sm text-rose-600">{subtitle}</p>}
          </section>

          <section className="grid gap-8 rounded-2xl border border-rose-100 bg-rose-50 p-6 shadow-inner">
            <article className="rounded-xl border border-white bg-white p-6 text-left shadow-sm">
              <h2 className="font-rude-slab text-2xl font-bold uppercase tracking-wide text-rose-900">
                This Week’s Prompt
              </h2>
              <p className="mt-3 text-sm text-rose-700">
                Incorporate iconic flashbacks and confessionals from this season. Rank the women from the
                most knee-slapping, chaotic energy to the least. We care about the drama they bring, the
                laughs they deliver, and how unforgettable their confessionals are.
              </p>
            </article>

            <article className="rounded-xl border border-white bg-white p-6 text-left shadow-sm">
              <h3 className="font-rude-slab text-xl font-bold uppercase tracking-wide text-rose-900">
                How it works
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-rose-700">
                <li>• Drag a cast token from the bench onto the line to place them.</li>
                <li>• Drag a token higher or lower on the line to reorder your ranking.</li>
                <li>• Drop a token back on the bench to remove them from the ranking.</li>
                <li>• Your progress saves automatically so you can return anytime before the survey closes.</li>
              </ul>
            </article>
          </section>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handlePrimaryCta}
              disabled={isButtonDisabled}
              className="inline-flex items-center rounded-full bg-rose-600 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {ctaLabel}
            </button>
            {isClosed && !isResultsCta && (
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-rose-500">
                Survey closed · See results any time
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
