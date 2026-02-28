"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import SocialPlatformTabIcon, { type SocialPlatformTabIconKey } from "@/components/admin/SocialPlatformTabIcon";
import {
  buildSeasonWeekBreadcrumb,
  humanizeSlug,
} from "@/lib/admin/admin-breadcrumbs";
import { recordAdminRecentShow } from "@/lib/admin/admin-recent-shows";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { buildSeasonAdminUrl, buildSeasonSocialWeekUrl, buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";
import type { PhotoMetadata } from "@/lib/photo-metadata";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  likes: number;
  is_reply: boolean;
  reply_count: number;
  created_at: string | null;
  comment_language?: string | null;
  is_author_liked?: boolean | null;
  aweme_id?: string | null;
  parent_source_comment_id?: string | null;
  media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  media_mirror_status?: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    display_name?: string | null;
    url?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    region?: string | null;
    language?: string | null;
  };
}

interface ThreadedComment extends Comment {
  replies: ThreadedComment[];
}

interface QuoteComment {
  comment_id: string;
  author: string;
  display_name?: string;
  text: string;
  likes: number;
  retweets?: number;
  reply_count?: number;
  quotes?: number;
  views?: number;
  is_reply: boolean;
  media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  thumbnail_url?: string | null;
  created_at: string | null;
  user?: {
    id?: string | null;
    username?: string | null;
    display_name?: string | null;
    url?: string | null;
    avatar_url?: string | null;
  };
}

interface BasePost {
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  engagement: number;
  total_comments_available: number;
  comments: Comment[];
  dislikes?: number;
  downvotes?: number;
  upvotes?: number;
  source_media_urls?: string[] | null;
  source_thumbnail_url?: string | null;
  hosted_media_urls?: string[] | null;
  hosted_thumbnail_url?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  cover_source?: string | null;
  cover_source_confidence?: string | null;
}

interface InstagramPost extends BasePost {
  likes: number;
  comments_count: number;
  views: number;
  media_type?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions: string[];
  duration_seconds?: number | null;
}

interface TikTokPost extends BasePost {
  nickname: string;
  likes: number;
  comments_count: number;
  shares: number;
  saves?: number;
  views: number;
  hashtags: string[];
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  mentions: string[];
}

interface YouTubePost extends BasePost {
  title: string;
  views: number;
  likes: number;
  comments_count: number;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  is_short?: boolean;
}

interface TwitterPost extends BasePost {
  display_name: string;
  likes: number;
  retweets: number;
  replies_count: number;
  quotes: number;
  views: number;
  hashtags: string[];
  mentions: string[];
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  total_quotes_in_db?: number;
}

interface FacebookPost extends BasePost {
  likes: number;
  comments_count: number;
  shares: number;
  views: number;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  post_type?: string | null;
}

interface ThreadsPost extends BasePost {
  likes: number;
  replies_count: number;
  reposts: number;
  quotes: number;
  views: number;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
}

type AnyPost = InstagramPost | TikTokPost | YouTubePost | TwitterPost | FacebookPost | ThreadsPost;

interface PlatformData {
  posts: AnyPost[];
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
}

interface WeekDetailResponse {
  week: {
    week_index: number;
    label: string;
    start: string;
    end: string;
  };
  season: {
    season_id: string;
    show_id: string;
    show_name: string | null;
    show_slug: string | null;
    season_number: number;
  };
  source_scope: string;
  platforms: Record<string, PlatformData>;
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
  pagination?: {
    limit: number;
    offset: number;
    returned: number;
    total: number;
    has_more: boolean;
  };
}

interface PostDetailResponse {
  platform: string;
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  title?: string;
  display_name?: string;
  thumbnail_url?: string | null;
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
  cover_source?: string | null;
  cover_source_confidence?: string | null;
  post_format?: "reel" | "post" | "carousel" | null;
  profile_tags?: string[];
  collaborators?: string[];
  hashtags?: string[];
  mentions?: string[];
  duration_seconds?: number | null;
  stats: Record<string, number>;
  total_comments_in_db: number;
  total_quotes_in_db?: number;
  comments: ThreadedComment[];
  quotes?: QuoteComment[];
}

interface SocialJob {
  id: string;
  run_id?: string | null;
  platform: string;
  status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  job_type?: string;
  items_found?: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface SocialRun {
  id: string;
  status: "queued" | "pending" | "retrying" | "running" | "completed" | "failed" | "cancelled";
  source_scope?: string;
  config?: Record<string, unknown>;
  summary?: {
    total_jobs?: number;
    completed_jobs?: number;
    failed_jobs?: number;
    active_jobs?: number;
    items_found_total?: number;
    stage_counts?: Record<
      string,
      {
        total?: number;
        completed?: number;
        failed?: number;
        active?: number;
      }
    >;
  };
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
}

interface CommentsCoverageResponse {
  total_saved_comments: number;
  total_reported_comments: number;
  coverage_pct: number | null;
  up_to_date: boolean;
  stale_posts_count: number;
  posts_scanned: number;
  by_platform?: Record<
    string,
    {
      saved_comments?: number;
      reported_comments?: number;
      total_saved_comments?: number;
      total_reported_comments?: number;
      coverage_pct: number | null;
      up_to_date: boolean;
      stale_posts_count: number;
      posts_scanned: number;
    }
  >;
}

interface MirrorCoverageResponse {
  up_to_date: boolean;
  needs_mirror_count: number;
  mirrored_count: number;
  failed_count: number;
  partial_count: number;
  pending_count: number;
  posts_scanned: number;
  by_platform?: Record<
    string,
    {
      up_to_date: boolean;
      needs_mirror_count: number;
      mirrored_count: number;
      failed_count: number;
      partial_count: number;
      pending_count: number;
      posts_scanned: number;
    }
  >;
}

interface WorkerHealthPayload {
  queue_enabled?: boolean;
  healthy?: boolean;
  healthy_workers?: number;
  reason?: string | null;
}

type PlatformFilter = "all" | "instagram" | "tiktok" | "twitter" | "youtube" | "facebook" | "threads";
type SocialPlatform = Exclude<PlatformFilter, "all">;
type SortField = "engagement" | "likes" | "views" | "comments_count" | "shares" | "retweets" | "posted_at";
type SortDir = "desc" | "asc";
type SourceScope = "bravo" | "creator" | "community";
type SocialMediaType = "image" | "video" | "embed";

interface SocialMediaCandidate {
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  mirrored: boolean;
  originalSrc: string | null;
}

interface SocialStatsItem {
  label: string;
  value: string;
}

interface SocialMediaLightboxEntry {
  id: string;
  src: string;
  mediaType: SocialMediaType;
  posterSrc: string | null;
  alt: string;
  metadata: PhotoMetadata;
  stats: SocialStatsItem[];
}

interface PostDetailMediaFields {
  media_urls?: string[] | null;
  source_media_urls?: string[] | null;
  hosted_media_urls?: string[] | null;
  thumbnail_url?: string | null;
  source_thumbnail_url?: string | null;
  hosted_thumbnail_url?: string | null;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORM_FILTERS: { key: PlatformFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
  { key: "facebook", label: "Facebook" },
  { key: "threads", label: "Threads" },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "views", label: "Views" },
  { key: "comments_count", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "retweets", label: "Reposts" },
  { key: "posted_at", label: "Date" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  tiktok: "bg-gray-100 text-gray-800",
  twitter: "bg-sky-100 text-sky-800",
  youtube: "bg-red-100 text-red-800",
  facebook: "bg-blue-100 text-blue-800",
  threads: "bg-neutral-100 text-neutral-800",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
};
const PLATFORM_HANDLE_FALLBACK: Record<string, string> = {
  youtube: "Bravo",
  facebook: "Bravo",
  threads: "bravotv",
};

const STAT_LABELS: Record<string, string> = {
  likes: "Likes",
  comments_count: "Comments",
  views: "Views",
  shares: "Shares",
  saves: "Saves",
  retweets: "Reposts",
  replies_count: "Replies",
  quotes: "Quotes",
  engagement: "Total Engagement",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value: string): boolean => UUID_RE.test(value);
const ACTIVE_RUN_STATUSES = new Set<SocialRun["status"]>(["queued", "pending", "retrying", "running"]);
const TERMINAL_RUN_STATUSES = new Set<SocialRun["status"]>(["completed", "failed", "cancelled"]);
const SOCIAL_TIME_ZONE = "America/New_York";
const DATE_TOKEN_RE = /^\d{4}-\d{2}-\d{2}$/;
const COMMENT_SYNC_MAX_PASSES = 8;
const COMMENT_SYNC_MAX_DURATION_MS = 90 * 60 * 1000;
const SOCIAL_FULL_SYNC_MIRROR_ENABLED =
  process.env.NEXT_PUBLIC_SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true" ||
  process.env.SOCIAL_FULL_SYNC_MIRROR_ENABLED === "true";
const WEEK_DETAIL_MAX_COMMENTS_PER_POST = 25;
const WEEK_DETAIL_POST_LIMIT = 20;
const REQUEST_TIMEOUT_MS = {
  weekDetail: 45_000,
  syncRuns: 15_000,
  syncJobs: 15_000,
  commentsCoverage: 35_000,
  mirrorCoverage: 35_000,
  workerHealth: 12_000,
} as const;
const SYNC_POLL_BACKOFF_MS = [3_000, 6_000, 10_000, 15_000] as const;
const TRANSIENT_DEV_RESTART_PATTERNS = [
  "failed to fetch",
  "networkerror when attempting to fetch resource",
  "fetch failed",
  "unexpected end of json input",
  "invalid json",
  "load failed",
  "connection closed",
] as const;
const SOCIAL_MEDIA_IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i;
const SOCIAL_MEDIA_VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|m3u8|mpd)(\?|$)/i;
const SOCIAL_MEDIA_HTML_EXT_RE = /\.(html?|php|aspx?)(\?|$)/i;
const SOCIAL_MIRROR_HOST_MARKERS = ["cloudfront.net", "amazonaws.com", "s3.", "therealityreport"];
const SOCIAL_SOURCE_COLORS: Record<string, string> = {
  instagram: "#f43f5e",
  tiktok: "#111827",
  twitter: "#0284c7",
  youtube: "#dc2626",
  facebook: "#1d4ed8",
  threads: "#27272a",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (!error || typeof error !== "object") return false;
  return (error as { name?: string }).name === "AbortError";
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const isTransientDevRestartMessage = (message: string | null | undefined): boolean => {
  const normalized = String(message ?? "").toLowerCase();
  if (!normalized) return false;
  return TRANSIENT_DEV_RESTART_PATTERNS.some((pattern) => normalized.includes(pattern));
};

const buildCanonicalRoute = (relativeUrl: string): string => {
  try {
    const url = new URL(relativeUrl, "http://localhost");
    const sortedParams = new URLSearchParams(url.search);
    sortedParams.sort();
    const query = sortedParams.toString();
    return `${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return relativeUrl;
  }
};

const buildStableRoute = (pathname: string, search: string): string => {
  return buildCanonicalRoute(`${pathname}${search ? `?${search}` : ""}`);
};

const compareAndReplace = (
  router: ReturnType<typeof useRouter>,
  canonicalCurrentRoute: string,
  nextRoute: string,
) => {
  if (buildCanonicalRoute(nextRoute) === canonicalCurrentRoute) return;
  router.replace(nextRoute as Route, { scroll: false });
};

const parseResponseJson = async <T,>(response: Response, fallbackMessage: string): Promise<T> => {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${fallbackMessage}. Response payload unavailable.`);
  }
};

const fmtNum = (n: number | null | undefined): string => {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SOCIAL_TIME_ZONE,
  });
};

const dateTokenFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SOCIAL_TIME_ZONE,
  month: "short",
  day: "numeric",
});

const toLocalDateToken = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = dateTokenFormatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = part.value;
  }
  if (!values.year || !values.month || !values.day) return null;
  return `${values.year}-${values.month}-${values.day}`;
};

const toDayFilterLabel = (token: string | null): string | null => {
  if (!token || !DATE_TOKEN_RE.test(token)) return null;
  const [yearRaw, monthRaw, dayRaw] = token.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return dayLabelFormatter.format(date);
};

function getNum(post: AnyPost, key: string): number {
  return (post as unknown as Record<string, number>)[key] ?? 0;
}

function hasNum(post: AnyPost, key: string): boolean {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "number" && Number.isFinite(val);
}

function getStrArr(post: AnyPost, key: string): string[] {
  const val = (post as unknown as Record<string, unknown>)[key];
  return Array.isArray(val) ? (val as string[]) : [];
}

