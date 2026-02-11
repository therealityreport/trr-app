"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSurveyManager } from "@/lib/surveys/manager";
import { RHOSLC_EPISODE_ID, RHOSLC_SEASON_ID, RHOSLC_SHOW_ID } from "@/lib/surveys/config";
import type { SurveyResponse } from "@/lib/surveys/types";
import PartialFillIcon from "@/components/survey/PartialFillIcon";
import "@/styles/realitease-fonts.css";

const IDENTIFIERS = {
  showId: RHOSLC_SHOW_ID,
  seasonId: RHOSLC_SEASON_ID,
  episodeId: RHOSLC_EPISODE_ID,
};

const SNOWFLAKE_ICON_SRC = "/icons/snowflake-solid-ice-7.svg";

export default function RhoslcSurveyResultsPage() {
  const router = useRouter();
  const manager = useSurveyManager();
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setResponse(null);
      return;
    }
    const unsubscribe = manager.subscribeToResponse(IDENTIFIERS, user.uid, (next) => {
      setResponse(next);
    });
    return () => unsubscribe();
  }, [manager, user?.uid]);

  const handleBack = () => {
    router.push("/surveys/rhoslc-s6");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50">
        <p className="text-sm font-semibold text-rose-600">Loading your ranking…</p>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rose-50 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">
          <h1 className="font-rude-slab text-3xl font-bold uppercase tracking-wide text-rose-800">
            Sign in to view results
          </h1>
          <p className="mt-4 text-sm text-rose-600">Log in to see how your ranking stacks up.</p>
          <button
            type="button"
            onClick={() => router.push("/auth/register")}
            className="mt-6 inline-flex items-center rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white px-4 py-12">
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
            Your RHOSLC Ranking
          </h1>
          <p className="max-w-2xl text-sm text-rose-700">
            Here’s the order you locked in. We’ll reveal fan-wide results soon—check back after the
            episode airs.
          </p>
        </header>

        <section className="rounded-3xl border border-rose-100 bg-white p-8 shadow-xl">
          {response && (
            <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">Your season rating</div>
              {response.seasonRating !== null && response.seasonRating !== undefined ? (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="font-rude-slab text-5xl font-bold tabular-nums text-rose-900">
                    {response.seasonRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const raw = response.seasonRating! - index;
                      const fillPercent = Math.round(Math.max(0, Math.min(1, raw)) * 100);
                      return (
                        <span key={`snowflake-${index}`} data-fill-percent={fillPercent}>
                          <PartialFillIcon
                            src={SNOWFLAKE_ICON_SRC}
                            sizePx={34}
                            fillPercent={fillPercent}
                            fillColor="#0EA5E9"
                            emptyColor="#E5E7EB"
                          />
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-rose-700">No rating submitted.</p>
              )}
            </div>
          )}

          {response?.ranking?.length ? (
            <ol className="space-y-3 text-left">
              {response.ranking.map((item, index) => (
                <li key={item.id} className="flex items-center gap-4">
                  <span className="flex size-10 items-center justify-center rounded-full bg-rose-100 font-semibold text-rose-700">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="size-12 overflow-hidden rounded-full border border-rose-100">
                      {item.img ? (
                        <Image
                          src={item.img}
                          alt={item.label}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-rose-200 text-xs font-bold uppercase text-rose-700">
                          {item.label.split(" ").map((part) => part[0]).join("")}
                        </div>
                      )}
                    </div>
                    <span className="font-['TN_Web_Use_Only'] text-lg font-semibold text-rose-900">{item.label}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-10 text-center">
              <p className="font-['TN_Web_Use_Only'] text-base text-rose-700">
                You haven’t submitted a ranking yet. Head back to the survey to share your take!
              </p>
              <button
                type="button"
                onClick={() => router.push("/surveys/rhoslc-s6/play")}
                className="mt-6 inline-flex items-center rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Go to Survey
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
