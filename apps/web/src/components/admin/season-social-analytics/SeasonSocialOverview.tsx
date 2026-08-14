import Link from "next/link";
import type { Route } from "next";
import {
  formatPercent,
  formatInteger,
  formatCompactInteger,
  formatDateTime,
  formatPctLabel,
} from "./section-helpers";
import type { AnalyticsResponse, PlatformTab } from "./section-helpers";

type PostMetadataMetricCard = {
  key: string;
  label: string;
  value: { posts_with: number; pct: number | null } | undefined;
};
type CommentsSavedActualSummary = { saved: number; actual: number; pct: number | null };

export type SeasonSocialOverviewProps = {
  variant: "skeleton" | "content";
  Link: typeof Link;
  analytics: AnalyticsResponse | null;
  commentsSavedActualSummary: CommentsSavedActualSummary;
  commentsSavedPctCard: number | null;
  contentTypeDistributionLines: string[];
  formatCompactInteger: typeof formatCompactInteger;
  formatDateTime: typeof formatDateTime;
  formatInteger: typeof formatInteger;
  formatPctLabel: typeof formatPctLabel;
  formatPercent: typeof formatPercent;
  isAdvancedView: boolean;
  isBravoView: boolean;
  isHashtagsView: boolean;
  isSentimentView: boolean;
  platformTab: PlatformTab;
  postMetadataMetricCards: PostMetadataMetricCard[];
  postMetadataTotalPosts: number;
  youtubeContentBreakdown:
    | NonNullable<NonNullable<AnalyticsResponse["summary"]["data_quality"]>["youtube_content_breakdown"]>
    | undefined;
};

