"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { canonicalizeOperationStatus, type CanonicalOperationStatus } from "@/lib/admin/async-handles";
import {
  getAutoResumableAdminOperationSession,
  markAdminOperationSessionStatus,
  upsertAdminOperationSession,
} from "@/lib/admin/operation-session";
import {
  getAutoResumableAdminRunSession,
  getOrCreateAdminRunFlowKey,
  markAdminRunSessionStatus,
  upsertAdminRunSession,
} from "@/lib/admin/run-session";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { useAdminOperationUnloadGuard } from "@/lib/admin/use-operation-unload-guard";
import RedditAdminShell from "@/components/admin/RedditAdminShell";
import { buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SeasonAdminTab, SocialAnalyticsViewSlug } from "@/lib/admin/show-admin-routes";
import {
  buildAdminRedditCommunityUrl,
  buildAdminRedditCommunityWindowPostUrl,
  buildAdminRedditCommunityWindowUrl,
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";

type PeriodPostMatchType = "flair" | "scan" | "all";

interface DiscoveryThread {
  reddit_post_id: string;
  title: string;
  text: string | null;
  url: string;
  permalink: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string | null;
  link_flair_text: string | null;
  is_show_match?: boolean;
  passes_flair_filter?: boolean;
  match_score?: number;
  flair_mode?: string | null;
  match_type?: PeriodPostMatchType | null;
  admin_approved?: boolean | null;
  upvote_ratio?: number | null;
  post_type?: string | null;
  is_nsfw?: boolean | null;
  is_spoiler?: boolean | null;
  author_flair_text?: string | null;
}

interface DiscoveryPayload {
  fetched_at: string;
  totals?: {
    fetched_rows: number;
    matched_rows: number;
    tracked_flair_rows: number;
  };
  window_start?: string | null;
  window_end?: string | null;
  threads: DiscoveryThread[];
}

interface RedditCommunityListItem {
  id: string;
  trr_show_id: string;
  trr_show_name: string;
  subreddit: string;
  is_show_focused?: boolean;
  analysis_all_flairs?: string[];
}

interface ShowSeasonOption {
  id: string;
  season_number: number;
}

interface SeasonEpisodeRow {
  id: string;
  episode_number: number;
  air_date: string | null;
}

interface SocialAnalyticsPeriodRow {
  week_index?: number;
  label?: string;
  start?: string;
  end?: string;
}

interface EpisodePeriodOption {
  key: string;
  label: string;
  start: string;
  end: string;
}

interface EpisodeWindowBounds {
  key: string;
  label: string;
  start: string | null;
  end: string | null;
  type: "episode" | "period";
  source?: "period" | "fallback";
  episodeNumber?: number;
}

interface WindowContext {
  communityId: string;
  seasonId: string;
  seasonNumber: number;
  showSlug: string;
  showName: string;
  communitySlug: string;
  subreddit: string;
  containerKey: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  periodSource: "legacy" | "period" | "fallback";
  requiresDiscoveryLookup: boolean;
  isShowFocused: boolean;
  analysisAllFlairs: string[];
}

type ResolverStage =
  | "init"
  | "loading_communities"
  | "loading_seasons"
  | "loading_windows"
  | "loading_cache"
  | "finalizing";

type RefreshRunStatus = "queued" | "running" | "cancelling" | "completed" | "partial" | "failed" | "cancelled";

interface RefreshRunPayload {
  run_id: string;
  operation_id?: string | null;
  execution_owner?: string | null;
  execution_mode_canonical?: string | null;
  status: RefreshRunStatus;
  error?: string | null;
  queue_position?: number | null;
  active_jobs?: number | null;
}

const SEASON_TABS: Array<{ tab: SeasonAdminTab; label: string }> = [
  { tab: "overview", label: "Home" },
  { tab: "episodes", label: "Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "news", label: "News" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
];

const SOCIAL_TABS: Array<{ view: SocialAnalyticsViewSlug; label: string }> = [
  { view: "official", label: "OFFICIAL ANALYSIS" },
  { view: "sentiment", label: "SENTIMENT ANALYSIS" },
  { view: "hashtags", label: "HASHTAGS ANALYSIS" },
  { view: "advanced", label: "ADVANCED ANALYTICS" },
  { view: "reddit", label: "REDDIT ANALYTICS" },
  { view: "cast-content", label: "CAST COMPARISON" },
];

const fmtNum = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US").format(value);
};

const fmtDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US");
};

const toInt = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const slugifyShowName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "show";

const normalizeCommunitySlug = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/^\/?r\//i, "")
    .replace(/^https?:\/\/(?:www\.)?reddit\.com\/r\//i, "")
    .replace(/^\/+|\/+$/g, "")
    .split(/[/?#]/, 1)[0];
  return cleaned || null;
};

const parseDateMs = (value: string | null | undefined): number | null => {
  if (!value || typeof value !== "string") return null;
  const parsed = new Date(value);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : null;
};

const toIsoDate = (value: string | null | undefined): string | null => {
  const ms = parseDateMs(value);
  return ms === null ? null : new Date(ms).toISOString();
};

const EASTERN_TIMEZONE = "America/New_York";

const getEasternDateParts = (
  value: Date,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } | null => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(value);
  const getPart = (type: Intl.DateTimeFormatPartTypes): number | null => {
    const raw = parts.find((part) => part.type === type)?.value;
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");
  if (year === null || month === null || day === null || hour === null || minute === null || second === null) {
    return null;
  }
  return { year, month, day, hour, minute, second };
};

const toEasternDateKey = (value: string | null | undefined): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const explicitDateMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.000)?Z$)/,
    );
    if (explicitDateMatch) {
      const year = explicitDateMatch[1];
      const month = explicitDateMatch[2];
      const day = explicitDateMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  const ms = parseDateMs(value);
  if (ms === null) return null;
  const parts = getEasternDateParts(new Date(ms));
  if (!parts) return null;
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
};

const toEasternMidnightIso = (value: string | null | undefined): string | null => {
  const dateKey = toEasternDateKey(value);
  if (!dateKey) return null;
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  for (let utcHour = 0; utcHour <= 12; utcHour += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day, utcHour, 0, 0));
    const parts = getEasternDateParts(candidate);
    if (!parts) continue;
    if (parts.year === year && parts.month === month && parts.day === day && parts.hour === 0 && parts.minute === 0) {
      return candidate.toISOString();
    }
  }
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
};

const toEasternClockIso = (
  value: string | null | undefined,
  hour: number,
  minute: number,
  second: number,
): string | null => {
  const dateKey = toEasternDateKey(value);
  if (!dateKey) return null;
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  for (let utcDayOffset = -1; utcDayOffset <= 1; utcDayOffset += 1) {
    for (let utcHour = 0; utcHour < 24; utcHour += 1) {
      const candidate = new Date(
        Date.UTC(year, month - 1, day + utcDayOffset, utcHour, minute, second),
      );
      const parts = getEasternDateParts(candidate);
      if (!parts) continue;
      if (
        parts.year === year &&
        parts.month === month &&
        parts.day === day &&
        parts.hour === hour &&
        parts.minute === minute &&
        parts.second === second
      ) {
        return candidate.toISOString();
      }
    }
  }
  return null;
};

const addDaysUtc = (value: string | null | undefined, days: number): string | null => {
  const ms = parseDateMs(value);
  return ms === null ? null : new Date(ms + days * 24 * 60 * 60 * 1000).toISOString();
};

