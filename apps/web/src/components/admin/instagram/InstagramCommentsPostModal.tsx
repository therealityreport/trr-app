"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import AdminModal from "@/components/admin/AdminModal";
import {
  AdminCommentThread,
  type AdminCommentThreadItem,
} from "@/components/admin/comments/AdminCommentThread";
import {
  readInstagramCommentsErrorMessage,
  type InstagramCommentsProxyErrorPayload,
} from "@/components/admin/instagram/comments-scrape-error";
import { Button } from "@/components/ui/button";
import type {
  SocialAccountCommentBreakdown,
  SocialAccountFacebookCrosspost,
  SocialAccountProfileComment,
  SocialAccountProfileCommentsResponse,
  SocialAccountProfilePost,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { SOCIAL_ACCOUNT_PLATFORM_LABELS } from "@/lib/admin/social-account-profile";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  platform: SocialPlatformSlug;
  handle: string;
  post: SocialAccountProfilePost | null;
  fetchAdmin: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshKey?: number;
};

type ProxyErrorPayload = InstagramCommentsProxyErrorPayload & {
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
};

type CommentSortField = "user" | "comment" | "likes" | "replies" | "created";
type CommentSortDirection = "asc" | "desc";
type CommentSortState = {
  field: CommentSortField;
  direction: CommentSortDirection;
};
type MediaPreviewState = {
  url: string;
  isVideo: boolean;
  x: number;
  y: number;
};
type NormalizedCommentBreakdown = {
  reportedComments: number;
  parentComments: number;
  childReplies: number;
  facebookComments: number;
  savedInstagramComments: number;
  accountedComments: number;
  missingComments: number;
  formulaLabel: string;
};
type NormalizedCaptureHealth = {
  captureRateLabel: string | null;
  phaseLabel: string | null;
  statusLabel: string | null;
  cursorLabel: string | null;
  coveredComments: number | null;
  trendLabel: string | null;
  observedAt: string | null;
};

const COMMENT_SORT_COLUMNS: Array<{ key: CommentSortField; label: string }> = [
  { key: "user", label: "User" },
  { key: "comment", label: "Comment" },
  { key: "likes", label: "Likes" },
  { key: "replies", label: "Replies" },
  { key: "created", label: "Created" },
];
const DEFAULT_COMMENT_SORT: CommentSortState = { field: "created", direction: "desc" };
const TEXT_COMMENT_SORT_FIELDS = new Set<CommentSortField>(["user", "comment"]);

const formatInteger = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const readFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readNonNegativeInteger = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
};