/** Typed, stateless presentation for this Season Social Analytics region. */
export function SeasonSocialOverview({
  variant,
  Link,
  analytics,
  commentsSavedActualSummary,
  commentsSavedPctCard,
  contentTypeDistributionLines,
  formatCompactInteger,
  formatDateTime,
  formatInteger,
  formatPctLabel,
  formatPercent,
  isAdvancedView,
  isBravoView,
  isHashtagsView,
  isSentimentView,
  platformTab,
  postMetadataMetricCards,
  postMetadataTotalPosts,
  youtubeContentBreakdown,
}: SeasonSocialOverviewProps) {
  return variant === "skeleton" ? (
    <>
          {(isBravoView || isSentimentView) && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <article
                  key={`summary-skeleton-${index}`}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-3 h-8 w-16 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-2 h-3 w-36 animate-pulse rounded bg-zinc-200" />
                </article>
              ))}
            </section>
          )}
          {(isBravoView || isAdvancedView) && (
            <section className="grid gap-6 xl:grid-cols-3">
              <article className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 space-y-3">
                  {[0, 1].map((row) => (
                    <div key={`heatmap-skeleton-${row}`} className="space-y-2">
                      <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
                      <div className="grid grid-cols-7 gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-2">
                        {Array.from({ length: 7 }).map((_, idx) => (
                          <div
                            key={`heatmap-skeleton-${row}-${idx}`}
                            className="h-9 w-9 animate-pulse rounded bg-zinc-200 sm:h-10 sm:w-10"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 space-y-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`panel-skeleton-${index}`} className="h-8 animate-pulse rounded bg-zinc-200" />
                  ))}
                </div>
              </article>
            </section>
          )}
          {(isSentimentView || isHashtagsView) && (
            <section className="grid gap-6 xl:grid-cols-2">
              {[0, 1].map((index) => (
                <article key={`detail-skeleton-${index}`} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                  <div className="mt-4 space-y-2">
                    {[0, 1, 2, 3].map((row) => (
                      <div key={`detail-skeleton-${index}-${row}`} className="h-8 animate-pulse rounded bg-zinc-200" />
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )}
    </>
  ) : (
    <>
          {(isBravoView || isSentimentView) && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Content Volume</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCompactInteger(analytics?.summary.total_posts)}</p>
              <p className="mt-1 text-xs text-zinc-500">Bravo posts/videos captured</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Viewer Comments</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCompactInteger(analytics?.summary.total_comments)}</p>
              <p className="mt-1 text-xs text-zinc-500">Comment/reply records persisted</p>
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Engagement</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {formatCompactInteger(analytics?.summary.total_engagement)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Cross-platform interactions</p>
            </article>
            {platformTab === "overview" && analytics?.reddit && (
              <article className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm" data-testid="reddit-summary-card">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-600">Reddit Coverage</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {formatCompactInteger(Number(analytics.reddit.tracked_post_count ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  tracked posts · {formatCompactInteger(Number(analytics.reddit.show_match_post_count ?? 0))} show-match ·{" "}
                  {formatCompactInteger(Number(analytics.reddit.comment_count ?? 0))} comments
                </p>
                {analytics.reddit.deep_link?.path && (
                  <Link
                    href={analytics.reddit.deep_link.path as Route}
                    className="mt-2 inline-flex text-xs font-semibold text-orange-700 underline-offset-4 hover:underline"
                  >
                    Open Reddit Manager
                  </Link>
                )}
              </article>
            )}
            {platformTab === "overview" && analytics?.reddit && (
              <article className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" data-testid="reddit-freshness-card">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-600">Reddit Freshness</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {formatCompactInteger(Number(analytics.reddit.coverage?.recovered_container_count ?? 0))}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  recovered windows · {formatCompactInteger(Number(analytics.reddit.coverage?.stale_container_count ?? 0))} stale
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Latest Reddit run {formatDateTime(analytics.reddit.freshness?.latest_run_timestamp ?? null)}
                </p>
              </article>
            )}
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-comments-saved-pct-card"
            >
              <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-comments-saved-pct-value">
                {formatPctLabel(commentsSavedPctCard)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">of Comments Saved</p>
            </article>
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-comments-saved-actual-card"
            >
              <p className="mt-2 text-3xl font-bold text-zinc-900 break-all" data-testid="metric-comments-saved-actual-value">
                {`${formatCompactInteger(commentsSavedActualSummary.saved)}/${formatCompactInteger(commentsSavedActualSummary.actual)}*`}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Comments (Saved/Actual)</p>
            </article>
            {isSentimentView && (
              <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Sentiment Mix</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-semibold text-emerald-700">
                    Positive {formatPercent(analytics?.summary.sentiment_mix.positive ?? 0)}
                  </p>
                  <p className="font-semibold text-zinc-600">
                    Neutral {formatPercent(analytics?.summary.sentiment_mix.neutral ?? 0)}
                  </p>
                  <p className="font-semibold text-red-700">
                    Negative {formatPercent(analytics?.summary.sentiment_mix.negative ?? 0)}
                  </p>
                </div>
              </article>
            )}
            {platformTab === "youtube" && (
              <>
                <article
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  data-testid="metric-youtube-videos-card"
                >
                  <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-youtube-videos-value">
                    {youtubeContentBreakdown
                      ? formatCompactInteger(Number(youtubeContentBreakdown.videos_count ?? 0))
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Videos</p>
                </article>
                <article
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  data-testid="metric-youtube-reels-card"
                >
                  <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid="metric-youtube-reels-value">
                    {youtubeContentBreakdown
                      ? formatCompactInteger(Number(youtubeContentBreakdown.reels_count ?? 0))
                      : "--"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Reels</p>
                </article>
              </>
            )}
            {postMetadataMetricCards.map((metric) => (
              <article
                key={`post-metadata-${metric.key}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                data-testid={`metric-${metric.key}-coverage-card`}
              >
                <p className="mt-2 text-3xl font-bold text-zinc-900" data-testid={`metric-${metric.key}-coverage-value`}>
                  {formatPctLabel(metric.value?.pct)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">of {metric.label} Saved</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {`${formatInteger(Number(metric.value?.posts_with ?? 0))}/${formatInteger(postMetadataTotalPosts)} ${metric.label} (Saved/Posts)`}
                </p>
              </article>
            ))}
            <article
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              data-testid="metric-content-type-distribution-card"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Content Type Distribution</p>
              <div className="mt-2 space-y-1 text-xs text-zinc-700">
                {contentTypeDistributionLines.length > 0 ? (
                  contentTypeDistributionLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </article>
            </section>
          )}

    </>
  );
}
