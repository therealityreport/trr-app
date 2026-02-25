"use client";

import type { ReactNode } from "react";

type UnifiedNewsItem = {
  article_url: string;
  published_at?: string | null;
  source_id?: string | null;
  publisher_name?: string | null;
  publisher_domain?: string | null;
  feed_rank?: number | null;
  headline?: string | null;
  hosted_image_url?: string | null;
  image_url?: string | null;
  original_image_url?: string | null;
  person_tags?: Array<{ person_id?: string | null; person_name?: string | null }> | null;
  topic_tags?: string[] | null;
  season_matches?:
    | Array<{ season_number?: number | null; match_types?: string[] | null }>
    | null;
};

type SourceOption = {
  token: string;
  label: string;
  count: number;
};

type PersonOption = {
  id: string;
  name: string;
  count: number;
};

type TopicOption = {
  topic: string;
  count: number;
};

type SeasonOption = {
  seasonNumber: number;
  count: number;
};

interface ShowNewsTabProps {
  showName: string;
  newsSort: "trending" | "latest";
  onSetNewsSort: (sort: "trending" | "latest") => void;
  onRefreshNews: () => void;
  newsLoading: boolean;
  newsSyncing: boolean;
  newsSourceFilter: string;
  onSetNewsSourceFilter: (value: string) => void;
  newsPersonFilter: string;
  onSetNewsPersonFilter: (value: string) => void;
  newsTopicFilter: string;
  onSetNewsTopicFilter: (value: string) => void;
  newsSeasonFilter: string;
  onSetNewsSeasonFilter: (value: string) => void;
  onClearFilters: () => void;
  newsSourceOptions: SourceOption[];
  newsPeopleOptions: PersonOption[];
  newsTopicOptions: TopicOption[];
  newsSeasonOptions: SeasonOption[];
  newsPageCount: number;
  newsTotalCount: number;
  newsError: string | null;
  newsNotice: string | null;
  newsGoogleUrlMissing: boolean;
  unifiedNews: UnifiedNewsItem[];
  formatPublishedDate: (value: string | null | undefined) => string | null;
  newsNextCursor: string | null;
  onLoadMore: () => void;
  renderNewsImage: (props: {
    src: string;
    alt: string;
    sizes: string;
    className?: string;
  }) => ReactNode;
}