const parseEpisodeNumberFromPeriodLabel = (label: string): number | null => {
  const episodeMatch = label.match(/\bepisode\s*(\d{1,3})\b/i);
  if (!episodeMatch?.[1]) return null;
  const parsed = Number.parseInt(episodeMatch[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isPreSeasonPeriodLabel = (label: string): boolean =>
  /\b(pre[\s-]?season|trailer)\b/i.test(label);

const isPostSeasonPeriodLabel = (label: string): boolean =>
  /\b(post[\s-]?season|reunion|finale)\b/i.test(label);

const buildPeriodOptions = (weeklyRows: SocialAnalyticsPeriodRow[]): EpisodePeriodOption[] => {
  const weekly = weeklyRows
    .map((row) => {
      const start = toIsoDate(row.start);
      const end = toIsoDate(row.end);
      if (!start || !end) return null;
      return {
        key: `weekly-${row.week_index ?? `${start}-${end}`}`,
        label: row.label?.trim() || `Week ${row.week_index ?? "?"}`,
        start,
        end,
      } satisfies EpisodePeriodOption;
    })
    .filter((row): row is EpisodePeriodOption => Boolean(row))
    .sort((a, b) => {
      const aPreSeason = isPreSeasonPeriodLabel(a.label);
      const bPreSeason = isPreSeasonPeriodLabel(b.label);
      if (aPreSeason && !bPreSeason) return -1;
      if (!aPreSeason && bPreSeason) return 1;
      return (parseDateMs(a.start) ?? 0) - (parseDateMs(b.start) ?? 0);
    });

  if (weekly.length === 0) return [];
  const allStart = weekly[0]?.start;
  const allEnd = weekly[weekly.length - 1]?.end;
  if (!allStart || !allEnd) return weekly;
  return [{ key: "all-periods", label: "All Periods", start: allStart, end: allEnd }, ...weekly];
};

const buildEpisodeWindowBounds = (
  seasonEpisodes: SeasonEpisodeRow[],
  periodOptions: EpisodePeriodOption[],
): Map<string, EpisodeWindowBounds> => {
  const bounds = new Map<string, EpisodeWindowBounds>();
  const rows = [...seasonEpisodes]
    .filter((episode) => Number.isFinite(episode.episode_number) && episode.episode_number > 0)
    .sort((a, b) => a.episode_number - b.episode_number);

  if (rows.length > 0) {
    const firstEpisodeAirDate = rows[0]?.air_date ?? null;
    const lastEpisodeAirDate = rows[rows.length - 1]?.air_date ?? null;
    const firstEpisodeAirMidnight = toEasternMidnightIso(firstEpisodeAirDate);
    const lastEpisodeAirMidnight = toEasternMidnightIso(lastEpisodeAirDate);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row) continue;
      const nextRow = rows[index + 1];
      const rowAirMidnight = toEasternMidnightIso(row.air_date);
      const nextAirMidnight = nextRow ? toEasternMidnightIso(nextRow.air_date) : null;
      bounds.set(`episode-${row.episode_number}`, {
        key: `episode-${row.episode_number}`,
        label: `Episode ${row.episode_number}`,
        start: rowAirMidnight,
        end: nextAirMidnight ?? addDaysUtc(lastEpisodeAirMidnight ?? rowAirMidnight, 7),
        type: "episode",
        source: "fallback",
        episodeNumber: row.episode_number,
      });
    }

    const preseasonEnd = rows[0] ? toEasternMidnightIso(rows[0].air_date) : null;
    if (firstEpisodeAirMidnight || preseasonEnd) {
      bounds.set("period-preseason", {
        key: "period-preseason",
        label: "Pre-Season",
        start: firstEpisodeAirMidnight,
        end: preseasonEnd,
        type: "period",
        source: "fallback",
      });
    }

    const postseasonStart = lastEpisodeAirMidnight;
    const postseasonEnd = addDaysUtc(postseasonStart, 7);
    if (postseasonStart || postseasonEnd) {
      bounds.set("period-postseason", {
        key: "period-postseason",
        label: "Post-Season",
        start: postseasonStart,
        end: postseasonEnd,
        type: "period",
        source: "fallback",
      });
    }
  }

  for (const period of periodOptions) {
    if (period.key === "all-periods") continue;
    const label = period.label.trim();
    const episodeNumber = parseEpisodeNumberFromPeriodLabel(label);
    if (episodeNumber !== null) {
      bounds.set(`episode-${episodeNumber}`, {
        key: `episode-${episodeNumber}`,
        label: `Episode ${episodeNumber}`,
        start: period.start,
        end: period.end,
        type: "episode",
        source: "period",
        episodeNumber,
      });
      continue;
    }
    if (isPreSeasonPeriodLabel(label)) {
      bounds.set("period-preseason", {
        key: "period-preseason",
        label: "Pre-Season",
        start: period.start,
        end: period.end,
        type: "period",
        source: "period",
      });
      continue;
    }
    if (isPostSeasonPeriodLabel(label)) {
      bounds.set("period-postseason", {
        key: "period-postseason",
        label: "Post-Season",
        start: period.start,
        end: period.end,
        type: "period",
        source: "period",
      });
    }
  }

  const firstEpisodeAirDate = rows.find((row) => row.episode_number === 1)?.air_date ?? null;
  const secondEpisodeAirDate = rows.find((row) => row.episode_number === 2)?.air_date ?? null;
  if (firstEpisodeAirDate) {
    const preSeasonEndCutover = toEasternClockIso(firstEpisodeAirDate, 19, 0, 0);
    const episodeOneStartCutover = toEasternClockIso(firstEpisodeAirDate, 19, 1, 1);
    const episodeOneWindow = bounds.get("episode-1");
    const episodeOneEndAnchor =
      secondEpisodeAirDate ??
      episodeOneWindow?.end ??
      addDaysUtc(toEasternMidnightIso(firstEpisodeAirDate), 7);
    const episodeOneEndCutover = toEasternClockIso(episodeOneEndAnchor, 19, 1, 10);

    const preSeasonWindow = bounds.get("period-preseason");
    if (preSeasonWindow && preSeasonEndCutover) {
      bounds.set("period-preseason", { ...preSeasonWindow, end: preSeasonEndCutover });
    }
    if (episodeOneWindow) {
      bounds.set("episode-1", {
        ...episodeOneWindow,
        start: episodeOneStartCutover ?? episodeOneWindow.start,
        end: episodeOneEndCutover ?? episodeOneWindow.end,
      });
    }
  }

  return bounds;
};

/**
 * Parse reddit window context from a show-scoped pathname.  Used as a fallback
 * when the page is rendered from the s[seasonNumber] catch-all route where
 * useParams() returns { showId, seasonNumber: "ocial", rest: [...] } instead
 * of the expected { showId, communitySlug, seasonNumber, windowKey }.
 */
const parseRedditWindowFromPathname = (
  pathname: string,
): {
  showId: string;
  communitySlug: string;
  seasonNumber: number | null;
  windowKey: string;
} | null => {
  const adminWithSeason = pathname.match(
    /^\/admin\/social(?:-media)?\/reddit\/([^/]+)\/([^/]+)\/s(\d{1,3})\/([^/]+)$/,
  );
  if (adminWithSeason) {
    const communitySlug = decodeURIComponent(adminWithSeason[1] ?? "");
    if (communitySlug.toLowerCase() !== "communities") {
      const season = Number.parseInt(adminWithSeason[3] ?? "", 10);
      return {
        showId: decodeURIComponent(adminWithSeason[2] ?? ""),
        communitySlug,
        seasonNumber: Number.isFinite(season) && season > 0 ? season : null,
        windowKey: decodeURIComponent(adminWithSeason[4] ?? ""),
      };
    }
  }
  const adminWithoutSeason = pathname.match(
    /^\/admin\/social(?:-media)?\/reddit\/([^/]+)\/([^/]+)\/([^/]+)$/,
  );
  if (adminWithoutSeason) {
    const communitySlug = decodeURIComponent(adminWithoutSeason[1] ?? "");
    if (communitySlug.toLowerCase() !== "communities") {
      return {
        showId: decodeURIComponent(adminWithoutSeason[2] ?? ""),
        communitySlug,
        seasonNumber: null,
        windowKey: decodeURIComponent(adminWithoutSeason[3] ?? ""),
      };
    }
  }
  // /{showId}/social/reddit/{communitySlug}/s{season}/{windowKey}
  const withSeason = pathname.match(
    /^\/([^/]+)\/social\/reddit\/([^/]+)\/s(\d{1,3})\/([^/]+)$/,
  );
  if (withSeason) {
    const season = Number.parseInt(withSeason[3] ?? "", 10);
    return {
      showId: decodeURIComponent(withSeason[1] ?? ""),
      communitySlug: decodeURIComponent(withSeason[2] ?? ""),
      seasonNumber: Number.isFinite(season) && season > 0 ? season : null,
      windowKey: decodeURIComponent(withSeason[4] ?? ""),
    };
  }
  // /{showId}/social/reddit/{communitySlug}/{windowKey}
  const withoutSeason = pathname.match(
    /^\/([^/]+)\/social\/reddit\/([^/]+)\/([^/]+)$/,
  );
  if (withoutSeason) {
    return {
      showId: decodeURIComponent(withoutSeason[1] ?? ""),
      communitySlug: decodeURIComponent(withoutSeason[2] ?? ""),
      seasonNumber: null,
      windowKey: decodeURIComponent(withoutSeason[3] ?? ""),
    };
  }
  return null;
};

const resolveContainerKeyFromWindowToken = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "w0" || normalized === "period-preseason") return "period-preseason";
  if (normalized === "w-postseason" || normalized === "period-postseason") return "period-postseason";
  const episodeCanonical = normalized.match(/^e(\d+)$/);
  if (episodeCanonical) return `episode-${episodeCanonical[1]}`;
  const episodeLegacy = normalized.match(/^w(\d+)$/);
  if (episodeLegacy) return `episode-${episodeLegacy[1]}`;
  const episodeRaw = normalized.match(/^episode-(\d+)$/);
  if (episodeRaw) return `episode-${episodeRaw[1]}`;
  return null;
};