function getStr(post: AnyPost, key: string): string {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

const HASHTAG_TOKEN_RE = /#([A-Za-z0-9_]+)/g;
const MENTION_TOKEN_RE = /@([A-Za-z0-9_.]+)/g;

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function parseHashtagsFromText(text: string): string[] {
  HASHTAG_TOKEN_RE.lastIndex = 0;
  return dedupeCaseInsensitive(Array.from(text.matchAll(HASHTAG_TOKEN_RE), (match) => match[1] ?? ""));
}

function parseMentionsFromText(text: string): string[] {
  MENTION_TOKEN_RE.lastIndex = 0;
  return dedupeCaseInsensitive(Array.from(text.matchAll(MENTION_TOKEN_RE), (match) => `@${match[1] ?? ""}`));
}

function normalizeHashtagTokens(values: string[]): string[] {
  return dedupeCaseInsensitive(
    values.map((value) => value.trim().replace(/^#+/, "")).filter((value) => value.length > 0),
  );
}

function normalizeMentionTokens(values: string[]): string[] {
  return dedupeCaseInsensitive(
    values
      .map((value) => value.trim().replace(/^@+/, ""))
      .filter((value) => value.length > 0)
      .map((value) => `@${value}`),
  );
}

function getPostHashtags(post: AnyPost): string[] {
  const stored = normalizeHashtagTokens(getStrArr(post, "hashtags"));
  if (stored.length > 0) return stored;
  return parseHashtagsFromText(getStr(post, "text"));
}

function getPostMentions(post: AnyPost): string[] {
  const stored = normalizeMentionTokens(getStrArr(post, "mentions"));
  if (stored.length > 0) return stored;
  return parseMentionsFromText(getStr(post, "text"));
}

function getActualCommentsForPost(platform: string, post: AnyPost): number {
  if (platform === "twitter" || platform === "threads") {
    return Math.max(0, getNum(post, "replies_count"));
  }
  return Math.max(0, getNum(post, "comments_count"));
}

function getSavedCommentsForPost(post: AnyPost): number {
  const value = Number(post.total_comments_available ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function formatSavedVsActualComments(saved: number, actual: number): string {
  return `${fmtNum(saved)}/${fmtNum(actual)}`;
}

function isCommentsCoverageIncomplete(saved: number, actual: number): boolean {
  return saved < actual;
}

function toEffectiveCommentCoverage(saved: number, actual: number): {
  saved: number;
  actual: number;
  incomplete: boolean;
} {
  const normalizedSaved = Number.isFinite(saved) ? Math.max(0, saved) : 0;
  const normalizedActual = Number.isFinite(actual) ? Math.max(0, actual) : 0;
  const effectiveSaved = Math.min(normalizedSaved, normalizedActual);
  return {
    saved: effectiveSaved,
    actual: normalizedActual,
    incomplete: isCommentsCoverageIncomplete(effectiveSaved, normalizedActual),
  };
}

function getCoverageEntryCounts(
  entry:
    | {
        saved_comments?: number;
        reported_comments?: number;
        total_saved_comments?: number;
        total_reported_comments?: number;
      }
    | null
    | undefined,
): { saved: number; actual: number } {
  const rawSaved = Number(entry?.saved_comments ?? entry?.total_saved_comments ?? 0);
  const rawActual = Number(entry?.reported_comments ?? entry?.total_reported_comments ?? 0);
  return {
    saved: Number.isFinite(rawSaved) ? Math.max(0, rawSaved) : 0,
    actual: Number.isFinite(rawActual) ? Math.max(0, rawActual) : 0,
  };
}

function parseSocialPlatform(value: string | null | undefined): SocialPlatform | null {
  if (
    value === "instagram" ||
    value === "tiktok" ||
    value === "twitter" ||
    value === "youtube" ||
    value === "facebook" ||
    value === "threads"
  ) {
    return value;
  }
  return null;
}

function formatCoverageLabel(saved: number, actual: number): string {
  const pct = actual > 0 ? Math.max(0, Math.min(100, (saved / actual) * 100)) : 100;
  return `${fmtNum(saved)}/${fmtNum(actual)} (${pct.toFixed(1)}%)`;
}

function formatMirrorCoverageLabel(readyCount: number, total: number): string {
  const pct = total > 0 ? Math.max(0, Math.min(100, (readyCount / total) * 100)) : 100;
  return `${fmtNum(readyCount)}/${fmtNum(total)} (${pct.toFixed(1)}%)`;
}

function getReportedCommentCountFromStats(platform: string, stats: Record<string, number>): number {
  const raw =
    platform === "twitter" || platform === "threads"
      ? Number(stats.replies_count ?? stats.comments_count ?? 0)
      : Number(stats.comments_count ?? 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, raw);
}

function getPostThumbnailUrl(platform: string, post: AnyPost): string | null {
  const hostedThumbnail = getStr(post, "hosted_thumbnail_url");
  if (hostedThumbnail) return hostedThumbnail;

  if (platform === "twitter") {
    const thumbnail = getStr(post, "thumbnail_url");
    if (thumbnail) return thumbnail;
    const hostedMediaUrls = getStrArr(post, "hosted_media_urls");
    if (hostedMediaUrls[0]) return hostedMediaUrls[0];
    const mediaUrls = getStrArr(post, "media_urls");
    return mediaUrls[0] || null;
  }
  if (platform === "youtube") return getStr(post, "thumbnail_url") || null;
  if (platform === "instagram") {
    const thumbnail = getStr(post, "thumbnail_url");
    if (thumbnail) return thumbnail;
    const hostedMediaUrls = getStrArr(post, "hosted_media_urls");
    if (hostedMediaUrls[0]) return hostedMediaUrls[0];
    const mediaUrls = getStrArr(post, "media_urls");
    return mediaUrls[0] || null;
  }
  return getStr(post, "thumbnail_url") || getStrArr(post, "hosted_media_urls")[0] || null;
}

function detectSocialMediaType(url: string): SocialMediaType {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_VIDEO_EXT_RE.test(normalized)) return "video";
  if (isEmbeddableSocialPageUrl(normalized)) return "embed";
  return "image";
}

function isLikelyHtmlDocumentUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  if (SOCIAL_MEDIA_HTML_EXT_RE.test(normalized)) return true;
  return normalized.includes("media-") && normalized.includes(".html");
}

function isEmbeddableSocialPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes("tiktok.com") && path.includes("/video/")) return true;
    if (host.includes("youtube.com") && (path === "/watch" || path.startsWith("/shorts/"))) return true;
    if (host === "youtu.be") return true;
    return false;
  } catch {
    return false;
  }
}

function normalizeSocialMediaCandidateUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function selectPreferredMediaUrlPair(sourceMediaUrlRaw: string | null, hostedMediaUrlRaw: string | null): {
  src: string | null;
  mirrored: boolean;
  originalSrc: string | null;
} {
  const sourceMediaUrl = normalizeSocialMediaCandidateUrl(sourceMediaUrlRaw);
  const hostedMediaUrl = normalizeSocialMediaCandidateUrl(hostedMediaUrlRaw);

  if (sourceMediaUrl && hostedMediaUrl) {
    // When a mirrored URL exists, keep playback anchored to mirrored assets only.
    return {
      src: hostedMediaUrl,
      mirrored: true,
      originalSrc: sourceMediaUrl,
    };
  }

  if (hostedMediaUrl) {
    return {
      src: hostedMediaUrl,
      mirrored: true,
      originalSrc: null,
    };
  }

  if (sourceMediaUrl) {
    return {
      src: sourceMediaUrl,
      mirrored: false,
      originalSrc: sourceMediaUrl,
    };
  }

  return {
    src: null,
    mirrored: false,
    originalSrc: null,
  };
}

function isLikelyMirroredSocialUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.trim().length === 0) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOCIAL_MIRROR_HOST_MARKERS.some((marker) => host.includes(marker));
  } catch {
    return false;
  }
}

function inferMirrorFileNameFromUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split("/").filter(Boolean).pop();
    return fileName ? decodeURIComponent(fileName) : null;
  } catch {
    return null;
  }
}

function normalizeSocialMediaUrlForCompare(url: string | null | undefined): string {
  if (typeof url !== "string" || url.trim().length === 0) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function resolveMediaCandidateIndex(
  candidates: SocialMediaCandidate[],
  preferredSrc: string | null | undefined,
): number {
  if (candidates.length === 0) return 0;
  const normalizedPreferred = normalizeSocialMediaUrlForCompare(preferredSrc ?? "");
  if (!normalizedPreferred) return 0;
  const matchIndex = candidates.findIndex((candidate) => {
    if (normalizeSocialMediaUrlForCompare(candidate.src) === normalizedPreferred) return true;
    if (normalizeSocialMediaUrlForCompare(candidate.originalSrc ?? "") === normalizedPreferred) return true;
    return false;
  });
  return matchIndex >= 0 ? matchIndex : 0;
}

function formatInstagramCoverSourceLabel(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "custom_cover") return "Custom Cover Photo";
  if (normalized === "still_frame_or_default") return "Still Frame / Default Cover";
  if (normalized === "unknown") return "Unknown";
  return normalized.replaceAll("_", " ");
}

function buildMirrorScopeLabel(post: AnyPost): string {
  const sourceCount = getStrArr(post, "source_media_urls").length || getStrArr(post, "media_urls").length;
  const hostedCount = getStrArr(post, "hosted_media_urls").length;
  const hasHostedThumbnail = Boolean(getStr(post, "hosted_thumbnail_url"));
  if (hostedCount > 0 && sourceCount > 0 && hostedCount >= sourceCount) return "Media + thumbnail mirrored";
  if (hostedCount > 0 && sourceCount > 0) return `Partial media mirrored (${hostedCount}/${sourceCount})`;
  if (hostedCount > 0) return "Media mirrored";
  if (hasHostedThumbnail) return "Thumbnail mirrored only";
  return "Platform-hosted media";
}

function getPostMediaCandidates(platform: string, post: AnyPost): SocialMediaCandidate[] {
  const sourceMediaUrls = getStrArr(post, "source_media_urls").length
    ? getStrArr(post, "source_media_urls")
    : getStrArr(post, "media_urls");
  const hostedMediaUrls = getStrArr(post, "hosted_media_urls");
  const sourceThumbnail = getStr(post, "source_thumbnail_url") || getStr(post, "thumbnail_url");
  const hostedThumbnail = getStr(post, "hosted_thumbnail_url");
  const thumbnail = getPostThumbnailUrl(platform, post);
  const candidates: SocialMediaCandidate[] = [];
  const seen = new Set<string>();

  const candidateCount = Math.max(sourceMediaUrls.length, hostedMediaUrls.length);
  for (let index = 0; index < candidateCount; index += 1) {
    const sourceMediaUrl = sourceMediaUrls[index] ?? null;
    const hostedMediaUrl = hostedMediaUrls[index] ?? null;
    const candidate = selectPreferredMediaUrlPair(sourceMediaUrl, hostedMediaUrl);
    const normalized = normalizeSocialMediaCandidateUrl(candidate.src);
    if (!normalized) continue;
    const mirrored = candidate.mirrored || isLikelyMirroredSocialUrl(normalized);
    if (mirrored && isLikelyHtmlDocumentUrl(normalized)) continue;
    const dedupeKey = normalizeSocialMediaUrlForCompare(normalized);
    if (dedupeKey && seen.has(dedupeKey)) continue;
    seen.add(dedupeKey || normalized);
    candidates.push({
      src: normalized,
      mediaType: detectSocialMediaType(normalized),
      posterSrc: thumbnail,
      mirrored,
      originalSrc: mirrored ? candidate.originalSrc : candidate.originalSrc ?? null,
    });
  }

  if (thumbnail) {
    const thumbnailDedupeKey = normalizeSocialMediaUrlForCompare(thumbnail);
    if (thumbnailDedupeKey && seen.has(thumbnailDedupeKey)) {
      return candidates;
    }
    seen.add(thumbnailDedupeKey || thumbnail);
    const mirrored = Boolean(hostedThumbnail) || isLikelyMirroredSocialUrl(thumbnail);
    candidates.push({
      src: thumbnail,
      mediaType: "image",
      posterSrc: thumbnail,
      mirrored,
      originalSrc: mirrored ? sourceThumbnail : sourceThumbnail ?? null,
    });
  }

  return candidates;
}

function pickFirstVideoUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (detectSocialMediaType(value) === "video") return value;
  }
  return null;
}

function pickFirstEmbeddableUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (detectSocialMediaType(value) === "embed") return value;
  }
  return null;
}

function pickFirstNonHtmlUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (!value) continue;
    if (!isLikelyHtmlDocumentUrl(value)) return value;
  }
  return null;
}

function pickFirstUrl(urls: Array<string | null | undefined>): string | null {
  for (const raw of urls) {
    const value = normalizeSocialMediaCandidateUrl(raw);
    if (value) return value;
  }
  return null;
}

function getPreferredPostDetailMediaSrc(data: PostDetailMediaFields): string | null {
  const hostedMediaUrls = data.hosted_media_urls ?? [];
  if (hostedMediaUrls.length > 0) {
    const hostedVideoCandidate = pickFirstVideoUrl(hostedMediaUrls);
    if (hostedVideoCandidate) return hostedVideoCandidate;

    const hostedNonHtmlCandidate = pickFirstNonHtmlUrl(hostedMediaUrls);
    if (hostedNonHtmlCandidate) return hostedNonHtmlCandidate;

    return pickFirstUrl([
      data.hosted_thumbnail_url,
      data.thumbnail_url,
      data.source_thumbnail_url,
    ]);
  }

  const videoCandidate = pickFirstVideoUrl([...(data.source_media_urls ?? []), ...(data.media_urls ?? [])]);
  if (videoCandidate) return videoCandidate;
  const embedCandidate = pickFirstEmbeddableUrl([...(data.source_media_urls ?? []), ...(data.media_urls ?? [])]);
  if (embedCandidate) return embedCandidate;
  return pickFirstUrl([
    ...(data.source_media_urls ?? []),
    ...(data.media_urls ?? []),
    data.hosted_thumbnail_url,
    data.thumbnail_url,
    data.source_thumbnail_url,
  ]);
}

function getPostDetailThumbnailUrl(data: PostDetailMediaFields): string | null {
  return pickFirstUrl([
    data.hosted_thumbnail_url,
    data.thumbnail_url,
    data.source_thumbnail_url,
    ...(data.hosted_media_urls ?? []),
    ...(data.media_urls ?? []),
    ...(data.source_media_urls ?? []),
  ]);
}

function mergePostWithDetailMedia(post: AnyPost, detailMedia: PostDetailMediaFields | null | undefined): AnyPost {
  if (!detailMedia) return post;
  return {
    ...post,
    media_urls: detailMedia.media_urls ?? post.media_urls ?? null,
    source_media_urls: detailMedia.source_media_urls ?? post.source_media_urls ?? null,
    hosted_media_urls: detailMedia.hosted_media_urls ?? post.hosted_media_urls ?? null,
    thumbnail_url: detailMedia.thumbnail_url ?? post.thumbnail_url ?? null,
    source_thumbnail_url: detailMedia.source_thumbnail_url ?? post.source_thumbnail_url ?? null,
    hosted_thumbnail_url: detailMedia.hosted_thumbnail_url ?? post.hosted_thumbnail_url ?? null,
  } as AnyPost;
}

function inferFileExtensionFromUrl(url: string): string | null {
  const imageMatch = url.match(SOCIAL_MEDIA_IMAGE_EXT_RE);
  if (imageMatch?.[1]) return imageMatch[1].toLowerCase();
  const videoMatch = url.match(SOCIAL_MEDIA_VIDEO_EXT_RE);
  if (videoMatch?.[1]) return videoMatch[1].toLowerCase();
  return null;
}

const PLATFORM_FILE_NAME_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
  facebook: "Facebook",
  threads: "Threads",
};

function computeDailyPostNumber(
  platform: string,
  post: AnyPost,
  allPlatformPosts: AnyPost[],
): number {
  if (!post.posted_at) return 1;
  const postDate = new Date(post.posted_at);
  if (Number.isNaN(postDate.getTime())) return 1;
  const postDay = postDate.toISOString().slice(0, 10);
  const postAuthor = (post.author || "").toLowerCase().replace(/^@/, "");

  const sameDayPosts = allPlatformPosts
    .filter((p) => {
      const pDate = p.posted_at ? new Date(p.posted_at) : null;
      if (!pDate || Number.isNaN(pDate.getTime())) return false;
      const pDay = pDate.toISOString().slice(0, 10);
      const pAuthor = (p.author || "").toLowerCase().replace(/^@/, "");
      return pDay === postDay && pAuthor === postAuthor;
    })
    .sort((a, b) => {
      const aTime = new Date(a.posted_at!).getTime();
      const bTime = new Date(b.posted_at!).getTime();
      return aTime - bTime || a.source_id.localeCompare(b.source_id);
    });

  const index = sameDayPosts.findIndex((p) => p.source_id === post.source_id);
  return index >= 0 ? index + 1 : 1;
}

