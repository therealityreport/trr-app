"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  readInstagramCommentsErrorMessage,
  type InstagramCommentsProxyErrorPayload,
} from "@/components/admin/instagram/comments-scrape-error";
import type {
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsScrapeRequest,
  SocialAccountCommentsScrapeResponse,
  SocialAccountProfileCommentsResponse,
  SocialAccountProfileSummary,
  SocialPlatformSlug,
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
const PRIMARY_BUTTON_CLASS =
  "inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

const formatInteger = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const normalizeRunStatus = (value?: string | null): string => String(value || "").trim().toLowerCase();

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
  const [comments, setComments] = useState<SocialAccountProfileCommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const handledTerminalRunRef = useRef<string | null>(null);

  const refreshComments = useCallback(async () => {
    if (checking || !user || !hasAccess) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments?page=${page}&page_size=25`,
        undefined,
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountProfileCommentsResponse & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to load Instagram comments"));
      }
      setComments(data);
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "Failed to load Instagram comments");
    } finally {
      setCommentsLoading(false);
    }
  }, [checking, fetchAdminWithAuth, handle, hasAccess, page, platform, user]);

  useEffect(() => {
    if (platform !== "instagram") return;
    void refreshComments();
  }, [platform, refreshComments]);

  const runProgress = useSharedPollingResource<SocialAccountCommentsRunProgress>({
    key: `instagram-comments-run:${platform}:${handle}:${scrapeRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && platform === "instagram" && Boolean(scrapeRunId),
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
      void refreshComments();
      void onSummaryRefresh?.();
    } else {
      setScrapeError(progress.error_message || `Comments sync ${status}.`);
    }
    setScrapeRunId(null);
  }, [onSummaryRefresh, refreshComments, runProgress.data]);

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
        throw new Error(readInstagramCommentsErrorMessage(data, "Failed to start comments sync"));
      }
      const runId = String(data.run_id || "").trim();
      setScrapeRunId(runId || null);
      setScrapeMessage(runId ? `Comments sync queued. Run ${runId.slice(0, 8)}.` : "Comments sync queued.");
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Failed to start comments sync");
    }
  }, [fetchAdminWithAuth, handle, platform, user]);

  const coverage = summary?.comments_coverage;
  // P0-1: `Available Posts` must match the saved-post total shown by the Posts card —
  // `live_catalog_total_posts` first, falling back to `catalog_total_posts`. Do NOT
  // derive from `coverage.available_posts`; that field conflates the commentable subset
  // with the saved-post inventory. `Commentable now` stays on `coverage.eligible_posts`.
  const availablePosts = Number(summary?.live_catalog_total_posts ?? summary?.catalog_total_posts ?? 0);
  const commentablePosts = Number(coverage?.eligible_posts ?? 0);
  const runStatus = useMemo(() => normalizeRunStatus(runProgress.data?.run_status), [runProgress.data?.run_status]);
  const isScraping = Boolean(scrapeRunId) || ACTIVE_RUN_STATUSES.has(runStatus);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Instagram Comments</h2>
          <p className="text-sm text-zinc-500">
            Review saved comment coverage and run a full-account comments sync across saved Instagram posts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startProfileScrape()}
          disabled={isScraping || checking || !user || !hasAccess}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isScraping ? "Syncing Comments..." : "Sync Comments"}
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
          <p className="mt-2 text-sm font-semibold capitalize text-zinc-900">
            {coverage?.last_comments_run_status || "idle"}
          </p>
        </div>
      </div>

      {scrapeMessage ? <p className="mt-4 text-sm text-zinc-600">{scrapeMessage}</p> : null}
      {scrapeError ? <p className="mt-4 text-sm text-red-700">{scrapeError}</p> : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
              <th className="pb-3 pr-4">Post</th>
              <th className="pb-3 pr-4">User</th>
              <th className="pb-3 pr-4">Comment</th>
              <th className="pb-3 pr-4">Likes</th>
              <th className="pb-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {commentsLoading ? (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-zinc-500">
                  Loading comments...
                </td>
              </tr>
            ) : commentsError ? (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-red-700">
                  {commentsError}
                </td>
              </tr>
            ) : (comments?.items ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-zinc-500">
                  No comments stored for this account yet.
                </td>
              </tr>
            ) : (
              (comments?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="py-4 pr-4 align-top text-zinc-700">
                    {item.post_url ? (
                      <a
                        href={item.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.post_source_id || "Open post"}
                      </a>
                    ) : (
                      <span>{item.post_source_id || "Unknown post"}</span>
                    )}
                  </td>
                  <td className="py-4 pr-4 align-top text-zinc-700">{item.username || "Unknown"}</td>
                  <td className="py-4 pr-4 align-top text-zinc-700">
                    <div className="max-w-xl">
                      <p className="leading-5 text-zinc-700">{item.text || "No text"}</p>
                      {item.is_reply ? <p className="mt-1 text-xs text-zinc-500">Reply</p> : null}
                    </div>
                  </td>
                  <td className="py-4 pr-4 align-top text-zinc-700">{formatInteger(item.likes)}</td>
                  <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(item.created_at)}</td>
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
          disabled={page <= 1 || commentsLoading}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <div className="text-sm text-zinc-500">
          Page {comments?.pagination.page ?? page} of {comments?.pagination.total_pages ?? 1}
        </div>
        <button
          type="button"
          onClick={() => setPage((current) => current + 1)}
          disabled={Boolean(comments && page >= comments.pagination.total_pages) || commentsLoading}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
