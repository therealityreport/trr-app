"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

interface TrrShow {
  id: string;
  name: string;
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

const formatFixed1 = (value: unknown): string | null => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : parsed.toFixed(1);
};

export default function TrrShowsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Covered shows state
  const [coveredShows, setCoveredShows] = useState<CoveredShow[]>([]);
  const [coveredShowIds, setCoveredShowIds] = useState<Set<string>>(new Set());
  const [loadingCovered, setLoadingCovered] = useState(true);
  const [addingShowId, setAddingShowId] = useState<string | null>(null);
  const [removingShowId, setRemovingShowId] = useState<string | null>(null);

  // Get auth headers helper
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Fetch covered shows
  const fetchCoveredShows = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/covered-shows", { headers });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch covered shows");
      }
      const data = await response.json();
      setCoveredShows(data.shows ?? []);
      setCoveredShowIds(new Set((data.shows ?? []).map((s: CoveredShow) => s.trr_show_id)));
    } catch (err) {
      console.error("Failed to fetch covered shows:", err);
    } finally {
      setLoadingCovered(false);
    }
  }, [getAuthHeaders]);

  // Load covered shows on mount
  useEffect(() => {
    if (hasAccess && user) {
      fetchCoveredShows();
    }
  }, [hasAccess, user, fetchCoveredShows]);

  // Add show to covered list
  const addToCoveredShows = useCallback(
    async (show: TrrShow) => {
      try {
        setAddingShowId(show.id);
        const headers = await getAuthHeaders();
        const response = await fetch("/api/admin/covered-shows", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
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
    [getAuthHeaders, fetchCoveredShows]
  );

  // Remove show from covered list
  const removeFromCoveredShows = useCallback(
    async (showId: string) => {
      try {
        setRemovingShowId(showId);
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/admin/covered-shows/${showId}`, {
          method: "DELETE",
          headers,
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
    [getAuthHeaders, fetchCoveredShows]
  );

  const searchShows = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `/api/admin/trr-api/shows?q=${encodeURIComponent(searchQuery)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to search shows");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchShows(query);
  };

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
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                TRR Core API
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">Shows</h1>
              <p className="text-sm text-zinc-500">
                Browse shows from the TRR metadata database. Create surveys and
                manage social posts.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Added Shows Section */}
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Editorial Coverage
                </p>
                <h2 className="text-xl font-bold text-zinc-900">
                  Added Shows
                </h2>
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
                No shows added yet. Search for shows below and click &quot;Add to
                Shows&quot; to add them to your editorial coverage list.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coveredShows.map((show) => {
                  const label = getCoveredShowDisplayName(show.show_name);
                  return (
                    <div
                      key={show.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <Link
                        href={`/admin/trr-shows/${show.trr_show_id}`}
                        className="flex-1 min-w-0 hover:underline"
                      >
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {label.primary}
                        </span>
                        {label.secondary && (
                          <span className="mt-0.5 block truncate text-xs text-zinc-500">
                            {label.secondary}
                          </span>
                        )}
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

          {/* Search Form */}
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
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
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </section>

          {/* Error State */}
          {error && (
            <section className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </section>
          )}

          {/* Results */}
          {results && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Search Results
                  </p>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {results.pagination.count} shows found
                  </h2>
                </div>
              </div>

              {results.shows.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No shows found matching your query.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {results.shows.map((show) => {
                    const isCovered = coveredShowIds.has(show.id);
                    const tmdbVoteAverageText = formatFixed1(show.tmdb_vote_average);
                    const displayName = getShowDisplayName(show);
                    return (
                      <div
                        key={show.id}
                        className="group rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 transition hover:border-zinc-400 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <Link
                            href={`/admin/trr-shows/${show.id}`}
                            className="flex-1 min-w-0"
                          >
                            <h3 className="text-lg font-semibold text-zinc-900 truncate hover:underline">
                              {displayName.primary}
                            </h3>
                            {displayName.secondary && (
                              <p className="mt-1 text-xs text-zinc-500 line-clamp-1">
                                {displayName.secondary}
                              </p>
                            )}
                            {show.networks.length > 0 && (
                              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                {show.networks.slice(0, 2).join(" · ")}
                              </p>
                            )}
                          </Link>
                          <div className="flex flex-col items-end gap-1">
                            {show.show_total_seasons && (
                              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                                {show.show_total_seasons} seasons
                              </span>
                            )}
                            {tmdbVoteAverageText && (
                              <span className="text-xs text-zinc-500">
                                ★ {tmdbVoteAverageText}
                              </span>
                            )}
                          </div>
                        </div>
                        {show.description && (
                          <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                            {show.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {show.genres?.slice(0, 3).map((genre) => (
                            <span
                              key={genre}
                              className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600"
                            >
                              {genre}
                            </span>
                          ))}
                          {show.tmdb_status && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                show.tmdb_status === "Returning Series"
                                  ? "bg-green-100 text-green-700"
                                  : show.tmdb_status === "Ended"
                                    ? "bg-zinc-100 text-zinc-600"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {show.tmdb_status}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <Link
                            href={`/admin/trr-shows/${show.id}`}
                            className="flex items-center gap-2 text-xs font-semibold text-zinc-900"
                          >
                            <span className="transition group-hover:translate-x-0.5">
                              View Details
                            </span>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              className="transition group-hover:translate-x-0.5"
                            >
                              <path
                                d="M4 12L12 4M12 4H5M12 4V11"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>

                          {/* Add/Remove from Covered Shows */}
                          {isCovered ? (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
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
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => addToCoveredShows(show)}
                              disabled={addingShowId === show.id}
                              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                            >
                              {addingShowId === show.id
                                ? "Adding..."
                                : "Add to Shows"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Empty State */}
          {!results && !loading && !error && (
            <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-zinc-500"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16 16L20 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">
                Search for a show
              </h3>
              <p className="mt-2 text-sm text-zinc-500">
                Enter a show name above to browse the TRR metadata database.
                <br />
                Try &quot;Real Housewives&quot;, &quot;Vanderpump Rules&quot;,
                or &quot;RHOSLC&quot;.
              </p>
            </section>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