export default function ShowNewsTab({
  showName,
  newsSort,
  onSetNewsSort,
  onRefreshNews,
  newsLoading,
  newsSyncing,
  newsSourceFilter,
  onSetNewsSourceFilter,
  newsPersonFilter,
  onSetNewsPersonFilter,
  newsTopicFilter,
  onSetNewsTopicFilter,
  newsSeasonFilter,
  onSetNewsSeasonFilter,
  onClearFilters,
  newsSourceOptions,
  newsPeopleOptions,
  newsTopicOptions,
  newsSeasonOptions,
  newsPageCount,
  newsTotalCount,
  newsError,
  newsNotice,
  newsGoogleUrlMissing,
  unifiedNews,
  formatPublishedDate,
  newsNextCursor,
  onLoadMore,
  renderNewsImage,
}: ShowNewsTabProps) {
  return (
    <section
      id="show-tabpanel-news"
      role="tabpanel"
      aria-labelledby="show-tab-news"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Unified News Feed
            </p>
            <h3 className="text-xl font-bold text-zinc-900">{showName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                onClick={() => onSetNewsSort("trending")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  newsSort === "trending"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => onSetNewsSort("latest")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  newsSort === "latest"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Latest
              </button>
            </div>
            <button
              type="button"
              onClick={onRefreshNews}
              disabled={newsLoading || newsSyncing}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {newsLoading || newsSyncing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Source
            <select
              value={newsSourceFilter}
              onChange={(event) => onSetNewsSourceFilter(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
            >
              <option value="">All sources</option>
              {newsSourceOptions.map((sourceOption) => (
                <option key={`news-source-${sourceOption.token}`} value={sourceOption.token}>
                  {sourceOption.label} ({sourceOption.count})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            People
            <select
              value={newsPersonFilter}
              onChange={(event) => onSetNewsPersonFilter(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
            >
              <option value="">All people</option>
              {newsPeopleOptions.map((personOption) => (
                <option key={`news-person-${personOption.id}`} value={personOption.id}>
                  {personOption.name} ({personOption.count})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Topic
            <select
              value={newsTopicFilter}
              onChange={(event) => onSetNewsTopicFilter(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
            >
              <option value="">All topics</option>
              {newsTopicOptions.map((topicOption) => (
                <option key={`news-topic-${topicOption.topic}`} value={topicOption.topic}>
                  {topicOption.topic} ({topicOption.count})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Season
            <select
              value={newsSeasonFilter}
              onChange={(event) => onSetNewsSeasonFilter(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
            >
              <option value="">All seasons</option>
              {newsSeasonOptions.map((seasonOption) => (
                <option
                  key={`news-season-${seasonOption.seasonNumber}`}
                  value={String(seasonOption.seasonNumber)}
                >
                  Season {seasonOption.seasonNumber} ({seasonOption.count})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Clear Filters
            </button>
          </div>
          <div className="flex items-end">
            <p className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
              Showing {newsPageCount}
              {newsTotalCount > 0 ? ` of ${newsTotalCount}` : ""}
            </p>
          </div>
        </div>

        {(newsError || newsNotice) && (
          <p className={`mb-4 text-sm ${newsError ? "text-red-600" : "text-zinc-500"}`}>
            {newsError || newsNotice}
          </p>
        )}
        {newsGoogleUrlMissing && (
          <p className="mb-4 text-sm text-amber-700">
            Google News URL is missing. Add it in Settings, then refresh this tab.
          </p>
        )}
        {!newsLoading && unifiedNews.length === 0 && !newsError && (
          <p className="text-sm text-zinc-500">
            No news items match the current filters. Sync Google News or adjust filters.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {unifiedNews.map((item) => {
            const newsImageUrl =
              (typeof item.hosted_image_url === "string" && item.hosted_image_url.trim()) ||
              (typeof item.image_url === "string" && item.image_url.trim()) ||
              (typeof item.original_image_url === "string" && item.original_image_url.trim()) ||
              null;

            return (
              <article
                key={`${item.article_url}-${item.published_at ?? "unknown"}`}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <a
                  href={item.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-lg bg-zinc-200">
                    {newsImageUrl ? (
                      renderNewsImage({
                        src: newsImageUrl,
                        alt: item.headline || "News item",
                        sizes: "400px",
                        className: "object-cover transition group-hover:scale-105",
                      })
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400">No image</div>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700">
                    {item.headline || "Untitled story"}
                  </h4>
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700">
                    {(item.publisher_name || item.publisher_domain || item.source_id || "Source").toString()}
                  </span>
                  {item.source_id === "google_news" && typeof item.feed_rank === "number" && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                      Feed #{item.feed_rank + 1}
                    </span>
                  )}
                </div>
                {Array.isArray(item.person_tags) && item.person_tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.person_tags.map((tag, tagIndex) => (
                      <span
                        key={`${tag.person_id || tag.person_name || "tag"}-${tagIndex}`}
                        className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700"
                      >
                        {tag.person_name || "Person"}
                      </span>
                    ))}
                  </div>
                )}
                {Array.isArray(item.topic_tags) && item.topic_tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.topic_tags.map((topicTag) => (
                      <span
                        key={`${item.article_url}-topic-${topicTag}`}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                      >
                        {topicTag}
                      </span>
                    ))}
                  </div>
                )}
                {Array.isArray(item.season_matches) && item.season_matches.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.season_matches.map((match, matchIndex) => (
                      <span
                        key={`${item.article_url}-season-${match?.season_number || "x"}-${matchIndex}`}
                        className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                      >
                        Season {match?.season_number || "?"}
                        {Array.isArray(match?.match_types) && match.match_types.length > 0
                          ? ` (${match.match_types.join("+")})`
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
                {formatPublishedDate(item.published_at) && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Posted {formatPublishedDate(item.published_at)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {newsNextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={newsLoading}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {newsLoading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
