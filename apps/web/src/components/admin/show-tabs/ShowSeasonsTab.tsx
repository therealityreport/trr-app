"use client";

import type { ReactNode } from "react";
import { ShowSeasonCards } from "@/components/admin/show-tabs/ShowSeasonCards";

type SeasonPageTabId =
  | "overview"
  | "episodes"
  | "assets"
  | "videos"
  | "fandom"
  | "cast"
  | "surveys"
  | "social";

type SeasonPageTab = {
  tab: SeasonPageTabId;
  label: string;
};

type ShowSeason = {
  id: string;
  season_number: number;
  overview: string | null;
  air_date: string | null;
  tmdb_season_id: number | null;
};

type SeasonSummary = {
  count: number;
  premiereDate: string | null;
  finaleDate: string | null;
};

interface ShowSeasonsTabProps {
  showName: string;
  isShowRefreshBusy: boolean;
  onRefresh: () => void;
  refreshNotice: string | null;
  refreshError: string | null;
  refreshProgressBar: ReactNode;
  seasonSummariesLoading: boolean;
  seasons: ShowSeason[];
  seasonEpisodeSummaries: Record<string, SeasonSummary>;
  openSeasonId: string | null;
  onToggleSeason: (seasonId: string) => void;
  seasonPageTabs: ReadonlyArray<SeasonPageTab>;
  buildSeasonHref: (seasonNumber: number, tab: SeasonPageTabId) => string;
  showTmdbId: number | null;
  formatDateRange: (premiereDate: string | null | undefined, finaleDate: string | null | undefined) => string;
}

export default function ShowSeasonsTab({
  showName,
  isShowRefreshBusy,
  onRefresh,
  refreshNotice,
  refreshError,
  refreshProgressBar,
  seasonSummariesLoading,
  seasons,
  seasonEpisodeSummaries,
  openSeasonId,
  onToggleSeason,
  seasonPageTabs,
  buildSeasonHref,
  showTmdbId,
  formatDateRange,
}: ShowSeasonsTabProps) {
  return (
    <section
      id="show-tabpanel-seasons"
      role="tabpanel"
      aria-labelledby="show-tab-seasons"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Seasons
            </p>
            <h3 className="text-xl font-bold text-zinc-900">{showName}</h3>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isShowRefreshBusy}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {isShowRefreshBusy ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {(refreshNotice || refreshError) && (
          <p className={`mb-4 text-sm ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
            {refreshError || refreshNotice}
          </p>
        )}
        {refreshProgressBar}
        {seasonSummariesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900" />
          </div>
        ) : (
          <ShowSeasonCards
            seasons={seasons}
            seasonEpisodeSummaries={seasonEpisodeSummaries}
            openSeasonId={openSeasonId}
            onToggleSeason={onToggleSeason}
            seasonPageTabs={seasonPageTabs}
            buildSeasonHref={buildSeasonHref}
            showTmdbId={showTmdbId}
            formatDateRange={formatDateRange}
          />
        )}
      </div>
    </section>
  );
}
