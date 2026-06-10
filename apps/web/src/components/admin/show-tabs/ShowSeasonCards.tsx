"use client";

import type { Route } from "next";
import Link from "next/link";
import { TmdbLinkIcon } from "@/components/admin/ExternalLinks";

type SeasonPageTabId =
  | "overview"
  | "episodes"
  | "assets"
  | "news"
  | "fandom"
  | "cast"
  | "surveys"
  | "social";

type SeasonPageTab = {
  tab: SeasonPageTabId;
  label: string;
};

type SeasonSummary = {
  count: number;
  premiereDate: string | null;
  finaleDate: string | null;
};

type ShowSeason = {
  id: string;
  season_number: number;
  overview: string | null;
  air_date: string | null;
  premiere_date?: string | null;
  last_episode_air_date?: string | null;
  tmdb_season_id: number | null;
};

interface ShowSeasonCardsProps {
  seasons: ShowSeason[];
  seasonEpisodeSummaries: Record<string, SeasonSummary>;
  openSeasonId: string | null;
  onToggleSeason: (seasonId: string) => void;
  seasonPageTabs: ReadonlyArray<SeasonPageTab>;
  buildSeasonHref: (seasonNumber: number, tab: SeasonPageTabId) => string;
  showTmdbId: number | null;
  formatDateRange: (premiereDate: string | null | undefined, finaleDate: string | null | undefined) => string;
}

export function ShowSeasonCards({
  seasons,
  seasonEpisodeSummaries,
  openSeasonId,
  onToggleSeason,
  seasonPageTabs,
  buildSeasonHref,
  showTmdbId,
  formatDateRange,
}: ShowSeasonCardsProps) {
  if (seasons.length === 0) {
    return <p className="text-sm text-zinc-500">No seasons found</p>;
  }

  return (
    <div className="space-y-3">
      {seasons.map((season) => {
        const summary = seasonEpisodeSummaries[season.id];
        const isOpen = openSeasonId === season.id;
        const countLabel = summary ? `${summary.count} episodes` : "Episodes: —";
        const premiereDate = summary?.premiereDate ?? season.premiere_date ?? season.air_date;
        const finaleDate = summary?.finaleDate ?? season.last_episode_air_date ?? season.air_date ?? season.premiere_date;
        const dateRange = formatDateRange(premiereDate, finaleDate);

        return (
          <div key={season.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href={buildSeasonHref(season.season_number, "overview") as Route}
                    className="text-lg font-semibold text-zinc-900 hover:underline"
                  >
                    Season {season.season_number}
                  </Link>
                  {season.tmdb_season_id && showTmdbId && (
                    <span className="inline-flex">
                      <TmdbLinkIcon
                        showTmdbId={showTmdbId}
                        seasonNumber={season.season_number}
                        type="season"
                      />
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{countLabel}</span>
                  <span>{dateRange}</span>
                </div>
              </div>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Collapse" : "Expand"} Season ${season.season_number} details`}
                onClick={() => onToggleSeason(season.id)}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <span className={`block transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
            <div className="border-t border-zinc-100 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                {seasonPageTabs.map((tab) => (
                  <Link
                    key={tab.tab}
                    href={buildSeasonHref(season.season_number, tab.tab) as Route}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
              {isOpen && season.overview && <p className="mt-4 text-sm text-zinc-600">{season.overview}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