const toCanonicalWindowToken = (containerKey: string): string => {
  if (containerKey === "period-preseason") return "w0";
  if (containerKey === "period-postseason") return "w-postseason";
  const episode = containerKey.match(/^episode-(\d+)$/i);
  if (episode) return `e${episode[1]}`;
  return containerKey;
};

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("request timed out") ||
    normalized.includes("request aborted") ||
    normalized.includes("operation was aborted") ||
    normalized.includes("signal is aborted")
  );
};

class RequestCancelledError extends Error {
  constructor() {
    super("Request cancelled.");
    this.name = "RequestCancelledError";
  }
}

class RequestTimeoutError extends Error {
  constructor() {
    super("Request timed out.");
    this.name = "RequestTimeoutError";
  }
}

const isRequestCancelledError = (error: unknown): boolean =>
  error instanceof RequestCancelledError ||
  (error instanceof Error && error.message.toLowerCase() === "request cancelled.");

const isRequestTimeoutError = (error: unknown): boolean =>
  error instanceof RequestTimeoutError ||
  (error instanceof Error && error.message.toLowerCase().includes("request timed out"));

const resolverStageMessage = (stage: ResolverStage): string => {
  switch (stage) {
    case "loading_communities":
      return "Resolving community…";
    case "loading_seasons":
      return "Resolving season…";
    case "loading_windows":
      return "Loading period window…";
    case "loading_cache":
      return "Loading cached posts…";
    case "finalizing":
      return "Finalizing week context…";
    case "init":
    default:
      return "Resolving window context…";
  }
};

const TERMINAL_REFRESH_RUN_STATUSES = new Set<RefreshRunStatus>([
  "completed",
  "partial",
  "failed",
  "cancelled",
]);
const DETAIL_SYNC_POLL_INTERVAL_MS = 2_000;
const DETAIL_SYNC_POLL_MAX_ATTEMPTS = 75;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isRefreshRunStatus = (value: unknown): value is RefreshRunStatus =>
  value === "queued" ||
  value === "running" ||
  value === "cancelling" ||
  value === "completed" ||
  value === "partial" ||
  value === "failed" ||
  value === "cancelled";

const parseRefreshRunPayload = (value: unknown): RefreshRunPayload | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const runId = typeof record.run_id === "string" ? record.run_id.trim() : "";
  if (!runId) return null;
  if (!isRefreshRunStatus(record.status)) return null;
  return {
    run_id: runId,
    operation_id: typeof record.operation_id === "string" ? record.operation_id : null,
    execution_owner: typeof record.execution_owner === "string" ? record.execution_owner : null,
    execution_mode_canonical:
      typeof record.execution_mode_canonical === "string" ? record.execution_mode_canonical : null,
    status: record.status,
    error: typeof record.error === "string" ? record.error : null,
    queue_position: typeof record.queue_position === "number" ? record.queue_position : null,
    active_jobs: typeof record.active_jobs === "number" ? record.active_jobs : null,
  };
};

const parseRefreshRunListPayload = (value: unknown): RefreshRunPayload[] => {
  if (!value || typeof value !== "object") return [];
  const runsRaw = (value as { runs?: unknown }).runs;
  if (!Array.isArray(runsRaw)) return [];
  return runsRaw
    .map((entry) => parseRefreshRunPayload(entry))
    .filter((entry): entry is RefreshRunPayload => entry !== null);
};

const shortRunId = (runId: string): string => runId.slice(0, 8);

const buildExecutionSuffix = (run: RefreshRunPayload): string => {
  const parts: string[] = [];
  if (run.execution_owner) {
    parts.push(run.execution_owner === "remote_worker" ? "remote worker" : run.execution_owner);
  }
  if (run.execution_mode_canonical) {
    parts.push(`mode ${run.execution_mode_canonical}`);
  }
  if (run.operation_id) {
    parts.push(`op ${shortRunId(run.operation_id)}`);
  }
  return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
};

const buildDetailRunMessage = (periodLabel: string, run: RefreshRunPayload): string => {
  const executionSuffix = buildExecutionSuffix(run);
  if (run.status === "queued") {
    const queuedAhead =
      typeof run.queue_position === "number" && Number.isFinite(run.queue_position)
        ? ` · queue +${run.queue_position}`
        : "";
    return `${periodLabel}: detail sync queued (run ${shortRunId(run.run_id)}${executionSuffix})${queuedAhead}; showing cached posts while it updates.`;
  }
  if (run.status === "running") {
    const activeJobs =
      typeof run.active_jobs === "number" && Number.isFinite(run.active_jobs)
        ? ` · ${run.active_jobs} active jobs`
        : "";
    return `${periodLabel}: detail sync running in backend (run ${shortRunId(run.run_id)}${executionSuffix})${activeJobs}; showing cached posts while it updates.`;
  }
  if (run.status === "cancelling") {
    return `${periodLabel}: detail sync cancelling (run ${shortRunId(run.run_id)}${executionSuffix}).`;
  }
  if (run.status === "partial") {
    return `${periodLabel}: detail sync completed with partial coverage (run ${shortRunId(run.run_id)}${executionSuffix}).`;
  }
  if (run.status === "completed") {
    return `${periodLabel}: detail sync completed (run ${shortRunId(run.run_id)}${executionSuffix}).`;
  }
  return `${periodLabel}: detail sync ${run.status} (run ${shortRunId(run.run_id)}${executionSuffix}).`;
};

const classifyResolverError = (error: unknown): string => {
  if (isRequestTimeoutError(error)) {
    return "Request timed out while resolving window context.";
  }
  const message = error instanceof Error ? error.message : "Failed to resolve window context.";
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("not authenticated")) {
    return "Not authenticated. Sign in again.";
  }
  if (normalized.includes("invalid or missing window key")) {
    return "Invalid or missing window key.";
  }
  if (
    normalized.includes("unable to resolve reddit community") ||
    normalized.includes("community not found")
  ) {
    return "Community not found for this window.";
  }
  return message;
};

