"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import {
  readAdminRecentShows,
  recordAdminRecentShow,
  subscribeAdminRecentShows,
  type AdminRecentShowEntry,
} from "@/lib/admin/admin-recent-shows";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type ShowResult = {
  id: string;
  name: string;
  slug?: string | null;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
  show_total_seasons?: number | null;
  show_total_episodes?: number | null;
};

type ShowsResponse = {
  shows?: ShowResult[];
};

const breadcrumbs = buildAdminSectionBreadcrumb("Screenalytics", "/screenalytics");
const MIN_QUERY_LENGTH = 2;

export default function ScreenalyticsPickerPage() {
  const { checking, hasAccess, user } = useAdminGuard();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<ShowResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentShows, setRecentShows] = useState<AdminRecentShowEntry[]>([]);

  useEffect(() => {
    setRecentShows(readAdminRecentShows());
    const unsubscribe = subscribeAdminRecentShows(setRecentShows);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/shows?q=${encodeURIComponent(trimmed)}&limit=12`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
          {
            preferredUser: user,
            allowDevAdminBypass: true,
          },
        );
        const payload = (await response.json().catch(() => ({}))) as ShowsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to search shows");
        }
        setResults(Array.isArray(payload.shows) ? payload.shows : []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setResults([]);
        setError(fetchError instanceof Error ? fetchError.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => controller.abort();
  }, [debouncedQuery, user]);

  const helperText = useMemo(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return "Search by show name, slug, or franchise acronym.";
    if (loading) return "Searching shows...";
    if (error) return error;
    if (results.length === 0) return "No matching shows found yet.";
    return `Found ${results.length} matching show${results.length === 1 ? "" : "s"}.`;
  }, [error, loading, query, results.length]);

  if (checking) {
    return (
      <AdminGlobalHeader bodyClassName="px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-zinc-500">Checking admin access...</p>
        </div>
      </AdminGlobalHeader>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <AdminGlobalHeader bodyClassName="px-6 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
          <h1 className="text-3xl font-bold text-zinc-900">Screenalytics</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pick a show, then jump into its admin workspace for screen-time and related review flows. This picker lives
            in TRR-APP, remains the canonical admin label for this workflow, and is separate from the retired legacy
            screenalytics repo UI.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.35fr,0.85fr]">
          <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(24,24,27,0.06),_transparent_48%),linear-gradient(135deg,_#fafafa,_#f4f4f5)] px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">Show Finder</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-950">Open a show workspace fast</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Search by show name, slug, or acronym, then jump straight into the show admin surface.
                  </p>
                </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-right shadow-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Route</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">/&lt;show&gt;</div>
                </div>
              </div>
              <label className="mt-5 block text-sm font-medium text-zinc-700">
                Search shows
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search RHOSLC, Real Housewives of Salt Lake City, Vanderpump..."
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900"
                />
              </label>
              <p className="mt-3 text-sm text-zinc-500">{helperText}</p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {results.length === 0 && query.trim().length < MIN_QUERY_LENGTH ? (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-center text-sm text-zinc-500">
                  Start typing to search shows, or pick one from your recent list.
                </div>
              ) : null}
              {results.map((show) => {
                const routeSlug = resolvePreferredShowRouteSlug({
                  alternativeNames: show.alternative_names,
                  canonicalSlug: show.canonical_slug,
                  slug: show.slug,
                  fallback: show.name,
                });
                const href = `/${encodeURIComponent(routeSlug)}` as Route;
                return (
                  <Link
                    key={show.id}
                    href={href}
                    onClick={() => recordAdminRecentShow({ slug: routeSlug, label: show.name, href })}
                    className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/50 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Show</p>
                        <h2 className="mt-1 break-words text-xl font-semibold text-zinc-900">{show.name}</h2>
                        <p className="mt-2 break-all text-xs text-zinc-500">/{routeSlug}</p>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition group-hover:border-zinc-900 group-hover:text-zinc-950">
                        Open
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-600">
                      {show.show_total_seasons != null ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1">
                          {show.show_total_seasons} season{show.show_total_seasons === 1 ? "" : "s"}
                        </span>
                      ) : null}
                      {show.show_total_episodes != null ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-1">
                          {show.show_total_episodes} episode{show.show_total_episodes === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[28px] border border-zinc-200 bg-zinc-950 p-5 text-zinc-100 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Recent</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Jump back in</h2>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                {recentShows.length}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Recent show workspaces from your admin sessions stay here for one-click access.
            </p>
            <div className="mt-5 space-y-3">
              {recentShows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/70 px-4 py-5 text-sm text-zinc-400">
                  No recent shows yet. Open a show once and it will appear here.
                </div>
              ) : null}
              {recentShows.map((show) => (
                <Link
                  key={show.slug}
                  href={show.href as Route}
                  className="block rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-4 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Recent show</div>
                  <div className="mt-2 text-lg font-semibold text-white">{show.label}</div>
                  <div className="mt-1 break-all text-xs text-zinc-400">{show.href}</div>
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </AdminGlobalHeader>
  );
}