const firstNonNegativeInteger = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = readNonNegativeInteger(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatCaptureRate = (value: unknown): string | null => {
  const parsed = readFiniteNumber(value);
  if (parsed === null) return null;
  const percent = parsed <= 1 ? parsed * 100 : parsed;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: percent < 10 ? 1 : 0 }).format(percent)}%`;
};

const COMMENT_PHASE_LABELS: Record<string, string> = {
  ranked: "ranked",
  headload: "headload",
  fb_crosspost: "FB crosspost",
  child: "child",
};

const formatCaptureHealthKey = (value: string, labels: Record<string, string> = {}): string => {
  const normalized = value.trim();
  return labels[normalized] ?? normalized.replace(/_/g, " ");
};

const formatCaptureCountRecord = (
  value: Record<string, number | null | undefined> | null | undefined,
  labels: Record<string, string> = {},
): string | null => {
  const items = Object.entries(value ?? {})
    .map(([key, count]) => ({
      label: formatCaptureHealthKey(key, labels),
      count: readNonNegativeInteger(count),
    }))
    .filter((item): item is { label: string; count: number } => Boolean(item.label) && item.count !== null && item.count > 0)
    .map((item) => `${formatInteger(item.count)} ${item.label}`);
  return items.length ? items.join(", ") : null;
};

const getCaptureTrendLabel = (
  breakdown: SocialAccountCommentBreakdown | null | undefined,
): string | null => {
  const latest = [...(breakdown?.capture_rate_trend ?? [])].reverse().find((item) => item.capture_rate != null);
  if (!latest) return null;
  const rateLabel = formatCaptureRate(latest.capture_rate);
  if (!rateLabel) return null;
  const fetched = readNonNegativeInteger(latest.fetched_comments);
  const reported = readNonNegativeInteger(latest.reported_comments);
  if (fetched !== null && reported !== null && reported > 0) {
    return `${formatInteger(fetched)} / ${formatInteger(reported)} latest run (${rateLabel})`;
  }
  return `${rateLabel} latest run`;
};

const normalizeCaptureHealth = (
  breakdown: SocialAccountCommentBreakdown | null | undefined,
): NormalizedCaptureHealth | null => {
  const health = breakdown?.capture_health;
  if (!health) return null;
  const captureRateLabel = formatCaptureRate(health.capture_rate);
  const phaseLabel = formatCaptureCountRecord(health.phase_counts, COMMENT_PHASE_LABELS);
  const statusLabel = formatCaptureCountRecord(health.status_counts);
  const cursorLabel = formatCaptureCountRecord(health.cursor_param_counts);
  const coveredComments = firstNonNegativeInteger(health.covered_comments);
  const trendLabel = getCaptureTrendLabel(breakdown);
  const observedAt = typeof health.observed_at === "string" && health.observed_at.trim() ? health.observed_at.trim() : null;
  if (!captureRateLabel && !phaseLabel && !statusLabel && !cursorLabel && coveredComments === null && !trendLabel && !observedAt) {
    return null;
  }
  return {
    captureRateLabel,
    phaseLabel,
    statusLabel,
    cursorLabel,
    coveredComments,
    trendLabel,
    observedAt,
  };
};

const getFirstValidExternalUrl = (...values: Array<string | null | undefined>): string | null => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized) continue;
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      continue;
    }
  }
  return null;
};

const getCaptionPreview = (post: SocialAccountProfilePost | null): string => {
  const text = String(post?.content || post?.excerpt || post?.title || "").trim();
  return text || "No caption saved for this post.";
};

const getModalTitle = (platform: SocialPlatformSlug, post: SocialAccountProfilePost | null): string => {
  const sourceId = String(post?.source_id || "").trim();
  const prefix = platform === "instagram" ? "Comments" : "Discussion";
  return sourceId ? `${prefix} for ${sourceId}` : `Post ${prefix}`;
};

const normalizeCommentBreakdown = ({
  breakdown,
  facebookCrosspost,
  post,
}: {
  breakdown?: SocialAccountCommentBreakdown | null;
  facebookCrosspost?: SocialAccountFacebookCrosspost | null;
  post: SocialAccountProfilePost | null;
}): NormalizedCommentBreakdown => {
  const legacy = post?.comment_completeness ?? null;
  const facebookComments =
    firstNonNegativeInteger(
      breakdown?.facebook_comments,
      facebookCrosspost?.comments_count,
      post?.facebook_crosspost?.comments_count,
      legacy?.external_facebook_comments,
    ) ?? 0;
  const savedInstagramComments =
    firstNonNegativeInteger(
      breakdown?.saved_instagram_comments,
      legacy?.saved_instagram_comments,
      post?.saved_comments,
    ) ?? 0;
  const explicitParentComments = firstNonNegativeInteger(breakdown?.saved_parent_comments);
  const explicitChildReplies = firstNonNegativeInteger(breakdown?.saved_child_replies);
  const childReplies =
    explicitChildReplies ?? (explicitParentComments !== null ? Math.max(savedInstagramComments - explicitParentComments, 0) : 0);
  const parentComments = explicitParentComments ?? Math.max(savedInstagramComments - childReplies, 0);
  const reportedComments =
    firstNonNegativeInteger(
      breakdown?.reported_comments,
      legacy?.reported_comments,
      post?.metrics?.comments_count,
      savedInstagramComments + facebookComments,
    ) ?? 0;
  const missingComments =
    firstNonNegativeInteger(
      breakdown?.missing_comments,
      legacy?.missing_instagram_comments,
    ) ?? Math.max(reportedComments - parentComments - childReplies - facebookComments, 0);
  const accountedComments =
    firstNonNegativeInteger(breakdown?.accounted_comments) ??
    parentComments + childReplies + facebookComments + missingComments;

  return {
    reportedComments,
    parentComments,
    childReplies,
    facebookComments,
    savedInstagramComments,
    accountedComments,
    missingComments,
    formulaLabel: `${formatInteger(parentComments)} parent comments + ${formatInteger(childReplies)} child replies + ${formatInteger(
      facebookComments,
    )} Facebook comments + ${formatInteger(missingComments)} comments not captured = ${formatInteger(
      reportedComments,
    )} reported comments`,
  };
};

const readRecordString = (value: Record<string, unknown> | null | undefined, key: string): string | null => {
  const field = value?.[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
};

const getCommentDisplayName = (item: SocialAccountProfileComment): string => {
  return (
    item.display_name ||
    item.author_full_name ||
    readRecordString(item.owner, "display_name") ||
    readRecordString(item.user, "display_name") ||
    item.ownerUsername ||
    item.username ||
    "Unknown"
  );
};

const getCommentUsername = (item: SocialAccountProfileComment): string | null => {
  return (
    item.ownerUsername ||
    item.username ||
    readRecordString(item.owner, "username") ||
    readRecordString(item.user, "username")
  );
};

const getCommentAvatarUrl = (item: SocialAccountProfileComment): string | null => {
  return (
    item.hosted_author_profile_pic_url ||
    item.ownerProfilePicUrl ||
    item.author_profile_pic_url ||
    readRecordString(item.owner, "avatar_url") ||
    readRecordString(item.user, "avatar_url") ||
    null
  );
};

const getCommentLikes = (item: SocialAccountProfileComment): number | null | undefined =>
  item.likes_count ?? item.likesCount ?? item.likes;

const getCommentReplies = (item: SocialAccountProfileComment): number =>
  Math.max(
    Number(item.replies_count ?? item.repliesCount ?? item.reply_count ?? 0) || 0,
    item.replies?.length ?? 0,
  );

const getCommentCreatedAt = (item: SocialAccountProfileComment): string | null | undefined =>
  item.timestamp ?? item.created_at;

const isLikelyVideoUrl = (value?: string | null): boolean => {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".mov") ||
    normalized.endsWith(".webm") ||
    normalized.includes(".mp4?")
  );
};

const getCommentMediaUrls = (item: SocialAccountProfileComment): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  const hostedMediaUrls = item.hosted_media_urls ?? [];
  const sourceMediaUrls = item.media_urls ?? [];
  const candidates = hostedMediaUrls.length > 0 ? hostedMediaUrls : sourceMediaUrls;
  for (const value of candidates) {
    const url = String(value || "").trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
  }
  return urls;
};

const getDefaultCommentSortDirection = (field: CommentSortField): CommentSortDirection => {
  return TEXT_COMMENT_SORT_FIELDS.has(field) ? "asc" : "desc";
};

const getCommentIdentityKeys = (item: SocialAccountProfileComment): string[] => {
  const keys = [item.id, item.comment_id, item.external_id]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set(keys));
};

const getCommentPrimaryKey = (item: SocialAccountProfileComment): string => {
  return getCommentIdentityKeys(item)[0] || `${item.username || "unknown"}:${getCommentCreatedAt(item) || ""}:${item.text || ""}`;
};

const getCommentParentKey = (item: SocialAccountProfileComment): string | null => {
  return String(item.parent_comment_id || item.parent_comment_external_id || "").trim() || null;
};

const cloneCommentThread = (item: SocialAccountProfileComment): SocialAccountProfileComment => ({
  ...item,
  replies: (item.replies ?? []).map(cloneCommentThread),
});

const buildCommentThread = (items: SocialAccountProfileComment[]): SocialAccountProfileComment[] => {
  const nodesByPrimaryKey = new Map<string, SocialAccountProfileComment>();
  const nodeByLookupKey = new Map<string, SocialAccountProfileComment>();

  for (const item of items) {
    const node = { ...item, replies: (item.replies ?? []).map(cloneCommentThread) };
    const primaryKey = getCommentPrimaryKey(item);
    nodesByPrimaryKey.set(primaryKey, node);
    for (const key of getCommentIdentityKeys(item)) {
      if (!nodeByLookupKey.has(key)) {
        nodeByLookupKey.set(key, node);
      }
    }
  }

  const roots: SocialAccountProfileComment[] = [];
  for (const item of items) {
    const node = nodesByPrimaryKey.get(getCommentPrimaryKey(item));
    if (!node) continue;
    const parentKey = getCommentParentKey(item);
    const parent = parentKey ? nodeByLookupKey.get(parentKey) : null;
    if (parent && parent !== node) {
      parent.replies = [...(parent.replies ?? []), node];
      continue;
    }
    roots.push(node);
  }

  return roots;
};

const toAdminCommentThreadItem = (item: SocialAccountProfileComment): AdminCommentThreadItem => {
  const createdAt = getCommentCreatedAt(item);
  return {
    id: getCommentPrimaryKey(item),
    authorName: getCommentDisplayName(item),
    authorHandle: getCommentUsername(item),
    authorRole: item.discussion_type ? item.discussion_type.replace(/_/g, " ") : item.is_reply ? "reply" : null,
    avatarUrl: getCommentAvatarUrl(item),
    body: String(item.text || "").trim(),
    timestamp: createdAt || null,
    timestampLabel: createdAt ? formatDateTime(createdAt) : null,
    likes: getCommentLikes(item) ?? null,
    replyCount: getCommentReplies(item),
    mediaUrls: getCommentMediaUrls(item),
    replies: (item.replies ?? []).map(toAdminCommentThreadItem),
  };
};

export default function InstagramCommentsPostModal({
  isOpen,
  onClose,
  platform,
  handle,
  post,
  fetchAdmin,
  refreshKey = 0,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [comments, setComments] = useState<SocialAccountProfileCommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [commentSearch, setCommentSearch] = useState("");
  const [commentSort, setCommentSort] = useState<CommentSortState>(DEFAULT_COMMENT_SORT);
  const [retryNonce, setRetryNonce] = useState(0);
  const [mediaPreview, setMediaPreview] = useState<MediaPreviewState | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    setCommentSearch("");
    setCommentSort(DEFAULT_COMMENT_SORT);
  }, [isOpen, post?.source_id]);

  useEffect(() => {
    if (!isOpen || !post?.source_id) {
      setComments(null);
      setCommentsLoading(false);
      setCommentsError(null);
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      post_source_id: post.source_id,
      page: String(page),
      page_size: "25",
      sort_by: commentSort.field,
      sort_dir: commentSort.direction,
    });
    const trimmedSearch = commentSearch.trim();
    if (trimmedSearch) {
      query.set("search", trimmedSearch);
    }

    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const response = await fetchAdmin(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments?${query.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfileCommentsResponse & ProxyErrorPayload;
        if (!response.ok) {
          throw new Error(readInstagramCommentsErrorMessage(data, "Failed to load post comments"));
        }
        if (controller.signal.aborted) return;
        setComments(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCommentsError(error instanceof Error ? error.message : "Failed to load post comments");
      } finally {
        if (!controller.signal.aborted) {
          setCommentsLoading(false);
        }
      }
    };

    void loadComments();
    return () => controller.abort();
  }, [
    commentSearch,
    commentSort.direction,
    commentSort.field,
    fetchAdmin,
    handle,
    isOpen,
    page,
    platform,
    post?.source_id,
    refreshKey,
    retryNonce,
  ]);

  const dialogTitle = useMemo(() => getModalTitle(platform, post), [platform, post]);
  const captionPreview = useMemo(() => getCaptionPreview(post), [post]);
  const threadedItems = useMemo(() => buildCommentThread(comments?.items ?? []), [comments?.items]);
  const commentThreadItems = useMemo(() => threadedItems.map(toAdminCommentThreadItem), [threadedItems]);
  const currentPage = comments?.pagination.page ?? page;
  const totalPages = comments?.pagination.total_pages ?? 1;
  const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] ?? platform;
  const facebookCrosspost = comments?.facebook_crosspost ?? post?.facebook_crosspost ?? null;
  const sourceCommentBreakdown = comments?.comment_breakdown ?? post?.comment_breakdown ?? null;
  const commentBreakdown = useMemo(
    () =>
      normalizeCommentBreakdown({
        breakdown: sourceCommentBreakdown,
        facebookCrosspost,
        post,
      }),
    [facebookCrosspost, post, sourceCommentBreakdown],
  );
  const captureHealth = useMemo(() => normalizeCaptureHealth(sourceCommentBreakdown), [sourceCommentBreakdown]);
  const facebookPostUrl = useMemo(
    () => getFirstValidExternalUrl(comments?.facebook_crosspost?.post_url, post?.facebook_crosspost?.post_url),
    [comments?.facebook_crosspost?.post_url, post?.facebook_crosspost?.post_url],
  );
  const updateCommentSearch = (value: string) => {
    setCommentSearch(value);
    setPage(1);
  };
  const selectCommentSort = (field: CommentSortField) => {
    setCommentSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: getDefaultCommentSortDirection(field) };
    });
    setPage(1);
  };
  const updateMediaPreview = (mediaUrl: string, event: React.MouseEvent<HTMLElement>) => {
    setMediaPreview({
      url: mediaUrl,
      isVideo: isLikelyVideoUrl(mediaUrl),
      x: Math.min(event.clientX + 18, window.innerWidth - 300),
      y: Math.min(event.clientY + 18, window.innerHeight - 300),
    });
  };
  const showMediaPreviewFromElement = (mediaUrl: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setMediaPreview({
      url: mediaUrl,
      isVideo: isLikelyVideoUrl(mediaUrl),
      x: Math.min(rect.right + 12, window.innerWidth - 300),
      y: Math.min(rect.top, window.innerHeight - 300),
    });
  };
  const renderInstagramCommentMedia = (item: AdminCommentThreadItem): React.ReactNode => {
    const previewMediaUrl = item.mediaUrls?.[0] ?? null;
    if (!previewMediaUrl) return null;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href={previewMediaUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open comment media"
          onMouseEnter={(event) => updateMediaPreview(previewMediaUrl, event)}
          onMouseMove={(event) => updateMediaPreview(previewMediaUrl, event)}
          onMouseLeave={() => setMediaPreview(null)}
          onFocus={(event) => showMediaPreviewFromElement(previewMediaUrl, event.currentTarget)}
          onBlur={() => setMediaPreview(null)}
          className="group relative block size-12 overflow-hidden rounded-md border border-border bg-muted"
        >
          {isLikelyVideoUrl(previewMediaUrl) ? (
            <video src={previewMediaUrl} muted playsInline preload="metadata" className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewMediaUrl}
              alt="Comment media"
              loading="lazy"
              className="size-full object-cover transition group-hover:scale-105"
            />
          )}
        </a>
      </div>
    );
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      ariaLabel={dialogTitle}
      initialFocusRef={closeButtonRef}
      panelClassName="max-h-[90vh] max-w-5xl overflow-y-auto p-0"
      preserveScrollPosition
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <span>{platformLabel}</span>
              <span>{post?.source_id || "Unknown post"}</span>
              <span>{formatDateTime(post?.posted_at)}</span>
              <span>{formatInteger(commentBreakdown.savedInstagramComments)} {platformLabel} rows</span>
            </div>
            <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">{captionPreview}</p>
            {post?.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Post
              </a>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Comment Makeup</p>
            <div
              aria-label={commentBreakdown.formulaLabel}
              className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-zinc-800"
            >
              <span>{formatInteger(commentBreakdown.parentComments)} parent comments</span>
              <span className="text-zinc-400">+</span>
              <span>{formatInteger(commentBreakdown.childReplies)} child replies</span>
              <span className="text-zinc-400">+</span>
              <span>{formatInteger(commentBreakdown.facebookComments)} Facebook comments</span>
              <span className="text-zinc-400">+</span>
              <span
                className={
                  commentBreakdown.missingComments > 0
                    ? "rounded bg-amber-50 px-1.5 py-0.5 text-amber-800"
                    : "text-zinc-800"
                }
              >
                {formatInteger(commentBreakdown.missingComments)} not captured
              </span>
              <span className="text-zinc-400">=</span>
              <span>{formatInteger(commentBreakdown.reportedComments)} reported comments</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
              <span>Facebook comments: {formatInteger(commentBreakdown.facebookComments)}</span>
              {facebookPostUrl ? (
                <a
                  href={facebookPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Open Facebook post
                </a>
              ) : null}
            </div>
            {captureHealth ? (
              <div className="mt-3 border-t border-zinc-200 pt-2 text-xs text-zinc-600">
                <p className="font-semibold uppercase tracking-[0.14em] text-zinc-500">Capture Health</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {captureHealth.captureRateLabel ? <span>Capture: {captureHealth.captureRateLabel}</span> : null}
                  <span>Capture gap: {formatInteger(commentBreakdown.missingComments)}</span>
                  {captureHealth.phaseLabel ? <span>Phases: {captureHealth.phaseLabel}</span> : null}
                  {captureHealth.coveredComments !== null ? (
                    <span>Covered: {formatInteger(captureHealth.coveredComments)}</span>
                  ) : null}
                  {captureHealth.statusLabel ? <span>Status: {captureHealth.statusLabel}</span> : null}
                  {captureHealth.cursorLabel ? <span>Cursors: {captureHealth.cursorLabel}</span> : null}
                  {captureHealth.trendLabel ? <span>Trend: {captureHealth.trendLabel}</span> : null}
                  {captureHealth.observedAt ? <span>Observed: {formatDateTime(captureHealth.observedAt)}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block w-full max-w-sm">
              <span className="sr-only">Search post comments</span>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="search"
                value={commentSearch}
                onChange={(event) => updateCommentSearch(event.target.value)}
                placeholder="Search user or comment..."
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>
            <p className="text-sm text-zinc-500">{formatInteger(comments?.pagination.total)} parent threads</p>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {COMMENT_SORT_COLUMNS.map((column) => {
              const active = commentSort.field === column.key;
              const nextDirection =
                active
                  ? commentSort.direction === "asc"
                    ? "desc"
                    : "asc"
                  : getDefaultCommentSortDirection(column.key);
              const SortIcon = active
                ? commentSort.direction === "asc"
                  ? ArrowUpIcon
                  : ArrowDownIcon
                : ArrowUpDownIcon;
              return (
                <Button
                  key={column.key}
                  type="button"
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  aria-label={`Sort by ${column.label} ${nextDirection === "asc" ? "ascending" : "descending"}`}
                  onClick={() => selectCommentSort(column.key)}
                  className="gap-1.5 text-xs"
                >
                  <span>{column.label}</span>
                  <SortIcon aria-hidden="true" data-icon="inline-end" />
                  {active ? <span className="sr-only">sorted {commentSort.direction}</span> : null}
                </Button>
              );
            })}
          </div>
          <div>
            {commentsLoading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading post comments...</p>
            ) : commentsError ? (
              <div className="flex flex-wrap items-center gap-3 py-6 text-sm text-red-700">
                <span>{commentsError}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setRetryNonce((current) => current + 1)}>
                  Retry
                </Button>
              </div>
            ) : (
              <AdminCommentThread
                items={commentThreadItems}
                emptyLabel={
                  commentSearch.trim()
                    ? "No parent comment threads match this search."
                    : "No saved parent comment threads for this post yet."
                }
                renderMedia={renderInstagramCommentMedia}
                defaultExpandedDepth={4}
              />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1 || commentsLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-sm text-zinc-500">
              Parent-thread page {currentPage} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={commentsLoading || currentPage >= totalPages}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {mediaPreview ? (
        <div
          role="tooltip"
          aria-label="Comment media preview"
          className="pointer-events-none fixed z-[10000] overflow-hidden rounded-lg border border-zinc-200 bg-white p-2 shadow-xl"
          style={{ left: `${mediaPreview.x}px`, top: `${mediaPreview.y}px` }}
        >
          {mediaPreview.isVideo ? (
            <video src={mediaPreview.url} muted autoPlay loop playsInline className="max-h-72 w-72 bg-black object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaPreview.url} alt="" className="max-h-72 w-72 object-contain" />
          )}
        </div>
      ) : null}
    </AdminModal>
  );
}