function buildPostDisplayName(
  showSlug: string | null | undefined,
  username: string,
  platform: string,
  postNumber: number,
): string {
  const slug = (showSlug || "").replace(/[^A-Za-z0-9]/g, "");
  const sanitizedUser = username.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  const platformLabel = PLATFORM_FILE_NAME_LABELS[platform] ?? platform;
  return `${slug}${sanitizedUser}${platformLabel}Post${postNumber}`;
}

function buildSocialPostMetadata({
  platform,
  post,
  media,
  showName,
  showSlug,
  seasonNumber,
  weekLabel,
  sourceScope,
  allPlatformPosts,
  mediaIndex,
  totalMediaCount,
  isThumbnailEntry,
}: {
  platform: string;
  post: AnyPost;
  media: SocialMediaCandidate;
  showName: string | null | undefined;
  showSlug: string | null | undefined;
  seasonNumber: number | null;
  weekLabel: string | null;
  sourceScope: SourceScope;
  allPlatformPosts: AnyPost[];
  mediaIndex: number;
  totalMediaCount: number;
  isThumbnailEntry: boolean;
}): PhotoMetadata {
  const postedDate =
    typeof post.posted_at === "string" && post.posted_at.trim().length > 0
      ? new Date(post.posted_at)
      : null;
  const validPostedDate =
    postedDate && !Number.isNaN(postedDate.getTime()) ? postedDate : null;
  const sourceLabel = PLATFORM_LABELS[platform] ?? platform;
  const title = getStr(post, "title");
  const caption = title || post.text || null;
  const sourcePageTitle = title || caption || `${sourceLabel} post`;
  const sectionLabel = weekLabel ? `${sourceLabel} · ${weekLabel}` : sourceLabel;
  const fileType = inferFileExtensionFromUrl(media.src);
  const isS3Mirrored = media.mirrored || isLikelyMirroredSocialUrl(media.src);
  const mirrorFileName = isS3Mirrored ? inferMirrorFileNameFromUrl(media.src) : null;
  const originalMediaUrl = media.originalSrc ?? (!isS3Mirrored ? media.src : null);

  const postNumber = computeDailyPostNumber(platform, post, allPlatformPosts);
  const displayName = buildPostDisplayName(showSlug, post.author, platform, postNumber);
  let assetSuffix = "";
  if (isThumbnailEntry) {
    assetSuffix = "_Thumbnail";
  } else if (totalMediaCount > 1) {
    assetSuffix = `_S${mediaIndex + 1}`;
  }

  return {
    source: sourceLabel,
    sourceBadgeColor: SOCIAL_SOURCE_COLORS[platform] ?? "#71717a",
    isS3Mirrored,
    s3MirrorFileName: mirrorFileName,
    originalImageUrl: originalMediaUrl,
    originalSourceFileUrl: originalMediaUrl,
    originalSourcePageUrl: post.url || null,
    originalSourceLabel: sourceLabel,
    fileType,
    createdAt: validPostedDate,
    addedAt: validPostedDate,
    hasTextOverlay: null,
    contentType: media.mediaType === "video" || media.mediaType === "embed" ? "OTHER" : "PROMO",
    sectionTag: "OTHER",
    sectionLabel,
    sourceLogo: sourceScope.toUpperCase(),
    assetName: `${displayName}${assetSuffix}`,
    imdbType: null,
    episodeLabel: weekLabel,
    sourceVariant: sourceScope.toUpperCase(),
    sourcePageTitle,
    sourceUrl: post.url || media.src,
    faceBoxes: [],
    peopleCount: null,
    caption,
    dimensions: null,
    season: seasonNumber,
    contextType: "social_post_media",
    people: [],
    titles: [showName, title].filter((value): value is string => Boolean(value && value.trim())),
    fetchedAt: validPostedDate,
    galleryStatus: null,
    galleryStatusReason: null,
    galleryStatusCheckedAt: null,
  };
}

function buildSocialStats(platform: string, post: AnyPost): SocialStatsItem[] {
  const stats: SocialStatsItem[] = [
    { label: "Platform", value: PLATFORM_LABELS[platform] ?? platform },
    { label: "Engagement", value: fmtNum(Number(post.engagement ?? 0)) },
    {
      label: platform === "twitter" || platform === "threads" ? "Replies" : "Comments",
      value: formatSavedVsActualComments(getSavedCommentsForPost(post), getActualCommentsForPost(platform, post)),
    },
  ];

  if (hasNum(post, "likes")) stats.push({ label: "Likes", value: fmtNum(getNum(post, "likes")) });
  if (hasNum(post, "views")) stats.push({ label: "Views", value: fmtNum(getNum(post, "views")) });
  if (hasNum(post, "shares")) stats.push({ label: "Shares", value: fmtNum(getNum(post, "shares")) });
  if (hasNum(post, "saves")) stats.push({ label: "Saves", value: fmtNum(getNum(post, "saves")) });
  if (hasNum(post, "retweets")) stats.push({ label: "Reposts", value: fmtNum(getNum(post, "retweets")) });
  if (hasNum(post, "reposts")) stats.push({ label: "Reposts", value: fmtNum(getNum(post, "reposts")) });
  if (hasNum(post, "quotes")) stats.push({ label: "Quotes", value: fmtNum(getNum(post, "quotes")) });
  if (hasNum(post, "duration_seconds")) {
    stats.push({ label: "Duration", value: `${fmtNum(getNum(post, "duration_seconds"))}s` });
  }
  stats.push({ label: "Mirror", value: buildMirrorScopeLabel(post) });
  if (platform === "instagram") {
    const coverSourceLabel = formatInstagramCoverSourceLabel(getStr(post, "cover_source"));
    if (coverSourceLabel) {
      const confidence = getStr(post, "cover_source_confidence");
      stats.push({
        label: "Cover Source",
        value: confidence ? `${coverSourceLabel} (${confidence})` : coverSourceLabel,
      });
    }
  }

  return stats;
}

function getPlatformIconKey(platform: string): SocialPlatformTabIconKey | null {
  if (
    platform === "instagram" ||
    platform === "tiktok" ||
    platform === "twitter" ||
    platform === "youtube" ||
    platform === "facebook" ||
    platform === "threads"
  ) {
    return platform;
  }
  return null;
}

function formatPostHandle(platform: string, author: string): string {
  const normalized = String(author || "").trim().replace(/^@+/, "");
  if (normalized) return `@${normalized}`;
  const fallback = PLATFORM_HANDLE_FALLBACK[platform];
  if (fallback) return `@${fallback}`;
  return "@unknown";
}

function getJobStage(job: SocialJob): string {
  if (typeof job.config?.stage === "string" && job.config.stage) return job.config.stage;
  if (typeof job.metadata?.stage === "string" && job.metadata.stage) return job.metadata.stage;
  if (typeof job.job_type === "string" && job.job_type) return job.job_type;
  return "posts";
}

function getJobStageCounters(job: SocialJob): { posts: number; comments: number } | null {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.stage_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts === "number";
  const hasComments = typeof counters?.comments === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts: Number(counters?.posts ?? 0),
    comments: Number(counters?.comments ?? 0),
  };
}

function getJobPersistCounters(job: SocialJob): { posts_upserted: number; comments_upserted: number } | null {
  const counters = (job.metadata as Record<string, unknown> | undefined)?.persist_counters as
    | Record<string, unknown>
    | undefined;
  const hasPosts = typeof counters?.posts_upserted === "number";
  const hasComments = typeof counters?.comments_upserted === "number";
  if (!hasPosts && !hasComments) return null;
  return {
    posts_upserted: Number(counters?.posts_upserted ?? 0),
    comments_upserted: Number(counters?.comments_upserted ?? 0),
  };
}

function getJobActivity(job: SocialJob): Record<string, unknown> | null {
  const activity = (job.metadata as Record<string, unknown> | undefined)?.activity as
    | Record<string, unknown>
    | undefined;
  if (!activity || typeof activity !== "object") return null;
  return activity;
}

function getJobActivitySummary(job: SocialJob): string {
  const activity = getJobActivity(job);
  if (!activity) return "";
  const parts: string[] = [];
  if (typeof activity.phase === "string" && activity.phase.trim()) {
    parts.push(activity.phase.replaceAll("_", " "));
  }
  if (typeof activity.pages_scanned === "number") {
    parts.push(`${activity.pages_scanned}pg`);
  }
  if (typeof activity.posts_checked === "number") {
    parts.push(`${activity.posts_checked}chk`);
  }
  if (typeof activity.matched_posts === "number") {
    parts.push(`${activity.matched_posts}match`);
  }
  return parts.join(" · ");
}