async function fetchAdminJsonWithTimeout<T>({
  url,
  method = "GET",
  preferredUser,
  timeoutMs,
  signal,
  headers,
}: {
  url: string;
  method?: "GET" | "POST";
  preferredUser: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
}): Promise<{ ok: boolean; status: number; payload: T & { error?: string; detail?: string } }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, timeoutMs);
  const onAbort = () => {
    controller.abort((signal as AbortSignal & { reason?: unknown })?.reason ?? new DOMException("Request cancelled", "AbortError"));
  };
  if (signal) {
    if (signal.aborted) {
      controller.abort((signal as AbortSignal & { reason?: unknown })?.reason ?? new DOMException("Request cancelled", "AbortError"));
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    const response = await fetchAdminWithAuth(
      url,
      {
        method,
        headers,
        signal: controller.signal,
      },
      { preferredUser: preferredUser as never, allowDevAdminBypass: true },
    );
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    if (isAbortLikeError(error)) {
      if (signal?.aborted) throw new RequestCancelledError();
      throw new RequestTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}

function AdminRedditWindowPostsPageContent() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{
    showId?: string;
    showSlug?: string;
    seasonNumber?: string;
    communitySlug?: string;
    communityId?: string;
    windowKey?: string;
  }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const detailRunFlowScope = useMemo(() => `reddit-window-details:${pathname}`, [pathname]);
  const detailOperationFlowScope = useMemo(
    () => `operation:${detailRunFlowScope}`,
    [detailRunFlowScope],
  );
  const detailRunFlowKey = useMemo(
    () => getOrCreateAdminRunFlowKey(detailRunFlowScope),
    [detailRunFlowScope],
  );
  const canonicalRedirectRef = useRef<string | null>(null);
  const activeResolveAbortRef = useRef<AbortController | null>(null);
  const resolveInFlightRef = useRef(false);
  const activeResolveSignatureRef = useRef<string | null>(null);
  const lastResolvedSignatureRef = useRef<string | null>(null);
  const activeLoadAbortRef = useRef<AbortController | null>(null);
  const activeDetailsPollAbortRef = useRef<AbortController | null>(null);
  const detailsPollTokenRef = useRef(0);
  const detailsResumeAttemptRef = useRef<string | null>(null);
  const effectiveDiscoveryRef = useRef<DiscoveryPayload | null>(null);

  const [context, setContext] = useState<WindowContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [resolverStage, setResolverStage] = useState<ResolverStage>("init");
  const [contextError, setContextError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryPayload | null>(null);
  const [detailRunId, setDetailRunId] = useState<string | null>(null);
  const [detailResumeBanner, setDetailResumeBanner] = useState<string | null>(null);
  const [manualAttachRuns, setManualAttachRuns] = useState<RefreshRunPayload[]>([]);
  const [selectedManualAttachRunId, setSelectedManualAttachRunId] = useState("");
  useAdminOperationUnloadGuard();

  const queryWindowKey = searchParams.get("windowKey") ?? searchParams.get("window_key");
  const queryContainerKey = searchParams.get("container_key");
  const queryCommunitySlug = searchParams.get("community_slug") ?? searchParams.get("communitySlug");
  const queryCommunityId = searchParams.get("community_id");
  const querySeasonId = searchParams.get("season_id");
  const querySeason = searchParams.get("season");
  const queryPeriodLabel = searchParams.get("period_label");
  const queryPeriodStart = searchParams.get("period_start");
  const queryPeriodEnd = searchParams.get("period_end");
  const queryShowSlug = searchParams.get("showSlug") ?? searchParams.get("show");
  const isDirectWindowHelperRoute = /^\/admin\/reddit-window-posts\/?$/i.test(pathname);

  const resolveSignature = useMemo(
    () =>
      [
        params.showId ?? "",
        params.seasonNumber ?? "",
        params.communitySlug ?? "",
        params.communityId ?? "",
        params.windowKey ?? "",
        queryShowSlug ?? "",
        querySeason ?? "",
        querySeasonId ?? "",
        queryCommunitySlug ?? "",
        queryCommunityId ?? "",
        queryWindowKey ?? "",
        queryContainerKey ?? "",
      ].join("|"),
    [
      params.communityId,
      params.communitySlug,
      params.seasonNumber,
      params.showId,
      params.windowKey,
      queryCommunityId,
      queryCommunitySlug,
      queryContainerKey,
      querySeason,
      querySeasonId,
      queryShowSlug,
      queryWindowKey,
    ],
  );

  const resolveWindowContext = useCallback(async () => {
    if (!user || !hasAccess) return;
    if (lastResolvedSignatureRef.current === resolveSignature) return;
    if (resolveInFlightRef.current && activeResolveSignatureRef.current === resolveSignature) return;
    if (activeResolveAbortRef.current && activeResolveSignatureRef.current !== resolveSignature) {
      activeResolveAbortRef.current.abort(new DOMException("Request cancelled", "AbortError"));
      activeResolveAbortRef.current = null;
    }

    const resolveController = new AbortController();
    activeResolveAbortRef.current = resolveController;
    activeResolveSignatureRef.current = resolveSignature;
    resolveInFlightRef.current = true;
    lastResolvedSignatureRef.current = resolveSignature;

    setContextLoading(true);
    setResolverStage("loading_communities");
    setContextError(null);
    setWarning(null);
    effectiveDiscoveryRef.current = null;

    try {
      // Parse from pathname as fallback when rendered from the s[seasonNumber]
      // catch-all route where useParams() returns { showId, seasonNumber: "ocial",
      // rest: [...] } instead of { showId, communitySlug, seasonNumber, windowKey }.
      const parsedFromPathname = parseRedditWindowFromPathname(pathname);

      const token = params.windowKey ?? queryWindowKey ?? parsedFromPathname?.windowKey;
      const fallbackContainerKey = queryContainerKey;
      const containerKey =
        resolveContainerKeyFromWindowToken(fallbackContainerKey) ?? resolveContainerKeyFromWindowToken(token);
      if (!containerKey) {
        throw new Error("Invalid or missing window key.");
      }

      const legacyCommunityId = queryCommunityId;
      const pathCommunityId = params.communityId ? decodeURIComponent(params.communityId).trim() : null;
      const legacySeasonId = querySeasonId;
      const legacyPeriodLabel = queryPeriodLabel;
      const legacyPeriodStart = queryPeriodStart;
      const legacyPeriodEnd = queryPeriodEnd;

      const pathCommunitySlug = normalizeCommunitySlug(
        params.communitySlug ?? params.communityId ?? parsedFromPathname?.communitySlug ?? null,
      );
      const queryCommunitySlugNormalized = normalizeCommunitySlug(queryCommunitySlug);
      const communitySlugCandidates = [pathCommunitySlug, queryCommunitySlugNormalized]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      const pathShowSlug =
        (params.showSlug ?? "").trim() || (params.showId ?? "").trim() || parsedFromPathname?.showId || null;
      let showSlug = pathShowSlug ?? (queryShowSlug?.trim() || null);
      let seasonNumber = toInt(params.seasonNumber ?? querySeason) ?? parsedFromPathname?.seasonNumber ?? null;

      const communitiesResponse = await fetchAdminJsonWithTimeout<{
        communities?: RedditCommunityListItem[];
        error?: string;
      }>({
        url: "/api/admin/reddit/communities?include_inactive=1&include_assigned_threads=0",
        timeoutMs: 8_000,
        preferredUser: user,
        signal: resolveController.signal,
      });
      if (!communitiesResponse.ok) {
        throw new Error(communitiesResponse.payload.error ?? "Failed to load reddit communities");
      }
      const communities = Array.isArray(communitiesResponse.payload.communities)
        ? communitiesResponse.payload.communities
        : [];

      const selectedCommunity =
        communities.find((community) => community.id === legacyCommunityId) ??
        communities.find((community) => community.id === pathCommunityId) ??
        communities.find((community) => {
          const normalizedSubreddit = normalizeCommunitySlug(community.subreddit)?.toLowerCase() ?? "";
          return normalizedSubreddit.length > 0 && communitySlugCandidates.includes(normalizedSubreddit);
        }) ??
        null;
      if (!selectedCommunity) {
        throw new Error("Unable to resolve reddit community for this window.");
      }

      const communitySlug = normalizeCommunitySlug(selectedCommunity.subreddit) ?? selectedCommunity.subreddit;
      if (!showSlug) {
        showSlug = slugifyShowName(selectedCommunity.trr_show_name);
      }

      setResolverStage("loading_seasons");
      const seasonsResponse = await fetchAdminJsonWithTimeout<{
        seasons?: ShowSeasonOption[];
        error?: string;
      }>({
        url: `/api/admin/trr-api/shows/${selectedCommunity.trr_show_id}/seasons?limit=100&include_episode_signal=true`,
        timeoutMs: 8_000,
        preferredUser: user,
        signal: resolveController.signal,
      });
      if (!seasonsResponse.ok) {
        throw new Error(seasonsResponse.payload.error ?? "Failed to load show seasons");
      }
      const seasons = Array.isArray(seasonsResponse.payload.seasons) ? seasonsResponse.payload.seasons : [];
      if (seasons.length === 0) {
        throw new Error("No seasons found for this show.");
      }

      let resolvedSeason: ShowSeasonOption | null = null;
      if (legacySeasonId) {
        resolvedSeason = seasons.find((season) => season.id === legacySeasonId) ?? null;
      }
      if (!resolvedSeason && seasonNumber) {
        resolvedSeason = seasons.find((season) => season.season_number === seasonNumber) ?? null;
      }
      if (!resolvedSeason) {
        resolvedSeason = [...seasons].sort((a, b) => b.season_number - a.season_number)[0] ?? null;
      }
      if (!resolvedSeason?.id) {
        throw new Error("Unable to resolve season context for this window.");
      }
      seasonNumber = resolvedSeason.season_number;

      let resolvedLabel = legacyPeriodLabel?.trim() || "";
      let resolvedStart = legacyPeriodStart?.trim() || "";
      let resolvedEnd = legacyPeriodEnd?.trim() || "";
      let resolvedPeriodSource: WindowContext["periodSource"] =
        resolvedLabel || resolvedStart || resolvedEnd ? "legacy" : "fallback";
      let requiresDiscoveryLookup = false;
      let prefetchedDiscovery: DiscoveryPayload | null = null;

      if (!resolvedLabel || !resolvedStart || !resolvedEnd) {
        setResolverStage("loading_windows");
        const [seasonEpisodesResult, analyticsResult] = await Promise.allSettled([
          fetchAdminJsonWithTimeout<{
            episodes?: Array<{
              id?: string | null;
              episode_number?: number | string | null;
              air_date?: string | null;
            }>;
            error?: string;
          }>({
            url: `/api/admin/trr-api/seasons/${resolvedSeason.id}/episodes?limit=250&offset=0`,
            timeoutMs: 8_000,
            preferredUser: user,
            signal: resolveController.signal,
          }),
          fetchAdminJsonWithTimeout<{
            weekly?: SocialAnalyticsPeriodRow[];
            summary?: { window?: { start?: string | null; end?: string | null } };
            window?: { start?: string | null; end?: string | null };
            error?: string;
          }>({
            url: `/api/admin/trr-api/shows/${selectedCommunity.trr_show_id}/seasons/${resolvedSeason.season_number}/social/analytics?season_id=${encodeURIComponent(resolvedSeason.id)}`,
            timeoutMs: 8_000,
            preferredUser: user,
            signal: resolveController.signal,
          }),
        ]);

        const seasonEpisodes =
          seasonEpisodesResult.status === "fulfilled" && seasonEpisodesResult.value.ok
            ? (Array.isArray(seasonEpisodesResult.value.payload.episodes)
                ? seasonEpisodesResult.value.payload.episodes
                : []
              )
                .map((episode) => {
                  const parsedEpisodeNumber =
                    typeof episode.episode_number === "number"
                      ? Math.trunc(episode.episode_number)
                      : typeof episode.episode_number === "string"
                        ? Number.parseInt(episode.episode_number, 10)
                        : Number.NaN;
                  if (!Number.isFinite(parsedEpisodeNumber) || parsedEpisodeNumber <= 0) {
                    return null;
                  }
                  return {
                    id:
                      typeof episode.id === "string" && episode.id.trim().length > 0
                        ? episode.id
                        : `episode-${parsedEpisodeNumber}`,
                    episode_number: parsedEpisodeNumber,
                    air_date:
                      typeof episode.air_date === "string" && episode.air_date.trim().length > 0
                        ? episode.air_date
                        : null,
                  } satisfies SeasonEpisodeRow;
                })
                .filter((episode): episode is SeasonEpisodeRow => episode !== null)
            : [];

        const periodOptions =
          analyticsResult.status === "fulfilled" && analyticsResult.value.ok
            ? buildPeriodOptions(
                Array.isArray(analyticsResult.value.payload.weekly)
                  ? analyticsResult.value.payload.weekly
                  : [],
              )
            : [];
        requiresDiscoveryLookup =
          analyticsResult.status === "fulfilled" &&
          !analyticsResult.value.ok &&
          periodOptions.length === 0;
        const derivedBounds = buildEpisodeWindowBounds(seasonEpisodes, periodOptions).get(containerKey) ?? null;
        if (derivedBounds) {
          resolvedLabel = resolvedLabel || derivedBounds.label;
          resolvedStart = resolvedStart || derivedBounds.start || "";
          resolvedEnd = resolvedEnd || derivedBounds.end || "";
          resolvedPeriodSource = derivedBounds.source ?? "fallback";
        }
      }

      setResolverStage("finalizing");
      if (!resolvedLabel) {
        resolvedLabel = containerKey === "period-preseason"
          ? "Pre-Season"
          : containerKey === "period-postseason"
            ? "Post-Season"
            : containerKey.replace("episode-", "Episode ");
      }
      if (requiresDiscoveryLookup) {
        const discoveryParams = new URLSearchParams({
          season_id: resolvedSeason.id,
          container_key: containerKey,
          period_label: resolvedLabel,
          exhaustive: "true",
          search_backfill: "true",
          max_pages: "500",
          coverage_mode: containerKey === "period-preseason" ? "adaptive_deep" : "standard",
        });
        if (resolvedStart) {
          discoveryParams.set("period_start", resolvedStart);
        }
        if (resolvedEnd) {
          discoveryParams.set("period_end", resolvedEnd);
        }
        const discoveryResponse = await fetchAdminJsonWithTimeout<{
          discovery?: DiscoveryPayload | null;
          error?: string;
        }>({
          url: `/api/admin/reddit/%63ommunities/${selectedCommunity.id}/discover?${discoveryParams.toString()}`,
          timeoutMs: 12_000,
          preferredUser: user,
          signal: resolveController.signal,
        });
        if (!discoveryResponse.ok) {
          throw new Error(discoveryResponse.payload.error ?? "Failed to load window posts");
        }
        prefetchedDiscovery = discoveryResponse.payload.discovery ?? null;
      }
      effectiveDiscoveryRef.current = prefetchedDiscovery;
      setContext({
        communityId: selectedCommunity.id,
        seasonId: resolvedSeason.id,
        seasonNumber: resolvedSeason.season_number,
        showSlug,
        showName: selectedCommunity.trr_show_name,
        communitySlug,
        subreddit: selectedCommunity.subreddit,
        containerKey,
        periodLabel: resolvedLabel,
        periodStart: resolvedStart || null,
        periodEnd: resolvedEnd || null,
        periodSource: resolvedPeriodSource,
        requiresDiscoveryLookup,
        isShowFocused: selectedCommunity.is_show_focused !== false,
        analysisAllFlairs: Array.isArray(selectedCommunity.analysis_all_flairs)
          ? selectedCommunity.analysis_all_flairs
          : [],
      });
      setDiscovery(prefetchedDiscovery);
    } catch (resolveError) {
      if (isRequestCancelledError(resolveError)) return;
      if (lastResolvedSignatureRef.current === resolveSignature) {
        lastResolvedSignatureRef.current = null;
      }
      effectiveDiscoveryRef.current = null;
      setContextError(classifyResolverError(resolveError));
      setContext(null);
    } finally {
      if (activeResolveAbortRef.current === resolveController) {
        activeResolveAbortRef.current = null;
      }
      if (activeResolveSignatureRef.current === resolveSignature) {
        activeResolveSignatureRef.current = null;
      }
      resolveInFlightRef.current = false;
      setContextLoading(false);
      setResolverStage("init");
    }
  }, [
    hasAccess,
    params.communityId,
    params.communitySlug,
    params.seasonNumber,
    params.showId,
    params.showSlug,
    params.windowKey,
    pathname,
    queryCommunityId,
    queryCommunitySlug,
    queryContainerKey,
    queryPeriodEnd,
    queryPeriodLabel,
    queryPeriodStart,
    querySeason,
    querySeasonId,
    queryShowSlug,
    queryWindowKey,
    resolveSignature,
    user,
  ]);

  const loadWindowPosts = useCallback(
    async (refresh: boolean) => {
      if (!user || !hasAccess || !context) return;
      activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      const loadController = new AbortController();
      activeLoadAbortRef.current = loadController;
      setLoading(true);
      setError(null);
      setWarning(null);
      if (!refresh) {
        setResolverStage("loading_cache");
      }
      try {
        const paramsObj = new URLSearchParams({
          season_id: context.seasonId,
          container_key: context.containerKey,
          period_label: context.periodLabel,
          exhaustive: "true",
          search_backfill: "true",
          max_pages: "500",
          coverage_mode: context.containerKey === "period-preseason" ? "adaptive_deep" : "standard",
        });
        if (context.periodStart) {
          paramsObj.set("period_start", context.periodStart);
        }
        if (context.periodEnd) {
          paramsObj.set("period_end", context.periodEnd);
        }
        if (refresh) {
          const isPreOrPostSeason =
            context.containerKey === "period-preseason" || context.containerKey === "period-postseason";
          if (!isPreOrPostSeason && !context.periodStart && !context.periodEnd) {
            throw new Error(
              "Window boundaries are unavailable right now. Open the community season view and sync from the period card.",
            );
          }
          paramsObj.set("refresh", "true");
          paramsObj.set("wait", "true");
          paramsObj.set("mode", "sync_full");
        }

        const response = await fetchAdminJsonWithTimeout<{
          discovery?: DiscoveryPayload | null;
          warning?: string;
          error?: string;
        }>({
          url: `/api/admin/reddit/%63ommunities/${context.communityId}/discover?${paramsObj.toString()}`,
          timeoutMs: 12_000,
          preferredUser: user,
          signal: loadController.signal,
        });
        if (!response.ok) {
          throw new Error(response.payload.error ?? "Failed to load window posts");
        }
        const discoveryPayload = response.payload.discovery ?? null;
        const discoveryHasWindowBounds = Boolean(
          discoveryPayload?.window_start || discoveryPayload?.window_end,
        );
        const shouldRedirectHelperRoute =
          isDirectWindowHelperRoute &&
          ((!discoveryPayload &&
            context.requiresDiscoveryLookup &&
            Boolean(context.periodStart || context.periodEnd)) ||
            (Boolean(discoveryPayload) && !discoveryHasWindowBounds));
        effectiveDiscoveryRef.current =
          shouldRedirectHelperRoute && discoveryPayload
            ? {
                ...discoveryPayload,
                threads: [],
              }
            : discoveryPayload;
        setDiscovery(
          shouldRedirectHelperRoute && discoveryPayload
            ? {
                ...discoveryPayload,
                threads: [],
              }
            : discoveryPayload,
        );
        setWarning(response.payload.warning ?? null);

        // Backfill period dates from discovery window when context has no dates.
        if (discoveryPayload && (!context.periodStart || !context.periodEnd)) {
          const backfilledStart = discoveryPayload.window_start ?? null;
          const backfilledEnd = discoveryPayload.window_end ?? null;
          if (backfilledStart || backfilledEnd) {
            setContext((prev) =>
              prev
                ? {
                    ...prev,
                    periodStart: prev.periodStart || backfilledStart,
                    periodEnd: prev.periodEnd || backfilledEnd,
                  }
                : prev,
            );
          }
        }
        if (shouldRedirectHelperRoute) {
          const canonicalPath = buildAdminRedditCommunityWindowUrl({
            communitySlug: context.communitySlug,
            showSlug: context.showSlug,
            seasonNumber: context.seasonNumber,
            windowKey: toCanonicalWindowToken(context.containerKey),
          });
          if (canonicalRedirectRef.current !== canonicalPath) {
            canonicalRedirectRef.current = canonicalPath;
            router.replace(canonicalPath as Route);
          }
        }
      } catch (loadError) {
        if (isRequestCancelledError(loadError)) return;
        if (isRequestTimeoutError(loadError)) {
          setError("Request timed out while loading cached posts.");
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load window posts");
      } finally {
        if (activeLoadAbortRef.current === loadController) {
          activeLoadAbortRef.current = null;
        }
        setLoading(false);
        if (!refresh) {
          setResolverStage("init");
        }
      }
    },
    [context, hasAccess, isDirectWindowHelperRoute, router, user],
  );

  const detailsSyncing = false;
  const detailRunHeaders = useMemo(
    () => ({ "x-trr-flow-key": detailRunFlowKey }),
    [detailRunFlowKey],
  );

  const fetchRefreshRunStatus = useCallback(
    async (runId: string, signal?: AbortSignal): Promise<RefreshRunPayload> => {
      const response = await fetchAdminJsonWithTimeout<Record<string, unknown>>({
        url: `/api/admin/reddit/runs/${runId}`,
        timeoutMs: 20_000,
        preferredUser: user,
        signal,
        headers: detailRunHeaders,
      });
      if (!response.ok) {
        throw new Error(response.payload.error ?? "Failed to fetch reddit refresh run status");
      }
      const run = parseRefreshRunPayload(response.payload);
      if (!run) {
        throw new Error("Invalid reddit refresh run status payload.");
      }
      return run;
    },
    [detailRunHeaders, user],
  );

  const fetchOperationStatus = useCallback(
    async (
      operationId: string,
      signal?: AbortSignal,
    ): Promise<{ status: CanonicalOperationStatus; error: string | null }> => {
      const response = await fetchAdminJsonWithTimeout<Record<string, unknown>>({
        url: `/api/admin/trr-api/operations/${encodeURIComponent(operationId)}`,
        timeoutMs: 20_000,
        preferredUser: user,
        signal,
        headers: detailRunHeaders,
      });
      if (!response.ok) {
        throw new Error(response.payload.error ?? "Failed to fetch operation status");
      }
      const status = canonicalizeOperationStatus(response.payload.status, "running");
      return {
        status,
        error: typeof response.payload.error === "string" ? response.payload.error : null,
      };
    },
    [detailRunHeaders, user],
  );

  const fetchManualAttachRuns = useCallback(async () => {
    if (!context || !hasAccess || !user) {
      setManualAttachRuns([]);
      setSelectedManualAttachRunId("");
      return;
    }
    const params = new URLSearchParams({
      community_id: context.communityId,
      season_id: context.seasonId,
      period_key: context.containerKey,
      status: "queued,running,cancelling",
      limit: "25",
    });
    try {
      const response = await fetchAdminJsonWithTimeout<Record<string, unknown>>({
        url: `/api/admin/reddit/runs?${params.toString()}`,
        timeoutMs: 20_000,
        preferredUser: user,
        headers: detailRunHeaders,
      });
      if (!response.ok) {
        setManualAttachRuns([]);
        setSelectedManualAttachRunId("");
        return;
      }
      const runs = parseRefreshRunListPayload(response.payload).filter((run) => run.run_id !== detailRunId);
      setManualAttachRuns(runs);
      setSelectedManualAttachRunId((currentSelected) => {
        if (runs.length === 0) return "";
        if (runs.some((run) => run.run_id === currentSelected)) return currentSelected;
        return runs[0]?.run_id ?? "";
      });
    } catch {
      setManualAttachRuns([]);
      setSelectedManualAttachRunId("");
    }
  }, [context, detailRunHeaders, detailRunId, hasAccess, user]);

  const pollDetailSyncRun = useCallback(
    async (runId: string, periodLabel: string, operationId?: string | null) => {
      upsertAdminRunSession(detailRunFlowScope, {
        runId,
        flowKey: detailRunFlowKey,
        status: "active",
      });
      if (operationId) {
        upsertAdminOperationSession(detailOperationFlowScope, {
          flowKey: detailRunFlowKey,
          input: "/api/admin/reddit/communities/[communityId]/discover",
          method: "GET",
          operationId,
          runId,
          status: "active",
        });
      }
      setDetailRunId(runId);
      setManualAttachRuns((current) => current.filter((run) => run.run_id !== runId));
      setSelectedManualAttachRunId("");
      detailsPollTokenRef.current += 1;
      const token = detailsPollTokenRef.current;
      activeDetailsPollAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      const pollController = new AbortController();
      activeDetailsPollAbortRef.current = pollController;

      try {
        for (let attempt = 0; attempt < DETAIL_SYNC_POLL_MAX_ATTEMPTS; attempt += 1) {
          if (detailsPollTokenRef.current !== token) return;
          if (operationId) {
            try {
              const operation = await fetchOperationStatus(operationId, pollController.signal);
              if (detailsPollTokenRef.current !== token) return;
              if (operation.status === "queued" || operation.status === "running" || operation.status === "cancelling") {
                setWarning(`${periodLabel}: detail sync ${operation.status} (operation ${operationId.slice(0, 8)}).`);
                await sleep(DETAIL_SYNC_POLL_INTERVAL_MS);
                continue;
              }
              if (operation.status === "failed" || operation.status === "cancelled") {
                markAdminOperationSessionStatus(detailOperationFlowScope, operation.status === "failed" ? "failed" : "cancelled");
                markAdminRunSessionStatus(
                  detailRunFlowScope,
                  operation.status === "cancelled" ? "cancelled" : "failed",
                );
                setDetailRunId(null);
                throw new Error(operation.error || `Detail sync ${operation.status}.`);
              }
              markAdminOperationSessionStatus(detailOperationFlowScope, "completed");
              markAdminRunSessionStatus(detailRunFlowScope, "completed");
              setDetailRunId(null);
              await loadWindowPosts(false);
              await fetchManualAttachRuns();
              setWarning(`${periodLabel}: detail sync completed (operation ${operationId.slice(0, 8)}).`);
              return;
            } catch (operationError) {
              if (isRequestCancelledError(operationError)) return;
            }
          }
          const run = await fetchRefreshRunStatus(runId, pollController.signal);
          if (detailsPollTokenRef.current !== token) return;
          setWarning(buildDetailRunMessage(periodLabel, run));

          if (!TERMINAL_REFRESH_RUN_STATUSES.has(run.status)) {
            await sleep(DETAIL_SYNC_POLL_INTERVAL_MS);
            continue;
          }

          if (run.status === "failed" || run.status === "cancelled") {
            if (operationId) {
              markAdminOperationSessionStatus(
                detailOperationFlowScope,
                run.status === "cancelled" ? "cancelled" : "failed",
              );
            }
            markAdminRunSessionStatus(
              detailRunFlowScope,
              run.status === "cancelled" ? "cancelled" : "failed",
            );
            setDetailRunId(null);
            throw new Error(run.error || `Detail sync ${run.status}.`);
          }

          if (operationId) {
            markAdminOperationSessionStatus(detailOperationFlowScope, "completed");
          }
          markAdminRunSessionStatus(detailRunFlowScope, "completed");
          setDetailRunId(null);
          await loadWindowPosts(false);
          await fetchManualAttachRuns();
          setWarning(buildDetailRunMessage(periodLabel, run));
          return;
        }

        throw new Error(
          `${periodLabel}: detail sync is still running. Keep this page open or check again shortly.`,
        );
      } catch (pollError) {
        if (isRequestCancelledError(pollError)) return;
        if (operationId) {
          markAdminOperationSessionStatus(detailOperationFlowScope, "failed");
        }
        markAdminRunSessionStatus(detailRunFlowScope, "failed");
        setDetailRunId(null);
        setError(
          pollError instanceof Error
            ? pollError.message
            : `Failed to monitor detail sync for ${periodLabel}.`,
        );
      } finally {
        if (activeDetailsPollAbortRef.current === pollController) {
          activeDetailsPollAbortRef.current = null;
        }
      }
    },
    [
      detailOperationFlowScope,
      detailRunFlowKey,
      detailRunFlowScope,
      fetchOperationStatus,
      fetchManualAttachRuns,
      fetchRefreshRunStatus,
      loadWindowPosts,
    ],
  );

  const handleManualAttachRun = useCallback(async () => {
    const runId = selectedManualAttachRunId.trim();
    if (!runId || !context) return;
    const selectedRun = manualAttachRuns.find((run) => run.run_id === runId) ?? null;
    setError(null);
    setDetailResumeBanner(`Attached to run ${runId.slice(0, 8)}.`);
    await pollDetailSyncRun(runId, context.periodLabel, selectedRun?.operation_id ?? undefined);
  }, [context, manualAttachRuns, pollDetailSyncRun, selectedManualAttachRunId]);

  useEffect(() => {
    if (!context || !hasAccess || !user) return;
    void fetchManualAttachRuns();
  }, [context, fetchManualAttachRuns, hasAccess, user]);

  useEffect(() => {
    if (!context || !hasAccess || !user) return;
    if (detailsResumeAttemptRef.current === detailRunFlowScope) return;
    detailsResumeAttemptRef.current = detailRunFlowScope;
    const resumableRun = getAutoResumableAdminRunSession(detailRunFlowScope);
    const resumableOperation = getAutoResumableAdminOperationSession(detailOperationFlowScope);
    const resumedRunId = resumableRun?.runId ?? resumableOperation?.runId ?? null;
    if (!resumedRunId) return;
    setDetailResumeBanner(`Resumed same-tab run ${resumedRunId.slice(0, 8)}.`);
    setWarning(`${context.periodLabel}: reconnecting to run ${resumedRunId.slice(0, 8)}.`);
    void pollDetailSyncRun(resumedRunId, context.periodLabel, resumableOperation?.operationId ?? undefined);
  }, [context, detailOperationFlowScope, detailRunFlowScope, hasAccess, pollDetailSyncRun, user]);

  const [approvingPostIds, setApprovingPostIds] = useState<Set<string>>(new Set());

  const handleSetAdminApproved = useCallback(
    async (redditPostId: string, approved: boolean | null) => {
      if (!context || !user) return;
      setApprovingPostIds((prev) => new Set(prev).add(redditPostId));
      try {
        const headers = await (async () => {
          const token = await user.getIdToken();
          return { Authorization: `Bearer ${token}` };
        })();
        const response = await fetch("/api/admin/reddit/post-matches", {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            community_id: context.communityId,
            season_id: context.seasonId,
            period_key: context.containerKey,
            reddit_post_id: redditPostId,
            admin_approved: approved,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to update approval");
        }
        // Optimistic update on the discovery threads
        setDiscovery((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            threads: prev.threads.map((t) =>
              t.reddit_post_id === redditPostId ? { ...t, admin_approved: approved } : t,
            ),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update post approval");
      } finally {
        setApprovingPostIds((prev) => {
          const next = new Set(prev);
          next.delete(redditPostId);
          return next;
        });
      }
    },
    [context, user],
  );

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void resolveWindowContext();
  }, [checking, hasAccess, resolveWindowContext, resolveSignature, user]);

  useEffect(() => {
    detailsResumeAttemptRef.current = null;
    setDetailRunId(null);
    setDetailResumeBanner(null);
    setManualAttachRuns([]);
    setSelectedManualAttachRunId("");
  }, [detailRunFlowScope]);

  useEffect(
    () => () => {
      activeResolveAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeResolveAbortRef.current = null;
      resolveInFlightRef.current = false;
      activeLoadAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeLoadAbortRef.current = null;
      activeDetailsPollAbortRef.current?.abort(new DOMException("Request cancelled", "AbortError"));
      activeDetailsPollAbortRef.current = null;
      detailsPollTokenRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!context || !hasAccess || !user) return;
    if (isDirectWindowHelperRoute) return;

    const canonicalPath = buildAdminRedditCommunityWindowUrl({
      communitySlug: context.communitySlug,
      showSlug: context.showSlug,
      seasonNumber: context.seasonNumber,
      windowKey: toCanonicalWindowToken(context.containerKey),
    });
    if (pathname !== canonicalPath && canonicalRedirectRef.current !== canonicalPath) {
      canonicalRedirectRef.current = canonicalPath;
      router.replace(canonicalPath as Route);
      return;
    }
    void loadWindowPosts(false);
  }, [context, hasAccess, isDirectWindowHelperRoute, loadWindowPosts, pathname, router, user]);

  const effectiveDiscovery = discovery ?? effectiveDiscoveryRef.current;

  useEffect(() => {
    if (!context || !hasAccess || !user || !isDirectWindowHelperRoute) return;

    const canonicalPath = buildAdminRedditCommunityWindowUrl({
      communitySlug: context.communitySlug,
      showSlug: context.showSlug,
      seasonNumber: context.seasonNumber,
      windowKey: toCanonicalWindowToken(context.containerKey),
    });

    if (canonicalRedirectRef.current === canonicalPath) return;

    if (!effectiveDiscovery) {
      const shouldLoadHelperDiscovery =
        context.requiresDiscoveryLookup || context.periodSource === "fallback";
      if (shouldLoadHelperDiscovery) {
        if (!loading) {
          void loadWindowPosts(false);
        }
        return;
      }
      if (context.periodStart || context.periodEnd) {
        canonicalRedirectRef.current = canonicalPath;
        router.replace(canonicalPath as Route);
      }
      return;
    }

    if (effectiveDiscovery.window_start || effectiveDiscovery.window_end) {
      return;
    }

    if (context.periodStart || context.periodEnd) {
      setDiscovery((prev) => {
        if (!prev || prev.window_start || prev.window_end || prev.threads.length === 0) {
          return prev;
        }
        return {
          ...prev,
          threads: [],
        };
      });
      if (canonicalRedirectRef.current === canonicalPath) return;
      canonicalRedirectRef.current = canonicalPath;
      router.replace(canonicalPath as Route);
      return;
    }

    if (!loading) {
      void loadWindowPosts(false);
    }
  }, [context, effectiveDiscovery, hasAccess, isDirectWindowHelperRoute, loadWindowPosts, loading, router, user]);

  const showHref = context ? buildShowAdminUrl({ showSlug: context.showSlug }) : "/shows";
  const seasonHref = context
    ? buildSeasonAdminUrl({
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
      })
    : showHref;
  const redditHref = context
    ? buildShowRedditUrl({
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
      })
    : "/admin/social";
  const communityHref = context
    ? buildAdminRedditCommunityUrl({
        communitySlug: context.communitySlug,
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
      })
    : redditHref;
  const buildPostDetailsHref = useCallback(
    (thread: Pick<DiscoveryThread, "reddit_post_id" | "title" | "author">): string | null => {
      if (!context) return null;
      const normalizedPostId = thread.reddit_post_id.trim();
      if (!normalizedPostId) return null;
      const windowHref = buildAdminRedditCommunityWindowUrl({
        communitySlug: context.communitySlug,
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
        windowKey: toCanonicalWindowToken(context.containerKey),
      });
      const detailHref = buildAdminRedditCommunityWindowPostUrl({
        communitySlug: context.communitySlug,
        showSlug: context.showSlug,
        seasonNumber: context.seasonNumber,
        windowKey: toCanonicalWindowToken(context.containerKey),
        postId: normalizedPostId,
        title: thread.title,
        author: thread.author,
      });
      if (detailHref === windowHref) return detailHref;
      const detailSlug = detailHref.slice(windowHref.length + 1);
      return `${windowHref}/${encodeURIComponent(normalizedPostId)}/${detailSlug}`;
    },
    [context],
  );

  const breadcrumbs = useMemo(
    () =>
      buildSeasonSocialBreadcrumb(context?.showName ?? "Show", context?.seasonNumber ?? "", {
        showHref,
        seasonHref,
        socialHref: redditHref,
        subTabLabel: "Reddit Analytics",
        subTabHref: communityHref,
      }),
    [communityHref, context?.seasonNumber, context?.showName, redditHref, seasonHref, showHref],
  );
  const seasonLinks = SEASON_TABS.map((tab) => ({
    key: tab.tab,
    label: tab.label,
    href: context
      ? buildSeasonAdminUrl({
          showSlug: context.showSlug,
          seasonNumber: context.seasonNumber,
          tab: tab.tab,
        })
      : null,
    isActive: tab.tab === "social",
  }));
  const socialLinks = SOCIAL_TABS.map((tab) => ({
    key: tab.view,
    label: tab.label,
    href:
      context && tab.view === "reddit"
        ? buildShowRedditUrl({
            showSlug: context.showSlug,
            seasonNumber: context.seasonNumber,
          })
        : context
          ? buildSeasonAdminUrl({
              showSlug: context.showSlug,
              seasonNumber: context.seasonNumber,
              tab: "social",
              socialView: tab.view,
            })
          : null,
    isActive: tab.view === "reddit",
  }));

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Loading admin access…</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Admin access is required to view window posts.
        </div>
      </div>
    );
  }

  return (
    <RedditAdminShell
      breadcrumbs={breadcrumbs}
      title={context ? `r/${context.subreddit}` : "Reddit Analytics"}
      backHref={showHref}
      seasonLinks={seasonLinks}
      socialLinks={socialLinks}
      hero={
        context ? (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Window Overview</p>
                <h2 className="text-2xl font-semibold text-zinc-950">Discussion window dashboard</h2>
                <p className="text-sm font-medium text-zinc-900">Window period: {context.periodLabel}</p>
                <p className="max-w-3xl text-sm text-zinc-600">
                  Track the posts captured for this discussion window and use Sync Posts to refresh posts, comments, details, and media together.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Tracked Flair</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">
                    {fmtNum(effectiveDiscovery?.totals?.tracked_flair_rows)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Matched</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950">
                    {fmtNum(effectiveDiscovery?.totals?.matched_rows)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Fetched</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-950">
                    {fmtNum(effectiveDiscovery?.totals?.fetched_rows)}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null
      }
    >
        {contextLoading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
            {resolverStageMessage(resolverStage)}
          </div>
        )}
        {contextError && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
            <span>{contextError}</span>
            <button
              type="button"
              onClick={() => void resolveWindowContext()}
              className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {context && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{context.periodLabel}</h2>
                {(context.periodStart || context.periodEnd) ? (
                  <p className="text-sm text-zinc-600">
                    {fmtDateTime(context.periodStart)} to {fmtDateTime(context.periodEnd)}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400 italic">
                    {context.containerKey === "period-preseason"
                      ? "Before season premiere"
                      : context.containerKey === "period-postseason"
                        ? "After season finale"
                        : "Date range not yet available"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadWindowPosts(true)}
                  disabled={loading || detailsSyncing}
                  title="Sync posts, comments, details, and media for this window"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loading ? "Syncing…" : "Sync Posts"}
                </button>
                <a
                  href={communityHref}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Back to Community
                </a>
              </div>
            </div>

            {warning && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {warning}
              </div>
            )}
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {detailResumeBanner && (
              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                {detailResumeBanner}
              </div>
            )}
            {detailRunId && (
              <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                Active detail sync run: <span className="font-semibold">{detailRunId.slice(0, 8)}</span>
              </div>
            )}
            <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              <p className="font-semibold text-zinc-800">Manual attach to existing run</p>
              <p className="mt-1 text-zinc-600">
                Auto-resume is limited to this tab. Active runs from other tabs are listed here for explicit attach.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={selectedManualAttachRunId}
                  onChange={(event) => setSelectedManualAttachRunId(event.target.value)}
                  className="min-w-[220px] rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800"
                >
                  {manualAttachRuns.length === 0 ? (
                    <option value="">No active runs found</option>
                  ) : (
                    manualAttachRuns.map((run) => (
                      <option key={run.run_id} value={run.run_id}>
                        {run.run_id.slice(0, 8)} · {run.status}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void fetchManualAttachRuns();
                  }}
                  disabled={detailsSyncing}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Refresh runs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleManualAttachRun();
                  }}
                  disabled={!selectedManualAttachRunId.trim() || detailsSyncing}
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Attach
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">Window Posts</p>
              <p className="text-xs text-zinc-600">
                {effectiveDiscovery?.totals ? (
                  <>
                    {fmtNum(effectiveDiscovery.totals.tracked_flair_rows)} tracked flair posts · {" "}
                    {fmtNum(effectiveDiscovery.totals.matched_rows)} matched · {fmtNum(effectiveDiscovery.totals.fetched_rows)} fetched
                  </>
                ) : (
                  "No totals available"
                )}
              </p>
            </div>

            {loading && !effectiveDiscovery ? (
              <p className="text-sm text-zinc-500">Loading posts…</p>
            ) : !effectiveDiscovery || effectiveDiscovery.threads.length === 0 ? (
              <p className="text-sm text-zinc-500">No posts found for this window yet.</p>
            ) : context && !context.isShowFocused ? (
              (() => {
                const showFlairSet = new Set(
                  (context.analysisAllFlairs ?? []).map((f) => f.toLowerCase()),
                );
                // Posts with the show's flair (e.g., "Salt Lake City")
                const showFlairPosts = showFlairSet.size > 0
                  ? effectiveDiscovery.threads.filter(
                      (t) => t.link_flair_text && showFlairSet.has(t.link_flair_text.toLowerCase()),
                    )
                  : [];
                const showFlairPostIds = new Set(showFlairPosts.map((t) => t.reddit_post_id));
                // Scan-matched posts (title/text keyword matches, need admin review)
                const scanMatched = effectiveDiscovery.threads.filter(
                  (t) => t.match_type === "scan" && !showFlairPostIds.has(t.reddit_post_id),
                );
                // Other flair-matched posts (matched by non-show flair or match_type=flair but not the show's flair)
                const otherFlairMatched = effectiveDiscovery.threads.filter(
                  (t) =>
                    (t.match_type === "flair" || t.match_type === "all") &&
                    !showFlairPostIds.has(t.reddit_post_id),
                );
                // Everything else (no match_type)
                const untyped = effectiveDiscovery.threads.filter(
                  (t) =>
                    !showFlairPostIds.has(t.reddit_post_id) &&
                    t.match_type !== "scan" &&
                    t.match_type !== "flair" &&
                    t.match_type !== "all",
                );
                const showFlairLabel =
                  context.analysisAllFlairs.length === 1
                    ? context.analysisAllFlairs[0]
                    : context.analysisAllFlairs.join(" / ");
                return (
                  <div className="space-y-4">
                    {showFlairPosts.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
                          {showFlairLabel} ({fmtNum(showFlairPosts.length)})
                        </p>
                        <div className="space-y-2">
                          {showFlairPosts.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                {thread.post_type ? ` · ${thread.post_type}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-indigo-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {scanMatched.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Scan-Matched Posts ({fmtNum(scanMatched.length)})
                        </p>
                        <div className="space-y-2">
                          {scanMatched.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                    {thread.title}
                                  </a>
                                  <p className="mt-1 text-xs text-zinc-600">
                                    {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                    {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                    {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                    {thread.post_type ? ` · ${thread.post_type}` : ""}
                                    {thread.author_flair_text ? ` · author flair: ${thread.author_flair_text}` : ""}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {detailsHref && (
                                      <a
                                        href={detailsHref}
                                        className="rounded border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        View Details
                                      </a>
                                    )}
                                    <a
                                      href={thread.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                    >
                                      Open Post
                                    </a>
                                  </div>
                                  {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={approvingPostIds.has(thread.reddit_post_id)}
                                    onClick={() => void handleSetAdminApproved(thread.reddit_post_id, thread.admin_approved === true ? null : true)}
                                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                                      thread.admin_approved === true
                                        ? "border-green-400 bg-green-100 text-green-800"
                                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-green-50"
                                    }`}
                                    title={thread.admin_approved === true ? "Approved (click to reset)" : "Approve this post"}
                                  >
                                    {thread.admin_approved === true ? "Approved" : "Approve"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={approvingPostIds.has(thread.reddit_post_id)}
                                    onClick={() => void handleSetAdminApproved(thread.reddit_post_id, thread.admin_approved === false ? null : false)}
                                    className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
                                      thread.admin_approved === false
                                        ? "border-red-400 bg-red-100 text-red-800"
                                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-red-50"
                                    }`}
                                    title={thread.admin_approved === false ? "Rejected (click to reset)" : "Reject this post"}
                                  >
                                    {thread.admin_approved === false ? "Rejected" : "Reject"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {otherFlairMatched.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Other Flair-Matched Posts ({fmtNum(otherFlairMatched.length)})
                        </p>
                        <div className="space-y-2">
                          {otherFlairMatched.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                                {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                                {thread.post_type ? ` · ${thread.post_type}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                    {untyped.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">
                          Other Posts ({fmtNum(untyped.length)})
                        </p>
                        <div className="space-y-2">
                          {untyped.map((thread) => {
                            const detailsHref = buildPostDetailsHref(thread);
                            return (
                            <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                              <a href={thread.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-zinc-900 hover:underline">
                                {thread.title}
                              </a>
                              <p className="mt-1 text-xs text-zinc-600">
                                {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {fmtNum(thread.num_comments)} comments
                                {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {detailsHref && (
                                  <a
                                    href={detailsHref}
                                    className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                  >
                                    View Details
                                  </a>
                                )}
                                <a
                                  href={thread.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Open Post
                                </a>
                              </div>
                              {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                            </article>
                          );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="space-y-2">
                {effectiveDiscovery.threads.map((thread) => {
                  const detailsHref = buildPostDetailsHref(thread);
                  return (
                  <article key={thread.reddit_post_id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <a
                      href={thread.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-zinc-900 hover:underline"
                    >
                      {thread.title}
                    </a>
                    <p className="mt-1 text-xs text-zinc-600">
                      {fmtDateTime(thread.posted_at)} · {fmtNum(thread.score)} score · {" "}
                      {fmtNum(thread.num_comments)} comments
                      {thread.link_flair_text ? ` · flair: ${thread.link_flair_text}` : ""}
                      {thread.upvote_ratio != null ? ` · ${Math.round(thread.upvote_ratio * 100)}% upvoted` : ""}
                      {thread.post_type ? ` · ${thread.post_type}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {detailsHref && (
                        <a
                          href={detailsHref}
                          className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                        >
                          View Details
                        </a>
                      )}
                      <a
                        href={thread.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Open Post
                      </a>
                    </div>
                    {thread.text && <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-700">{thread.text}</p>}
                  </article>
                );
                })}
              </div>
            )}
          </section>
        )}
    </RedditAdminShell>
  );
}

export default function AdminRedditWindowPostsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <AdminRedditWindowPostsPageContent />
    </Suspense>
  );
}
