"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import InstagramCommentsPostModal from "@/components/admin/instagram/InstagramCommentsPostModal";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  readInstagramCommentsErrorMessage,
  type InstagramCommentsProxyErrorPayload,
} from "@/components/admin/instagram/comments-scrape-error";
import type {
  CatalogBackfillLaunchResponse,
  CatalogBackfillRequest,
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsScrapeRequest,
  SocialAccountCommentsScrapeResponse,
  SocialAccountProfilePost,
  SocialAccountProfilePostsResponse,
  SocialAccountProfileSummary,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import {
  SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
} from "@/lib/admin/social-account-profile";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  summary: SocialAccountProfileSummary | null;
  onSummaryRefresh?: () => Promise<void> | void;
};

type ProxyErrorPayload = InstagramCommentsProxyErrorPayload & {
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
};

const ACTIVE_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
// P2-8: 2s matches the existing admin polling cadence used elsewhere on the profile page.
const COMMENTS_PROGRESS_POLL_INTERVAL_MS = 2_000;
const POSTS_LOAD_RETRY_DELAY_MS = 200;
const PRIMARY_BUTTON_CLASS =
  "inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const COMMENTS_REFRESH_SELECTED_TASKS: CatalogBackfillRequest["selected_tasks"] = ["post_details", "comments", "media"];
const RETRYABLE_POSTS_PROXY_CODES = new Set([
  "UPSTREAM_TIMEOUT",
  "BACKEND_REQUEST_TIMEOUT",
  "BACKEND_SATURATED",
  "BACKEND_UNREACHABLE",
]);

const formatInteger = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatStatusLabel = (value?: string | null): string => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Idle";
  return normalized.replace(/_/g, " ").replace(/^./, (char) => char.toUpperCase());
};

const getCaptionPreview = (post: SocialAccountProfilePost): string => {
  const text = String(post.content || post.excerpt || post.title || "").trim();
  if (!text) return "No caption saved for this post.";
  if (text.length <= 220) return text;
  return `${text.slice(0, 217).trimEnd()}...`;
};

const normalizeRunStatus = (value?: string | null): string => String(value || "").trim().toLowerCase();
const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRetryablePostsLoadFailure = (
  payload: ProxyErrorPayload | null | undefined,
  message: string,
  status?: number,
): boolean => {
  if (payload?.retryable) return true;
  if (payload?.code && RETRYABLE_POSTS_PROXY_CODES.has(payload.code)) return true;
  if (status === 408 || status === 429 || status === 502 || status === 504) return true;
  const normalized = message.toLowerCase();
  return normalized.includes("timed out") || normalized.includes("backend is saturated");
};

const normalizeRunId = (value: unknown): string | null => {
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readCommentsRunId = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return (
    normalizeRunId(record.run_id) ??
    normalizeRunId(record.active_run_id) ??
    readCommentsRunId(record.detail)
  );
};