function formatRunStatus(status: SocialRun["status"]): string {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

const MAX_THREADED_COMMENT_DEPTH = 128;

/* ------------------------------------------------------------------ */
/* Threaded comment component                                          */
/* ------------------------------------------------------------------ */

function ThreadedCommentItem({
  comment,
  depth = 0,
  seenCommentIds = new Set<string>(),
}: {
  comment: ThreadedComment;
  depth?: number;
  seenCommentIds?: ReadonlySet<string>;
}) {
  const commentId = comment.comment_id;
  const visited = useMemo(() => {
    const next = new Set<string>(seenCommentIds);
    if (commentId) next.add(commentId);
    return next;
  }, [seenCommentIds, commentId]);
  const [expanded, setExpanded] = useState(depth < 2);
  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const hasReplies = replies.length > 0;
  const visibleReplies = replies.filter((reply) => !visited.has(reply.comment_id));
  const suppressedReplies = replies.length - visibleReplies.length;
  const hasDepthBudget = depth < MAX_THREADED_COMMENT_DEPTH;
  if (commentId && seenCommentIds.has(commentId)) {
    return (
      <div className="ml-4 border-l-2 border-amber-200 pl-3 py-2 text-xs text-amber-700">
        Recursion guard: comment already rendered in this thread.
      </div>
    );
  }
  const hostedMedia = Array.isArray(comment.hosted_media_urls) ? comment.hosted_media_urls : [];
  const sourceMedia = Array.isArray(comment.media_urls) ? comment.media_urls : [];
  const mediaUrls = (hostedMedia.length > 0 ? hostedMedia : sourceMedia).filter((url) => !!url);
  const avatarUrl =
    (typeof comment.user?.avatar_url === "string" ? comment.user.avatar_url : "") ||
    null;
  const displayHandle =
    (typeof comment.user?.username === "string" ? comment.user.username : "") ||
    comment.author ||
    "unknown";
  const displayName =
    (typeof comment.user?.display_name === "string" ? comment.user.display_name : "") ||
    "";
  const isImageUrl = (url: string): boolean =>
    /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.includes("image-origin");

  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-gray-100" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`@${displayHandle} avatar`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-5 w-5 rounded-full object-cover border border-gray-200"
            />
          ) : null}
          <span className="font-medium text-gray-700">@{displayHandle}</span>
          {displayName ? <span className="text-gray-500">({displayName})</span> : null}
          {comment.created_at && <span>{fmtDateTime(comment.created_at)}</span>}
          {comment.likes > 0 && (
            <span className="font-medium text-gray-600">{fmtNum(comment.likes)} likes</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
          {comment.text}
        </p>
        {mediaUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediaUrls.map((mediaUrl, index) => (
              <a
                key={`${comment.comment_id}-media-${index + 1}`}
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Comment media ${index + 1}`}
                className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
              >
                {isImageUrl(mediaUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt={`Comment media ${index + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded object-cover"
                  />
                ) : (
                  `Comment media ${index + 1}`
                )}
              </a>
            ))}
          </div>
        )}
        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {expanded ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {expanded && hasReplies && hasDepthBudget && (
        <div>
          {visibleReplies.map((reply) => (
            <ThreadedCommentItem
              key={reply.comment_id}
              comment={reply}
              depth={depth + 1}
              seenCommentIds={visited}
            />
          ))}
          {suppressedReplies > 0 ? (
            <p className="ml-4 border-l-2 border-amber-200 pl-3 py-1 text-xs text-amber-700">
              {suppressedReplies} nested replies skipped due to thread cycle.
            </p>
          ) : null}
        </div>
      )}
      {expanded && hasReplies && !hasDepthBudget ? (
        <p className="ml-4 border-l-2 border-amber-200 pl-3 py-1 text-xs text-amber-700">
          Max thread depth reached. {replies.length} {replies.length === 1 ? "reply" : "replies"} hidden.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Details Drawer                                                 */
/* ------------------------------------------------------------------ */

function PostStatsDrawer({
  showId,
  seasonNumber,
  seasonId,
  platform,
  sourceId,
  onOpenMediaLightbox,
  onClose,
}: {
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
  platform: string;
  sourceId: string;
  onOpenMediaLightbox?: ((preferredSrc?: string | null, detailMedia?: PostDetailMediaFields | null) => void) | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [twitterCommentMode, setTwitterCommentMode] = useState<"comments_replies" | "quotes">("comments_replies");

  const fetchPostStats = useCallback(async (): Promise<PostDetailResponse> => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (seasonId) {
      params.set("season_id", seasonId);
    }
    const baseUrl = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}`;
    const url = `${baseUrl}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
    const res = await fetchWithTimeout(
      url,
      {
        headers,
        cache: "no-store",
      },
      REQUEST_TIMEOUT_MS.weekDetail,
      "Post detail request timed out",
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as Record<string, string>).error || `HTTP ${res.status}`,
      );
    }
    return await parseResponseJson<PostDetailResponse>(res, "Failed to load post detail");
  }, [seasonId, seasonNumber, showId, platform, sourceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchPostStats();
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPostStats]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setTwitterCommentMode("comments_replies");
  }, [platform, sourceId]);

  const handleRefreshComments = useCallback(async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (seasonId) {
      params.set("season_id", seasonId);
    }
    const baseUrl = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}`;
    const url = `${baseUrl}/refresh${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            max_comments_per_post: 100000,
            fetch_replies: true,
          }),
        },
        REQUEST_TIMEOUT_MS.weekDetail,
        "Post comments refresh request timed out",
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as Record<string, string>).error || `HTTP ${res.status}`);
      }
      setData(await parseResponseJson<PostDetailResponse>(res, "Failed to refresh post comments"));
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Failed to refresh comments");
    } finally {
      setRefreshing(false);
    }
  }, [seasonId, showId, seasonNumber, platform, sourceId]);

  const reportedCommentsCount = data
    ? getReportedCommentCountFromStats(data.platform, data.stats)
    : 0;
  const savedCommentsCount = data ? Math.max(0, Number(data.total_comments_in_db ?? 0)) : 0;
  const commentsIncomplete = isCommentsCoverageIncomplete(savedCommentsCount, reportedCommentsCount);
  const isTwitterPost = data?.platform === "twitter";
  const twitterQuoteCount = data ? Math.max(0, Number(data.total_quotes_in_db ?? 0)) : 0;
  const quoteCommentsAsThreaded: ThreadedComment[] = (data?.quotes ?? []).map((quote) => ({
    comment_id: quote.comment_id,
    author: quote.author,
    text: quote.text,
    likes: Number(quote.likes ?? 0),
    is_reply: false,
    reply_count: Number(quote.reply_count ?? 0),
    created_at: quote.created_at,
    media_urls: quote.media_urls ?? undefined,
    hosted_media_urls: quote.hosted_media_urls ?? undefined,
    user: {
      id: quote.user?.id ?? null,
      username: quote.user?.username ?? quote.author ?? null,
      display_name: quote.user?.display_name ?? quote.display_name ?? null,
      url: quote.user?.url ?? null,
      avatar_url: quote.user?.avatar_url ?? null,
    },
    replies: [],
  }));
  const activeComments =
    isTwitterPost && twitterCommentMode === "quotes"
      ? quoteCommentsAsThreaded
      : (data?.comments ?? []);
  const drawerThumbnailUrl = data ? getPostDetailThumbnailUrl(data) : null;
  const preferredDrawerMediaSrc = data ? getPreferredPostDetailMediaSrc(data) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Post Details</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshComments}
              disabled={refreshing}
              className="text-xs font-semibold tracking-wide px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "REFRESH"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-center text-gray-500 py-12">Loading all comments...</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}
          {refreshError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
              {refreshError}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Post info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[data.platform] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {PLATFORM_LABELS[data.platform] ?? data.platform}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    @{data.author}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDateTime(data.posted_at)}</span>
                </div>
                {drawerThumbnailUrl && (
                  <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {onOpenMediaLightbox ? (
                      <button
                        type="button"
                        onClick={() => onOpenMediaLightbox(preferredDrawerMediaSrc ?? drawerThumbnailUrl, data)}
                        className="block w-full"
                        aria-label="Open post media lightbox from details"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={drawerThumbnailUrl}
                          alt={`${PLATFORM_LABELS[data.platform] ?? data.platform} post thumbnail`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="max-h-[360px] w-full object-contain bg-black/5"
                        />
                      </button>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={drawerThumbnailUrl}
                          alt={`${PLATFORM_LABELS[data.platform] ?? data.platform} post thumbnail`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="max-h-[360px] w-full object-contain bg-black/5"
                        />
                      </>
                    )}
                  </div>
                )}
                {data.title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{data.title}</h3>
                )}
                {data.text && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
                    {data.text}
                  </p>
                )}
                {data.platform === "instagram" && (
                  <div className="mb-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {data.post_format && (
                        <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                          {data.post_format.toUpperCase()}
                        </span>
                      )}
                      {typeof data.duration_seconds === "number" && data.duration_seconds > 0 && (
                        <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                          {data.duration_seconds}s
                        </span>
                      )}
                      {formatInstagramCoverSourceLabel(data.cover_source) && (
                        <span className="text-xs rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                          Cover: {formatInstagramCoverSourceLabel(data.cover_source)}
                          {data.cover_source_confidence ? ` (${data.cover_source_confidence})` : ""}
                        </span>
                      )}
                    </div>
                    {(data.profile_tags?.length || data.collaborators?.length) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(data.profile_tags ?? []).map((tag) => (
                          <span key={`profile-${tag}`} className="text-xs rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                            {tag}
                          </span>
                        ))}
                        {(data.collaborators ?? []).map((collab) => (
                          <span key={`collab-${collab}`} className="text-xs rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                            {collab}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {(data.hashtags?.length || data.mentions?.length) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(data.hashtags ?? []).map((tag) => (
                          <span key={`hashtag-${tag}`} className="text-xs rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                            #{tag}
                          </span>
                        ))}
                        {(data.mentions ?? []).map((mention) => (
                          <span key={`mention-${mention}`} className="text-xs rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
                            {mention}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View on {PLATFORM_LABELS[data.platform] ?? data.platform} ↗
                  </a>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(data.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="text-lg font-bold text-gray-900">{fmtNum(value)}</div>
                    <div className="text-xs text-gray-500">{STAT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>

              {/* Comments section */}
              <div className="border-t border-gray-200 pt-4">
                {isTwitterPost ? (
                  <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      aria-pressed={twitterCommentMode === "comments_replies"}
                      onClick={() => setTwitterCommentMode("comments_replies")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        twitterCommentMode === "comments_replies"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                      }`}
                    >
                      Comments & Replies
                    </button>
                    <button
                      type="button"
                      aria-pressed={twitterCommentMode === "quotes"}
                      onClick={() => setTwitterCommentMode("quotes")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        twitterCommentMode === "quotes"
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                      }`}
                    >
                      Quotes
                    </button>
                  </div>
                ) : null}

                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {isTwitterPost && twitterCommentMode === "quotes"
                    ? `All Quotes (${fmtNum(twitterQuoteCount)})`
                    : `All Comments (${formatSavedVsActualComments(savedCommentsCount, reportedCommentsCount)}${
                        commentsIncomplete ? "*" : ""
                      })`}
                </h3>
                {isTwitterPost && twitterCommentMode === "quotes" ? (
                  <p className="text-xs text-gray-500 mb-3">{fmtNum(twitterQuoteCount)} quotes saved in Supabase.</p>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">
                {commentsIncomplete
                    ? `Saved in Supabase: ${fmtNum(savedCommentsCount)} of ${fmtNum(reportedCommentsCount)} platform-reported comments. Run an Ingest in Week view (or open the row details for a post-level refresh) to backfill.`
                    : `${fmtNum(savedCommentsCount)} comments saved in Supabase.`}
                </p>
                )}

                {activeComments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4">
                    {isTwitterPost && twitterCommentMode === "quotes"
                      ? "No quotes in database."
                      : "No comments in database."}
                  </p>
                ) : (
                  <div className="space-y-1 divide-y divide-gray-100">
                    {activeComments.map((c) => (
                      <ThreadedCommentItem key={c.comment_id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engagement row                                                      */
/* ------------------------------------------------------------------ */

function EngagementRow({ platform, post }: { platform: string; post: AnyPost }) {
  const items: { label: string; value: string }[] = [];
  const savedComments = getSavedCommentsForPost(post);
  const actualComments = getActualCommentsForPost(platform, post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const commentsValue = `${formatSavedVsActualComments(savedComments, actualComments)}${
    commentsCoverageIncomplete ? "*" : ""
  }`;

  const pushMetric = (label: string, value: number) => {
    items.push({ label, value: fmtNum(value) });
  };

  if (platform === "instagram") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "tiktok") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Shares", getNum(post, "shares"));
    pushMetric("Saves", getNum(post, "saves"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "youtube") {
    pushMetric("Views", getNum(post, "views"));
    pushMetric("Likes", getNum(post, "likes"));
    if (hasNum(post, "dislikes")) {
      pushMetric("Dislikes", getNum(post, "dislikes"));
    } else if (hasNum(post, "downvotes")) {
      pushMetric("Downvotes", getNum(post, "downvotes"));
    }
    items.push({ label: "Comments", value: commentsValue });
  } else if (platform === "twitter") {
    pushMetric("Likes", getNum(post, "likes"));
    pushMetric("Reposts", getNum(post, "retweets"));
    items.push({ label: "Replies", value: commentsValue });
    pushMetric("Quotes", getNum(post, "quotes"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "facebook") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Comments", value: commentsValue });
    pushMetric("Shares", getNum(post, "shares"));
    pushMetric("Views", getNum(post, "views"));
  } else if (platform === "threads") {
    pushMetric("Likes", getNum(post, "likes"));
    items.push({ label: "Replies", value: commentsValue });
    pushMetric("Reposts", getNum(post, "reposts"));
    pushMetric("Quotes", getNum(post, "quotes"));
    pushMetric("Views", getNum(post, "views"));
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
      {items.map((item) => (
        <span key={item.label}>
          <span className="font-medium text-gray-800">{item.value}</span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function SocialStatsPanel({ stats }: { stats: SocialStatsItem[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="rounded border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/55">Social Stats</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {stats.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="rounded border border-white/10 bg-black/20 px-2 py-1.5"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/55">{item.label}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/90">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  platform,
  post,
  showId,
  seasonNumber,
  seasonId,
  onOpenMediaLightbox,
}: {
  platform: string;
  post: AnyPost;
  showId: string;
  seasonNumber: string;
  seasonId?: string | null;
  onOpenMediaLightbox?: (
    platform: string,
    post: AnyPost,
    initialIndex?: number,
    preferredSrc?: string | null,
  ) => void;
}) {
  const [statsOpen, setStatsOpen] = useState(false);
  const hashtags = getPostHashtags(post);
  const mentions = getPostMentions(post);
  const profileTags = getStrArr(post, "profile_tags");
  const collaborators = getStrArr(post, "collaborators");
  const postFormat = getStr(post, "post_format");
  const durationSeconds = getNum(post, "duration_seconds");
  const actualComments = getActualCommentsForPost(platform, post);
  const savedComments = getSavedCommentsForPost(post);
  const commentsCoverageIncomplete = isCommentsCoverageIncomplete(savedComments, actualComments);
  const thumbnailUrl = getPostThumbnailUrl(platform, post);
  const platformIconKey = getPlatformIconKey(platform);
  const postHandle = formatPostHandle(platform, post.author);

  return (
    <>
      <div className="h-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {platformIconKey ? (
              <span aria-label={`${PLATFORM_LABELS[platform] ?? platform} platform`} className="inline-flex">
                <SocialPlatformTabIcon tab={platformIconKey} />
              </span>
            ) : (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[platform] ?? "bg-gray-100 text-gray-800"}`}
              >
                {PLATFORM_LABELS[platform] ?? platform}
              </span>
            )}
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                {postHandle}
              </a>
            ) : (
              <span className="text-sm font-medium text-gray-900">{postHandle}</span>
            )}
            {platform === "twitter" && getStr(post, "display_name") && (
              <span className="text-xs text-gray-500">{getStr(post, "display_name")}</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{fmtDateTime(post.posted_at)}</span>
        </div>

        {/* Title (YouTube) */}
        {platform === "youtube" && getStr(post, "title") && (
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900">{getStr(post, "title")}</h3>
            {(post as YouTubePost).is_short && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Short
              </span>
            )}
          </div>
        )}

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="block w-full"
              aria-label="Open post detail modal"
            >
              <div className="relative flex min-h-[10rem] max-h-72 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt={`${PLATFORM_LABELS[platform] ?? platform} post thumbnail`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="max-h-72 w-full object-contain"
                />
              </div>
            </button>
          </div>
        )}

        {/* Post text */}
        {post.text && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3 line-clamp-6">
            {post.text}
          </p>
        )}

        {/* Engagement metrics */}
        <EngagementRow platform={platform} post={post} />

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hashtags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Mentions / tagged accounts */}
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {mentions.map((m) => (
              <span key={m} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                {m}
              </span>
            ))}
          </div>
        )}

        {platform === "instagram" &&
          (postFormat || durationSeconds > 0 || profileTags.length > 0 || collaborators.length > 0) && (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {postFormat && (
                  <span className="text-xs rounded bg-pink-50 px-1.5 py-0.5 text-pink-700">
                    {postFormat.toUpperCase()}
                  </span>
                )}
                {durationSeconds > 0 && (
                  <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 text-gray-700">
                    {durationSeconds}s
                  </span>
                )}
              </div>
              {(profileTags.length > 0 || collaborators.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {profileTags.map((tag) => (
                    <span key={`profile-${tag}`} className="text-xs rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
                      {tag}
                    </span>
                  ))}
                  {collaborators.map((collab) => (
                    <span key={`collab-${collab}`} className="text-xs rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      {collab}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* Actions row */}
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Post Details
              {actualComments > 0 && (
                <span className="ml-1 opacity-70">
                  · {formatSavedVsActualComments(savedComments, actualComments)}
                  {commentsCoverageIncomplete ? "*" : ""} comments
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Post Details Drawer */}
      {statsOpen && (
        <PostStatsDrawer
          showId={showId}
          seasonNumber={seasonNumber}
          seasonId={seasonId}
          platform={platform}
          sourceId={post.source_id}
          onOpenMediaLightbox={
            onOpenMediaLightbox
              ? (preferredSrc?: string | null, detailMedia?: PostDetailMediaFields | null) => {
                  setStatsOpen(false);
                  const postForLightbox = mergePostWithDetailMedia(post, detailMedia);
                  const postCandidates = getPostMediaCandidates(platform, postForLightbox);
                  if (postCandidates.length === 0) return;
                  const preferredIndex = resolveMediaCandidateIndex(
                    postCandidates,
                    preferredSrc ?? getPostThumbnailUrl(platform, postForLightbox) ?? null,
                  );
                  onOpenMediaLightbox(platform, postForLightbox, preferredIndex, preferredSrc ?? null);
                }
              : null
          }
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function WeekDetailPage() {
  const { hasAccess: isAdmin, checking: authLoading } = useAdminGuard();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ showId: string; seasonNumber: string; weekIndex: string; platform?: string }>();
  const searchParams = useSearchParams();
  const showRouteParam = typeof params.showId === "string" ? params.showId : "";
  const seasonNumber = typeof params.seasonNumber === "string" ? params.seasonNumber : "";
  const weekIndex = typeof params.weekIndex === "string" ? params.weekIndex : "";
  const platformFromPathParam = typeof params.platform === "string" ? params.platform : undefined;
  const weekSubTabFromPath = (platformFromPathParam ?? "").trim().toLowerCase();
  const seasonNumberInt = Number.parseInt(seasonNumber, 10);
  const weekIndexInt = Number.parseInt(weekIndex, 10);
  const hasValidNumericPathParams =
    Number.isFinite(seasonNumberInt) &&
    seasonNumberInt > 0 &&
    Number.isFinite(weekIndexInt) &&
    weekIndexInt >= 0;
  const invalidPathParamsError = hasValidNumericPathParams
    ? null
    : "Invalid season/week URL. Season and week must be numeric values.";
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [resolvedShowSlug, setResolvedShowSlug] = useState<string | null>(() => {
    const raw = showRouteParam.trim().toLowerCase();
    if (!raw || looksLikeUuid(raw)) return null;
    return raw;
  });
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(
    !looksLikeUuid(showRouteParam)
  );
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);
  const showIdForApi = resolvedShowId ?? "";
  const showSlugForRouting = resolvedShowSlug ?? showRouteParam;
  const sourceScope: SourceScope = (() => {
    const raw = searchParams.get("source_scope") ?? searchParams.get("scope") ?? "bravo";
    if (raw === "creator" || raw === "community") return raw;
    return "bravo";
  })();
  const seasonIdHint = (() => {
    const raw = searchParams.get("season_id");
    if (!raw || !looksLikeUuid(raw)) return null;
    return raw;
  })();
  const searchParamsString = searchParams.toString();
  const socialPlatformFromPath = parseSocialPlatform(platformFromPathParam);
  const socialPlatformFromQuery = parseSocialPlatform(searchParams.get("social_platform"));
  const isOverviewSubTabPath = weekSubTabFromPath === "overview";
  const socialPlatform = socialPlatformFromPath ?? socialPlatformFromQuery;
  const socialView = searchParams.get("social_view");
  const dayParam = searchParams.get("day");
  const dayFilterFromQuery = dayParam && DATE_TOKEN_RE.test(dayParam) ? dayParam : null;
  const socialPlatformFilterFromQuery: PlatformFilter = socialPlatform ?? "all";

  const [data, setData] = useState<WeekDetailResponse | null>(null);
  const [displayedPagination, setDisplayedPagination] = useState<WeekDetailResponse["pagination"] | null>(null);
  const [accumulatedPostsByPlatform, setAccumulatedPostsByPlatform] = useState<Record<string, AnyPost[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [postOffset, setPostOffset] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortField, setSortField] = useState<SortField>("engagement");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchText, setSearchText] = useState("");
  const [syncingComments, setSyncingComments] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRunId, setSyncRunId] = useState<string | null>(null);
  const [syncRun, setSyncRun] = useState<SocialRun | null>(null);
  const [syncJobs, setSyncJobs] = useState<SocialJob[]>([]);
  const [syncPollError, setSyncPollError] = useState<string | null>(null);
  const [syncLastSuccessAt, setSyncLastSuccessAt] = useState<Date | null>(null);
  const [syncStartedAt, setSyncStartedAt] = useState<Date | null>(null);
  const [syncPass, setSyncPass] = useState(0);
  const [syncCoveragePreview, setSyncCoveragePreview] = useState<CommentsCoverageResponse | null>(null);
  const [syncMirrorCoveragePreview, setSyncMirrorCoveragePreview] = useState<MirrorCoverageResponse | null>(null);
  const [syncWorkerHealth, setSyncWorkerHealth] = useState<WorkerHealthPayload | null>(null);
  const [mediaLightbox, setMediaLightbox] = useState<{
    entries: SocialMediaLightboxEntry[];
    index: number;
  } | null>(null);
  const syncPollGenerationRef = useRef(0);
  const syncPollFailureCountRef = useRef(0);
  const syncSessionGenerationRef = useRef(0);
  const syncSessionStateRef = useRef<{
    dateStart: string;
    dateEnd: string;
    platforms: Array<Exclude<PlatformFilter, "all">> | null;
    maxPasses: number;
    maxDurationMs: number;
    startedAtMs: number;
    pass: number;
  } | null>(null);
  const legacyWeekPlatformRedirectRef = useRef<string | null>(null);
  const legacyWeekPathRedirectRef = useRef<string | null>(null);
  const legacyWeekSubTabRedirectRef = useRef<string | null>(null);
  const canonicalShowSlugRedirectRef = useRef<string | null>(null);
  const canonicalCurrentRoute = useMemo(
    () => buildStableRoute(pathname, searchParamsString),
    [pathname, searchParamsString],
  );
  const resolvedSeasonId = useMemo(() => {
    if (data?.season?.season_id && looksLikeUuid(data.season.season_id)) {
      return data.season.season_id;
    }
    return seasonIdHint;
  }, [data, seasonIdHint]);
  const syncButtonLabel = useMemo(() => {
    if (syncingComments) return "Syncing...";
    if (SOCIAL_FULL_SYNC_MIRROR_ENABLED) {
      return platformFilter === "all"
        ? "Full Ingest + Mirror"
        : `Full Ingest ${PLATFORM_LABELS[platformFilter]} + Mirror`;
    }
    return platformFilter === "all"
      ? "Ingest Metrics"
      : `Ingest ${PLATFORM_LABELS[platformFilter]} Metrics`;
  }, [platformFilter, syncingComments]);

  const displayData = useMemo(() => {
    if (!data) return null;
    const mergedPlatforms: Record<string, PlatformData> = {};
    for (const [platform, payload] of Object.entries(data.platforms)) {
      mergedPlatforms[platform] = {
        ...payload,
        posts: accumulatedPostsByPlatform[platform] ?? payload.posts ?? [],
      };
    }
    return {
      ...data,
      platforms: mergedPlatforms,
    };
  }, [data, accumulatedPostsByPlatform]);

  useEffect(() => {
    setPlatformFilter(socialPlatformFilterFromQuery);
  }, [socialPlatformFilterFromQuery]);

  useEffect(() => {
    const raw = showRouteParam.trim().toLowerCase();
    if (!raw || looksLikeUuid(raw)) {
      setResolvedShowSlug(null);
      return;
    }
    setResolvedShowSlug(raw);
  }, [showRouteParam]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    const currentSlug = showRouteParam.trim().toLowerCase();
    const preferredSlug = resolvedShowSlug?.trim().toLowerCase() ?? "";
    if (!currentSlug || !preferredSlug || currentSlug === preferredSlug) return;
    const redirectKey = `${pathname}|${searchParamsString}|${currentSlug}|${preferredSlug}|${seasonNumber}|${weekIndex}|${socialPlatform ?? "details"}`;
    if (canonicalShowSlugRedirectRef.current === redirectKey) return;
    canonicalShowSlugRedirectRef.current = redirectKey;
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: preferredSlug,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatform ?? undefined,
      query: new URLSearchParams(searchParamsString),
    });
    compareAndReplace(router, canonicalCurrentRoute, nextRoute);
  }, [
    hasValidNumericPathParams,
    pathname,
    canonicalCurrentRoute,
    resolvedShowSlug,
    router,
    searchParamsString,
    seasonNumber,
    showRouteParam,
    socialPlatform,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (!pathname.includes("/social/week/")) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${socialPlatform ?? "details"}|${searchParamsString}`;
    if (legacyWeekPathRedirectRef.current === redirectKey) return;
    legacyWeekPathRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatform ?? undefined,
      query: nextQuery,
    });
    compareAndReplace(router, canonicalCurrentRoute, nextRoute);
  }, [
    hasValidNumericPathParams,
    pathname,
    canonicalCurrentRoute,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatform,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (!isOverviewSubTabPath) return;
    if (socialPlatformFromQuery) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${searchParamsString}`;
    if (legacyWeekSubTabRedirectRef.current === redirectKey) return;
    legacyWeekSubTabRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      query: nextQuery,
    });
    compareAndReplace(router, canonicalCurrentRoute, nextRoute);
  }, [
    hasValidNumericPathParams,
    isOverviewSubTabPath,
    canonicalCurrentRoute,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatformFromQuery,
    weekIndex,
    weekIndexInt,
  ]);

  useEffect(() => {
    if (!hasValidNumericPathParams) return;
    if (socialPlatformFromPath || !socialPlatformFromQuery) return;
    const redirectKey = `${showSlugForRouting}|${seasonNumber}|${weekIndex}|${socialPlatformFromQuery}|${searchParamsString}`;
    if (legacyWeekPlatformRedirectRef.current === redirectKey) return;
    legacyWeekPlatformRedirectRef.current = redirectKey;
    const nextQuery = new URLSearchParams(searchParamsString);
    nextQuery.delete("social_platform");
    const nextRoute = buildSeasonSocialWeekUrl({
      showSlug: showSlugForRouting,
      seasonNumber,
      weekIndex: weekIndexInt,
      platform: socialPlatformFromQuery,
      query: nextQuery,
    });
    compareAndReplace(router, canonicalCurrentRoute, nextRoute);
  }, [
    canonicalCurrentRoute,
    hasValidNumericPathParams,
    router,
    searchParamsString,
    seasonNumber,
    showSlugForRouting,
    socialPlatformFromPath,
    socialPlatformFromQuery,
    weekIndex,
    weekIndexInt,
  ]);

  const activeDayFilter = useMemo(() => {
    if (!dayFilterFromQuery || !data?.week) return null;
    const weekStartToken = toLocalDateToken(data.week.start);
    const weekEndToken = toLocalDateToken(data.week.end);
    if (!weekStartToken || !weekEndToken) return null;
    if (dayFilterFromQuery < weekStartToken || dayFilterFromQuery > weekEndToken) return null;
    return dayFilterFromQuery;
  }, [data, dayFilterFromQuery]);

  const recentShowLabel = useMemo(() => {
    const showName = data?.season.show_name?.trim();
    return showName || humanizeSlug(showSlugForRouting);
  }, [data?.season.show_name, showSlugForRouting]);

  useEffect(() => {
    if (!showSlugForRouting || !recentShowLabel) return;
    recordAdminRecentShow({
      slug: showSlugForRouting,
      label: recentShowLabel,
    });
  }, [recentShowLabel, showSlugForRouting]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    const raw = showRouteParam?.trim() ?? "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }
    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;
    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);
      try {
        const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
        const response = await fetch(
          `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
          { headers, cache: "no-store" }
        );
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          resolved?: {
            show_id?: string | null;
            canonical_slug?: string | null;
            slug?: string | null;
          };
        };
        if (!response.ok) throw new Error(data.error || "Failed to resolve show slug");
        const showId =
          typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
            ? data.resolved.show_id
            : null;
        if (!showId) throw new Error("Resolved show slug did not return a valid show id.");
        if (cancelled) return;
        setResolvedShowId(showId);
        const showSlugCandidate =
          typeof data.resolved?.canonical_slug === "string" && data.resolved.canonical_slug.trim().length > 0
            ? data.resolved.canonical_slug
            : typeof data.resolved?.slug === "string" && data.resolved.slug.trim().length > 0
              ? data.resolved.slug
              : raw;
        const normalizedShowSlug = showSlugCandidate.trim().toLowerCase();
        if (normalizedShowSlug && !looksLikeUuid(normalizedShowSlug)) {
          setResolvedShowSlug(normalizedShowSlug);
        }
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setResolvedShowSlug(raw.toLowerCase());
        setSlugResolutionError(err instanceof Error ? err.message : "Could not resolve show URL slug.");
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };
    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, showRouteParam]);

  const fetchData = useCallback(
    async ({
      append = false,
      requestOffset,
    }: {
      append?: boolean;
      requestOffset?: number;
    } = {}) => {
      if (!showIdForApi || !seasonNumber || !weekIndex || !hasValidNumericPathParams) return;
      const pageRequestOffset = append ? Number(requestOffset ?? 0) : 0;
      const requestLimit = WEEK_DETAIL_POST_LIMIT;
      if (append) {
        setIsLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        setPostOffset(0);
        setAccumulatedPostsByPlatform({});
        setDisplayedPagination(null);
      }
      try {
        const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
        const weekParams = new URLSearchParams({
          source_scope: sourceScope,
          timezone: SOCIAL_TIME_ZONE,
        });
        if (socialPlatform) {
          weekParams.set("platforms", socialPlatform);
        }
        weekParams.set("max_comments_per_post", String(WEEK_DETAIL_MAX_COMMENTS_PER_POST));
        weekParams.set("post_limit", String(requestLimit));
        weekParams.set("post_offset", String(pageRequestOffset));
        if (resolvedSeasonId) {
          weekParams.set("season_id", resolvedSeasonId);
        }
        const url = `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}?${weekParams.toString()}`;
        const res = await fetchWithTimeout(
          url,
          {
            headers,
            cache: "no-store",
          },
          REQUEST_TIMEOUT_MS.weekDetail,
          "Week detail request timed out",
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as Record<string, string>).error || `HTTP ${res.status}`,
          );
        }
        const payload = await parseResponseJson<WeekDetailResponse>(res, "Failed to load week detail");
        const platformPostsMap = Object.fromEntries(
          Object.entries(payload.platforms).map(([platform, payloadForPlatform]) => [
            platform,
            payloadForPlatform.posts ?? [],
          ]),
        );
        const returnedCount = platformPostsMap
          ? Object.values(platformPostsMap).reduce((total, posts) => total + posts.length, 0)
          : 0;
        const pagination = payload.pagination ?? {
          limit: requestLimit,
          offset: pageRequestOffset,
          returned: returnedCount,
          total: returnedCount,
          has_more: false,
        };
        const resolvedPagination = {
          ...pagination,
          offset: pageRequestOffset,
          returned: returnedCount,
          total: payload.totals.posts ?? pagination.total,
          has_more:
            pagination.has_more ??
            pageRequestOffset + returnedCount < (payload.totals.posts ?? returnedCount),
        };
        const nextOffset = resolvedPagination.offset + resolvedPagination.returned;
        setDisplayedPagination(resolvedPagination);
        setPostOffset(nextOffset);
        setData(payload);
        setAccumulatedPostsByPlatform((previous) => {
          if (!append) return platformPostsMap;

          const merged: Record<string, AnyPost[]> = { ...previous };
          for (const [platform, platformPosts] of Object.entries(platformPostsMap)) {
            const existing = merged[platform] ?? [];
            const seen = new Set(
              existing.map((post) => `${platform}:${String(post.source_id ?? "")}`),
            );
            const nextPosts = [...existing];
            for (const post of platformPosts) {
              const key = `${platform}:${String(post.source_id ?? "")}`;
              if (seen.has(key)) continue;
              seen.add(key);
              nextPosts.push(post);
            }
            merged[platform] = nextPosts;
          }
          return merged;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load week detail";
        if (append) {
          setLoadMoreError(message);
        } else {
          setError(message);
        }
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [
      hasValidNumericPathParams,
      resolvedSeasonId,
      showIdForApi,
      seasonNumber,
      sourceScope,
      socialPlatform,
      weekIndex,
    ],
  );

  useEffect(() => {
    if (!hasValidNumericPathParams) {
      setLoading(false);
      setError(invalidPathParamsError);
      return;
    }
    if (isAdmin) fetchData();
  }, [fetchData, hasValidNumericPathParams, invalidPathParamsError, isAdmin]);

  const hasMorePosts = Boolean(displayedPagination?.has_more);
  const handleLoadMorePosts = useCallback(() => {
    if (!hasMorePosts || isLoadingMore || loading) return;
    void fetchData({ append: true, requestOffset: postOffset });
  }, [fetchData, hasMorePosts, isLoadingMore, loading, postOffset]);

  useEffect(() => {
    return () => {
      syncSessionGenerationRef.current += 1;
      syncSessionStateRef.current = null;
    };
  }, []);

  const fetchSyncProgress = useCallback(
    async (
      runId: string,
      options?: { preserveLastGoodJobsIfEmpty?: boolean; preserveLastGoodRunIfMissing?: boolean },
    ) => {
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const runParams = new URLSearchParams({
        source_scope: sourceScope,
        run_id: runId,
        limit: "1",
      });
      if (resolvedSeasonId) {
        runParams.set("season_id", resolvedSeasonId);
      }
      const jobsParams = new URLSearchParams({
        run_id: runId,
        limit: "100",
      });
      if (resolvedSeasonId) {
        jobsParams.set("season_id", resolvedSeasonId);
      }
      const [runsResult, jobsResult] = await Promise.allSettled([
        fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/runs?${runParams.toString()}`,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.syncRuns,
          "Sync runs request timed out",
        ),
        fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/jobs?${jobsParams.toString()}`,
          { headers, cache: "no-store" },
          REQUEST_TIMEOUT_MS.syncJobs,
          "Sync jobs request timed out",
        ),
      ]);
      let runsError: string | null = null;
      let jobsError: string | null = null;
      let nextRun: SocialRun | null = null;
      let nextJobs: SocialJob[] = [];
      let runsLoaded = false;
      let jobsLoaded = false;

      if (runsResult.status === "fulfilled") {
        const runsResponse = runsResult.value;
        if (!runsResponse.ok) {
          const body = (await runsResponse.json().catch(() => ({}))) as { error?: string };
          runsError = body.error ?? "Failed to load sync runs";
        } else {
          const runsPayload = await parseResponseJson<{ runs?: SocialRun[] }>(
            runsResponse,
            "Failed to load sync runs",
          );
          nextRun = (runsPayload.runs ?? []).find((run) => run.id === runId) ?? null;
          runsLoaded = true;
        }
      } else {
        runsError = runsResult.reason instanceof Error ? runsResult.reason.message : "Failed to load sync runs";
      }

      if (jobsResult.status === "fulfilled") {
        const jobsResponse = jobsResult.value;
        if (!jobsResponse.ok) {
          const body = (await jobsResponse.json().catch(() => ({}))) as { error?: string };
          jobsError = body.error ?? "Failed to load sync jobs";
        } else {
          const jobsPayload = await parseResponseJson<{ jobs?: SocialJob[] }>(
            jobsResponse,
            "Failed to load sync jobs",
          );
          nextJobs = jobsPayload.jobs ?? [];
          jobsLoaded = true;
        }
      } else {
        jobsError = jobsResult.reason instanceof Error ? jobsResult.reason.message : "Failed to load sync jobs";
      }

      if (!runsLoaded && !jobsLoaded) {
        throw new Error(
          runsError && jobsError ? `${runsError}; ${jobsError}` : runsError ?? jobsError ?? "Failed to load sync progress",
        );
      }

      let effectiveRun: SocialRun | null = nextRun;
      let effectiveJobs = nextJobs;
      if (runsLoaded) {
        setSyncRun((current) => {
          const resolved =
            options?.preserveLastGoodRunIfMissing && !nextRun && current?.id === runId ? current : nextRun;
          effectiveRun = resolved;
          return resolved;
        });
      }
      if (jobsLoaded) {
        setSyncJobs((current) => {
          const resolved =
            options?.preserveLastGoodJobsIfEmpty && nextJobs.length === 0 && current.length > 0 ? current : nextJobs;
          effectiveJobs = resolved;
          return resolved;
        });
      }
      return { run: effectiveRun, jobs: effectiveJobs };
    },
    [hasValidNumericPathParams, invalidPathParamsError, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const queueSyncPass = useCallback(
    async ({
      pass,
      dateStart,
      dateEnd,
      platforms,
    }: {
      pass: number;
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const payload: {
        source_scope: SourceScope;
        platforms?: Array<Exclude<PlatformFilter, "all">>;
        max_posts_per_target: number;
        max_comments_per_post: number;
        max_replies_per_post: number;
        fetch_replies: boolean;
        ingest_mode: "posts_and_comments";
        sync_strategy: "incremental";
        allow_inline_dev_fallback: boolean;
        date_start: string;
        date_end: string;
      } = {
        source_scope: sourceScope,
        max_posts_per_target: 100000,
        max_comments_per_post: 100000,
        max_replies_per_post: 100000,
        fetch_replies: true,
        ingest_mode: "posts_and_comments",
        sync_strategy: "incremental",
        allow_inline_dev_fallback: true,
        date_start: dateStart,
        date_end: dateEnd,
      };
      if (platforms && platforms.length > 0) {
        payload.platforms = platforms;
      }

      const ingestParams = new URLSearchParams();
      if (resolvedSeasonId) {
        ingestParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetch(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest${ingestParams.toString() ? `?${ingestParams.toString()}` : ""}`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed to start sync pass ${pass}`);
      }

      const result = (await response.json().catch(() => ({}))) as {
        run_id?: string;
        queued_or_started_jobs?: number;
      };
      const runId = typeof result.run_id === "string" ? result.run_id : null;
      const jobs = Number(result.queued_or_started_jobs ?? 0);
      if (!runId) {
        throw new Error(`Sync pass ${pass} started without a run id`);
      }
      setSyncRunId(runId);
      setSyncRun(null);
      setSyncJobs([]);
      syncPollFailureCountRef.current = 0;
      setSyncPass(pass);
      void fetchSyncProgress(runId).catch(() => {});
      return { runId, jobs };
    },
    [fetchSyncProgress, resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchCommentsCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/comments-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.commentsCoverage,
        "Comments coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch comments coverage");
      }
      return await parseResponseJson<CommentsCoverageResponse>(response, "Failed to fetch comments coverage");
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchMirrorCoverage = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">> | null;
    }) => {
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      const coverageParams = new URLSearchParams({
        source_scope: sourceScope,
        timezone: SOCIAL_TIME_ZONE,
        date_start: dateStart,
        date_end: dateEnd,
      });
      if (platforms && platforms.length > 0) {
        coverageParams.set("platforms", platforms.join(","));
      }
      if (resolvedSeasonId) {
        coverageParams.set("season_id", resolvedSeasonId);
      }
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/analytics/mirror-coverage?${coverageParams.toString()}`,
        { headers, cache: "no-store" },
        REQUEST_TIMEOUT_MS.mirrorCoverage,
        "Mirror coverage request timed out",
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to fetch mirror coverage");
      }
      return await parseResponseJson<MirrorCoverageResponse>(response, "Failed to fetch mirror coverage");
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const requeueMirrorJobs = useCallback(
    async ({
      dateStart,
      dateEnd,
      platforms,
    }: {
      dateStart: string;
      dateEnd: string;
      platforms: Array<Exclude<PlatformFilter, "all">>;
    }) => {
      if (platforms.length === 0) {
        return { queuedJobs: 0, failed: 0 };
      }
      const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
      let queuedJobs = 0;
      let failed = 0;
      for (const platform of platforms) {
        const params = new URLSearchParams({
          platform,
          source_scope: sourceScope,
          failed_only: "false",
          date_start: dateStart,
          date_end: dateEnd,
        });
        if (resolvedSeasonId) {
          params.set("season_id", resolvedSeasonId);
        }
        const response = await fetchWithTimeout(
          `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/mirror/requeue?${params.toString()}`,
          {
            method: "POST",
            headers,
          },
          REQUEST_TIMEOUT_MS.mirrorCoverage,
          "Mirror requeue request timed out",
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to requeue mirror jobs for ${platform}`);
        }
        const payload = (await response.json().catch(() => ({}))) as {
          queued_jobs?: unknown;
          failed?: unknown;
        };
        queuedJobs += Number(payload.queued_jobs ?? 0) || 0;
        failed += Number(payload.failed ?? 0) || 0;
      }
      return { queuedJobs, failed };
    },
    [resolvedSeasonId, seasonNumber, showIdForApi, sourceScope],
  );

  const fetchSyncWorkerHealth = useCallback(async () => {
    const headers = await getClientAuthHeaders({ allowDevAdminBypass: true });
    const params = new URLSearchParams();
    if (resolvedSeasonId) {
      params.set("season_id", resolvedSeasonId);
    }
    const response = await fetchWithTimeout(
      `/api/admin/trr-api/shows/${showIdForApi}/seasons/${seasonNumber}/social/ingest/worker-health${params.toString() ? `?${params.toString()}` : ""}`,
      { headers, cache: "no-store" },
      REQUEST_TIMEOUT_MS.workerHealth,
      "Social worker health request timed out",
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Failed to fetch social worker health");
    }
    return await parseResponseJson<WorkerHealthPayload>(response, "Failed to fetch social worker health");
  }, [resolvedSeasonId, seasonNumber, showIdForApi]);

  const syncAllCommentsForWeek = useCallback(async () => {
    if (!data) return;
    const generation = ++syncSessionGenerationRef.current;
    try {
      setSyncingComments(true);
      setSyncError(null);
      setSyncPollError(null);
      setSyncMessage(null);
      setSyncCoveragePreview(null);
      setSyncMirrorCoveragePreview(null);
      if (!hasValidNumericPathParams) {
        throw new Error(invalidPathParamsError ?? "Invalid season/week URL");
      }

      const selectedPlatforms: Array<Exclude<PlatformFilter, "all">> | null =
        platformFilter === "all" ? null : [platformFilter];

      syncSessionStateRef.current = {
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
        maxPasses: COMMENT_SYNC_MAX_PASSES,
        maxDurationMs: COMMENT_SYNC_MAX_DURATION_MS,
        startedAtMs: Date.now(),
        pass: 1,
      };

      const platformLabel = platformFilter === "all" ? "all platforms" : PLATFORM_LABELS[platformFilter];
      const weekLabel = data.week.label || (data.week.week_index === 0 ? "Pre-Season" : `Week ${data.week.week_index}`);
      setSyncStartedAt(new Date(syncSessionStateRef.current.startedAtMs));
      setSyncPass(1);
      try {
        const health = await fetchSyncWorkerHealth();
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(health);
        }
      } catch {
        if (generation === syncSessionGenerationRef.current) {
          setSyncWorkerHealth(null);
        }
      }
      const kickoff = await queueSyncPass({
        pass: 1,
        dateStart: data.week.start,
        dateEnd: data.week.end,
        platforms: selectedPlatforms,
      });
      if (generation !== syncSessionGenerationRef.current) return;
      setSyncMessage(
        `Pass 1/${COMMENT_SYNC_MAX_PASSES} queued for ${weekLabel} (${platformLabel}) · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · ${
          SOCIAL_FULL_SYNC_MIRROR_ENABLED ? "Full Ingest + Mirror started." : "Ingest Metrics started."
        }`,
      );
    } catch (err) {
      setSyncError(
        err instanceof Error
          ? err.message
          : SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? "Failed to run full ingest + mirror"
            : "Failed to start ingest",
      );
      setSyncingComments(false);
      syncSessionStateRef.current = null;
    }
  }, [
    data,
    fetchSyncWorkerHealth,
    hasValidNumericPathParams,
    invalidPathParamsError,
    platformFilter,
    queueSyncPass,
  ]);

  useEffect(() => {
    if (!syncRunId || !syncingComments) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const generation = ++syncPollGenerationRef.current;

    const nextPollDelayMs = (failureCount: number): number => {
      const index = Math.min(failureCount, SYNC_POLL_BACKOFF_MS.length - 1);
      return SYNC_POLL_BACKOFF_MS[index];
    };

    const poll = async () => {
      if (cancelled || generation !== syncPollGenerationRef.current) return;
      try {
        const snapshot = await fetchSyncProgress(syncRunId, {
          preserveLastGoodJobsIfEmpty: true,
          preserveLastGoodRunIfMissing: true,
        });
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        syncPollFailureCountRef.current = 0;
        setSyncPollError(null);
        setSyncLastSuccessAt(new Date());
        const currentRun = snapshot.run;
        if (currentRun && TERMINAL_RUN_STATUSES.has(currentRun.status)) {
          const session = syncSessionStateRef.current;
          const summary = currentRun.summary ?? {};
          const completedJobs = Number(summary.completed_jobs ?? 0);
          const failedJobs = Number(summary.failed_jobs ?? 0);
          const totalJobs = Math.max(Number(summary.total_jobs ?? 0), completedJobs + failedJobs);
          const totalItems = Number(summary.items_found_total ?? 0);
          const elapsed = syncStartedAt ? ` in ${Math.round((Date.now() - syncStartedAt.getTime()) / 1000)}s` : "";
          const finalVerb =
            currentRun.status === "cancelled"
              ? "cancelled"
              : currentRun.status === "failed"
                ? "failed"
                : "complete";
          let terminalMessage = `Pass ${session?.pass ?? 1}/${session?.maxPasses ?? COMMENT_SYNC_MAX_PASSES} ingest ${finalVerb}${elapsed}: ${completedJobs} job(s) finished`;
          if (totalJobs > 0) {
            terminalMessage += ` of ${totalJobs}`;
          }
          terminalMessage += `, ${totalItems.toLocaleString()} scraped`;
          if (failedJobs > 0) {
            terminalMessage += ` · ${failedJobs} failed`;
          }

          if (!session || currentRun.status === "cancelled") {
            setSyncMessage(terminalMessage);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const coverage = await fetchCommentsCoverage({
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
            platforms: session.platforms,
          });
          const mirrorCoverage = SOCIAL_FULL_SYNC_MIRROR_ENABLED
            ? await fetchMirrorCoverage({
                dateStart: session.dateStart,
                dateEnd: session.dateEnd,
                platforms: session.platforms,
              })
            : {
                up_to_date: true,
                needs_mirror_count: 0,
                mirrored_count: 0,
                failed_count: 0,
                partial_count: 0,
                pending_count: 0,
                posts_scanned: 0,
              };
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncCoveragePreview(coverage);
          setSyncMirrorCoveragePreview(SOCIAL_FULL_SYNC_MIRROR_ENABLED ? mirrorCoverage : null);

          const coverageSaved = Number(coverage.total_saved_comments ?? 0);
          const coverageReported = Number(coverage.total_reported_comments ?? 0);
          const coverageLabel = formatCoverageLabel(coverageSaved, coverageReported);
          const mirrorTotal = Number(mirrorCoverage.posts_scanned ?? 0);
          const mirrorNeeds = Number(mirrorCoverage.needs_mirror_count ?? 0);
          const mirrorReadyCount = Math.max(0, mirrorTotal - mirrorNeeds);
          const mirrorLabel = formatMirrorCoverageLabel(mirrorReadyCount, mirrorTotal);

          const strictRunSuccess = currentRun.status === "completed" && failedJobs === 0;
          const mirrorIsReady = !SOCIAL_FULL_SYNC_MIRROR_ENABLED || mirrorCoverage.up_to_date;
          if (coverage.up_to_date && mirrorIsReady && strictRunSuccess) {
            const mirrorToken = SOCIAL_FULL_SYNC_MIRROR_ENABLED ? ` · Mirror ${mirrorLabel}` : "";
            setSyncMessage(`${terminalMessage} · Coverage ${coverageLabel}${mirrorToken} · Up-to-Date.`);
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const elapsedMs = Date.now() - session.startedAtMs;
          const nextPass = session.pass + 1;
          const withinGuardrail = nextPass <= session.maxPasses && elapsedMs < session.maxDurationMs;
          if (!withinGuardrail) {
            setSyncMessage(
              SOCIAL_FULL_SYNC_MIRROR_ENABLED
                ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Incomplete (guardrail reached after ${session.pass}/${session.maxPasses} passes; pending=${mirrorCoverage.pending_count ?? 0}, failed=${mirrorCoverage.failed_count ?? 0}).`
                : `${terminalMessage} · Coverage ${coverageLabel} · Stalled (guardrail reached after ${session.pass}/${session.maxPasses} passes).`,
            );
            setSyncingComments(false);
            syncSessionStateRef.current = null;
            void fetchData();
            return;
          }

          const staleCommentPlatforms = Object.entries(coverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" ||
              platform === "tiktok" ||
              platform === "twitter" ||
              platform === "youtube" ||
              platform === "facebook" ||
              platform === "threads",
            );
          const staleMirrorPlatforms = Object.entries(mirrorCoverage.by_platform ?? {})
            .filter(([, value]) => !value.up_to_date || Number(value.needs_mirror_count ?? 0) > 0)
            .map(([platform]) => platform)
            .filter((platform): platform is Exclude<PlatformFilter, "all"> =>
              platform === "instagram" ||
              platform === "tiktok" ||
              platform === "twitter" ||
              platform === "youtube" ||
              platform === "facebook" ||
              platform === "threads",
            );
          const mergedStalePlatforms = Array.from(new Set([...staleCommentPlatforms, ...staleMirrorPlatforms]));
          if (SOCIAL_FULL_SYNC_MIRROR_ENABLED && staleMirrorPlatforms.length > 0) {
            const requeueResult = await requeueMirrorJobs({
              dateStart: session.dateStart,
              dateEnd: session.dateEnd,
              platforms: staleMirrorPlatforms,
            });
            if (cancelled || generation !== syncPollGenerationRef.current) return;
            setSyncMessage(
              `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Requeued ${requeueResult.queuedJobs} mirror job(s) for ${staleMirrorPlatforms.length} platform(s).`,
            );
          }

          session.pass = nextPass;
          session.platforms = mergedStalePlatforms.length > 0 ? mergedStalePlatforms : session.platforms;
          setSyncPass(session.pass);
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `${terminalMessage} · Coverage ${coverageLabel} · Mirror ${mirrorLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`
              : `${terminalMessage} · Coverage ${coverageLabel} · Auto-continuing pass ${session.pass}/${session.maxPasses}...`,
          );

          const kickoff = await queueSyncPass({
            pass: session.pass,
            dateStart: session.dateStart,
            dateEnd: session.dateEnd,
            platforms: session.platforms,
          });
          if (cancelled || generation !== syncPollGenerationRef.current) return;
          setSyncMessage(
            SOCIAL_FULL_SYNC_MIRROR_ENABLED
              ? `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel} · Mirror ${mirrorLabel}.`
              : `Pass ${session.pass}/${session.maxPasses} queued · run ${kickoff.runId.slice(0, 8)} · ${kickoff.jobs} job(s) · Coverage ${coverageLabel}.`,
          );
          return;
        }
      } catch (err) {
        if (cancelled || generation !== syncPollGenerationRef.current) return;
        const message = err instanceof Error ? err.message : "Failed to refresh sync progress";
        if (isTransientDevRestartMessage(message)) {
          syncPollFailureCountRef.current = Math.max(1, syncPollFailureCountRef.current);
        } else {
          syncPollFailureCountRef.current += 1;
        }
        if (syncPollFailureCountRef.current >= 2 && !isTransientDevRestartMessage(message)) {
          setSyncPollError(message);
        }
      }

      if (cancelled || generation !== syncPollGenerationRef.current) return;
      const delayMs = nextPollDelayMs(syncPollFailureCountRef.current);
      timeoutId = setTimeout(() => {
        void poll();
      }, delayMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    fetchCommentsCoverage,
    fetchData,
    fetchMirrorCoverage,
    fetchSyncProgress,
    queueSyncPass,
    requeueMirrorJobs,
    syncRunId,
    syncStartedAt,
    syncingComments,
  ]);

  useEffect(() => {
    if (!syncingComments && syncPass !== 0) {
      setSyncPass(0);
    }
  }, [syncPass, syncingComments]);

  useEffect(() => {
    if (!syncingComments) {
      syncSessionStateRef.current = null;
    }
  }, [syncingComments]);

  const openPostMediaLightbox = useCallback(
    (platform: string, post: AnyPost, initialIndex = 0) => {
      const mediaCandidates = getPostMediaCandidates(platform, post);
      if (mediaCandidates.length === 0) return;
      const weekLabel = displayData?.week.label ?? `Week ${weekIndexInt}`;
      const stats = buildSocialStats(platform, post);
      const allPlatformPosts = displayData?.platforms[platform]?.posts ?? [];
      // Count actual media URLs (not the appended thumbnail candidate)
      const mediaUrlCount = Math.max(
        getStrArr(post, "source_media_urls").length || getStrArr(post, "media_urls").length,
        getStrArr(post, "hosted_media_urls").length,
      );
      const entries = mediaCandidates.map((media, mediaIndex) => {
        const isThumbnailEntry = mediaIndex >= mediaUrlCount && mediaUrlCount > 0;
        const metadata = buildSocialPostMetadata({
          platform,
          post,
          media,
          showName: displayData?.season.show_name,
          showSlug: displayData?.season.show_slug,
          seasonNumber: Number.isFinite(seasonNumberInt) ? seasonNumberInt : null,
          weekLabel,
          sourceScope,
          allPlatformPosts,
          mediaIndex,
          totalMediaCount: mediaUrlCount,
          isThumbnailEntry,
        });
        return {
          id: `${platform}-${post.source_id}-${mediaIndex + 1}`,
          src: media.src,
          mediaType: media.mediaType,
          posterSrc: media.posterSrc,
          alt: `${PLATFORM_LABELS[platform] ?? platform} media`,
          metadata,
          stats,
        } satisfies SocialMediaLightboxEntry;
      });
      const boundedIndex = Math.max(0, Math.min(initialIndex, entries.length - 1));
      setMediaLightbox({ entries, index: boundedIndex });
    },
    [
      displayData?.platforms,
      displayData?.season.show_name,
      displayData?.season.show_slug,
      displayData?.week.label,
      seasonNumberInt,
      sourceScope,
      weekIndexInt,
    ],
  );

  const closeMediaLightbox = useCallback(() => {
    setMediaLightbox(null);
  }, []);

  const navigateMediaLightbox = useCallback((direction: "prev" | "next") => {
    setMediaLightbox((current) => {
      if (!current) return current;
      const delta = direction === "next" ? 1 : -1;
      const nextIndex = current.index + delta;
      if (nextIndex < 0 || nextIndex >= current.entries.length) return current;
      return {
        ...current,
        index: nextIndex,
      };
    });
  }, []);

  // Build merged post list with sort + search
  const allPosts = useMemo(() => {
    if (!displayData) return [];
    const entries: { platform: string; post: AnyPost }[] = [];
    const needle = searchText.trim().toLowerCase();
    for (const [plat, pdata] of Object.entries(displayData.platforms)) {
      if (platformFilter !== "all" && plat !== platformFilter) continue;
      for (const post of pdata.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) {
            continue;
          }
        }
        if (needle) {
          const text = (post.text ?? "").toLowerCase();
          const author = (post.author ?? "").toLowerCase();
          const title = getStr(post, "title").toLowerCase();
          if (!text.includes(needle) && !author.includes(needle) && !title.includes(needle)) {
            continue;
          }
        }
        entries.push({ platform: plat, post });
      }
    }
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortField === "posted_at") {
      entries.sort((a, b) => {
        const ta = a.post.posted_at ? new Date(a.post.posted_at).getTime() : 0;
        const tb = b.post.posted_at ? new Date(b.post.posted_at).getTime() : 0;
        return (ta - tb) * dir;
      });
    } else {
      entries.sort((a, b) => {
        const va = getNum(a.post, sortField);
        const vb = getNum(b.post, sortField);
        return (va - vb) * dir;
      });
    }
    return entries;
  }, [activeDayFilter, displayData, platformFilter, sortField, sortDir, searchText]);

  // Filtered totals
  const filteredTotals = useMemo(() => {
    if (!displayData) return { posts: 0, total_comments: 0, total_engagement: 0 };
    if (activeDayFilter) {
      let posts = 0;
      let totalComments = 0;
      let totalEngagement = 0;
      const platformEntries =
        platformFilter === "all"
          ? Object.entries(displayData.platforms)
          : [[platformFilter, displayData.platforms[platformFilter]] as [string, PlatformData | undefined]];
      for (const [platform, platformData] of platformEntries) {
        if (!platformData) continue;
        for (const post of platformData.posts) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
          posts += 1;
          totalComments += getActualCommentsForPost(platform, post);
          totalEngagement += Number(post.engagement ?? 0);
        }
      }
      return { posts, total_comments: totalComments, total_engagement: totalEngagement };
    }
    if (platformFilter === "all") {
      return {
        posts: displayData.totals.posts,
        total_comments: displayData.totals.total_comments,
        total_engagement: displayData.totals.total_engagement,
      };
    }
    const pd = displayData.platforms[platformFilter];
    return pd?.totals
      ? { posts: pd.totals.posts, total_comments: pd.totals.total_comments, total_engagement: pd.totals.total_engagement }
      : { posts: 0, total_comments: 0, total_engagement: 0 };
  }, [activeDayFilter, displayData, platformFilter]);

  const filteredCommentCoverage = useMemo(() => {
    if (!displayData) return { saved: 0, actual: 0, incomplete: false };
    let effectiveSaved = 0;
    let actual = 0;
    const platformEntries =
      platformFilter === "all"
        ? Object.entries(displayData.platforms)
        : [[platformFilter, displayData.platforms[platformFilter]] as [string, PlatformData | undefined]];
    for (const [platform, platformData] of platformEntries) {
      if (!platformData) continue;
      for (const post of platformData.posts) {
        if (activeDayFilter) {
          const postDayToken = toLocalDateToken(post.posted_at);
          if (!postDayToken || postDayToken !== activeDayFilter) continue;
        }
        const savedCount = getSavedCommentsForPost(post);
        const actualCount = getActualCommentsForPost(platform, post);
        effectiveSaved += Math.min(savedCount, actualCount);
        actual += actualCount;
      }
    }
    return toEffectiveCommentCoverage(effectiveSaved, actual);
  }, [activeDayFilter, displayData, platformFilter]);

  const syncFilteredCommentCoverage = useMemo(() => {
    if (!syncCoveragePreview) return null;
    const coverageByPlatform = syncCoveragePreview.by_platform ?? {};

    if (platformFilter === "all" && Object.keys(coverageByPlatform).length > 0) {
      let saved = 0;
      let actual = 0;
      for (const entry of Object.values(coverageByPlatform)) {
        const counts = getCoverageEntryCounts(entry);
        saved += Math.min(counts.saved, counts.actual);
        actual += counts.actual;
      }
      return toEffectiveCommentCoverage(saved, actual);
    }

    if (platformFilter !== "all") {
      const platformEntry = coverageByPlatform[platformFilter];
      if (platformEntry) {
        const counts = getCoverageEntryCounts(platformEntry);
        return toEffectiveCommentCoverage(counts.saved, counts.actual);
      }
    }

    const totals = getCoverageEntryCounts({
      total_saved_comments: syncCoveragePreview.total_saved_comments,
      total_reported_comments: syncCoveragePreview.total_reported_comments,
    });
    return toEffectiveCommentCoverage(totals.saved, totals.actual);
  }, [platformFilter, syncCoveragePreview]);

  const commentsSavedPct = useMemo(() => {
    const effectiveCoverage =
      syncingComments && syncFilteredCommentCoverage
        ? syncFilteredCommentCoverage
        : filteredCommentCoverage;
    if (effectiveCoverage.actual <= 0) return 100;
    const ratio = (effectiveCoverage.saved / effectiveCoverage.actual) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [filteredCommentCoverage, syncFilteredCommentCoverage, syncingComments]);

  const displayedCommentCoverage = useMemo(() => {
    if (syncingComments && syncFilteredCommentCoverage) {
      return syncFilteredCommentCoverage;
    }
    return filteredCommentCoverage;
  }, [filteredCommentCoverage, syncFilteredCommentCoverage, syncingComments]);

  const syncProgress = useMemo(() => {
    const summary = syncRun?.summary ?? {};
    const fallbackCompleted = syncJobs.filter((job) => job.status === "completed").length;
    const fallbackFailed = syncJobs.filter((job) => job.status === "failed").length;
    const fallbackActive = syncJobs.filter((job) => ACTIVE_RUN_STATUSES.has(job.status)).length;
    const fallbackTotal = syncJobs.length;
    const fallbackItems = syncJobs.reduce((sum, job) => sum + Number(job.items_found ?? 0), 0);
    const completed = Number(summary.completed_jobs ?? fallbackCompleted);
    const failed = Number(summary.failed_jobs ?? fallbackFailed);
    const total = Number(summary.total_jobs ?? fallbackTotal);
    const active = Number(summary.active_jobs ?? fallbackActive);
    const items = Number(summary.items_found_total ?? fallbackItems);
    const finished = completed + failed;
    const pct = total > 0 ? Math.round((finished / total) * 100) : syncingComments ? 5 : 100;
    return {
      completed,
      failed,
      total,
      active,
      items,
      finished,
      pct: Math.max(0, Math.min(100, pct)),
    };
  }, [syncJobs, syncRun, syncingComments]);

  const syncStageProgress = useMemo(() => {
    const fromSummary = syncRun?.summary?.stage_counts ?? {};
    const parseStage = (stageName: string) => {
      const stage = fromSummary[stageName] ?? {};
      return {
        total: Number(stage.total ?? 0),
        completed: Number(stage.completed ?? 0),
        failed: Number(stage.failed ?? 0),
        active: Number(stage.active ?? 0),
        scraped: 0,
        saved: 0,
      };
    };
    let posts = parseStage("posts");
    let comments = parseStage("comments");
    let mediaMirror = parseStage("media_mirror");
    const fallback = {
      posts: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
      comments: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
      mediaMirror: { total: 0, completed: 0, failed: 0, active: 0, scraped: 0, saved: 0 },
    };
    for (const job of syncJobs) {
      const stageName = getJobStage(job);
      const stage =
        stageName === "comments"
          ? "comments"
          : stageName === "media_mirror"
            ? "mediaMirror"
            : "posts";
      const current = fallback[stage];
      current.total += 1;
      if (job.status === "completed") current.completed += 1;
      else if (job.status === "failed") current.failed += 1;
      else if (ACTIVE_RUN_STATUSES.has(job.status)) current.active += 1;

      const stageCounters = getJobStageCounters(job);
      if (stageCounters) {
        current.scraped += stageCounters.posts + stageCounters.comments;
      } else {
        current.scraped += Number(job.items_found ?? 0);
      }

      const persistCounters = getJobPersistCounters(job);
      if (persistCounters) {
        current.saved += persistCounters.posts_upserted + persistCounters.comments_upserted;
      }
    }
    if (posts.total === 0 && comments.total === 0 && mediaMirror.total === 0) {
      posts = fallback.posts;
      comments = fallback.comments;
      mediaMirror = fallback.mediaMirror;
    } else {
      posts.scraped = fallback.posts.scraped;
      posts.saved = fallback.posts.saved;
      comments.scraped = fallback.comments.scraped;
      comments.saved = fallback.comments.saved;
      mediaMirror.scraped = fallback.mediaMirror.scraped;
      mediaMirror.saved = fallback.mediaMirror.saved;
    }
    return { posts, comments, mediaMirror };
  }, [syncJobs, syncRun?.summary?.stage_counts]);

  const syncLogs = useMemo(() => {
    return [...syncJobs]
      .sort((a, b) => {
        const aTs = Date.parse(a.completed_at ?? a.started_at ?? a.created_at ?? "");
        const bTs = Date.parse(b.completed_at ?? b.started_at ?? b.created_at ?? "");
        return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs);
      })
      .slice(0, 10)
      .map((job) => {
        const stageName = getJobStage(job);
        const stage = stageName === "comments" ? "comments" : stageName === "media_mirror" ? "media_mirror" : "posts";
        const platform = PLATFORM_LABELS[job.platform] ?? job.platform;
        const account =
          typeof job.config?.account === "string" && job.config.account ? ` @${job.config.account}` : "";
        const timestampRaw = job.completed_at ?? job.started_at ?? job.created_at ?? null;
        const timestamp = timestampRaw
          ? new Date(timestampRaw).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: SOCIAL_TIME_ZONE,
            })
          : "--:--";
        const counters = getJobStageCounters(job);
        const persistCounters = getJobPersistCounters(job);
        const activitySummary = getJobActivitySummary(job);
        const retrievalMeta = (job.metadata as Record<string, unknown> | undefined)?.retrieval_meta as
          | Record<string, unknown>
          | undefined;
        const refreshDecisions = retrievalMeta?.comment_refresh_decisions as Record<string, unknown> | undefined;
        const upToDateCount =
          refreshDecisions && typeof refreshDecisions.up_to_date === "number" ? Number(refreshDecisions.up_to_date) : 0;
        const countersLabel = counters ? ` · ${counters.posts}p/${counters.comments}c` : "";
        const persistLabel = persistCounters
          ? ` · saved ${persistCounters.posts_upserted}p/${persistCounters.comments_upserted}c`
          : "";
        const activityLabel = activitySummary ? ` · ${activitySummary}` : "";
        const skippedLabel = upToDateCount > 0 ? ` · ${upToDateCount} up-to-date skipped` : "";
        const itemsLabel =
          !counters && typeof job.items_found === "number" ? ` · ${job.items_found.toLocaleString()} items` : "";
        const errorLabel = job.status === "failed" && job.error_message ? ` · ${job.error_message}` : "";
        return {
          id: job.id,
          line: `${timestamp} · ${platform}${account} ${stage} ${job.status}${countersLabel}${itemsLabel}${persistLabel}${activityLabel}${skippedLabel}${errorLabel}`,
        };
      });
  }, [syncJobs]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Checking access...
      </div>
    );
  }

  if (slugResolutionError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {slugResolutionError}
        </div>
      </div>
    );
  }

  if (slugResolutionLoading || !showIdForApi) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Resolving show URL...
      </div>
    );
  }

  const breadcrumbShowName = recentShowLabel;
  const breadcrumbWeekLabel = data?.week.label?.trim() || `Week ${weekIndexInt}`;
  const normalizedSocialView =
    socialView === "bravo" || socialView === "official" ? "official" : socialView;
  const breadcrumbShowHref = buildShowAdminUrl({ showSlug: showSlugForRouting });
  const breadcrumbQuery = (() => {
    const query = new URLSearchParams();
    if (socialPlatform) query.set("social_platform", socialPlatform);
    if (normalizedSocialView) query.set("social_view", normalizedSocialView);
    return query;
  })();
  const breadcrumbSeasonHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
  });
  const breadcrumbSocialHref = buildSeasonAdminUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
    tab: "social",
    query: breadcrumbQuery,
  });
  const breadcrumbWeekHref = buildSeasonSocialWeekUrl({
    showSlug: showSlugForRouting,
    seasonNumber,
    weekIndex: weekIndexInt,
    platform: socialPlatform ?? undefined,
    query: breadcrumbQuery,
  });
  const breadcrumbSubTabLabel = normalizedSocialView
    ? `${humanizeSlug(normalizedSocialView)} Analytics`
    : socialPlatform
      ? PLATFORM_LABELS[socialPlatform] ?? humanizeSlug(socialPlatform)
      : undefined;

  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminGlobalHeader bodyClassName="px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <AdminBreadcrumbs
            items={buildSeasonWeekBreadcrumb(breadcrumbShowName, seasonNumber, breadcrumbWeekLabel, {
              showHref: breadcrumbShowHref,
              seasonHref: breadcrumbSeasonHref,
              socialHref: breadcrumbSocialHref,
              subTabLabel: breadcrumbSubTabLabel,
              subTabHref: breadcrumbSocialHref,
              weekHref: breadcrumbWeekHref,
            })}
            className="mb-2"
          />
          <Link
            href={buildSeasonAdminUrl({
              showSlug: showSlugForRouting,
              seasonNumber,
              tab: "social",
              query: (() => {
                const query = new URLSearchParams();
                if (socialPlatform) query.set("social_platform", socialPlatform);
                if (normalizedSocialView) query.set("social_view", normalizedSocialView);
                return query;
              })(),
            }) as Route}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Back to Season Social Analytics
          </Link>

          {data && (
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {data.week.label}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {data.season.show_name} — Season {data.season.season_number} ·{" "}
                {fmtDate(data.week.start)} – {fmtDate(data.week.end)}
              </p>
            </div>
          )}
        </div>
      </AdminGlobalHeader>

      <main className="mx-auto max-w-6xl px-4 py-6">

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          Loading week detail...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {activeDayFilter && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <span className="font-semibold">
                Day filter: {toDayFilterLabel(activeDayFilter) ?? activeDayFilter}
              </span>
              <span className="text-xs text-zinc-500">
                Showing posts captured on this local day only.
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextQuery = new URLSearchParams(searchParams.toString());
                  nextQuery.delete("day");
                  const nextRoute = buildSeasonSocialWeekUrl({
                    showSlug: showSlugForRouting,
                    seasonNumber,
                    weekIndex: weekIndexInt,
                    platform: socialPlatform ?? undefined,
                    query: nextQuery,
                  });
                  compareAndReplace(router, canonicalCurrentRoute, nextRoute);
                }}
                className="ml-auto rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Clear day filter
              </button>
            </div>
          )}

          {/* Platform filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PLATFORM_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPlatformFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  platformFilter === tab.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && data.platforms[tab.key] && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.platforms[tab.key].totals.posts})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort & search controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Sort field */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-field" className="text-xs font-medium text-gray-500">
                Sort by
              </label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort direction toggle */}
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={sortDir === "desc" ? "Highest first" : "Lowest first"}
            >
              {sortDir === "desc" ? "↓ High to Low" : "↑ Low to High"}
            </button>

            {/* Text search */}
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void syncAllCommentsForWeek();
              }}
              disabled={syncingComments}
              className="text-sm rounded-md px-3 py-1.5 bg-gray-900 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncButtonLabel}
            </button>

            {/* Result count */}
            <span className="text-xs text-gray-500">
              {allPosts.length} {allPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {(syncMessage || syncError) && (
            <div
              className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                syncError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {syncError ?? syncMessage}
            </div>
          )}

          {(syncRun || syncingComments) && (
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Sync Progress</h3>
                  <p className="text-xs text-gray-500">
                    {syncRunId
                      ? `Run ${syncRunId.slice(0, 8)} · ${
                          syncRun ? formatRunStatus(syncRun.status) : syncingComments ? "Running" : "Unknown"
                        }`
                      : "Preparing run"}
                  </p>
                  {syncWorkerHealth && (
                    <p className="mt-1 text-xs text-gray-500">
                      Workers:{" "}
                      {syncWorkerHealth.queue_enabled
                        ? `${syncWorkerHealth.healthy_workers ?? 0} healthy${syncWorkerHealth.reason ? ` (${syncWorkerHealth.reason})` : ""}`
                        : "queue disabled"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{syncProgress.pct}%</div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    {syncProgress.finished}/{syncProgress.total || "?"} jobs · {fmtNum(syncProgress.items)} scraped
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    syncRun?.status === "failed"
                      ? "bg-red-500"
                      : syncRun?.status === "cancelled"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(2, syncProgress.pct)}%` }}
                />
              </div>

              <div className={`mt-3 grid gap-2 ${SOCIAL_FULL_SYNC_MIRROR_ENABLED ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 1: Queue + Start</div>
                  <div className="mt-1 text-gray-600">
                    {syncRun
                      ? `${formatRunStatus(syncRun.status)}${syncProgress.active > 0 ? ` · ${syncProgress.active} active` : ""}`
                      : "Queued"}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 2: Posts Stage</div>
                  <div className="mt-1 text-gray-600 tabular-nums">
                    {syncStageProgress.posts.completed + syncStageProgress.posts.failed}/
                    {syncStageProgress.posts.total || "?"} complete
                    {syncStageProgress.posts.active > 0 ? ` · ${syncStageProgress.posts.active} active` : ""}
                    {` · ${fmtNum(syncStageProgress.posts.scraped)} scraped`}
                    {syncStageProgress.posts.saved > 0 ? ` · saved ${fmtNum(syncStageProgress.posts.saved)}` : ""}
                  </div>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-medium text-gray-700">Step 3: Comments Stage</div>
                  <div className="mt-1 text-gray-600 tabular-nums">
                    {syncStageProgress.comments.completed + syncStageProgress.comments.failed}/
                    {syncStageProgress.comments.total || "?"} complete
                    {syncStageProgress.comments.active > 0 ? ` · ${syncStageProgress.comments.active} active` : ""}
                    {` · ${fmtNum(syncStageProgress.comments.scraped)} scraped`}
                    {syncStageProgress.comments.saved > 0 ? ` · saved ${fmtNum(syncStageProgress.comments.saved)}` : ""}
                  </div>
                </div>
                {SOCIAL_FULL_SYNC_MIRROR_ENABLED && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                    <div className="font-medium text-gray-700">Step 4: Mirror Stage</div>
                    <div className="mt-1 text-gray-600 tabular-nums">
                      {syncStageProgress.mediaMirror.completed + syncStageProgress.mediaMirror.failed}/
                      {syncStageProgress.mediaMirror.total || "?"} complete
                      {syncStageProgress.mediaMirror.active > 0 ? ` · ${syncStageProgress.mediaMirror.active} active` : ""}
                    </div>
                  </div>
                )}
              </div>

              {syncMirrorCoveragePreview && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Mirror Coverage:{" "}
                  {formatMirrorCoverageLabel(
                    Math.max(
                      0,
                      Number(syncMirrorCoveragePreview.posts_scanned ?? 0) -
                        Number(syncMirrorCoveragePreview.needs_mirror_count ?? 0),
                    ),
                    Number(syncMirrorCoveragePreview.posts_scanned ?? 0),
                  )}
                  {` · pending ${fmtNum(Number(syncMirrorCoveragePreview.pending_count ?? 0))}`}
                  {` · failed ${fmtNum(Number(syncMirrorCoveragePreview.failed_count ?? 0))}`}
                  {` · partial ${fmtNum(Number(syncMirrorCoveragePreview.partial_count ?? 0))}`}
                </div>
              )}

              {syncPollError && (
                <p className="mt-3 text-xs text-amber-700">
                  Progress refresh issue: {syncPollError}. Retrying automatically.
                </p>
              )}
              {syncingComments && syncLastSuccessAt && (
                <p className="mt-1 text-xs text-gray-500">
                  Last successful progress refresh: {fmtDateTime(syncLastSuccessAt.toISOString())}
                </p>
              )}

              {syncLogs.length > 0 && (
                <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-700">Recent Run Log</p>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {syncLogs.map((entry) => (
                      <p key={entry.id} className="text-xs text-gray-600">
                        {entry.line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary bar */}
          <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.posts)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Posts</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_comments)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Comments</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_engagement)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Engagement</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{commentsSavedPct.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">of Comments Saved</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatSavedVsActualComments(displayedCommentCoverage.saved, displayedCommentCoverage.actual)}
                {displayedCommentCoverage.incomplete ? "*" : ""} Comments (Saved/Actual)
              </div>
            </div>
          </div>
          {displayedCommentCoverage.incomplete && (
            <p className="mb-5 -mt-3 text-xs text-gray-500">
              * Not all platform-reported comments are saved in Supabase yet.
            </p>
          )}

          {/* Post cards */}
          {allPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {activeDayFilter ? "No posts found for this day." : "No posts found for this week."}
            </div>
          ) : (
          <div data-testid="week-post-gallery" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allPosts.map(({ platform, post }) => (
                <PostCard
                  key={`${platform}-${post.source_id}`}
                  platform={platform}
                  post={post}
                  showId={showIdForApi}
                  seasonNumber={seasonNumber}
                  seasonId={resolvedSeasonId}
                  onOpenMediaLightbox={openPostMediaLightbox}
                />
              ))}
            </div>
          )}
          {(loadMoreError || (displayedPagination && !displayedPagination.has_more)) && (
            <div className="mt-4 text-sm">
              {loadMoreError && <p className="text-red-600 text-center">{loadMoreError}</p>}
              {!loadMoreError &&
                displayedPagination &&
                !displayedPagination.has_more &&
                displayedPagination.total > 0 &&
                allPosts.length > 0 && (
                  <p className="text-gray-500 text-center">
                    All loaded: {allPosts.length}/{displayedPagination.total} posts
                  </p>
                )}
            </div>
          )}
          {hasMorePosts && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMorePosts}
                disabled={isLoadingMore || loading}
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Loading more posts..." : "Load more posts"}
              </button>
            </div>
          )}
        </>
      )}
      </main>

      {mediaLightbox && mediaLightbox.entries[mediaLightbox.index] && (
        <ImageLightbox
          src={mediaLightbox.entries[mediaLightbox.index].src}
          alt={mediaLightbox.entries[mediaLightbox.index].alt}
          mediaType={mediaLightbox.entries[mediaLightbox.index].mediaType}
          videoPosterSrc={mediaLightbox.entries[mediaLightbox.index].posterSrc}
          isOpen={true}
          onClose={closeMediaLightbox}
          metadata={mediaLightbox.entries[mediaLightbox.index].metadata}
          metadataExtras={<SocialStatsPanel stats={mediaLightbox.entries[mediaLightbox.index].stats} />}
          position={{
            current: mediaLightbox.index + 1,
            total: mediaLightbox.entries.length,
          }}
          onPrevious={() => navigateMediaLightbox("prev")}
          onNext={() => navigateMediaLightbox("next")}
          hasPrevious={mediaLightbox.index > 0}
          hasNext={mediaLightbox.index < mediaLightbox.entries.length - 1}
        />
      )}
    </div>
  );
}
