import {
  PLATFORM_LABELS,
  formatInteger,
  getCanonicalLeaderboardThumbnailImage,
  isVideoLikeThumbnailUrl,
} from "./section-helpers";
import type {
  AnalyticsResponse,
  CastAttitudePrototypeRow,
  ViewerAttitudePlatformRow,
  SocialStatsItem,
} from "./section-helpers";

type HashtagWeeklyUsage = { weekIndex: number; label: string; totalTokens: number; uniqueTokens: number };
type HashtagSeasonCount = { tag: string; count: number };
type HashtagPlatformUsage = { platform: string; label: string; count: number };
type LeaderboardItem = AnalyticsResponse["leaderboards"]["bravo_content"][number];

export type SeasonSocialInsightPanelsProps = {
  PLATFORM_LABELS: typeof PLATFORM_LABELS;
  analytics: AnalyticsResponse | null;
  castAttitudePrototypeRows: CastAttitudePrototypeRow[];
  formatInteger: typeof formatInteger;
  getCanonicalLeaderboardThumbnailImage: typeof getCanonicalLeaderboardThumbnailImage;
  hashtagMaxPlatformTokens: number;
  hashtagMaxWeeklyTokens: number;
  hashtagPeakWeek: HashtagWeeklyUsage | null;
  hashtagPlatformUsage: HashtagPlatformUsage[];
  hashtagSeasonCounts: HashtagSeasonCount[];
  hashtagTopTag: HashtagSeasonCount | null;
  hashtagTotalTokens: number;
  hashtagUniqueCount: number;
  hashtagUsageLoading: boolean;
  hashtagWeeklyUsage: HashtagWeeklyUsage[];
  isBravoView: boolean;
  isHashtagsView: boolean;
  isSentimentView: boolean;
  isVideoLikeThumbnailUrl: typeof isVideoLikeThumbnailUrl;
  openLeaderboardLightbox: (
    item: LeaderboardItem,
    sectionTitle: string,
    extraStats?: SocialStatsItem[],
  ) => void;
  viewerAttitudeByPlatformRows: ViewerAttitudePlatformRow[];
};

