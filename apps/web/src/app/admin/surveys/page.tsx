"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

interface SurveyConfig {
  id: string;
  key: string;
  title: string;
  description: string | null;
  show_id: string | null;
  season_number: number | null;
  is_active: boolean;
  theme: Record<string, unknown> | null;
  air_schedule: {
    airDays: string[];
    airTime: string;
    timezone: string;
    autoProgress: boolean;
  } | null;
  current_episode_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminSurveysPage() {
  const router = useRouter();
  const { user, userKey, checking, hasAccess } = useAdminGuard();
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    if (!userKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchAdminWithAuth("/api/admin/surveys?full=true", {
        headers: {
          "Content-Type": "application/json",
        },
      }, {
        preferredUser: user,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to fetch surveys");
      }

      const data = await response.json();
      setSurveys(data.items ?? []);
    } catch (err) {
      console.error("Failed to fetch surveys", err);
      setError(err instanceof Error ? err.message : "Failed to fetch surveys");
    } finally {
      setLoading(false);
    }
  }, [user, userKey]);

  useEffect(() => {
    if (hasAccess && userKey) {
      fetchSurveys();
    }
  }, [hasAccess, userKey, fetchSurveys]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading surveys...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Admin / Survey Editor
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">Survey Configuration</h1>
              <p className="text-sm text-zinc-500">
                Create and manage survey themes, cast members, episodes, and air schedules.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">All Surveys</h2>
                <p className="text-sm text-zinc-500">
                  {surveys.length} survey{surveys.length !== 1 ? "s" : ""} configured
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  // TODO: Open create survey modal
                  alert("Create survey modal coming soon");
                }}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                + New Survey
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              </div>
            ) : surveys.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
                <p className="text-zinc-500">No surveys found. Create your first survey to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/50 hover:shadow-md"
                    onClick={() => router.push(`/admin/surveys/${survey.key}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-zinc-900">{survey.title}</h3>
                          {!survey.is_active && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">{survey.key}</p>
                        {survey.description && (
                          <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{survey.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {survey.show_id && (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600">
                          Show: {survey.show_id}
                        </span>
                      )}
                      {survey.season_number && (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600">
                          Season {survey.season_number}
                        </span>
                      )}
                      {survey.theme && Object.keys(survey.theme).length > 0 && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          Custom Theme
                        </span>
                      )}
                      {survey.air_schedule && (
                        <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          {survey.air_schedule.airDays.join(", ")} @ {survey.air_schedule.airTime}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">
                        Updated {new Date(survey.updated_at).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-zinc-900 transition group-hover:translate-x-0.5">
                        Edit →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
            <h3 className="text-lg font-semibold text-blue-900">Survey Editor Features</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="font-semibold">Theme Customization</h4>
                <p className="mt-1 text-blue-700">
                  Customize all 21 theme properties including colors, fonts, and UI elements.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Cast Management</h4>
                <p className="mt-1 text-blue-700">
                  Add, edit, and reorder cast members with images, roles, and status.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Episode Configuration</h4>
                <p className="mt-1 text-blue-700">
                  Manage episodes with air dates, open/close times, and current episode selection.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Air Schedule</h4>
                <p className="mt-1 text-blue-700">
                  Configure air days and times with optional auto-progression to next episode.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
