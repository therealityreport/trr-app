"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import {
  buildPersonAdminUrl,
} from "@/lib/admin/show-admin-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type PeopleHomeItem = {
  person_id: string;
  person_slug: string;
  full_name: string;
  known_for: string | null;
  photo_url: string | null;
  show_context: string | null;
  metric_label: string;
  metric_value: number;
  latest_at: string | null;
};

type SectionResponse = {
  items: PeopleHomeItem[];
  error: string | null;
};

type PeopleHomeResponse = {
  sections: {
    recentlyViewed: SectionResponse;
    mostPopular: SectionResponse;
    mostShows: SectionResponse;
    topEpisodes: SectionResponse;
    recentlyAdded: SectionResponse;
  };
};

type SearchResponse = {
  people: Array<{
    id: string;
    full_name: string | null;
    known_for: string | null;
    person_slug: string;
    show_context: string | null;
  }>;
};

const DEFAULT_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 250;
const MIN_SEARCH_QUERY = 2;

function PersonCard({ person }: { person: PeopleHomeItem }) {
  const href = buildPersonAdminUrl({
    personSlug: person.person_slug,
    showId: person.show_context ?? undefined,
  }) as Route;

  const knownFor = person.known_for?.trim() || null;
  const metricValue = Number.isFinite(person.metric_value) ? person.metric_value : 0;

  return (
    <Link
      href={href}
      className="group block w-[14rem] flex-shrink-0 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.full_name}
            fill
            sizes="224px"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
        )}
      </div>
      <p className="line-clamp-1 font-semibold text-zinc-900">{person.full_name}</p>
      {knownFor ? <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{knownFor}</p> : null}
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{person.metric_label}</span>
        <span className="font-semibold text-zinc-700">{metricValue > 0 ? metricValue : "-"}</span>
      </div>
    </Link>
  );
}

function SectionRail({
  title,
  section,
  emptyMessage,
}: {
  title: string;
  section: SectionResponse | null;
  emptyMessage: string;
}) {
  if (!section) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</h2>
        <p className="mt-3 text-sm text-zinc-500">Loading...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</h2>
      {section.error ? (
        <p className="mt-3 text-sm text-red-600">{section.error}</p>
      ) : section.items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {section.items.map((item) => (
            <PersonCard key={`${title}-${item.person_id}`} person={item} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PeopleHomePage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [homeData, setHomeData] = useState<PeopleHomeResponse | null>(null);
  const [loadingHome, setLoadingHome] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResponse["people"]>([]);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    if (checking || !hasAccess) return;
    setLoadingHome(true);
    setHomeError(null);

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/people/home?limit=${DEFAULT_LIMIT}`,
          {
            cache: "no-store",
          },
          {
            preferredUser: user,
          },
        );
        const data = (await response.json().catch(() => ({}))) as PeopleHomeResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load people home");
        }
        if (cancelled) return;
        setHomeData(data);
      } catch (error) {
        if (cancelled) return;
        setHomeData(null);
        setHomeError(error instanceof Error ? error.message : "Failed to load people home");
      } finally {
        if (!cancelled) setLoadingHome(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      if (searchContainerRef.current.contains(event.target as Node)) return;
      setSearchOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_SEARCH_QUERY) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const requestId = ++searchRequestRef.current;
    setSearchLoading(true);
    setSearchError(null);

    const run = async () => {
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/search?q=${encodeURIComponent(trimmed)}&limit=8`,
          {
            cache: "no-store",
          },
          {
            preferredUser: user,
          },
        );
        const data = (await response.json().catch(() => ({}))) as SearchResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to search people");
        }
        if (cancelled || searchRequestRef.current !== requestId) return;
        setSearchResults(Array.isArray(data.people) ? data.people : []);
      } catch (error) {
        if (cancelled || searchRequestRef.current !== requestId) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Search failed");
      } finally {
        if (!cancelled && searchRequestRef.current === requestId) {
          setSearchLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, user]);

  const showSearchPanel =
    searchOpen && searchQuery.trim().length >= MIN_SEARCH_QUERY;

  const sections = homeData?.sections ?? null;

  const rows = useMemo(
    () => [
      {
        key: "recentlyViewed",
        title: "Recently Viewed",
        emptyMessage: "No recent people yet.",
        section: sections?.recentlyViewed ?? null,
      },
      {
        key: "mostPopular",
        title: "Most Popular",
        emptyMessage: "No popularity data available yet.",
        section: sections?.mostPopular ?? null,
      },
      {
        key: "mostShows",
        title: "Most Shows",
        emptyMessage: "No show-leaderboard data available yet.",
        section: sections?.mostShows ?? null,
      },
      {
        key: "topEpisodes",
        title: "Top Episodes",
        emptyMessage: "No episode leaderboard data available yet.",
        section: sections?.topEpisodes ?? null,
      },
      {
        key: "recentlyAdded",
        title: "Recently Added",
        emptyMessage: "No recently added people available yet.",
        section: sections?.recentlyAdded ?? null,
      },
    ],
    [sections],
  );

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">People</p>
            <h1 className="text-2xl font-bold text-zinc-900">People Explorer</h1>
            <p className="text-sm text-zinc-600">
              Browse recent profiles and ranked people signals across shows and episodes.
            </p>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {checking ? (
            <p className="text-sm text-zinc-500">Checking admin access...</p>
          ) : !hasAccess ? (
            <p className="text-sm text-red-600">Admin access required.</p>
          ) : (
            <div className="space-y-6">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Find People</h2>
                <div ref={searchContainerRef} className="relative mt-3">
                  <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4 text-zinc-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M11 4a7 7 0 105.292 11.585l3.56 3.559a1 1 0 001.414-1.414l-3.559-3.56A7 7 0 0011 4z" fill="currentColor" />
                    </svg>
                    <input
                      type="search"
                      value={searchQuery}
                      onFocus={() => setSearchOpen(true)}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setSearchOpen(true);
                      }}
                      placeholder="Search people"
                      aria-label="Find people"
                      className="ml-2 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                    />
                  </div>

                  {showSearchPanel && (
                    <div className="absolute z-40 mt-2 w-full rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
                      {searchLoading && <p className="text-sm text-zinc-500">Searching...</p>}
                      {searchError && <p className="text-sm text-red-600">{searchError}</p>}
                      {!searchLoading && !searchError && searchResults.length === 0 && (
                        <p className="text-sm text-zinc-500">No people found.</p>
                      )}
                      {!searchLoading && !searchError && searchResults.length > 0 && (
                        <ul className="space-y-1">
                          {searchResults.map((person) => {
                            const label = person.full_name?.trim() || "Unknown Person";
                            return (
                              <li key={person.id}>
                                <Link
                                  href={
                                    buildPersonAdminUrl({
                                      personSlug: person.person_slug,
                                      showId: person.show_context ?? undefined,
                                    }) as Route
                                  }
                                  onClick={() => setSearchOpen(false)}
                                  className="block rounded-md px-2 py-2 transition hover:bg-zinc-100"
                                >
                                  <p className="text-sm font-medium text-zinc-900">{label}</p>
                                  {person.known_for ? (
                                    <p className="text-xs text-zinc-500">{person.known_for}</p>
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {homeError ? (
                <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{homeError}</p>
                </section>
              ) : null}

              {loadingHome && !sections ? (
                <section className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <p className="text-sm text-zinc-500">Loading people sections...</p>
                </section>
              ) : null}

              {rows.map((row) => (
                <SectionRail
                  key={row.key}
                  title={row.title}
                  section={row.section}
                  emptyMessage={row.emptyMessage}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