export default function InstagramCommentsPanel({ platform, handle, summary, onSummaryRefresh }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const fetchAdminWithAuth = useCallback(
    (
      input: RequestInfo | URL,
      init?: RequestInit,
      options?: Parameters<typeof fetchAdminWithAuthBase>[2],
    ) =>
      fetchAdminWithAuthBase(input, init, {
        ...options,
        preferredUser: options?.preferredUser ?? user,
        allowDevAdminBypass: options?.allowDevAdminBypass ?? true,
      }),
    [user],
  );
  const [posts, setPosts] = useState<SocialAccountProfilePostsResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [catalogRefreshPending, setCatalogRefreshPending] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialAccountProfilePost | null>(null);
  const [modalRefreshKey, setModalRefreshKey] = useState(0);
  const handledTerminalRunRef = useRef<string | null>(null);
  const supportsComments = SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS.includes(platform);
  const supportsInlineCommentsSync = platform === "instagram";
  const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] ?? platform;

  const refreshPosts = useCallback(async () => {
    if (checking || !user || !hasAccess) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const postsUrl = `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts?page=${page}&page_size=25&comments_only=true`;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const response = await fetchAdminWithAuth(postsUrl, undefined, { preferredUser: user });
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfilePostsResponse & ProxyErrorPayload;
        if (response.ok) {
          setPosts(data);
          return;
        }

        const errorMessage = readInstagramCommentsErrorMessage(data, "Failed to load Instagram posts with comments");
        if (attempt < 2 && isRetryablePostsLoadFailure(data, errorMessage, response.status)) {
          const retryAfterMs =
            typeof data.retry_after_seconds === "number" && data.retry_after_seconds > 0
              ? data.retry_after_seconds * 1000
              : POSTS_LOAD_RETRY_DELAY_MS;
          await sleep(retryAfterMs);
          continue;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : "Failed to load Instagram posts with comments");
    } finally {
      setPostsLoading(false);
    }
  }, [checking, fetchAdminWithAuth, handle, hasAccess, page, platform, user]);

  useEffect(() => {
    if (!supportsComments) return;
    void refreshPosts();
  }, [refreshPosts, supportsComments]);

  useEffect(() => {
    if (!selectedPost || !posts) return;
    const refreshedSelection =
      posts.items.find((item) => item.id === selectedPost.id) ??
      posts.items.find((item) => item.source_id === selectedPost.source_id);
    if (refreshedSelection && refreshedSelection !== selectedPost) {
      setSelectedPost(refreshedSelection);
    }
  }, [posts, selectedPost]);

  const runProgress = useSharedPollingResource<SocialAccountCommentsRunProgress>({
    key: `instagram-comments-run:${platform}:${handle}:${scrapeRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && supportsInlineCommentsSync && Boolean(scrapeRunId),
    intervalMs: COMMENTS_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(scrapeRunId || "")}/progress`,
        { signal },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsRunProgress & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to load comments scrape progress"));
      }
      return data;
    },
  });

  useEffect(() => {
    const progress = runProgress.data;
    if (!progress) return;
    const runId = String(progress.run_id || "").trim();
    const status = normalizeRunStatus(progress.run_status);
    if (!runId) return;
    if (ACTIVE_RUN_STATUSES.has(status)) {
      setScrapeMessage(`Comments sync ${status}. Run ${runId.slice(0, 8)}.`);
      setScrapeError(null);
      return;
    }
    if (!TERMINAL_RUN_STATUSES.has(status) || handledTerminalRunRef.current === runId) return;
    handledTerminalRunRef.current = runId;
    if (status === "completed") {
      setScrapeMessage(`Comments sync completed. Run ${runId.slice(0, 8)}.`);
      setScrapeError(null);
      void refreshPosts();
      setModalRefreshKey((current) => current + 1);
      void onSummaryRefresh?.();
    } else {
      setScrapeError(progress.error_message || `Comments sync ${status}.`);
    }
    setScrapeRunId(null);
  }, [onSummaryRefresh, refreshPosts, runProgress.data]);

  useEffect(() => {
    if (!runProgress.error) return;
    setScrapeError(runProgress.error);
    setScrapeRunId(null);
  }, [runProgress.error]);

  const startProfileScrape = useCallback(async () => {
    if (!user) return;
    setScrapeError(null);
    setScrapeMessage(null);
    handledTerminalRunRef.current = null;
    const body: SocialAccountCommentsScrapeRequest = {
      mode: "profile",
      source_scope: "bravo",
      refresh_policy: "all_saved_posts",
    };
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/scrape`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsScrapeResponse & ProxyErrorPayload;
      if (!response.ok) {
        const activeRunId =
          (response.status === 409 && readCommentsRunId(data.upstream_detail)) ||
          (response.status === 409 && readCommentsRunId(data));
        if (activeRunId) {
          setScrapeRunId(activeRunId);
          setScrapeMessage(`Comments sync already running. Run ${activeRunId.slice(0, 8)}.`);
          return;
        }
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to start comments sync"));
      }
      const runId = String(data.run_id || "").trim();
      setScrapeRunId(runId || null);
      setScrapeMessage(runId ? `Comments sync queued. Run ${runId.slice(0, 8)}.` : "Comments sync queued.");
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to start comments sync");
    }
  }, [fetchAdminWithAuth, handle, platform, user]);

  const startCatalogRefresh = useCallback(async () => {
    if (!user) return;
    setScrapeError(null);
    setScrapeMessage(null);
    setCatalogRefreshPending(true);
    const body: CatalogBackfillRequest = {
      source_scope: "bravo",
      backfill_scope: "full_history",
      selected_tasks: COMMENTS_REFRESH_SELECTED_TASKS,
    };
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/catalog/backfill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as CatalogBackfillLaunchResponse & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to queue discussion refresh"));
      }
      const runId = String(data.catalog_run_id || data.run_id || "").trim();
      setScrapeMessage(
        runId ? `Refresh queued. Run ${runId.slice(0, 8)}.` : "Refresh queued for saved posts and discussion.",
      );
      void refreshPosts();
      void onSummaryRefresh?.();
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to queue discussion refresh");
    } finally {
      setCatalogRefreshPending(false);
    }
  }, [fetchAdminWithAuth, handle, onSummaryRefresh, platform, refreshPosts, user]);

  const coverage = summary?.comments_coverage;
  const savedSummary = summary?.comments_saved_summary;
  const coverageStatus = normalizeRunStatus(coverage?.effective_status ?? coverage?.last_comments_run_status);
  const coverageActiveRunId = useMemo(() => {
    if (!ACTIVE_RUN_STATUSES.has(coverageStatus)) return null;
    return readCommentsRunId(coverage);
  }, [coverage, coverageStatus]);
  // P0-1: `Available Posts` must match the saved-post total shown by the Posts card —
  // `live_catalog_total_posts` first, falling back to `catalog_total_posts`. Do NOT
  // derive from `coverage.available_posts`; that field conflates the commentable subset
  // with the saved-post inventory. `Commentable now` stays on `coverage.eligible_posts`.
  const availablePosts = Number(summary?.live_catalog_total_posts ?? summary?.catalog_total_posts ?? 0);
  const commentablePosts = Number(coverage?.eligible_posts ?? savedSummary?.retrieved_comment_posts ?? 0);
  const effectiveCoverageLabel = String(coverage?.effective_label || "").trim()
    || (savedSummary ? "Saved" : formatStatusLabel(coverage?.effective_status ?? coverage?.last_comments_run_status));
  const historicalFailure = Boolean(coverage?.historical_failure);
  const lastAttemptStatus = normalizeRunStatus(coverage?.last_attempt_status);
  const lastAttemptAt = coverage?.last_attempt_at ?? coverage?.last_comments_run_at;
  const runStatus = useMemo(() => normalizeRunStatus(runProgress.data?.run_status), [runProgress.data?.run_status]);
  const isScraping = Boolean(scrapeRunId) || ACTIVE_RUN_STATUSES.has(runStatus);
  const primaryActionPending = supportsInlineCommentsSync ? isScraping : catalogRefreshPending;
  const emptyPostsLabel = supportsInlineCommentsSync
    ? `No ${platformLabel} posts with comments are saved for this account yet.`
    : `No saved ${platformLabel} posts with discussion are available for this account yet.`;
  const panelTitle = supportsInlineCommentsSync ? `${platformLabel} Comments` : `${platformLabel} Discussion`;
  const panelDescription = supportsInlineCommentsSync
    ? `Review saved comment coverage and run a full-account comments sync across saved ${platformLabel} posts.`
    : `Review saved discussion coverage and queue a catalog-driven refresh for post details, comments, and media across saved ${platformLabel} posts.`;
  const primaryActionLabel = supportsInlineCommentsSync
    ? primaryActionPending
      ? "Syncing Comments..."
      : "Sync Comments"
    : primaryActionPending
      ? "Queuing Refresh..."
      : "Refresh Details + Comments + Media";
  const openPostComments = useCallback(
    (post: SocialAccountProfilePost, event?: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event?.preventDefault();
      setSelectedPost(post);
    },
    [],
  );

  useEffect(() => {
    if (!supportsInlineCommentsSync || !coverageActiveRunId) return;
    handledTerminalRunRef.current = null;
    setScrapeRunId((current) => current ?? coverageActiveRunId);
  }, [coverageActiveRunId, supportsInlineCommentsSync]);

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{panelTitle}</h2>
            <p className="text-sm text-zinc-500">{panelDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => void (supportsInlineCommentsSync ? startProfileScrape() : startCatalogRefresh())}
            disabled={primaryActionPending || checking || !user || !hasAccess}
            className={PRIMARY_BUTTON_CLASS}
          >
            {primaryActionLabel}
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Available Posts</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(availablePosts)}</p>
            <p className="mt-1 text-xs text-zinc-500">Commentable now: {formatInteger(commentablePosts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Missing</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(coverage?.missing_posts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Stale</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(coverage?.stale_posts)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last Run</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDateTime(coverage?.last_comments_run_at)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{effectiveCoverageLabel}</p>
            {historicalFailure && lastAttemptStatus === "failed" ? (
              <p className="mt-1 text-xs text-amber-700">
                Last attempt failed at {formatDateTime(lastAttemptAt)}. Saved discussion remains available.
              </p>
            ) : null}
          </div>
        </div>

        {scrapeMessage ? <p className="mt-4 text-sm text-zinc-600">{scrapeMessage}</p> : null}
        {scrapeError ? <p className="mt-4 text-sm text-red-700">{scrapeError}</p> : null}

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                <th className="pb-3 pr-4">Post</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3 pr-4">Caption</th>
                <th className="pb-3 pr-4">Comments Saved</th>
                <th className="pb-3">Likes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {postsLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-sm text-zinc-500">
                    Loading posts with comments...
                  </td>
                </tr>
              ) : postsError ? (
                <tr>
                  <td colSpan={5} className="py-6 text-sm text-red-700">
                    {postsError}
                  </td>
                </tr>
              ) : (posts?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-sm text-zinc-500">
                    {emptyPostsLabel}
                  </td>
                </tr>
              ) : (
                (posts?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 pr-4 align-top text-zinc-700">
                      {item.url ? (
                        <a
                          href={item.url}
                          onClick={(event) => openPostComments(item, event)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {item.source_id || "Open post"}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => openPostComments(item, event)}
                          className="text-left text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {item.source_id || "Open post"}
                        </button>
                      )}
                    </td>
                    <td className="py-4 pr-4 align-top text-xs text-zinc-500">{formatDateTime(item.posted_at)}</td>
                    <td className="py-4 pr-4 align-top text-zinc-700">
                      <div className="max-w-xl">
                        <p className="whitespace-pre-wrap break-words leading-5 text-zinc-700">
                          {getCaptionPreview(item)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 pr-4 align-top text-zinc-700">{formatInteger(item.saved_comments)}</td>
                    <td className="py-4 align-top text-zinc-700">{formatInteger(item.metrics.likes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || postsLoading}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <div className="text-sm text-zinc-500">
            Page {posts?.pagination.page ?? page} of {posts?.pagination.total_pages ?? 1}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={Boolean(posts && page >= posts.pagination.total_pages) || postsLoading}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      <InstagramCommentsPostModal
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        platform={platform}
        handle={handle}
        post={selectedPost}
        fetchAdmin={(input, init) => fetchAdminWithAuth(input, init, { preferredUser: user })}
        refreshKey={modalRefreshKey}
      />
    </>
  );
}
