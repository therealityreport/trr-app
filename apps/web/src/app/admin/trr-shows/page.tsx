"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { buildShowAdminUrl } from "@/lib/admin/show-admin-routes";

interface TrrShow {
  id: string;
  name: string;
  slug: string;
  canonical_slug: string;
  alternative_names?: string[] | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  show_total_seasons: number | null;
  show_total_episodes: number | null;
  description: string | null;
  networks: string[];
  genres: string[];
  tmdb_status: string | null;
  tmdb_vote_average: number | null;
  imdb_rating_value: number | null;
}

interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug?: string | null;
  show_total_episodes?: number | null;
  poster_url?: string | null;
  created_at: string;
  created_by_firebase_uid: string;
}

interface SearchResult {
  shows: TrrShow[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

const sanitizeAcronym = (value: string) => value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

const getHousewivesAcronymFromAlternativeNames = (
  alternativeNames: unknown,
): string | null => {
  if (!Array.isArray(alternativeNames)) return null;

  const candidates = alternativeNames
    .filter((name): name is string => typeof name === "string")
    .map((name) => sanitizeAcronym(name.trim()))
    .filter(Boolean)
    .filter((name) => /^RH[A-Z0-9]{2,}$/.test(name));

  if (candidates.length === 0) return null;

  const rho = candidates.filter((name) => name.startsWith("RHO"));
  const pool = rho.length > 0 ? rho : candidates;
  pool.sort((a, b) => b.length - a.length);
  return pool[0] ?? null;
};

const getHousewivesAcronymFromTitle = (title: string): string | null => {
  const normalized = title.trim().replace(/^the\s+/i, "");
  const match = normalized.match(/real housewives of (.+)$/i);
  if (!match) return null;

  const remainder = match[1]
    .replace(/[()]/g, " ")
    .replace(/[^A-Za-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!remainder) return null;

  const stop = new Set(["of", "the", "and"]);
  const letters = remainder
    .split(" ")
    .filter((word) => word.length > 0 && !stop.has(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase())
    .filter((value): value is string => Boolean(value));

  if (letters.length === 0) return null;

  return `RHO${letters.join("")}`;
};

const getShowDisplayName = (show: { name: string; alternative_names?: string[] | null }) => {
  const acronym =
    getHousewivesAcronymFromAlternativeNames(show.alternative_names) ??
    getHousewivesAcronymFromTitle(show.name);

  if (!acronym) {
    return { primary: show.name, secondary: null as string | null };
  }

  const normalizedName = sanitizeAcronym(show.name);
  if (normalizedName === acronym) {
    return { primary: show.name, secondary: null as string | null };
  }

  // Only apply acronym display for Real Housewives-family shows.
  if (!/real housewives/i.test(show.name) && !acronym.startsWith("RH")) {
    return { primary: show.name, secondary: null as string | null };
  }

  return { primary: acronym, secondary: show.name };
};

const getCoveredShowDisplayName = (name: string) => {
  const acronym = getHousewivesAcronymFromTitle(name);
  if (!acronym) return { primary: name, secondary: null as string | null };
  const normalizedName = sanitizeAcronym(name);
  if (normalizedName === acronym) return { primary: name, secondary: null as string | null };
  return { primary: acronym, secondary: name };
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizePosterUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `https://image.tmdb.org/t/p/original${trimmed}`;
  return null;
};

export default function TrrShowsPage() {
  const { user, userKey, checking, hasAccess } = useAdminGuard();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestSearchRequestRef = useRef(0);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  // Sync-from-lists state
  const [syncingLists, setSyncingLists] = useState(false);
  const [syncListsNotice, setSyncListsNotice] = useState<string | null>(null);
  const [syncListsError, setSyncListsError] = useState<string | null>(null);

  // Covered shows state
  const [coveredShows, setCoveredShows] = useState<CoveredShow[]>([]);
  const [coveredShowIds, setCoveredShowIds] = useState<Set<string>>(new Set());
  const [loadingCovered, setLoadingCovered] = useState(true);
  const [addingShowId, setAddingShowId] = useState<string | null>(null);
  const [removingShowId, setRemovingShowId] = useState<string | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  // Fetch covered shows
  const fetchCoveredShows = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/admin/covered-shows");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch covered shows");
      }
      const data = await response.json();
      setCoveredShows(data.shows ?? []);
      setCoveredShowIds(new Set((data.shows ?? []).map((s: CoveredShow) => s.trr_show_id)));
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        return;
      }
      console.error("Failed to fetch covered shows:", err);
    } finally {
      setLoadingCovered(false);
    }
  }, [fetchWithAuth]);

  // Load covered shows on mount
  useEffect(() => {
    if (checking || !user || !hasAccess || !userKey) {
      return;
    }
    fetchCoveredShows();
  }, [checking, user, hasAccess, userKey, fetchCoveredShows]);

  // Add show to covered list
  const addToCoveredShows = useCallback(
    async (show: TrrShow) => {
      try {
        setAddingShowId(show.id);
        const response = await fetchWithAuth("/api/admin/covered-shows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trr_show_id: show.id,
            show_name: show.name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to add show");
        }

        await fetchCoveredShows();
      } catch (err) {
        console.error("Failed to add covered show:", err);
        setError(err instanceof Error ? err.message : "Failed to add show");
      } finally {
        setAddingShowId(null);
      }
    },
    [fetchCoveredShows, fetchWithAuth]
  );

  // Remove show from covered list
  const removeFromCoveredShows = useCallback(
    async (showId: string) => {
      try {
        setRemovingShowId(showId);
        const response = await fetchWithAuth(`/api/admin/covered-shows/${showId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to remove show");
        }

        await fetchCoveredShows();
      } catch (err) {
        console.error("Failed to remove covered show:", err);
        setError(err instanceof Error ? err.message : "Failed to remove show");
      } finally {
        setRemovingShowId(null);
      }
    },
    [fetchCoveredShows, fetchWithAuth]
  );

  const searchShows = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      searchAbortControllerRef.current?.abort();
      searchAbortControllerRef.current = null;
      setResults(null);
      setSearchError(null);
      setLoading(false);
      return;
    }

    searchAbortControllerRef.current?.abort();
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const requestId = latestSearchRequestRef.current + 1;
    latestSearchRequestRef.current = requestId;
    setLoading(true);
    setSearchError(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/trr-api/shows?q=${encodeURIComponent(searchQuery)}&limit=20`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to search shows");
      }

      const data = await response.json();
      if (requestId !== latestSearchRequestRef.current) return;
      setResults(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (requestId !== latestSearchRequestRef.current) return;
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      if (searchAbortControllerRef.current === controller) {
        searchAbortControllerRef.current = null;
      }
      if (requestId !== latestSearchRequestRef.current) return;
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!hasAccess || !userKey) return;
    const q = query.trim();

    if (!q) {
      setResults(null);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void searchShows(q);
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [hasAccess, userKey, query, searchShows]);

  useEffect(() => {
    return () => {
      searchAbortControllerRef.current?.abort();
      searchAbortControllerRef.current = null;
    };
  }, []);

  const syncFromLists = useCallback(async () => {
    if (syncingLists) return;

    setSyncingLists(true);
    setSyncListsNotice(null);
    setSyncListsError(null);

    try {
      const response = await fetchWithAuth("/api/admin/trr-api/shows/sync-from-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof data.error === "string" && typeof data.detail === "string"
            ? `${data.error}: ${data.detail}`
            : (typeof data.error === "string" && data.error) ||
              (typeof data.detail === "string" && data.detail) ||
              "Sync failed";
        throw new Error(message);
      }

      const created = typeof data.created === "number" ? data.created : null;
      const updated = typeof data.updated === "number" ? data.updated : null;
      const skipped = typeof data.skipped === "number" ? data.skipped : null;
      const candidates =
        typeof data.candidates_collected === "number" ? data.candidates_collected : null;

      setSyncListsNotice(
        `Synced from lists: created=${created ?? "?"} updated=${updated ?? "?"} skipped=${skipped ?? "?"} (candidates=${candidates ?? "?"})`
      );

      // If the user is actively searching, re-run search to reflect updates.
      if (query.trim()) {
        await searchShows(query);
      }
    } catch (err) {
      console.error("Failed to sync shows from lists:", err);
      setSyncListsError(err instanceof Error ? err.message : "Failed to sync from lists");
    } finally {
      setSyncingLists(false);
    }
  }, [fetchWithAuth, query, searchShows, syncingLists]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access...</p>
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
        <AdminGlobalHeader bodyClassName="px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Shows", "/admin/trr-shows")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">Shows</h1>
              <p className="text-sm text-zinc-500">
                Browse shows from the TRR metadata database. Create surveys and
                manage social posts.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={syncFromLists}
                disabled={syncingLists}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncingLists ? "Syncing..." : "Sync from Lists"}
              </button>
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Search */}
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Search
              </p>
              <h2 className="text-xl font-bold text-zinc-900">Find Shows</h2>
            </div>
            <div className="relative">
              <label htmlFor="search" className="sr-only">
                Search shows
              </label>
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shows by name (e.g., 'Real Housewives', 'Vanderpump', 'RHOSLC')"
                className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />

              {query.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[26rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl">
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                    </div>
                  ) : searchError ? (
                    <div className="p-3 text-sm text-red-700">{searchError}</div>
                  ) : !results || results.shows.length === 0 ? (
                    <div className="p-3 text-sm text-zinc-500">
                      No shows found matching your query.
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {results.shows.map((show) => {
                        const isCovered = coveredShowIds.has(show.id);
                        const displayName = getShowDisplayName(show);
                        const networks = show.networks.slice(0, 2).join(" · ");
                        const seasonsText =
                          typeof show.show_total_seasons === "number" && show.show_total_seasons > 0
                            ? `${show.show_total_seasons} seasons`
                            : null;
                        const metaText = [networks || null, seasonsText].filter(Boolean).join(" · ");

                        return (
                          <li key={show.id} className="flex items-start justify-between gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <Link
                                href={buildShowAdminUrl({
                                  showSlug: show.canonical_slug || show.slug || show.id,
                                }) as "/admin/trr-shows"}
                                className="block rounded-md px-1 py-0.5 transition hover:bg-zinc-50"
                              >
                                <p className="truncate text-sm font-semibold text-zinc-900">
                                  {displayName.primary}
                                </p>
                                {displayName.secondary && (
                                  <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                                    {displayName.secondary}
                                  </p>
                                )}
                                {metaText && (
                                  <p className="mt-1 text-xs text-zinc-500">{metaText}</p>
                                )}
                              </Link>
                            </div>
                            {isCovered ? (
                              <span
                                className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
                                title="In Shows"
                              >
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span className="sr-only">In Shows</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => addToCoveredShows(show)}
                                disabled={addingShowId === show.id}
                                className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                              >
                                {addingShowId === show.id ? "Adding..." : "Add"}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Results appear in a dropdown while you type.
            </p>
          </section>

          {(syncListsNotice || syncListsError) && (
            <section
              className={`mb-8 rounded-2xl border p-6 ${
                syncListsError
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  syncListsError ? "text-red-800" : "text-green-800"
                }`}
              >
                {syncListsError ? "Sync Failed" : "Sync Complete"}
              </p>
              <p
                className={`mt-1 text-sm ${
                  syncListsError ? "text-red-700" : "text-green-700"
                }`}
              >
                {syncListsError || syncListsNotice}
              </p>
            </section>
          )}

          {/* Error State */}
          {error && (
            <section className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </section>
          )}

          {/* Shows (editorial coverage) */}
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Editorial Coverage
                </p>
                <h2 className="text-xl font-bold text-zinc-900">Shows</h2>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {coveredShows.length} shows
              </span>
            </div>

            {loadingCovered ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
              </div>
            ) : coveredShows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No shows added yet. Search above and click &quot;Add&quot; to add a show
                to editorial coverage.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coveredShows.map((show) => {
                  const label = getCoveredShowDisplayName(show.show_name);
                  const posterUrl = normalizePosterUrl(show.poster_url);
                  const totalEpisodes = toFiniteNumber(show.show_total_episodes);
                  const canonicalSlug =
                    typeof show.canonical_slug === "string" && show.canonical_slug.trim()
                      ? show.canonical_slug.trim()
                      : show.trr_show_id;
                  return (
                    <div
                      key={show.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <Link
                        href={buildShowAdminUrl({
                          showSlug: canonicalSlug,
                        }) as "/admin/trr-shows"}
                        className="group flex min-w-0 flex-1 items-start gap-3"
                      >
                        <div className="relative w-20 flex-shrink-0 aspect-[4/5] overflow-hidden rounded-md bg-zinc-200">
                          {posterUrl ? (
                            <Image
                              src={posterUrl}
                              alt={`${label.secondary ?? label.primary} poster`}
                              fill
                              className="object-cover"
                              sizes="80px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                <path d="M7 17l3-4 2 2 4-5 3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <span className="block text-sm font-medium leading-snug text-zinc-900 whitespace-normal break-words group-hover:underline">
                            {label.primary}
                          </span>
                          {label.secondary && (
                            <span className="mt-0.5 block text-xs leading-snug text-zinc-500 whitespace-normal break-words">
                              {label.secondary}
                            </span>
                          )}
                          <span className="mt-1 block text-xs text-zinc-500">
                            Total Episodes:{" "}
                            {typeof totalEpisodes === "number"
                              ? totalEpisodes.toLocaleString()
                              : "—"}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFromCoveredShows(show.trr_show_id)}
                        disabled={removingShowId === show.trr_show_id}
                        className="ml-2 flex-shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingShowId === show.trr_show_id ? "..." : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
