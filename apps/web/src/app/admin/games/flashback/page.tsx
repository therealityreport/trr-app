"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { ADMIN_GAME_MAP } from "@/lib/admin/games";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { createClient } from "@/lib/supabase/client";
import type { FlashbackQuiz, FlashbackEvent } from "@/lib/flashback/types";

// Flashback tables are not yet in the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  const client = createClient();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

const GAME = ADMIN_GAME_MAP.flashback;

export default function AdminFlashbackPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  const [quizzes, setQuizzes] = useState<FlashbackQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [events, setEvents] = useState<FlashbackEvent[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  /* ─── Fetch quizzes ─── */
  const fetchQuizzes = useCallback(async () => {
    setLoadingQuizzes(true);
    const supabase = db();
    const { data, error } = await supabase
      .from("flashback_quizzes")
      .select("*")
      .order("publish_date", { ascending: false });

    if (error) {
      console.error("Failed to load quizzes", error);
    } else {
      setQuizzes((data ?? []) as FlashbackQuiz[]);
    }
    setLoadingQuizzes(false);
  }, []);

  useEffect(() => {
    if (hasAccess) fetchQuizzes();
  }, [hasAccess, fetchQuizzes]);

  /* ─── Fetch events for selected quiz ─── */
  const fetchEvents = useCallback(async (quizId: string) => {
    setLoadingEvents(true);
    const supabase = db();
    const { data, error } = await supabase
      .from("flashback_events")
      .select("*")
      .eq("quiz_id", quizId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to load events", error);
    } else {
      setEvents((data ?? []) as FlashbackEvent[]);
    }
    setLoadingEvents(false);
  }, []);

  useEffect(() => {
    if (selectedQuizId) fetchEvents(selectedQuizId);
    else setEvents([]);
  }, [selectedQuizId, fetchEvents]);

  /* ─── Create quiz ─── */
  const handleCreateQuiz = async () => {
    const title = window.prompt("Quiz title:");
    if (!title) return;
    const publishDate = window.prompt("Publish date (YYYY-MM-DD):");
    if (!publishDate) return;

    const supabase = db();
    const { error } = await supabase.from("flashback_quizzes").insert({
      title,
      publish_date: publishDate,
      is_published: false,
    });

    if (error) {
      window.alert(`Error creating quiz: ${error.message}`);
    } else {
      await fetchQuizzes();
    }
  };

  /* ─── Toggle publish ─── */
  const handleTogglePublish = async (quiz: FlashbackQuiz) => {
    const supabase = db();
    const { error } = await supabase
      .from("flashback_quizzes")
      .update({ is_published: !quiz.is_published })
      .eq("id", quiz.id);

    if (error) {
      window.alert(`Error toggling publish: ${error.message}`);
    } else {
      await fetchQuizzes();
    }
  };

  /* ─── Add event ─── */
  const handleAddEvent = async () => {
    if (!selectedQuizId) return;

    const description = window.prompt("Event description:");
    if (!description) return;
    const yearStr = window.prompt("Year:");
    if (!yearStr) return;
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      window.alert("Invalid year");
      return;
    }
    const imageUrl = window.prompt("Image URL (leave blank for none):") || null;
    const pointValueStr = window.prompt("Point value (2-5):", "3");
    if (!pointValueStr) return;
    const pointValue = parseInt(pointValueStr, 10);
    if (isNaN(pointValue) || pointValue < 2 || pointValue > 5) {
      window.alert("Point value must be between 2 and 5");
      return;
    }

    const nextSortOrder = events.length + 1;

    const supabase = db();
    const { error } = await supabase.from("flashback_events").insert({
      quiz_id: selectedQuizId,
      description,
      year,
      image_url: imageUrl,
      point_value: pointValue,
      sort_order: nextSortOrder,
    });

    if (error) {
      window.alert(`Error adding event: ${error.message}`);
    } else {
      await fetchEvents(selectedQuizId);
    }
  };

  /* ─── Delete event ─── */
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Delete this event?")) return;
    const supabase = db();
    const { error } = await supabase
      .from("flashback_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      window.alert(`Error deleting event: ${error.message}`);
    } else if (selectedQuizId) {
      await fetchEvents(selectedQuizId);
    }
  };

  /* ─── Guards ─── */
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const selectedQuiz = quizzes.find((q) => q.id === selectedQuizId) ?? null;

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs
                items={[
                  { label: "Admin", href: "/admin" },
                  { label: "Games", href: "/admin/games" },
                  { label: GAME.title, href: GAME.adminHref },
                ]}
                className="mb-1"
              />
              <h1 className="text-3xl font-bold text-zinc-900">{GAME.title}</h1>
              <p className="text-sm text-zinc-500">{GAME.subtitle}</p>
            </div>
            <Link
              href="/admin/games"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Games
            </Link>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          {/* ── Quizzes Section ── */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  Quiz Management
                </p>
                <h2 className="mt-1 text-xl font-bold text-zinc-900">
                  Flashback Quizzes
                </h2>
              </div>
              <button
                onClick={handleCreateQuiz}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                Create New Quiz
              </button>
            </div>

            {loadingQuizzes ? (
              <p className="mt-4 text-sm text-zinc-500">Loading quizzes...</p>
            ) : quizzes.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No quizzes yet. Create one to get started.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-zinc-100">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className={`flex items-center justify-between gap-4 py-3 ${
                      selectedQuizId === quiz.id
                        ? "rounded-lg bg-zinc-50 px-3"
                        : "px-1"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setSelectedQuizId(
                          selectedQuizId === quiz.id ? null : quiz.id,
                        )
                      }
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-zinc-900">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {quiz.publish_date}
                        {quiz.is_published ? (
                          <span className="ml-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Published
                          </span>
                        ) : (
                          <span className="ml-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                            Draft
                          </span>
                        )}
                      </p>
                    </button>
                    <button
                      onClick={() => handleTogglePublish(quiz)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        quiz.is_published
                          ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {quiz.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Events Section ── */}
          {selectedQuiz && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                    Events
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-zinc-900">
                    {selectedQuiz.title} &mdash; Timeline Events
                  </h2>
                </div>
                <button
                  onClick={handleAddEvent}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                >
                  Add Event
                </button>
              </div>

              {loadingEvents ? (
                <p className="mt-4 text-sm text-zinc-500">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  No events yet. Add events to build this quiz.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        <th className="py-2 pr-4">#</th>
                        <th className="py-2 pr-4">Description</th>
                        <th className="py-2 pr-4">Year</th>
                        <th className="py-2 pr-4">Points</th>
                        <th className="py-2 pr-4">Image</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {events.map((evt) => (
                        <tr key={evt.id}>
                          <td className="py-2.5 pr-4 font-medium text-zinc-700">
                            {evt.sort_order}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-900">
                            {evt.description}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-700">
                            {evt.year}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-700">
                            {evt.point_value}
                          </td>
                          <td className="py-2.5 pr-4 text-zinc-500">
                            {evt.image_url ? (
                              <a
                                href={evt.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-zinc-400">None</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