/** Typed, stateless presentation for this Season Social Analytics region. */
export function SeasonSocialInsightPanels({
  PLATFORM_LABELS,
  analytics,
  castAttitudePrototypeRows,
  formatInteger,
  getCanonicalLeaderboardThumbnailImage,
  hashtagMaxPlatformTokens,
  hashtagMaxWeeklyTokens,
  hashtagPeakWeek,
  hashtagPlatformUsage,
  hashtagSeasonCounts,
  hashtagTopTag,
  hashtagTotalTokens,
  hashtagUniqueCount,
  hashtagUsageLoading,
  hashtagWeeklyUsage,
  isBravoView,
  isHashtagsView,
  isSentimentView,
  isVideoLikeThumbnailUrl,
  openLeaderboardLightbox,
  viewerAttitudeByPlatformRows,
}: SeasonSocialInsightPanelsProps) {
  return (
    <>
          {isSentimentView && (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-semibold text-zinc-900">Cast Mention Comparison (Prototype)</h4>
                <p className="mb-4 text-xs text-zinc-500">
                  Heuristic draft: compares candidate cast-name mentions in viewer highlights against sentiment labels.
                </p>
                {castAttitudePrototypeRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No cast mention candidates detected in viewer highlights yet.</p>
                ) : (
                  <div className="space-y-3">
                    {castAttitudePrototypeRows.map((row) => {
                      const total = Math.max(1, row.mentions);
                      const positivePct = (row.positive / total) * 100;
                      const neutralPct = (row.neutral / total) * 100;
                      const negativePct = Math.max(0, 100 - positivePct - neutralPct);
                      return (
                        <div key={row.entity} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-900">{row.entity}</p>
                            <p className="text-xs text-zinc-600">
                              {formatInteger(row.mentions)} mentions · {formatInteger(row.engagement)} engagement
                            </p>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-200">
                            <div className="flex h-full">
                              <span
                                className="h-full bg-emerald-500"
                                style={{ width: `${positivePct}%` }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-full bg-zinc-400"
                                style={{ width: `${neutralPct}%` }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-full bg-red-500"
                                style={{ width: `${negativePct}%` }}
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            +{row.positive} · ={row.neutral} · -{row.negative} · net {row.netSentiment}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-semibold text-zinc-900">Viewer Attitude by Platform</h4>
                <p className="mb-4 text-xs text-zinc-500">
                  Early matrix for comparing where audience tone is most positive vs critical.
                </p>
                {viewerAttitudeByPlatformRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No viewer discussion highlights available.</p>
                ) : (
                  <div className="space-y-2">
                    {viewerAttitudeByPlatformRows.map((row) => {
                      const positivePct = row.total > 0 ? (row.positive / row.total) * 100 : 0;
                      const negativePct = row.total > 0 ? (row.negative / row.total) * 100 : 0;
                      const tone =
                        positivePct === negativePct
                          ? "Balanced"
                          : positivePct > negativePct
                            ? "Positive-leaning"
                            : "Critical-leaning";
                      return (
                        <div key={row.platform} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              {PLATFORM_LABELS[row.platform] ?? row.platform}
                            </p>
                            <p className="text-xs text-zinc-600">{formatInteger(row.total)} highlights</p>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-600">
                            +{row.positive} · ={row.neutral} · -{row.negative} · {tone}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Platform Sentiment Breakdown</h4>
              <div className="space-y-2">
                {(analytics?.platform_breakdown ?? []).map((platform) => {
                  const label = PLATFORM_LABELS[platform.platform] ?? platform.platform;
                  return (
                    <div
                      key={platform.platform}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-zinc-900">
                        <span>{label}</span>
                        <span>{formatInteger(platform.engagement)} engagement</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatInteger(platform.posts)} posts · {formatInteger(platform.comments)} comments · P {formatInteger(platform.sentiment.positive)} / N {formatInteger(platform.sentiment.neutral)} / Neg {formatInteger(platform.sentiment.negative)}
                      </p>
                    </div>
                  );
                })}
                {(analytics?.platform_breakdown?.length ?? 0) === 0 && (
                  <p className="text-sm text-zinc-500">No platform data available.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-lg font-semibold text-zinc-900">Top Sentiment Drivers</h4>
              <p className="-mt-2 mb-4 text-xs text-zinc-500">
                Cast names and social handles are excluded from driver terms.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Positive</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.positive ?? []).slice(0, 8).map((driver) => (
                      <li key={`p-${driver.term}`} className="rounded bg-emerald-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.positive?.length ?? 0) === 0 && <li className="text-zinc-500">No positive drivers.</li>}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">Negative</p>
                  <ul className="space-y-1 text-sm text-zinc-700">
                    {(analytics?.themes.negative ?? []).slice(0, 8).map((driver) => (
                      <li key={`n-${driver.term}`} className="rounded bg-red-50 px-2 py-1">
                        {driver.term} · {driver.count}
                      </li>
                    ))}
                    {(analytics?.themes.negative?.length ?? 0) === 0 && <li className="text-zinc-500">No negative drivers.</li>}
                  </ul>
                </div>
              </div>
            </article>
            </section>
          )}

          {(isBravoView || isSentimentView) && (
            <section className="grid gap-6 xl:grid-cols-2">
              {isBravoView && (
                <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h4 className="mb-4 text-lg font-semibold text-zinc-900">Bravo Content Leaderboard</h4>
                  <div className="space-y-2">
                    {(analytics?.leaderboards.bravo_content ?? []).slice(0, 10).map((item) => {
                      const canonicalThumbnail = getCanonicalLeaderboardThumbnailImage(item);
                      const canonicalThumbnailUrl = canonicalThumbnail.src;
                      return (
                      <div
                        key={`${item.platform}-${item.source_id}`}
                        className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                      >
                        <div className="flex items-start gap-3">
                          {canonicalThumbnailUrl && (
                            <button
                              type="button"
                              onClick={() => openLeaderboardLightbox(item, "Bravo Content Leaderboard")}
                              className="shrink-0"
                              aria-label="Open leaderboard media lightbox"
                            >
                              {isVideoLikeThumbnailUrl(canonicalThumbnailUrl) ? (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                                  Video
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={canonicalThumbnailUrl}
                                  srcSet={canonicalThumbnail.srcSet ?? undefined}
                                  alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} leaderboard thumbnail`}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="h-12 w-12 rounded-md border border-zinc-200 object-cover"
                                />
                              )}
                            </button>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-zinc-900">
                                {PLATFORM_LABELS[item.platform] ?? item.platform}
                              </span>
                              <span className="text-xs text-zinc-500">{formatInteger(item.engagement)} engagement</span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-700 line-clamp-2">{item.text || item.source_id}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              >
                                Open Post
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                    {(analytics?.leaderboards.bravo_content?.length ?? 0) === 0 && (
                      <p className="text-sm text-zinc-500">No content leaderboard entries yet.</p>
                    )}
                  </div>
                </article>
              )}

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-4 text-lg font-semibold text-zinc-900">Viewer Discussion Highlights</h4>
                <div className="space-y-2">
                  {(analytics?.leaderboards.viewer_discussion ?? []).slice(0, 10).map((item) => {
                    const canonicalThumbnail = getCanonicalLeaderboardThumbnailImage(item);
                    const canonicalThumbnailUrl = canonicalThumbnail.src;
                    return (
                    <div
                      key={`${item.platform}-${item.source_id}`}
                      className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100"
                    >
                      <div className="flex items-start gap-3">
                        {canonicalThumbnailUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              openLeaderboardLightbox(item, "Viewer Discussion Highlights", [
                                { label: "Sentiment", value: item.sentiment.toUpperCase() },
                              ])
                            }
                            className="shrink-0"
                            aria-label="Open discussion media lightbox"
                          >
                            {isVideoLikeThumbnailUrl(canonicalThumbnailUrl) ? (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-200 bg-zinc-900 text-[10px] font-semibold uppercase tracking-wide text-zinc-100">
                                Video
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={canonicalThumbnailUrl}
                                srcSet={canonicalThumbnail.srcSet ?? undefined}
                                alt={`${PLATFORM_LABELS[item.platform] ?? item.platform} discussion thumbnail`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 rounded-md border border-zinc-200 object-cover"
                              />
                            )}
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.15em] text-zinc-500">
                            <span>{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                            <span>{item.sentiment}</span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-700 line-clamp-3">{item.text}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                            >
                              Open Post
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {(analytics?.leaderboards.viewer_discussion?.length ?? 0) === 0 && (
                    <p className="text-sm text-zinc-500">No viewer discussion highlights yet.</p>
                  )}
                </div>
              </article>
            </section>
          )}

          {isHashtagsView && (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Hashtag Insights</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Season-wide hashtag usage across social posts in the selected platform scope.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Total Uses</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-total-uses">
                      {formatInteger(hashtagTotalTokens)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Unique Hashtags</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-unique-tags">
                      {formatInteger(hashtagUniqueCount)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Top Hashtag</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-top-tag">
                      {hashtagTopTag ? `#${hashtagTopTag.tag}` : "-"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {hashtagTopTag ? `${formatInteger(hashtagTopTag.count)} uses` : "No hashtag activity yet"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Peak Week</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-900" data-testid="hashtag-insights-peak-week">
                      {hashtagPeakWeek && hashtagPeakWeek.totalTokens > 0 ? hashtagPeakWeek.label : "-"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {hashtagPeakWeek && hashtagPeakWeek.totalTokens > 0
                        ? `${formatInteger(hashtagPeakWeek.totalTokens)} uses`
                        : "No hashtag activity yet"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Hashtags</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Top hashtag usage with total seasonal share.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagSeasonCounts.length === 0 ? (
                  <p className="text-sm text-zinc-500">No hashtags found in season social posts for this scope.</p>
                ) : (
                  <ul className="space-y-2">
                    {hashtagSeasonCounts.slice(0, 30).map((item, index) => {
                      const sharePct = hashtagTotalTokens > 0 ? (item.count / hashtagTotalTokens) * 100 : 0;
                      return (
                        <li
                          key={item.tag}
                          data-testid={`hashtag-leaderboard-row-${index}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="font-semibold text-zinc-800">#{item.tag}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              {formatInteger(item.count)} use{item.count === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-zinc-200">
                              <div
                                className="h-1.5 rounded-full bg-zinc-700"
                                style={{ width: `${Math.min(100, Math.max(0, sharePct))}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500">{sharePct.toFixed(1)}%</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Weekly Hashtag Usage</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Total hashtag tokens used per week across season social posts.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagWeeklyUsage.length === 0 ? (
                  <p className="text-sm text-zinc-500">No weekly hashtag data available.</p>
                ) : (
                  <div className="space-y-2">
                    {hashtagWeeklyUsage.map((item) => {
                      const widthPct =
                        hashtagMaxWeeklyTokens > 0 ? (item.totalTokens / hashtagMaxWeeklyTokens) * 100 : 0;
                      return (
                        <div
                          key={`hashtag-week-${item.weekIndex}`}
                          data-testid={`hashtag-weekly-usage-row-${item.weekIndex}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-zinc-800">{item.label}</span>
                            <span className="text-xs text-zinc-500">
                              {formatInteger(item.totalTokens)} uses · {formatInteger(item.uniqueTokens)} unique
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-200">
                            <div
                              className="h-2 rounded-full bg-zinc-700"
                              style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
                <h4 className="mb-3 text-lg font-semibold text-zinc-900">Platform Hashtag Distribution</h4>
                <p className="-mt-1 mb-4 text-xs text-zinc-500">
                  Share of hashtag usage by platform for the selected scope.
                </p>
                {hashtagUsageLoading ? (
                  <p className="text-sm text-zinc-500">Loading hashtag analytics...</p>
                ) : hashtagPlatformUsage.length === 0 || hashtagTotalTokens === 0 ? (
                  <p className="text-sm text-zinc-500">No platform hashtag distribution available.</p>
                ) : (
                  <div className="space-y-2">
                    {hashtagPlatformUsage.map((item) => {
                      const widthPct =
                        hashtagMaxPlatformTokens > 0 ? (item.count / hashtagMaxPlatformTokens) * 100 : 0;
                      const sharePct = hashtagTotalTokens > 0 ? (item.count / hashtagTotalTokens) * 100 : 0;
                      return (
                        <div
                          key={`hashtag-platform-${item.platform}`}
                          data-testid={`hashtag-platform-usage-row-${item.platform}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-zinc-800">{item.label}</span>
                            <span className="text-xs text-zinc-500">
                              {formatInteger(item.count)} uses · {sharePct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-200">
                            <div
                              className="h-2 rounded-full bg-zinc-700"
                              style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          )}

    </>
  );
}
