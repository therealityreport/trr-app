"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import { useSharedPollingResource } from "@/lib/admin/shared-live-resource";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import type {
  SocialAccountCommentsRunProgress,
  SocialAccountCommentsScrapeRequest,
  SocialAccountCommentsScrapeResponse,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  sourceId: string;
  onCompleted?: () => Promise<void> | void;
};

type ProxyErrorPayload = {
  error?: string;
  detail?: string;
  // P2-7: Extracted by the admin proxy from FastAPI's `detail.code`. The
  // button branches on this to show actionable copy for known failure modes.
  upstream_detail_code?: string;
  upstream_status?: number;
};

const ACTIVE_RUN_STATUSES = new Set(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);
// P2-8: Match the 2s cadence used elsewhere in the admin via `useSharedPollingResource`.
const COMMENTS_PROGRESS_POLL_INTERVAL_MS = 2_000;

const readErrorMessage = (payload: ProxyErrorPayload | null | undefined, fallback: string): string => {
  // P2-7: Map structured backend codes to actionable operator copy so the
  // per-post button shows specific guidance, not a generic 400/503.
  const code = typeof payload?.upstream_detail_code === "string" ? payload.upstream_detail_code : "";
  if (code === "SOCIAL_WORKER_UNAVAILABLE") {
    return "No comments worker online — start it, then retry.";
  }
  if (code === "instagram_comments_auth_failed") {
    return "Instagram session expired — refresh cookies, then retry.";
  }
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload?.detail === "string" && payload.detail.trim()) return payload.detail;
  return fallback;
};

const normalizeRunStatus = (value?: string | null): string => String(value || "").trim().toLowerCase();

export default function PostScrapeCommentsButton({ platform, handle, sourceId, onCompleted }: Props) {
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
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledTerminalRunRef = useRef<string | null>(null);

  const runProgress = useSharedPollingResource<SocialAccountCommentsRunProgress>({
    key: `instagram-post-comments-run:${platform}:${handle}:${sourceId}:${scrapeRunId ?? "none"}`,
    shouldRun: !checking && Boolean(user) && hasAccess && Boolean(scrapeRunId),
    intervalMs: COMMENTS_PROGRESS_POLL_INTERVAL_MS,
    fetchData: async (signal) => {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments/runs/${encodeURIComponent(scrapeRunId || "")}/progress`,
        { signal },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as SocialAccountCommentsRunProgress & ProxyErrorPayload;
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "Failed to load comments scrape progress"));
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
      setMessage(`Run ${runId.slice(0, 8)} ${status}.`);
      setErrorMessage(null);
      return;
    }
    if (!TERMINAL_RUN_STATUSES.has(status) || handledTerminalRunRef.current === runId) return;
    handledTerminalRunRef.current = runId;
    if (status === "completed") {
      setMessage("Comments refreshed.");
      setErrorMessage(null);
      void onCompleted?.();
    } else {
      setErrorMessage(progress.error_message || `Comments scrape ${status}.`);
    }
    setScrapeRunId(null);
  }, [onCompleted, runProgress.data]);

  useEffect(() => {
    if (!runProgress.error) return;
    setErrorMessage(runProgress.error);
    setScrapeRunId(null);
  }, [runProgress.error]);

  const startScrape = useCallback(async () => {
    if (!user) return;
    handledTerminalRunRef.current = null;
    setMessage(null);
    setErrorMessage(null);
    const body: SocialAccountCommentsScrapeRequest = {
      mode: "single_post",
      source_id: sourceId,
      max_comments_per_post: 500,
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
        throw new Error(readErrorMessage(data, "Failed to start comments scrape"));
      }
      const runId = String(data.run_id || "").trim();
      setScrapeRunId(runId || null);
      setMessage(runId ? `Queued ${runId.slice(0, 8)}.` : "Queued.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start comments scrape");
    }
  }, [fetchAdminWithAuth, handle, platform, sourceId, user]);

  const runStatus = normalizeRunStatus(runProgress.data?.run_status);
  const isRunning = Boolean(scrapeRunId) || ACTIVE_RUN_STATUSES.has(runStatus);

  // P2-8: Defense-in-depth platform guard. Parent SocialAccountProfilePage
  // already gates rendering on `supportsComments`, but if that guard ever
  // regresses we must not POST a comments-scrape request for a non-Instagram
  // platform (the backend would 400 and the user sees a confusing error).
  // The check must live AFTER all hooks to stay compliant with Rules of Hooks.
  if (platform !== "instagram") return null;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void startScrape()}
        disabled={isRunning || checking || !user || !hasAccess}
        className="inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? "Scraping..." : "Scrape Comments"}
      </button>
      {message ? <p className="text-[11px] text-zinc-500">{message}</p> : null}
      {errorMessage ? <p className="text-[11px] text-red-700">{errorMessage}</p> : null}
    </div>
  );
}
