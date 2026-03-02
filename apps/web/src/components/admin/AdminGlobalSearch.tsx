"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  buildPersonAdminUrl,
  buildSeasonAdminUrl,
  buildShowAdminUrl,
} from "@/lib/admin/show-admin-routes";

type ShowResult = {
  id: string;
  name: string;
  slug: string;
};

type PersonResult = {
  id: string;
  full_name: string | null;
  known_for: string | null;
  person_slug: string;
  show_context: string | null;
};

type EpisodeResult = {
  id: string;
  title: string | null;
  episode_number: number | null;
  season_number: number | null;
  air_date: string | null;
  show_name: string | null;
  show_slug: string;
};

type SearchResponse = {
  shows: ShowResult[];
  people: PersonResult[];
  episodes: EpisodeResult[];
};

type AdminGlobalSearchProps = {
  variant?: "header" | "hero";
};

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 250;

const hasQuery = (value: string): boolean => value.trim().length >= MIN_QUERY_LENGTH;

function SectionHeader({ id, children }: { id: string; children: string }) {
  return (
    <h3 id={id} className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
      {children}
    </h3>
  );
}

export default function AdminGlobalSearch({ variant = "header" }: AdminGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === MIN_QUERY_LENGTH) {
      setDebouncedQuery(trimmed);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!hasQuery(trimmed)) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const response = await fetch(
          `/api/admin/trr-api/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => ({}))) as SearchResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to search");
        }
        if (requestIdRef.current !== requestId) return;
        setResults({
          shows: Array.isArray(data.shows) ? data.shows : [],
          people: Array.isArray(data.people) ? data.people : [],
          episodes: Array.isArray(data.episodes) ? data.episodes : [],
        });
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        setResults(null);
        setError(fetchError instanceof Error ? fetchError.message : "Search failed");
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const totalHits = useMemo(() => {
    if (!results) return 0;
    return results.shows.length + results.people.length + results.episodes.length;
  }, [results]);

  const shouldShowPanel = open && hasQuery(query) && (Boolean(error) || loading || totalHits >= 0);
  const isHero = variant === "hero";

  return (
    <div
      ref={containerRef}
      className={isHero ? "relative w-full max-w-5xl" : "relative w-[min(36rem,72vw)]"}
    >
      <div
        className={
          isHero
            ? "flex items-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            : "flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 shadow-sm"
        }
      >
        <svg
          aria-hidden="true"
          className={isHero ? "h-5 w-5 text-zinc-500" : "h-4 w-4 text-zinc-500"}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11 4a7 7 0 105.292 11.585l3.56 3.559a1 1 0 001.414-1.414l-3.559-3.56A7 7 0 0011 4z" fill="currentColor" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          aria-label="Search shows, people, and episodes"
          placeholder="Search shows, people, episodes"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          className={
            isHero
              ? "ml-3 h-8 w-full bg-transparent text-base text-zinc-800 outline-none placeholder:text-zinc-400"
              : "ml-2 h-7 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
          }
        />
      </div>

      {shouldShowPanel && (
        <div
          className={
            isHero
              ? "absolute left-0 z-50 mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl"
              : "absolute right-0 z-50 mt-2 w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl"
          }
        >
          {loading && <p className="text-sm text-zinc-500">Searching...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && results && totalHits === 0 && (
            <p className="text-sm text-zinc-500">No matches for &quot;{debouncedQuery.trim()}&quot;.</p>
          )}

          {!loading && !error && results && totalHits > 0 && (
            <div className="flex flex-col gap-3" role="region" aria-label="Grouped search results">
              <section aria-labelledby="admin-search-shows-heading" className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <SectionHeader id="admin-search-shows-heading">Shows</SectionHeader>
                <div className="space-y-1.5">
                  {results.shows.length === 0 ? (
                    <p className="text-xs text-zinc-500">No show matches.</p>
                  ) : (
                    results.shows.map((show) => (
                      <Link
                        key={show.id}
                        href={buildShowAdminUrl({ showSlug: show.slug }) as Route}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm text-zinc-800 transition hover:bg-zinc-100"
                      >
                        {show.name}
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section aria-labelledby="admin-search-people-heading" className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <SectionHeader id="admin-search-people-heading">People</SectionHeader>
                <div className="space-y-1.5">
                  {results.people.length === 0 ? (
                    <p className="text-xs text-zinc-500">No people matches.</p>
                  ) : (
                    results.people.map((person) => {
                      const label = person.full_name?.trim() || "Unknown Person";
                      return (
                        <Link
                          key={person.id}
                          href={
                            buildPersonAdminUrl({
                              personSlug: person.person_slug,
                              showId: person.show_context ?? undefined,
                            }) as Route
                          }
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-2 py-1.5 transition hover:bg-zinc-100"
                        >
                          <p className="text-sm text-zinc-800">{label}</p>
                          {person.known_for && (
                            <p className="truncate text-xs text-zinc-500">{person.known_for}</p>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>

              <section aria-labelledby="admin-search-episodes-heading" className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <SectionHeader id="admin-search-episodes-heading">Episodes</SectionHeader>
                <div className="space-y-1.5">
                  {results.episodes.length === 0 ? (
                    <p className="text-xs text-zinc-500">No episode matches.</p>
                  ) : (
                    results.episodes.map((episode) => {
                      const seasonNumber = Number.isFinite(episode.season_number)
                        ? Number(episode.season_number)
                        : null;
                      const href =
                        seasonNumber && seasonNumber > 0
                          ? buildSeasonAdminUrl({
                              showSlug: episode.show_slug,
                              seasonNumber,
                              tab: "episodes",
                              query: new URLSearchParams({ focusEpisode: episode.id }),
                            })
                          : buildShowAdminUrl({ showSlug: episode.show_slug });

                      return (
                        <Link
                          key={episode.id}
                          href={href as Route}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-2 py-1.5 transition hover:bg-zinc-100"
                        >
                          <p className="truncate text-sm text-zinc-800">{episode.title || "Untitled Episode"}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {episode.show_name || "Unknown Show"}
                            {seasonNumber && Number.isFinite(episode.episode_number)
                              ? ` · S${seasonNumber}E${episode.episode_number}`
                              : ""}
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
