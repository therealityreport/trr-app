"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth as fetchAdminWithAuthBase } from "@/lib/admin/client-auth";
import {
  buildScreenalyticsRunPath,
  buildScreenalyticsRunUrl,
  isScreenalyticsRhobhS5E16TestPath,
  SCREENALYTICS_CANONICAL_PATH,
  SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS,
  SCREENALYTICS_RHOBH_S5_E16_TEST_SEASON_ID,
} from "@/lib/admin/screenalytics-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { getAllowedReviewTransitions, getExecutionStatusLabel, getRunOverviewMessage } from "./run-state";

type OwnerScope = "show" | "season" | "episode";
type VideoClass = "episode" | "trailer" | "extras";
type MediaKind = string;
type ImportMode = "youtube_url" | "external_url" | "social_youtube_row";
type VideoClassFilter = "all" | VideoClass;

const fetchAdminWithAuth: typeof fetchAdminWithAuthBase = (input, init, options) =>
  fetchAdminWithAuthBase(input, init, { allowDevAdminBypass: true, ...options });

type UploadSessionPayload = {
  upload_session_id: string;
  status?: string;
  error_text?: string | null;
  promoted_video_asset_id?: string | null;
  put_url?: string;
  temp_object_key?: string;
  expires_at?: string;
  owner_scope?: OwnerScope;
  owner_id?: string;
  media_type?: VideoClass;
  media_kind?: string | null;
  video_class?: VideoClass;
  promo_subtype?: string | null;
};

type UploadSessionStatusPayload = UploadSessionPayload & {
  video_asset?: VideoAssetPayload | null;
};

type ImportVideoAssetResponsePayload = {
  upload_session_id: string;
  queued?: boolean;
  status?: string;
  video_asset?: VideoAssetPayload | null;
};

type VideoAssetPayload = {
  id: string;
  show_id?: string | null;
  season_id?: string | null;
  episode_id?: string | null;
  owner_scope?: OwnerScope | null;
  owner_id?: string | null;
  source_url?: string | null;
  source_json?: Record<string, unknown>;
  source_import_type?: string | null;
  media_type?: VideoClass | null;
  media_kind?: string | null;
  video_class?: VideoClass | null;
  promo_subtype?: string | null;
  is_publishable?: boolean;
  publish_block_reason?: string | null;
  publication_mode?: string | null;
  is_canonical_publication?: boolean;
  supports_reference_publication?: boolean;
  subtitle_summary?: SubtitleSummaryPayload | null;
};

type SubtitleExtractionStatus =
  | "not_requested"
  | "queued"
  | "running"
  | "complete"
  | "partial"
  | "unavailable"
  | "failed";

type SubtitleTrackPayload = {
  id: string;
  stream_index: number;
  codec_name: string;
  language?: string | null;
  language_normalized?: string | null;
  language_raw?: string | null;
  title?: string | null;
  is_default: boolean;
  is_forced: boolean;
  is_primary: boolean;
  selection_status: string;
  extraction_status: string;
  cue_count?: number | null;
  first_cue_start_ms?: number | null;
  last_cue_end_ms?: number | null;
  srt_size_bytes?: number | null;
  srt_sha256?: string | null;
  error?: string | null;
};

type SubtitleSummaryPayload = {
  video_asset_id?: string;
  status: SubtitleExtractionStatus;
  error?: string | null;
  attempts?: number;
  requested_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  discovered_track_count?: number;
  eligible_track_count?: number;
  completed_track_count?: number;
  failed_track_count?: number;
  primary_track_id?: string | null;
  tracks?: SubtitleTrackPayload[];
};

type SubtitleCuePayload = {
  ordinal: number;
  start_ms: number;
  end_ms: number;
  text: string;
  plain_text: string;
};

type SubtitleCuePagePayload = {
  video_asset_id: string;
  track_id: string;
  offset: number;
  limit: number;
  total_cues: number;
  matched_cues?: number;
  items: SubtitleCuePayload[];
};

type SubtitleDownloadPayload = {
  filename: string;
  download_url: string;
};

type RunPayload = {
  id: string;
  status: string;
  review_status?: string;
  run_type: string;
  manifest_key?: string | null;
  video_asset_id: string;
  show_id?: string | null;
  season_id?: string | null;
  episode_id?: string | null;
  owner_scope?: OwnerScope | null;
  owner_id?: string | null;
  media_type?: VideoClass | null;
  media_kind?: string | null;
  video_class?: VideoClass | null;
  promo_subtype?: string | null;
  source_import_type?: string | null;
  is_publishable?: boolean;
  publish_block_reason?: string | null;
  publication_mode?: string | null;
  is_canonical_publication?: boolean;
  supports_reference_publication?: boolean;
  effective_runtime_seconds?: number | null;
  error_message?: string | null;
  completed_at?: string | null;
  dispatch_status?: string | null;
  dispatch_job_id?: string | null;
  candidate_scope_policy_json?: CandidateScopePolicyPayload | null;
  cast_coverage_summary_json?: CastCoverageSummaryPayload | null;
};

type CandidateScopePolicyPayload = {
  media_type?: string | null;
  owner_scope?: string | null;
  primary_scope?: string | null;
  scope_order?: string[];
  fallback_scopes_used?: string[];
  preferred_facebank_coverage?: boolean;
  strict_credit_scope?: boolean;
};

type CastCoverageSummaryPayload = {
  candidate_count?: number;
  approved_facebank_coverage_count?: number;
  fallback_scopes_used?: string[];
  warning?: string | null;
  warnings?: string[];
};

type PublishVersionEntry = {
  id: string;
  run_id: string;
  video_asset_id: string;
  version_number: number;
  is_current: boolean;
  published_at?: string | null;
  published_by?: string | null;
  publication_mode?: string | null;
  is_canonical_publication?: boolean;
};

type ProgressPayload = {
  stage: string;
  state: string;
  detail?: string | null;
  updated_at?: string | null;
  counters?: Record<string, unknown>;
};

type FlashbackMatchEntry = {
  scene_key: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  fingerprint_type: string;
  fingerprint_hash: string;
  matched_reference_scene_key?: string | null;
  reference_video_asset_id?: string | null;
  reference_run_id?: string | null;
  confidence_score?: number | null;
};

type TitleCardReferenceEntry = {
  scene_key: string;
  fingerprint_type: string;
  fingerprint_hash: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  metadata?: Record<string, unknown>;
};

type CacheMetricsPayload = {
  cache_mode?: string | null;
  cache_root?: string | null;
  hit_count?: number;
  miss_count?: number;
  last_object_key?: string | null;
};

type RollupEntry = {
  person_id: string;
  display_name?: string | null;
  screen_time_seconds: number;
  frame_count: number;
  source_version_count: number;
};

type RollupPayload = {
  published_asset_count: number;
  leaderboard: RollupEntry[];
};

type LeaderboardEntry = {
  person_id: string;
  display_name?: string | null;
  screen_time_seconds: number | string;
  frame_count: number;
  confidence_avg?: number | string | null;
};

type SegmentEntry = {
  segment_key: string;
  display_name?: string | null;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  assignment_source: string;
  is_counted?: boolean;
};

type EvidenceEntry = {
  evidence_key: string;
  segment_key: string;
  evidence_type: string;
  timestamp_ms: number;
  object_key: string;
  public_url?: string | null;
  content_type?: string | null;
};

type ShotEntry = {
  shot_key: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  observation_count: number;
  assigned_person_ids?: string[];
};

type SceneEntry = {
  scene_key: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  shot_count: number;
  composition_type: string;
  dominant_person_ids?: string[];
  dominant_display_names?: Record<string, string>;
  unknown_segment_count: number;
  title_card_shot_count: number;
};

type TitleCardCandidateEntry = {
  shot_key: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  confidence_score?: number | null;
  evidence_key?: string | null;
};

type ConfessionalCandidateEntry = {
  segment_key: string;
  display_name?: string | null;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  confidence_score?: number | null;
  shot_count?: number;
};

type CastSuggestionEntry = {
  suggestion_key: string;
  person_id: string;
  display_name?: string | null;
  support_count: number;
  scene_count: number;
  total_duration_ms: number;
  confidence_score?: number | null;
  avg_similarity_score?: number | null;
  review_bucket?: string;
  scope_hint?: string | null;
};

type UnknownReviewQueueEntry = {
  queue_key: string;
  queue_group?: string | null;
  candidate_person_id?: string | null;
  candidate_display_name?: string | null;
  support_count: number;
  scene_count: number;
  total_duration_ms: number;
  escalation_level: string;
  recommended_action: string;
  best_similarity_score?: number | null;
};

type SuggestionDecisionEntry = {
  id: string;
  owner_scope: OwnerScope;
  owner_entity_id: string;
  suggestion_key: string;
  person_id: string;
  display_name?: string | null;
  decision: "accept" | "reject" | "defer";
  decided_at?: string | null;
  decided_by?: string | null;
};

type UnknownReviewDecisionEntry = {
  id: string;
  owner_scope: OwnerScope;
  owner_entity_id: string;
  queue_key: string;
  queue_group?: string | null;
  candidate_person_id?: string | null;
  candidate_display_name?: string | null;
  decision: "accept" | "reject" | "defer";
  escalation_level: string;
  decided_at?: string | null;
  decided_by?: string | null;
};

type DecisionStatePayload = {
  suggestion_decisions: SuggestionDecisionEntry[];
  unknown_review_state: UnknownReviewDecisionEntry[];
  rerun_required_for_metrics?: boolean;
  decision_effect_summary?: string | null;
};

type ExcludedSectionEntry = {
  section_key: string;
  section_type: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  detection_source: string;
};

type ReviewSummaryPayload = {
  run_id: string;
  publication_mode?: string | null;
  is_canonical_publication?: boolean;
  raw_leaderboard: LeaderboardEntry[];
  reviewed_leaderboard: LeaderboardEntry[];
  reviewed_totals_source?: string | null;
  excluded_section_count: number;
  excluded_overlap_ms: number;
  decision_counts?: {
    suggestion_decisions?: number;
    unknown_review_state?: number;
  };
  rerun_required_for_identity_changes?: boolean;
  decision_effect_summary?: string | null;
  current_publish_version?: PublishVersionEntry | null;
};

const breadcrumbs = buildAdminSectionBreadcrumb("Screenalytics", SCREENALYTICS_CANONICAL_PATH);
const videoClassFilters: VideoClassFilter[] = ["all", "episode", "trailer", "extras"];
const importModes: ImportMode[] = ["youtube_url", "external_url", "social_youtube_row"];
const decisionScopes: OwnerScope[] = ["episode", "season", "show"];
const subtitleCuePageSize = 50;
const subtitlePollingDelays = [2_000, 5_000, 15_000] as const;
const subtitleAutoPollingMaxAttempts = 6;
const screenalyticsKnownContext = {
  show: {
    id: SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.show_id,
    label: "Real Housewives of Beverly Hills",
    shortLabel: "RHOBH",
  },
  season: {
    id: SCREENALYTICS_RHOBH_S5_E16_TEST_SEASON_ID,
    label: "Season 5",
  },
  episode: {
    id: SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.owner_id,
    label: "Episode 16",
  },
} as const;

const mediaKindOptions = [
  { value: "screenalytics_test", label: "Screenalytics test" },
  { value: "bonus_scene", label: "Bonus scene" },
  { value: "after_show", label: "After show" },
  { value: "clip", label: "Clip" },
  { value: "extended_scene", label: "Extended scene" },
] as const;

function getScreenalyticsRunId(pathname: string | null, searchParams: URLSearchParams): string {
  const segments = (pathname || "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 3 && segments[0] === "screenalytics" && segments[1] === "runs") {
    return segments[2] || "";
  }
  return String(searchParams.get("run_id") || searchParams.get("run") || "").trim();
}

function parseOwnerScope(value: string | null): OwnerScope | null {
  return value === "show" || value === "season" || value === "episode" ? value : null;
}

function parseVideoClass(value: string | null): VideoClass | null {
  if (value === "episode" || value === "trailer" || value === "extras") return value;
  if (value === "promo") return "trailer";
  return null;
}

function parsePromoSubtype(value: string | null): string | null {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function parseImportMode(value: string | null): ImportMode | null {
  return value === "youtube_url" || value === "external_url" || value === "social_youtube_row" ? value : null;
}

function parseVideoClassFilter(value: string | null): VideoClassFilter | null {
  if (value === "all" || value === "episode" || value === "trailer" || value === "extras") return value;
  if (value === "promo") return "trailer";
  return null;
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value / 1000).toFixed(value >= 1000 ? 2 : 3)}s`;
}

function formatScreenTimeSeconds(value: number | string | null | undefined): string {
  const numericValue = typeof value === "string" ? Number(value) : value;
  if (numericValue == null || !Number.isFinite(numericValue)) return "n/a";
  return `${numericValue.toFixed(3)}s`;
}

function resolveMediaType(item?: { media_type?: string | null; video_class?: string | null; promo_subtype?: string | null } | null): VideoClass {
  if (item?.media_type === "episode" || item?.media_type === "trailer" || item?.media_type === "extras") {
    return item.media_type;
  }
  if (item?.video_class === "episode") return "episode";
  if (item?.promo_subtype === "trailer") return "trailer";
  return "extras";
}

function formatVideoClass(mediaType?: string | null, mediaKind?: string | null, legacyVideoClass?: string | null, legacyPromoSubtype?: string | null): string {
  const resolvedType = resolveMediaType({
    media_type: mediaType,
    video_class: legacyVideoClass,
    promo_subtype: legacyPromoSubtype,
  });
  if (resolvedType === "episode") return "Episode";
  if (resolvedType === "trailer") return "Trailer";
  if (mediaKind) return `Extras · ${mediaKind.replaceAll("_", " ")}`;
  return "Extras";
}

function formatImportType(value?: string | null): string {
  const normalized = String(value || "").trim();
  if (!normalized) return "n/a";
  return normalized.replaceAll("_", " ");
}

function formatMediaFilterLabel(value: VideoClassFilter): string {
  if (value === "all") return "All";
  if (value === "episode") return "Episodes";
  if (value === "trailer") return "Trailers";
  return "Extras";
}

function formatMediaKindLabel(value?: string | null): string {
  const normalized = String(value || "").trim();
  if (!normalized) return "No extra type";
  return mediaKindOptions.find((option) => option.value === normalized)?.label ?? normalized.replaceAll("_", " ");
}

function normalizeSubtitleSummary(
  payload: Partial<SubtitleSummaryPayload> | null | undefined,
  videoAssetId: string,
): SubtitleSummaryPayload {
  const supportedStatuses: SubtitleExtractionStatus[] = [
    "not_requested",
    "queued",
    "running",
    "complete",
    "partial",
    "unavailable",
    "failed",
  ];
  const status = supportedStatuses.includes(payload?.status as SubtitleExtractionStatus)
    ? (payload?.status as SubtitleExtractionStatus)
    : "not_requested";
  return {
    ...payload,
    video_asset_id: payload?.video_asset_id || videoAssetId,
    status,
    tracks: Array.isArray(payload?.tracks) ? payload.tracks : [],
  };
}

function formatSubtitleStatus(status?: SubtitleExtractionStatus | null): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Extracting";
  if (status === "complete") return "Ready";
  if (status === "partial") return "Partially extracted";
  if (status === "unavailable") return "No English embedded subtitles";
  if (status === "failed") return "Extraction failed";
  return "Not extracted";
}

function formatSubtitleTimestamp(milliseconds?: number | null): string {
  if (milliseconds == null || !Number.isFinite(milliseconds)) return "n/a";
  const safeMilliseconds = Math.max(0, Math.floor(milliseconds));
  const hours = Math.floor(safeMilliseconds / 3_600_000);
  const minutes = Math.floor((safeMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMilliseconds % 60_000) / 1_000);
  const millis = safeMilliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatSubtitleBytes(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "n/a";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatOwnerSelectionLabel(
  ownerScope?: string | null,
  ownerId?: string | null,
  seasonId?: string | null,
  episodeId?: string | null,
): string {
  const resolvedOwnerId = String(ownerId || episodeId || seasonId || "").trim();
  if (!resolvedOwnerId) return "Not selected";
  if (resolvedOwnerId === screenalyticsKnownContext.episode.id || episodeId === screenalyticsKnownContext.episode.id) {
    return `${screenalyticsKnownContext.show.shortLabel} ${screenalyticsKnownContext.season.label} ${screenalyticsKnownContext.episode.label}`;
  }
  if (resolvedOwnerId === screenalyticsKnownContext.season.id || seasonId === screenalyticsKnownContext.season.id) {
    return `${screenalyticsKnownContext.show.shortLabel} ${screenalyticsKnownContext.season.label}`;
  }
  if (resolvedOwnerId === screenalyticsKnownContext.show.id) {
    return screenalyticsKnownContext.show.label;
  }
  return ownerScope ? `${ownerScope} selected` : "Selected";
}

function formatCoverageWarning(value: string): string {
  if (value === "no_candidate_cast_rows_found") return "No candidate cast rows were found for this asset scope.";
  if (value === "no_approved_facebank_coverage") return "None of the current candidates have approved facebank coverage yet.";
  if (value === "episode_scope_required_fallback") return "Legacy run widened episode scope; rerun to use strict credits.";
  if (value === "sparse_candidate_cast") return "Candidate cast is still sparse for this run.";
  return value.replaceAll("_", " ");
}

function buildShowRunsPath(showId: string, videoClassFilter: VideoClassFilter): string {
  const params = new URLSearchParams({ limit: "10" });
  if (videoClassFilter !== "all") params.set("media_type", videoClassFilter);
  return `/api/admin/trr-api/cast-screentime/shows/${showId}/runs?${params.toString()}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string; detail?: string };
  if (!response.ok) {
    const message =
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : typeof (data as { detail?: string }).detail === "string"
          ? (data as { detail: string }).detail
          : "Request failed";
    throw new Error(message);
  }
  return data;
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "amber" | "emerald" | "sky";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-neutral-200 bg-neutral-50 text-neutral-700";
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${toneClass}`}>{children}</span>;
}

function DebugJsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value == null) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <pre className="max-h-80 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

export default function CastScreentimePageClient() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isTestExtraPath = isScreenalyticsRhobhS5E16TestPath(pathname);
  const routeRunId = getScreenalyticsRunId(pathname, searchParams);
  const prefillContext = String(searchParams.get("prefill_context") || "").trim();
  const { checking, hasAccess } = useAdminGuard();
  const [showId, setShowId] = useState(() =>
    String(
      searchParams.get("show_id") ||
        (isTestExtraPath ? SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.show_id : ""),
    ).trim(),
  );
  const [ownerScope, setOwnerScope] = useState<OwnerScope>(
    () =>
      parseOwnerScope(searchParams.get("owner_scope")) ??
      (isTestExtraPath ? (SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.owner_scope as OwnerScope) : "season"),
  );
  const [ownerId, setOwnerId] = useState(() =>
    String(
      searchParams.get("owner_id") ||
        (isTestExtraPath ? SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.owner_id : ""),
    ).trim(),
  );
  const [selectedSeasonId, setSelectedSeasonId] = useState(() =>
    String(
      searchParams.get("season_id") ||
        (parseOwnerScope(searchParams.get("owner_scope")) === "season" ? searchParams.get("owner_id") : "") ||
        (isTestExtraPath ? screenalyticsKnownContext.season.id : ""),
    ).trim(),
  );
  const [videoClass, setVideoClass] = useState<VideoClass>(
    () =>
      parseVideoClass(searchParams.get("media_type") || searchParams.get("video_class")) ??
      (isTestExtraPath ? (SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_type as VideoClass) : "trailer"),
  );
  const [promoSubtype, setPromoSubtype] = useState<MediaKind>(
    () =>
      parsePromoSubtype(searchParams.get("media_kind") || searchParams.get("promo_subtype")) ??
      (isTestExtraPath ? SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_kind : ""),
  );
  const [videoClassFilter, setVideoClassFilter] = useState<VideoClassFilter>(
    () => parseVideoClassFilter(searchParams.get("media_type_filter") || searchParams.get("video_class_filter")) ?? "all",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>(() => parseImportMode(searchParams.get("source_mode")) ?? "youtube_url");
  const [remoteSource, setRemoteSource] = useState(() => String(searchParams.get("source_url") || "").trim());
  const [socialYoutubeVideoId, setSocialYoutubeVideoId] = useState(
    () => String(searchParams.get("social_youtube_video_id") || "").trim(),
  );
  const [uploading, setUploading] = useState(false);
  const [importingAsset, setImportingAsset] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [launchingRun, setLaunchingRun] = useState(false);
  const [refreshingRun, setRefreshingRun] = useState(false);
  const [refreshingRuns, setRefreshingRuns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestUpload, setLatestUpload] = useState<UploadSessionPayload | null>(null);
  const [videoAsset, setVideoAsset] = useState<VideoAssetPayload | null>(null);
  const [run, setRun] = useState<RunPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [segments, setSegments] = useState<SegmentEntry[]>([]);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [excludedSections, setExcludedSections] = useState<ExcludedSectionEntry[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryPayload | null>(null);
  const [shots, setShots] = useState<ShotEntry[]>([]);
  const [scenes, setScenes] = useState<SceneEntry[]>([]);
  const [titleCardCandidates, setTitleCardCandidates] = useState<TitleCardCandidateEntry[]>([]);
  const [titleCardReferences, setTitleCardReferences] = useState<TitleCardReferenceEntry[]>([]);
  const [titleCardMatches, setTitleCardMatches] = useState<FlashbackMatchEntry[]>([]);
  const [confessionalCandidates, setConfessionalCandidates] = useState<ConfessionalCandidateEntry[]>([]);
  const [castSuggestions, setCastSuggestions] = useState<CastSuggestionEntry[]>([]);
  const [unknownReviewQueues, setUnknownReviewQueues] = useState<UnknownReviewQueueEntry[]>([]);
  const [suggestionDecisions, setSuggestionDecisions] = useState<SuggestionDecisionEntry[]>([]);
  const [unknownReviewState, setUnknownReviewState] = useState<UnknownReviewDecisionEntry[]>([]);
  const [showRuns, setShowRuns] = useState<RunPayload[]>([]);
  const [publishHistory, setPublishHistory] = useState<PublishVersionEntry[]>([]);
  const [showRollup, setShowRollup] = useState<RollupPayload | null>(null);
  const [seasonRollup, setSeasonRollup] = useState<RollupPayload | null>(null);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [flashbackMatches, setFlashbackMatches] = useState<FlashbackMatchEntry[]>([]);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetricsPayload | null>(null);
  const [decisionScope, setDecisionScope] = useState<OwnerScope>("season");
  const [updatingReviewStatus, setUpdatingReviewStatus] = useState<string | null>(null);
  const [publishingRun, setPublishingRun] = useState(false);
  const [reconcilingStale, setReconcilingStale] = useState(false);
  const [generatingClipKey, setGeneratingClipKey] = useState<string | null>(null);
  const [actingSuggestionKey, setActingSuggestionKey] = useState<string | null>(null);
  const [actingUnknownQueueKey, setActingUnknownQueueKey] = useState<string | null>(null);
  const [decisionRerunRequired, setDecisionRerunRequired] = useState(false);
  const [decisionEffectSummary, setDecisionEffectSummary] = useState<string | null>(null);
  const [autoLoadedRunId, setAutoLoadedRunId] = useState<string | null>(null);
  const [copiedRunLinkId, setCopiedRunLinkId] = useState<string | null>(null);
  const [subtitleSummary, setSubtitleSummary] = useState<SubtitleSummaryPayload | null>(null);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleActionPending, setSubtitleActionPending] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [selectedSubtitleTrackId, setSelectedSubtitleTrackId] = useState("");
  const [subtitleCuePage, setSubtitleCuePage] = useState<SubtitleCuePagePayload | null>(null);
  const [subtitleCueOffset, setSubtitleCueOffset] = useState(0);
  const [subtitleSearchInput, setSubtitleSearchInput] = useState("");
  const [subtitleSearchQuery, setSubtitleSearchQuery] = useState("");
  const [subtitleCueLoading, setSubtitleCueLoading] = useState(false);
  const [subtitleDownloadPending, setSubtitleDownloadPending] = useState(false);
  const [subtitlePollVersion, setSubtitlePollVersion] = useState(0);
  const [subtitleAutoPollingStopped, setSubtitleAutoPollingStopped] = useState(false);
  const subtitleAutoPollingStoppedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const effectivePromoSubtype = videoClass === "episode" ? null : promoSubtype.trim() || null;
  const selectedEpisodeId = ownerScope === "episode" ? ownerId.trim() : "";
  const submissionOwnerScope: OwnerScope =
    videoClass === "episode" || selectedEpisodeId ? "episode" : "season";
  const submissionOwnerId = submissionOwnerScope === "episode" ? selectedEpisodeId : selectedSeasonId.trim();
  const selectedScopeLabel = formatOwnerSelectionLabel(
    submissionOwnerScope,
    submissionOwnerId,
    selectedSeasonId,
    selectedEpisodeId,
  );
  const selectedMediaLabel =
    videoClass === "episode" ? "Canonical episode" : formatMediaKindLabel(effectivePromoSubtype);
  const visibleMediaKindOptions = mediaKindOptions.some((option) => option.value === promoSubtype)
    ? mediaKindOptions
    : promoSubtype.trim()
      ? [...mediaKindOptions, { value: promoSubtype.trim(), label: formatMediaKindLabel(promoSubtype) }]
      : mediaKindOptions;
  const activeVideoAssetId = String(videoAsset?.id || run?.video_asset_id || "").trim();

  useEffect(() => {
    subtitleAutoPollingStoppedRef.current = false;
    setSubtitleAutoPollingStopped(false);
  }, [activeVideoAssetId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSubtitleSearchQuery(subtitleSearchInput.trim());
      setSubtitleCueOffset(0);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [subtitleSearchInput]);

  useEffect(() => {
    let cancelled = false;
    let timerId: number | undefined;

    setSubtitleSummary(null);
    setSelectedSubtitleTrackId("");
    setSubtitleCuePage(null);
    setSubtitleCueOffset(0);
    setSubtitleSearchInput("");
    setSubtitleSearchQuery("");
    setSubtitleError(null);

    if (!activeVideoAssetId || checking || !hasAccess) return undefined;

    const loadSummary = async (pollAttempt: number) => {
      setSubtitleLoading(true);
      try {
        const payload = await parseResponse<SubtitleSummaryPayload>(
          await fetchAdminWithAuth(
            `/api/admin/trr-api/cast-screentime/video-assets/${activeVideoAssetId}/subtitles`,
          ),
        );
        if (cancelled) return;
        const normalized = normalizeSubtitleSummary(payload, activeVideoAssetId);
        setSubtitleSummary(normalized);
        setSubtitleError(null);
        const completedTracks = (normalized.tracks ?? []).filter(
          (track) => track.extraction_status === "complete",
        );
        setSelectedSubtitleTrackId((current) => {
          if (completedTracks.some((track) => track.id === current)) return current;
          return (
            completedTracks.find((track) => track.id === normalized.primary_track_id)?.id ||
            completedTracks.find((track) => track.is_primary)?.id ||
            completedTracks[0]?.id ||
            ""
          );
        });
        if (normalized.status === "queued" || normalized.status === "running") {
          if (subtitleAutoPollingStoppedRef.current) return;
          if (pollAttempt + 1 >= subtitleAutoPollingMaxAttempts) {
            subtitleAutoPollingStoppedRef.current = true;
            setSubtitleAutoPollingStopped(true);
            return;
          }
          const delay = subtitlePollingDelays[Math.min(pollAttempt, subtitlePollingDelays.length - 1)];
          timerId = window.setTimeout(() => void loadSummary(pollAttempt + 1), delay);
        } else if (subtitleAutoPollingStoppedRef.current) {
          subtitleAutoPollingStoppedRef.current = false;
          setSubtitleAutoPollingStopped(false);
        }
      } catch (summaryError) {
        if (!cancelled) {
          setSubtitleError(
            summaryError instanceof Error ? summaryError.message : "Subtitle status could not be loaded",
          );
        }
      } finally {
        if (!cancelled) setSubtitleLoading(false);
      }
    };

    void loadSummary(0);
    return () => {
      cancelled = true;
      if (timerId != null) window.clearTimeout(timerId);
    };
  }, [activeVideoAssetId, checking, hasAccess, subtitlePollVersion]);

  useEffect(() => {
    let cancelled = false;
    if (!activeVideoAssetId || !selectedSubtitleTrackId) {
      setSubtitleCuePage(null);
      return undefined;
    }

    const loadCues = async () => {
      setSubtitleCueLoading(true);
      try {
        const query = new URLSearchParams({
          offset: String(subtitleCueOffset),
          limit: String(subtitleCuePageSize),
        });
        if (subtitleSearchQuery) query.set("q", subtitleSearchQuery);
        const payload = await parseResponse<SubtitleCuePagePayload>(
          await fetchAdminWithAuth(
            `/api/admin/trr-api/cast-screentime/video-assets/${activeVideoAssetId}/subtitles/${selectedSubtitleTrackId}/cues?${query.toString()}`,
          ),
        );
        if (!cancelled) {
          setSubtitleCuePage({ ...payload, items: Array.isArray(payload.items) ? payload.items : [] });
          setSubtitleError(null);
        }
      } catch (cueError) {
        if (!cancelled) {
          setSubtitleCuePage(null);
          setSubtitleError(cueError instanceof Error ? cueError.message : "Subtitle cues could not be loaded");
        }
      } finally {
        if (!cancelled) setSubtitleCueLoading(false);
      }
    };

    void loadCues();
    return () => {
      cancelled = true;
    };
  }, [activeVideoAssetId, selectedSubtitleTrackId, subtitleCueOffset, subtitleSearchQuery]);

  const handleShowChange = (nextShowId: string) => {
    setShowId(nextShowId);
    if (nextShowId === screenalyticsKnownContext.show.id && !selectedSeasonId.trim()) {
      setSelectedSeasonId(screenalyticsKnownContext.season.id);
    }
    if (!nextShowId.trim()) {
      setSelectedSeasonId("");
      setOwnerScope("season");
      setOwnerId("");
    }
  };

  const handleSeasonChange = (nextSeasonId: string) => {
    setSelectedSeasonId(nextSeasonId);
    if (!selectedEpisodeId) {
      setOwnerScope("season");
      setOwnerId(nextSeasonId);
    }
  };

  const handleEpisodeChange = (nextEpisodeId: string) => {
    if (nextEpisodeId) {
      setOwnerScope("episode");
      setOwnerId(nextEpisodeId);
      return;
    }
    setOwnerScope("season");
    setOwnerId(selectedSeasonId.trim());
  };

  const handleVideoClassChange = (nextVideoClass: VideoClass) => {
    setVideoClass(nextVideoClass);
    if (nextVideoClass === "episode") {
      setPromoSubtype("");
      setOwnerScope("episode");
      setOwnerId(selectedEpisodeId || screenalyticsKnownContext.episode.id);
      if (!selectedSeasonId.trim()) {
        setSelectedSeasonId(screenalyticsKnownContext.season.id);
      }
      return;
    }
    if (!submissionOwnerId && selectedSeasonId.trim()) {
      setOwnerScope("season");
      setOwnerId(selectedSeasonId.trim());
    }
    if (!promoSubtype.trim() && nextVideoClass === "extras") {
      setPromoSubtype(isTestExtraPath ? SCREENALYTICS_RHOBH_S5_E16_TEST_DEFAULTS.media_kind : "bonus_scene");
    }
  };

  const resetRunOutputs = () => {
    setRun(null);
    setLeaderboard([]);
    setSegments([]);
    setEvidence([]);
    setExcludedSections([]);
    setReviewSummary(null);
    setShots([]);
    setScenes([]);
    setTitleCardCandidates([]);
    setTitleCardReferences([]);
    setTitleCardMatches([]);
    setConfessionalCandidates([]);
    setCastSuggestions([]);
    setUnknownReviewQueues([]);
    setSuggestionDecisions([]);
    setUnknownReviewState([]);
    setPublishHistory([]);
    setShowRollup(null);
    setSeasonRollup(null);
    setProgress(null);
    setFlashbackMatches([]);
    setCacheMetrics(null);
    setDecisionRerunRequired(false);
    setDecisionEffectSummary(null);
  };

  const syncShowContext = (asset?: VideoAssetPayload | null, nextRun?: RunPayload | null) => {
    const resolvedShowId = String(asset?.show_id || nextRun?.show_id || "").trim();
    if (resolvedShowId) {
      setShowId(resolvedShowId);
    }
    const resolvedSeasonId = String(asset?.season_id || nextRun?.season_id || "").trim();
    if (resolvedSeasonId) {
      setSelectedSeasonId(resolvedSeasonId);
    }
    const resolvedOwnerScope = parseOwnerScope(String(asset?.owner_scope || nextRun?.owner_scope || "").trim());
    const resolvedOwnerId = String(asset?.owner_id || nextRun?.owner_id || "").trim();
    if (resolvedOwnerScope && resolvedOwnerId) {
      setOwnerScope(resolvedOwnerScope);
      setOwnerId(resolvedOwnerId);
    }
  };

  const refreshRecentRuns = async (forcedShowId?: string) => {
    const resolvedShowId = String(forcedShowId || showId).trim();
    if (!resolvedShowId) {
      setShowRuns([]);
      return;
    }
    setRefreshingRuns(true);
    try {
      const response = await fetchAdminWithAuth(buildShowRunsPath(resolvedShowId, videoClassFilter));
      const payload = await parseResponse<{ runs: RunPayload[] }>(response);
      setShowRuns(Array.isArray(payload.runs) ? payload.runs : []);
    } catch (runsError) {
      setError(runsError instanceof Error ? runsError.message : "Show run refresh failed");
    } finally {
      setRefreshingRuns(false);
    }
  };

  const applyImportedVideoAsset = async (asset: VideoAssetPayload) => {
    setVideoAsset(asset);
    syncShowContext(asset, null);
    resetRunOutputs();
    await refreshRecentRuns(asset.show_id || undefined);
  };

  const pollImportedUploadSession = async (uploadSessionId: string): Promise<VideoAssetPayload> => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!mountedRef.current) {
        throw new Error("Import polling stopped");
      }
      const payload = await parseResponse<UploadSessionStatusPayload>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/upload-sessions/${uploadSessionId}`),
      );
      if (!mountedRef.current) {
        throw new Error("Import polling stopped");
      }
      setLatestUpload((current) => ({ ...(current || { upload_session_id: uploadSessionId }), ...payload }));
      if (payload.status === "failed") {
        throw new Error(payload.error_text || "Import failed");
      }
      if (payload.status === "promoted") {
        if (payload.video_asset) {
          return payload.video_asset;
        }
        throw new Error("Import finished without a video asset");
      }
      setImportStatus("Importing remote video...");
      await wait(2000);
    }
    throw new Error("Import timed out");
  };

  const uploadVideo = async () => {
    if (!showId.trim()) {
      setError("Choose a show first");
      return;
    }
    if (!selectedSeasonId.trim()) {
      setError("Choose a season first");
      return;
    }
    if (!submissionOwnerId) {
      setError(videoClass === "episode" ? "Choose an episode first" : "Choose a season or episode first");
      return;
    }
    if (!selectedFile) {
      setError("Choose a video file first");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const uploadSession = await parseResponse<UploadSessionPayload>(
        await fetchAdminWithAuth("/api/admin/trr-api/cast-screentime/upload-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_scope: submissionOwnerScope,
            owner_id: submissionOwnerId,
            filename: selectedFile.name,
            content_type: selectedFile.type || "video/mp4",
            expected_size_bytes: selectedFile.size,
            media_type: videoClass,
            media_kind: effectivePromoSubtype,
          }),
        }),
      );
      setLatestUpload(uploadSession);

      const putResponse = await fetch(uploadSession.put_url || "", {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type || "video/mp4" },
        body: selectedFile,
      });
      if (!putResponse.ok) {
        throw new Error(`Direct upload failed with ${putResponse.status}`);
      }

      const completed = await parseResponse<{ video_asset: VideoAssetPayload }>(
        await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/upload-sessions/${uploadSession.upload_session_id}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ upload_session_id: uploadSession.upload_session_id }),
          },
        ),
      );
      setVideoAsset(completed.video_asset);
      syncShowContext(completed.video_asset, null);
      resetRunOutputs();
      await refreshRecentRuns(completed.video_asset.show_id || undefined);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const importVideoAsset = async () => {
    if (!showId.trim()) {
      setError("Choose a show first");
      return;
    }
    if (!selectedSeasonId.trim()) {
      setError("Choose a season first");
      return;
    }
    if (!submissionOwnerId) {
      setError(videoClass === "episode" ? "Choose an episode first" : "Choose a season or episode first");
      return;
    }
    if (importMode === "social_youtube_row" && !socialYoutubeVideoId.trim()) {
      setError("Existing social YouTube row ID is required");
      return;
    }
    if (importMode !== "social_youtube_row" && !remoteSource.trim()) {
      setError("Source URL is required");
      return;
    }

    setError(null);
    setImportingAsset(true);
    setImportStatus(null);
    try {
      const payload = await parseResponse<ImportVideoAssetResponsePayload>(
        await fetchAdminWithAuth("/api/admin/trr-api/cast-screentime/video-assets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_mode: importMode,
            source_url: importMode === "social_youtube_row" ? undefined : remoteSource.trim(),
            social_youtube_video_id: importMode === "social_youtube_row" ? socialYoutubeVideoId.trim() : undefined,
            owner_scope: submissionOwnerScope,
            owner_id: submissionOwnerId,
            media_type: videoClass,
            media_kind: effectivePromoSubtype,
          }),
        }),
      );
      setLatestUpload({
        upload_session_id: payload.upload_session_id,
        status: payload.status,
        owner_scope: submissionOwnerScope,
        owner_id: submissionOwnerId,
        media_type: videoClass,
        media_kind: effectivePromoSubtype,
      });
      if (payload.video_asset) {
        await applyImportedVideoAsset(payload.video_asset);
        setImportStatus(null);
        return;
      }
      setImportStatus(payload.queued ? "Import queued..." : "Importing remote video...");
      const promotedAsset = await pollImportedUploadSession(payload.upload_session_id);
      await applyImportedVideoAsset(promotedAsset);
      setImportStatus(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setImportingAsset(false);
    }
  };

  const requestSubtitleExtraction = async (force: boolean) => {
    if (!activeVideoAssetId) return;
    if (force && !window.confirm("Re-extract source subtitles and replace the active revision when it succeeds?")) {
      return;
    }
    setSubtitleActionPending(true);
    setSubtitleError(null);
    try {
      const payload = await parseResponse<Partial<SubtitleSummaryPayload>>(
        await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/video-assets/${activeVideoAssetId}/subtitles/extract`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ force }),
          },
        ),
      );
      setSubtitleSummary((current) =>
        normalizeSubtitleSummary({ ...(current ?? {}), ...payload }, activeVideoAssetId),
      );
      subtitleAutoPollingStoppedRef.current = false;
      setSubtitleAutoPollingStopped(false);
      setSubtitlePollVersion((current) => current + 1);
    } catch (actionError) {
      setSubtitleError(actionError instanceof Error ? actionError.message : "Subtitle extraction could not be queued");
    } finally {
      setSubtitleActionPending(false);
    }
  };

  const downloadSubtitleTrack = async () => {
    if (!activeVideoAssetId || !selectedSubtitleTrackId) return;
    setSubtitleDownloadPending(true);
    setSubtitleError(null);
    try {
      const payload = await parseResponse<SubtitleDownloadPayload>(
        await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/video-assets/${activeVideoAssetId}/subtitles/${selectedSubtitleTrackId}/download-url`,
        ),
      );
      const anchor = document.createElement("a");
      anchor.href = payload.download_url;
      anchor.download = payload.filename;
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (downloadError) {
      setSubtitleError(downloadError instanceof Error ? downloadError.message : "Subtitle download could not start");
    } finally {
      setSubtitleDownloadPending(false);
    }
  };

  const launchRun = async () => {
    if (!videoAsset?.id) {
      setError("Create or import a video asset first");
      return;
    }
    setError(null);
    setLaunchingRun(true);
    try {
      const response = await parseResponse<{
        run: RunPayload;
        dispatch_state: string;
      }>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/video-assets/${videoAsset.id}/runs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_config_json: {} }),
        }),
      );
      setRun(response.run);
      syncShowContext(videoAsset, response.run);
      await refreshRun(response.run.id, response.run.show_id || videoAsset.show_id || undefined);
      router.push(buildScreenalyticsRunPath(response.run.id));
      if (response.dispatch_state === "dispatch_failed") {
        setError(response.run.error_message || "Run dispatch failed");
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Run launch failed");
    } finally {
      setLaunchingRun(false);
    }
  };

  const refreshRun = async (runId = run?.id, forcedShowId?: string) => {
    if (!runId) return;
    setError(null);
    setRefreshingRun(true);
    try {
      const fetchArtifactPayload = async <T,>(artifactKey: string): Promise<T[]> => {
        const response = await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/artifacts/${artifactKey}`);
        if (response.status === 404) return [];
        const payload = await parseResponse<{ payload: T[] }>(response);
        return Array.isArray(payload.payload) ? payload.payload : [];
      };
      const fetchArtifactObject = async <T,>(artifactKey: string): Promise<T | null> => {
        const response = await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/artifacts/${artifactKey}`);
        if (response.status === 404) return null;
        const payload = await parseResponse<{ payload: T }>(response);
        return payload.payload ?? null;
      };

      const [runResponse, leaderboardResponse, segmentsResponse, evidenceResponse, excludedResponse, reviewSummaryResponse] = await Promise.all([
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/leaderboard`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/segments`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/evidence`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/excluded-sections`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/review-summary`),
      ]);

      const runPayload = await parseResponse<RunPayload>(runResponse);
      const leaderboardPayload = await parseResponse<{ leaderboard: LeaderboardEntry[] }>(leaderboardResponse);
      const segmentsPayload = await parseResponse<{ segments: SegmentEntry[] }>(segmentsResponse);
      const evidencePayload = await parseResponse<{ evidence: EvidenceEntry[] }>(evidenceResponse);
      const excludedPayload = await parseResponse<{ excluded_sections: ExcludedSectionEntry[] }>(excludedResponse);
      const reviewSummaryPayload = await parseResponse<ReviewSummaryPayload>(reviewSummaryResponse);
      setRun(runPayload);
      syncShowContext(null, runPayload);
      if (runPayload.owner_scope) {
        setDecisionScope(runPayload.owner_scope);
      }
      setLeaderboard(Array.isArray(leaderboardPayload.leaderboard) ? leaderboardPayload.leaderboard : []);
      setSegments(Array.isArray(segmentsPayload.segments) ? segmentsPayload.segments : []);
      setEvidence(Array.isArray(evidencePayload.evidence) ? evidencePayload.evidence : []);
      setExcludedSections(Array.isArray(excludedPayload.excluded_sections) ? excludedPayload.excluded_sections : []);
      setReviewSummary(reviewSummaryPayload);
      const [
        shotsPayload,
        scenesPayload,
        titleCardsPayload,
        titleCardReferencesPayload,
        titleCardMatchesPayload,
        confessionalsPayload,
        suggestionsPayload,
        queuesPayload,
        progressPayload,
        cacheMetricsPayload,
        flashbackPayload,
        decisionStatePayload,
      ] =
        await Promise.all([
          fetchArtifactPayload<ShotEntry>("shots.json"),
          fetchArtifactPayload<SceneEntry>("scenes.json"),
          fetchArtifactPayload<TitleCardCandidateEntry>("title_card_candidates.json"),
          fetchArtifactPayload<TitleCardReferenceEntry>("title_card_reference_signatures.json"),
          fetchArtifactPayload<FlashbackMatchEntry>("title_card_matches.json"),
          fetchArtifactPayload<ConfessionalCandidateEntry>("confessional_candidates.json"),
          fetchArtifactPayload<CastSuggestionEntry>("cast_suggestions.json"),
          fetchArtifactPayload<UnknownReviewQueueEntry>("unknown_review_queues.json"),
          fetchArtifactObject<ProgressPayload>("progress.json"),
          fetchArtifactObject<CacheMetricsPayload>("cache_metrics.json"),
          fetchArtifactPayload<FlashbackMatchEntry>("flashback_matches.json"),
          parseResponse<DecisionStatePayload>(await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/decision-state`)),
        ]);
      setShots(shotsPayload);
      setScenes(scenesPayload);
      setTitleCardCandidates(titleCardsPayload);
      setTitleCardReferences(titleCardReferencesPayload);
      setTitleCardMatches(titleCardMatchesPayload);
      setConfessionalCandidates(confessionalsPayload);
      setCastSuggestions(suggestionsPayload);
      setUnknownReviewQueues(queuesPayload);
      setProgress(progressPayload);
      setCacheMetrics(cacheMetricsPayload);
      setFlashbackMatches(flashbackPayload);
      setSuggestionDecisions(Array.isArray(decisionStatePayload.suggestion_decisions) ? decisionStatePayload.suggestion_decisions : []);
      setUnknownReviewState(Array.isArray(decisionStatePayload.unknown_review_state) ? decisionStatePayload.unknown_review_state : []);
      setDecisionRerunRequired(Boolean(decisionStatePayload.rerun_required_for_metrics));
      setDecisionEffectSummary(String(decisionStatePayload.decision_effect_summary || "").trim() || null);
      if (runPayload.video_asset_id) {
        const publishHistoryResponse = await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/video-assets/${runPayload.video_asset_id}/publish-history`,
        );
        const publishHistoryPayload = await parseResponse<{ publish_history: PublishVersionEntry[] }>(publishHistoryResponse);
        setPublishHistory(Array.isArray(publishHistoryPayload.publish_history) ? publishHistoryPayload.publish_history : []);
      } else {
        setPublishHistory([]);
      }
      const resolvedShowId = String(runPayload.show_id || forcedShowId || showId).trim();
      if (resolvedShowId) {
        setShowId(resolvedShowId);
        await refreshRecentRuns(resolvedShowId);
        const showRollupResponse = await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/shows/${resolvedShowId}/published-rollups`,
        );
        const showRollupPayload = await parseResponse<RollupPayload>(showRollupResponse);
        setShowRollup(showRollupPayload);
      } else {
        setShowRuns([]);
        setShowRollup(null);
      }
      const resolvedSeasonId = String(runPayload.season_id || "").trim();
      if (resolvedSeasonId) {
        const seasonRollupResponse = await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/seasons/${resolvedSeasonId}/published-rollups`,
        );
        const seasonRollupPayload = await parseResponse<RollupPayload>(seasonRollupResponse);
        setSeasonRollup(seasonRollupPayload);
      } else {
        setSeasonRollup(null);
      }
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Run refresh failed");
    } finally {
      setRefreshingRun(false);
    }
  };

  const generateClip = async (segmentKey: string, mode: "exact" | "timestamp", durationSeconds?: number) => {
    if (!run?.id) return;
    setError(null);
    const actionKey = `${segmentKey}:${mode}:${durationSeconds ?? 0}`;
    setGeneratingClipKey(actionKey);
    try {
      await parseResponse<{ evidence: EvidenceEntry }>(
        await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/runs/${run.id}/segments/${encodeURIComponent(segmentKey)}/clip`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode,
              duration_seconds: durationSeconds,
              ttl_days: 7,
            }),
          },
        ),
      );
      await refreshRun(run.id);
    } catch (clipError) {
      setError(clipError instanceof Error ? clipError.message : "Clip generation failed");
    } finally {
      setGeneratingClipKey(null);
    }
  };

  const transitionReviewStatus = async (nextStatus: string) => {
    if (!run?.id) return;
    setError(null);
    setUpdatingReviewStatus(nextStatus);
    try {
      await parseResponse<RunPayload>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${run.id}/review-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: nextStatus,
            notes: { source: "trr-app-admin" },
          }),
        }),
      );
      await refreshRun(run.id);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Review status update failed");
    } finally {
      setUpdatingReviewStatus(null);
    }
  };

  const publishCurrentRun = async () => {
    if (!run?.id) return;
    setError(null);
    setPublishingRun(true);
    try {
      await parseResponse<{ publish_version: PublishVersionEntry }>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${run.id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: { source: "trr-app-admin" } }),
        }),
      );
      await refreshRun(run.id);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Publish failed");
    } finally {
      setPublishingRun(false);
    }
  };

  const applySuggestionDecision = async (suggestionKey: string, decision: "accept" | "reject" | "defer") => {
    if (!run?.id) return;
    setError(null);
    setActingSuggestionKey(`${suggestionKey}:${decision}`);
    try {
      await parseResponse<{ decision: SuggestionDecisionEntry }>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${run.id}/suggestions/${encodeURIComponent(suggestionKey)}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            decision_scope: decisionScope,
            notes: { source: "trr-app-admin" },
          }),
        }),
      );
      await refreshRun(run.id);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Suggestion decision failed");
    } finally {
      setActingSuggestionKey(null);
    }
  };

  const applyUnknownDecision = async (queueKey: string, decision: "accept" | "reject" | "defer") => {
    if (!run?.id) return;
    setError(null);
    setActingUnknownQueueKey(`${queueKey}:${decision}`);
    try {
      await parseResponse<{ decision: UnknownReviewDecisionEntry }>(
        await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${run.id}/unknown-review/${encodeURIComponent(queueKey)}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            decision_scope: decisionScope,
            notes: { source: "trr-app-admin" },
          }),
        }),
      );
      await refreshRun(run.id);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unknown review decision failed");
    } finally {
      setActingUnknownQueueKey(null);
    }
  };

  const reconcileStaleRuns = async () => {
    if (!showId.trim()) {
      setError("Choose a show to reconcile stale runs");
      return;
    }
    setError(null);
    setReconcilingStale(true);
    try {
      await parseResponse<{ reconciled_run_count: number }>(
        await fetchAdminWithAuth(
          `/api/admin/trr-api/cast-screentime/runs/reconcile-stale?show_id=${encodeURIComponent(showId.trim())}`,
          {
            method: "POST",
          },
        ),
      );
      if (run?.id) {
        await refreshRun(run.id, showId.trim());
      } else {
        await refreshRecentRuns(showId.trim());
      }
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Stale-run reconciliation failed");
    } finally {
      setReconcilingStale(false);
    }
  };

  const loadRecentRun = async (runId: string) => {
    const canonicalPath = buildScreenalyticsRunPath(runId);
    if (pathname !== canonicalPath) {
      router.push(canonicalPath);
    }
    await refreshRun(runId);
  };

  const copyRunLink = async (runId: string) => {
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== "function") {
        throw new Error("Clipboard access is not available in this browser.");
      }
      await clipboard.writeText(buildScreenalyticsRunUrl(runId));
      if (!mountedRef.current) return;
      setCopiedRunLinkId(runId);
      window.setTimeout(() => {
        if (!mountedRef.current) return;
        setCopiedRunLinkId((current) => (current === runId ? null : current));
      }, 1800);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Failed to copy run link.");
    }
  };

  useEffect(() => {
    if (!routeRunId || checking || !hasAccess || autoLoadedRunId === routeRunId) return;
    setAutoLoadedRunId(routeRunId);
    void refreshRun(routeRunId);
  }, [autoLoadedRunId, checking, hasAccess, routeRunId]);

  if (checking) {
    return (
      <AdminGlobalHeader bodyClassName="px-6 py-6">
        <div className="mx-auto max-w-6xl">
          <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
          <p className="text-sm text-neutral-500">Checking admin access…</p>
        </div>
      </AdminGlobalHeader>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const publicationMode = run?.publication_mode || reviewSummary?.publication_mode || (resolveMediaType(run) === "episode" ? "canonical_episode" : "supplementary_reference");
  const isCanonicalPublication = publicationMode === "canonical_episode";
  const currentPublishVersion =
    (run ? publishHistory.find((entry) => entry.run_id === run.id) ?? null : null) || reviewSummary?.current_publish_version || null;
  const canPublishCurrentRun = Boolean(run?.status === "success" && (run?.review_status || "draft") === "approved");
  const publishButtonLabel = currentPublishVersion?.is_current
    ? isCanonicalPublication
      ? `Published (v${currentPublishVersion.version_number})`
      : `Published Internal Reference (v${currentPublishVersion.version_number})`
    : isCanonicalPublication
      ? "Publish Canonical Version"
      : "Publish Internal Reference";
  const availableReviewTransitions = getAllowedReviewTransitions(run);
  const canonicalRuns = showRuns.filter((item) => resolveMediaType(item) === "episode");
  const independentRuns = showRuns.filter((item) => resolveMediaType(item) !== "episode");
  const latestSuggestionDecisionByPerson = new Map<string, SuggestionDecisionEntry>();
  suggestionDecisions.forEach((entry) => {
    if (!latestSuggestionDecisionByPerson.has(entry.person_id)) {
      latestSuggestionDecisionByPerson.set(entry.person_id, entry);
    }
  });
  const latestUnknownDecisionByGroup = new Map<string, UnknownReviewDecisionEntry>();
  unknownReviewState.forEach((entry) => {
    const key = entry.queue_group || entry.queue_key;
    if (!latestUnknownDecisionByGroup.has(key)) {
      latestUnknownDecisionByGroup.set(key, entry);
    }
  });
  const debugDetailsAvailable = Boolean(latestUpload || videoAsset || run);
  const hasRunReviewArtifacts = Boolean(
    progress ||
      cacheMetrics ||
      flashbackMatches.length > 0 ||
      titleCardMatches.length > 0 ||
      shots.length > 0 ||
      scenes.length > 0 ||
      titleCardCandidates.length > 0 ||
      titleCardReferences.length > 0 ||
      confessionalCandidates.length > 0,
  );
  const hasFrameOrFaceArtifacts = Boolean(
    shots.length > 0 ||
      scenes.length > 0 ||
      titleCardCandidates.length > 0 ||
      titleCardReferences.length > 0 ||
      confessionalCandidates.length > 0,
  );
  const candidateScopePolicy = run?.candidate_scope_policy_json ?? null;
  const candidateScopeLabel =
    candidateScopePolicy?.primary_scope || candidateScopePolicy?.owner_scope || run?.owner_scope || "selected";
  const strictCandidateScope = candidateScopePolicy?.strict_credit_scope === true;
  const fallbackScopesUsed = run?.cast_coverage_summary_json?.fallback_scopes_used ?? [];
  const completedSubtitleTracks = (subtitleSummary?.tracks ?? []).filter(
    (track) => track.extraction_status === "complete",
  );
  const selectedSubtitleTrack =
    completedSubtitleTracks.find((track) => track.id === selectedSubtitleTrackId) ?? null;
  const subtitleResultCount = subtitleCuePage
    ? subtitleSearchQuery
      ? (subtitleCuePage.matched_cues ?? subtitleCuePage.items.length)
      : subtitleCuePage.total_cues
    : 0;
  const subtitleHasPreviousPage = subtitleCueOffset > 0;
  const subtitleHasNextPage = subtitleCueOffset + subtitleCuePageSize < subtitleResultCount;

  return (
    <AdminGlobalHeader bodyClassName="px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
          <h1 className="text-2xl font-semibold text-neutral-900">Screenalytics Workspace</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Prepare a video asset, run cast screen-time analysis, then review frames, faces, exclusions, and publishable totals from one admin surface.
          </p>
          {prefillContext === "social_week_youtube" ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              Prefilled from a social-week YouTube post. Review owner and source URL, then import the trailer into cast screentime.
            </p>
          ) : null}
          {isTestExtraPath || prefillContext === "screenalytics_test_extra" ? (
            <p className="mt-2 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
              Prefilled for RHOBH S5 E16 extras screenalytics test.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Analysis Setup</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Choose the show and season first. Add an episode when the video belongs to one episode; leave it season-level for trailers or extras that span multiple episodes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={videoClass === "episode" ? "sky" : "amber"}>
                {formatVideoClass(videoClass, effectivePromoSubtype)}
              </Badge>
              {videoClass === "episode" ? <Badge tone="emerald">Canonical episode</Badge> : <Badge tone="amber">Internal reference</Badge>}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr,1fr,0.95fr]">
            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Show
              <select
                aria-label="Show"
                value={showId}
                onChange={(event) => handleShowChange(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              >
                <option value="">Choose show</option>
                <option value={screenalyticsKnownContext.show.id}>{screenalyticsKnownContext.show.label}</option>
                {showId && showId !== screenalyticsKnownContext.show.id ? <option value={showId}>Current show</option> : null}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Season
              <select
                aria-label="Season"
                value={selectedSeasonId}
                onChange={(event) => handleSeasonChange(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              >
                <option value="">Choose season</option>
                <option value={screenalyticsKnownContext.season.id}>{screenalyticsKnownContext.season.label}</option>
                {selectedSeasonId && selectedSeasonId !== screenalyticsKnownContext.season.id ? (
                  <option value={selectedSeasonId}>Current season</option>
                ) : null}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Episode
              <select
                aria-label="Episode"
                value={selectedEpisodeId}
                onChange={(event) => handleEpisodeChange(event.target.value)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              >
                <option value="">Season-level or multiple episodes</option>
                <option value={screenalyticsKnownContext.episode.id}>{screenalyticsKnownContext.episode.label}</option>
                {selectedEpisodeId && selectedEpisodeId !== screenalyticsKnownContext.episode.id ? (
                  <option value={selectedEpisodeId}>Current episode</option>
                ) : null}
              </select>
              <span className="text-xs font-normal text-neutral-500">
                Optional for trailers and extras. Required only for canonical episode assets.
              </span>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Asset Type
              <select
                aria-label="Asset Type"
                value={videoClass}
                onChange={(event) => handleVideoClassChange(event.target.value as VideoClass)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              >
                <option value="episode">Episode</option>
                <option value="trailer">Trailer</option>
                <option value="extras">Extras</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
              {videoClass === "extras" ? "Extra Type" : videoClass === "trailer" ? "Trailer Type" : "Media Type"}
              <select
                aria-label="Content Type"
                value={videoClass === "episode" ? "" : promoSubtype}
                onChange={(event) => setPromoSubtype(event.target.value)}
                disabled={videoClass === "episode"}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 disabled:bg-neutral-100"
              >
                <option value="">No subtype</option>
                {visibleMediaKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl bg-neutral-50 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Context</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{selectedScopeLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Video class</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{formatVideoClass(videoClass, effectivePromoSubtype)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Label</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{selectedMediaLabel}</p>
            </div>
          </div>

          <details className="mt-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
            <summary className="cursor-pointer font-medium text-neutral-800">Technical routing</summary>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <span className="text-neutral-500">Owner scope</span>
                <div className="font-mono text-neutral-900">{submissionOwnerScope}</div>
              </div>
              <div>
                <span className="text-neutral-500">Owner ID</span>
                <div className="truncate font-mono text-neutral-900">{submissionOwnerId || "not selected"}</div>
              </div>
              <div>
                <span className="text-neutral-500">Media key</span>
                <div className="font-mono text-neutral-900">{effectivePromoSubtype || "none"}</div>
              </div>
            </div>
          </details>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Direct Upload</h2>
              <Badge tone="neutral">Source video</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              Upload a local video directly to R2, verify it, and promote it into a cast-screentime video asset.
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-neutral-700">
              Source Video
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={uploadVideo}
                disabled={uploading}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Upload And Verify"}
              </button>
              <span className="text-xs text-neutral-500">
                {videoClass === "episode"
                  ? "Episode uploads stay eligible for canonical publish after approval."
                  : "Trailer and extras uploads stay reviewable and can publish as internal references."}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Remote Import</h2>
              <Badge tone="neutral">Source video</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-600">
              Mirror an official YouTube trailer, another explicit external video URL, or an existing social YouTube row into TRR storage first.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr,1.4fr]">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Import Mode
                <select
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value as ImportMode)}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                >
                  {importModes.map((option) => (
                    <option key={option} value={option}>
                      {option === "social_youtube_row"
                        ? "Existing Social YouTube Row"
                        : option === "youtube_url"
                          ? "Official YouTube URL"
                          : "External URL"}
                    </option>
                  ))}
                </select>
              </label>
              {importMode === "social_youtube_row" ? (
                <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                  Social YouTube Row ID
                  <input
                    value={socialYoutubeVideoId}
                    onChange={(event) => setSocialYoutubeVideoId(event.target.value)}
                    placeholder="UUID from social.youtube_videos.id"
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                  Source URL
                  <input
                    value={remoteSource}
                    onChange={(event) => setRemoteSource(event.target.value)}
                    placeholder={
                      importMode === "youtube_url"
                        ? "https://www.youtube.com/watch?v=..."
                        : "https://cdn.example.com/trailer.mp4"
                    }
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  />
                </label>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={importVideoAsset}
                disabled={importingAsset}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {importingAsset ? "Importing…" : "Import Asset"}
              </button>
              <Badge tone="amber">YouTube imports must match an official configured channel</Badge>
            </div>
            {importStatus ? <p className="mt-3 text-sm text-neutral-600">{importStatus}</p> : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Latest Upload Session</h2>
              {latestUpload ? (
                <Badge tone={resolveMediaType(latestUpload) === "episode" ? "sky" : "amber"}>
                  {formatVideoClass(latestUpload.media_type, latestUpload.media_kind, latestUpload.video_class, latestUpload.promo_subtype)}
                </Badge>
              ) : null}
            </div>
            {latestUpload ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Session</p>
                  <p className="mt-1 truncate font-mono text-xs font-medium text-neutral-900">{latestUpload.upload_session_id}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Context</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {formatOwnerSelectionLabel(latestUpload.owner_scope, latestUpload.owner_id)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Expires</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{latestUpload.expires_at || "n/a"}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">No upload session has been created in this browser session.</p>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Run Control</h2>
              {videoAsset ? (
                <>
                  <Badge tone={resolveMediaType(videoAsset) === "episode" ? "sky" : "amber"}>
                    {formatVideoClass(videoAsset.media_type, videoAsset.media_kind, videoAsset.video_class, videoAsset.promo_subtype)}
                  </Badge>
                  <Badge tone="neutral">{formatImportType(videoAsset.source_import_type)}</Badge>
                  {videoAsset.is_publishable === false ? <Badge tone="amber">Non-publishable</Badge> : null}
                </>
              ) : null}
            </div>
            {videoAsset ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Context</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {formatOwnerSelectionLabel(videoAsset.owner_scope, videoAsset.owner_id, videoAsset.season_id, videoAsset.episode_id)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Show</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {videoAsset.show_id === screenalyticsKnownContext.show.id ? screenalyticsKnownContext.show.label : videoAsset.show_id || "n/a"}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Import Type</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{formatImportType(videoAsset.source_import_type)}</p>
                </div>
              </div>
            ) : importStatus ? (
              <p className="mt-3 text-sm text-neutral-500">{importStatus}</p>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Create or import a video asset before launching a run.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={launchRun}
                disabled={launchingRun || !videoAsset?.id}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {launchingRun ? "Launching…" : "Launch Run"}
              </button>
              <button
                type="button"
                onClick={() => void refreshRecentRuns()}
                disabled={refreshingRuns || !showId.trim()}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {refreshingRuns ? "Refreshing Runs…" : "Refresh Show Runs"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" aria-labelledby="source-subtitles-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="source-subtitles-heading" className="text-base font-semibold text-neutral-900">
                  Source Subtitles
                </h2>
                {activeVideoAssetId ? (
                  <Badge
                    tone={
                      subtitleSummary?.status === "complete"
                        ? "sky"
                        : subtitleSummary?.status === "failed" || subtitleSummary?.status === "partial"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {subtitleLoading && !subtitleSummary
                      ? "Loading"
                      : formatSubtitleStatus(subtitleSummary?.status)}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                Preserve embedded English captions as the source reference for transcript review.
              </p>
            </div>
            {activeVideoAssetId ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubtitlePollVersion((current) => current + 1)}
                  disabled={subtitleLoading}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
                >
                  {subtitleLoading ? "Refreshing…" : "Refresh"}
                </button>
                {subtitleSummary?.status === "not_requested" || !subtitleSummary ? (
                  <button
                    type="button"
                    onClick={() => void requestSubtitleExtraction(false)}
                    disabled={subtitleActionPending}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {subtitleActionPending ? "Queuing…" : "Extract Subtitles"}
                  </button>
                ) : subtitleSummary.status === "failed" ||
                  subtitleSummary.status === "partial" ||
                  subtitleSummary.status === "unavailable" ? (
                  <button
                    type="button"
                    onClick={() => void requestSubtitleExtraction(false)}
                    disabled={subtitleActionPending}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {subtitleActionPending ? "Queuing…" : "Retry Extraction"}
                  </button>
                ) : subtitleSummary.status === "complete" ? (
                  <button
                    type="button"
                    onClick={() => void requestSubtitleExtraction(true)}
                    disabled={subtitleActionPending}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
                  >
                    {subtitleActionPending ? "Queuing…" : "Re-extract"}
                  </button>
                ) : subtitleSummary.status === "queued" || subtitleSummary.status === "running" ? (
                  <button
                    type="button"
                    onClick={() => void requestSubtitleExtraction(true)}
                    disabled={subtitleActionPending}
                    className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-60"
                  >
                    {subtitleActionPending ? "Queuing…" : "Restart extraction"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {!activeVideoAssetId ? (
            <p className="mt-4 text-sm text-neutral-500">
              Create, import, or load a video asset to inspect its embedded subtitle tracks.
            </p>
          ) : null}

          {activeVideoAssetId && subtitleSummary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Discovered</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {subtitleSummary.discovered_track_count ?? subtitleSummary.tracks?.length ?? 0} tracks
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">English</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {subtitleSummary.eligible_track_count ?? 0} eligible
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Extracted</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {subtitleSummary.completed_track_count ?? completedSubtitleTracks.length} complete
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Attempts</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{subtitleSummary.attempts ?? 0}</p>
              </div>
            </div>
          ) : null}

          {subtitleSummary?.status === "queued" || subtitleSummary?.status === "running" ? (
            <p className="mt-4 text-sm text-neutral-600" role="status">
              {subtitleAutoPollingStopped
                ? `Subtitle extraction is still running. Automatic refresh paused after ${subtitleAutoPollingMaxAttempts} checks; use Refresh to check again.`
                : "Subtitle extraction is running in the background. This video remains available for analysis."}
            </p>
          ) : null}
          {subtitleSummary?.status === "unavailable" ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This asset has no supported English embedded subtitle track.
            </p>
          ) : null}
          {subtitleSummary?.status === "failed" || subtitleSummary?.status === "partial" ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {subtitleSummary.error ||
                (subtitleSummary.status === "partial"
                  ? "Some English subtitle tracks could not be extracted."
                  : "Subtitle extraction failed. The video upload is still available.")}
            </p>
          ) : null}
          {subtitleError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {subtitleError}
            </p>
          ) : null}

          {completedSubtitleTracks.length > 0 ? (
            <div className="mt-5 border-t border-neutral-200 pt-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="flex min-w-64 flex-col gap-2 text-sm font-medium text-neutral-700">
                  English subtitle track
                  <select
                    aria-label="English subtitle track"
                    value={selectedSubtitleTrackId}
                    onChange={(event) => {
                      setSelectedSubtitleTrackId(event.target.value);
                      setSubtitleCueOffset(0);
                    }}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                  >
                    {completedSubtitleTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        Stream {track.stream_index} · {track.language || track.language_normalized || track.language_raw || "English"} · {track.codec_name}
                        {track.is_primary ? " · primary" : ""}
                        {track.is_forced ? " · forced" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void downloadSubtitleTrack()}
                  disabled={!selectedSubtitleTrack || subtitleDownloadPending}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {subtitleDownloadPending ? "Preparing SRT…" : "Download SRT"}
                </button>
              </div>

              {selectedSubtitleTrack ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Track</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-sm font-medium text-neutral-900">Stream {selectedSubtitleTrack.stream_index}</span>
                      {selectedSubtitleTrack.is_primary ? <Badge tone="sky">Primary</Badge> : null}
                      {selectedSubtitleTrack.is_default ? <Badge tone="neutral">Default</Badge> : null}
                      {selectedSubtitleTrack.is_forced ? <Badge tone="amber">Forced</Badge> : null}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Cues</p>
                    <p className="mt-1 text-sm font-medium text-neutral-900">
                      {(selectedSubtitleTrack.cue_count ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">Timing</p>
                    <p className="mt-1 text-xs font-medium text-neutral-900">
                      {formatSubtitleTimestamp(selectedSubtitleTrack.first_cue_start_ms)} –{" "}
                      {formatSubtitleTimestamp(selectedSubtitleTrack.last_cue_end_ms)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500">SRT</p>
                    <p className="mt-1 text-xs font-medium text-neutral-900">
                      {formatSubtitleBytes(selectedSubtitleTrack.srt_size_bytes)}
                      {selectedSubtitleTrack.srt_sha256
                        ? ` · ${selectedSubtitleTrack.srt_sha256.slice(0, 10)}…`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="flex min-w-64 flex-1 flex-col gap-2 text-sm font-medium text-neutral-700">
                    Search subtitle cues
                    <input
                      type="search"
                      value={subtitleSearchInput}
                      onChange={(event) => setSubtitleSearchInput(event.target.value)}
                      placeholder="Search spoken dialogue, speaker labels, or SDH cues"
                      className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                    />
                  </label>
                  <p className="pb-2 text-xs text-neutral-500" aria-live="polite">
                    {subtitleCueLoading
                      ? "Loading cues…"
                      : `${subtitleResultCount.toLocaleString()} ${subtitleSearchQuery ? "matches" : "cues"}`}
                  </p>
                </div>

                {!subtitleCueLoading && subtitleCuePage?.items.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-500">No subtitle cues match this search.</p>
                ) : null}
                {subtitleCuePage?.items.length ? (
                  <ol className="mt-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
                    {subtitleCuePage.items.map((cue) => (
                      <li key={`${cue.ordinal}-${cue.start_ms}`} className="grid gap-2 px-3 py-3 md:grid-cols-[10rem,1fr]">
                        <div className="font-mono text-xs text-neutral-500">
                          {formatSubtitleTimestamp(cue.start_ms)}
                          <span className="mx-1">–</span>
                          {formatSubtitleTimestamp(cue.end_ms)}
                        </div>
                        <div>
                          <p className="whitespace-pre-wrap text-sm text-neutral-900">{cue.plain_text}</p>
                          {cue.text !== cue.plain_text ? (
                            <details className="mt-2 text-xs text-neutral-500">
                              <summary className="cursor-pointer">Raw subtitle text</summary>
                              <pre className="mt-1 whitespace-pre-wrap break-words font-mono">{cue.text}</pre>
                            </details>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {subtitleCuePage && subtitleResultCount > subtitleCuePageSize ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSubtitleCueOffset((current) => Math.max(0, current - subtitleCuePageSize))}
                      disabled={!subtitleHasPreviousPage || subtitleCueLoading}
                      className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
                    >
                      Previous cues
                    </button>
                    <span className="text-xs text-neutral-500">
                      {subtitleCueOffset + 1}–{Math.min(subtitleCueOffset + subtitleCuePage.items.length, subtitleResultCount)} of{" "}
                      {subtitleResultCount.toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubtitleCueOffset((current) => current + subtitleCuePageSize)}
                      disabled={!subtitleHasNextPage || subtitleCueLoading}
                      className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
                    >
                      Next cues
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Run History Filter</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Episode, trailer, and extras runs stay in one admin surface, but you can isolate each media type.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Show filter
                <select
                  aria-label="Run History Show"
                  value={showId}
                  onChange={(event) => handleShowChange(event.target.value)}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="">Choose show</option>
                  <option value={screenalyticsKnownContext.show.id}>{screenalyticsKnownContext.show.label}</option>
                  {showId && showId !== screenalyticsKnownContext.show.id ? <option value={showId}>Current show</option> : null}
                </select>
              </label>
              <div className="flex flex-wrap gap-2 pt-6">
                {videoClassFilters.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setVideoClassFilter(option)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium ${
                      videoClassFilter === option
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-300 text-neutral-900"
                    }`}
                  >
                    {formatMediaFilterLabel(option)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void refreshRecentRuns()}
                disabled={refreshingRuns || !showId.trim()}
                className="mt-6 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {refreshingRuns ? "Refreshing…" : "Load Runs"}
              </button>
              <button
                type="button"
                onClick={() => void reconcileStaleRuns()}
                disabled={reconcilingStale || !showId.trim()}
                className="mt-6 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {reconcilingStale ? "Reconciling…" : "Reconcile Stale Runs"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Current Run</h2>
              {run ? (
                <>
                  <Badge tone={resolveMediaType(run) === "episode" ? "sky" : "amber"}>
                    {formatVideoClass(run.media_type, run.media_kind, run.video_class, run.promo_subtype)}
                  </Badge>
                  <Badge tone="neutral">{formatImportType(run.source_import_type)}</Badge>
                  {run.is_publishable === false ? <Badge tone="amber">Non-publishable</Badge> : null}
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {run?.id ? (
                <Button variant="outline" size="sm" onClick={() => void copyRunLink(run.id)}>
                  {copiedRunLinkId === run.id ? "Copied link" : "Copy run link"}
                </Button>
              ) : null}
              {debugDetailsAvailable ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Debug details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Screenalytics debug details</DialogTitle>
                      <DialogDescription>
                        Raw payloads for troubleshooting. These are hidden from the normal review view.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <DebugJsonBlock title="Current run" value={run} />
                      <DebugJsonBlock title="Current video asset" value={videoAsset} />
                      <DebugJsonBlock title="Latest upload session" value={latestUpload} />
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
          {!run ? (
            <p className="mt-3 text-sm text-neutral-500">
              Load a recent run or launch a new one to review screen-time output.
            </p>
          ) : null}
          {run ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {getRunOverviewMessage(run, currentPublishVersion)}
            </div>
          ) : null}
          {run ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Run</p>
                <p className="mt-1 truncate font-mono text-xs font-medium text-neutral-900">{run.id}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Execution</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{getExecutionStatusLabel(run)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Dispatch</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{run.dispatch_status || "n/a"}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Review</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{run.review_status || "draft"}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Context</p>
                <p className="mt-1 truncate text-sm font-medium text-neutral-900">
                  {formatOwnerSelectionLabel(run.owner_scope, run.owner_id, run.season_id, run.episode_id)}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Effective Runtime</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {run.effective_runtime_seconds != null ? `${Number(run.effective_runtime_seconds).toFixed(2)}s` : "n/a"}
                </p>
              </div>
            </div>
          ) : null}
          {run?.cast_coverage_summary_json ? (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
              <div className="font-medium">
                Candidate cast preflight: {run.cast_coverage_summary_json.candidate_count ?? 0} candidates,{" "}
                {run.cast_coverage_summary_json.approved_facebank_coverage_count ?? 0} with approved facebank coverage.
              </div>
              {candidateScopePolicy ? (
                <div className="mt-1 text-xs text-sky-800">
                  {strictCandidateScope
                    ? `Strict ${candidateScopeLabel} credits only. Broader fallback cast is not included.`
                    : `Candidate scope: ${candidateScopePolicy.scope_order?.join(", ") || candidateScopeLabel}.`}
                </div>
              ) : null}
              {Array.isArray(fallbackScopesUsed) && fallbackScopesUsed.length > 0 ? (
                <div className="mt-1 text-xs text-sky-800">
                  {strictCandidateScope ? "Legacy fallback scopes recorded" : "Fallback scopes used"}:{" "}
                  {fallbackScopesUsed.join(", ")}
                </div>
              ) : null}
              {Array.isArray(run.cast_coverage_summary_json.warnings) && run.cast_coverage_summary_json.warnings.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {run.cast_coverage_summary_json.warnings.map((warning) => (
                    <Badge key={warning} tone="amber">
                      {formatCoverageWarning(warning)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {run?.error_message ? <p className="mt-3 text-sm text-red-600">{run.error_message}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="flex flex-col gap-2 text-xs font-medium text-neutral-700">
              Decision Scope
              <select
                value={decisionScope}
                onChange={(event) => setDecisionScope(event.target.value as OwnerScope)}
                className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              >
                {decisionScopes.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void refreshRun()}
              disabled={refreshingRun || !run?.id}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
            >
              {refreshingRun ? "Refreshing…" : "Refresh Run"}
            </button>
            {canPublishCurrentRun ? (
              <button
                type="button"
                onClick={() => void publishCurrentRun()}
                disabled={publishingRun}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {publishingRun ? "Publishing…" : publishButtonLabel}
              </button>
            ) : null}
            {run
              ? availableReviewTransitions.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    onClick={() => void transitionReviewStatus(nextStatus)}
                    disabled={Boolean(updatingReviewStatus)}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-900 disabled:opacity-60"
                  >
                    {updatingReviewStatus === nextStatus ? "Updating…" : `Mark ${nextStatus}`}
                  </button>
                ))
              : null}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Review Workspace</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Use this as the handoff point after a run starts: metrics, frame artifacts, identity suggestions, and exclusions populate as retained artifacts arrive.
              </p>
            </div>
            {run ? <Badge tone="sky">{getExecutionStatusLabel(run)}</Badge> : <Badge tone="neutral">No active run</Badge>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-neutral-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Metrics</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{leaderboard.length}</p>
              <p className="text-xs text-neutral-500">leaderboard rows</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Frames and faces</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{shots.length + scenes.length}</p>
              <p className="text-xs text-neutral-500">shots and scenes</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Identity review</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{castSuggestions.length + unknownReviewQueues.length}</p>
              <p className="text-xs text-neutral-500">suggestions and queues</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Exclusions</p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">{excludedSections.length}</p>
              <p className="text-xs text-neutral-500">sections marked out</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">
              {isCanonicalPublication ? "Canonical publication" : "Supplementary reference publication"}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {isCanonicalPublication
                ? "Episode assets publish into canonical episode, season, and show rollups."
                : "Trailer and extras assets publish as internal references without changing canonical episode, season, or show rollups."}
            </p>
            {publishHistory.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">
                {isCanonicalPublication
                  ? "No canonical publish history exists for the current asset."
                  : "No supplementary internal-reference publish history exists for the current asset."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {publishHistory.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">v{entry.version_number}</span>
                      {entry.is_current ? <Badge tone="emerald">Current</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Run {entry.run_id} · {entry.published_at || "n/a"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Run Progress</h2>
            {progress ? (
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="sky">{progress.stage}</Badge>
                  <Badge tone={progress.state === "completed" ? "emerald" : "neutral"}>{progress.state}</Badge>
                </div>
                <p className="text-neutral-700">{progress.detail || "No detail available."}</p>
                {cacheMetrics ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">{cacheMetrics.cache_mode || "cache n/a"}</Badge>
                    <Badge tone="sky">hits {cacheMetrics.hit_count ?? 0}</Badge>
                    <Badge tone="amber">misses {cacheMetrics.miss_count ?? 0}</Badge>
                  </div>
                ) : null}
                <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3 text-xs text-neutral-100">
                  {JSON.stringify(progress.counters || {}, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">No progress artifact has been persisted for this run yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Flashback Review</h2>
            {flashbackMatches.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No flashback matches were recorded for this run.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {flashbackMatches.map((item) => (
                  <div key={`${item.scene_key}:${item.fingerprint_hash}`} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">{item.scene_key}</span>
                      <Badge tone="amber">Flashback</Badge>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {formatDurationMs(item.duration_ms)} · reference scene {item.matched_reference_scene_key || "n/a"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Title Card Matches</h2>
            {titleCardMatches.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No season-scope title-card matches were recorded for this run.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {titleCardMatches.map((item) => (
                  <div key={`${item.scene_key}:${item.fingerprint_hash}`} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">{item.scene_key}</span>
                      <Badge tone="sky">Title Card</Badge>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {formatDurationMs(item.duration_ms)} · reference scene {item.matched_reference_scene_key || "n/a"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Reviewed Totals</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Derived from immutable retained segments plus excluded-section overlays. These are the totals used for publication snapshots.
              </p>
            </div>
            {reviewSummary ? (
              <div className="flex flex-wrap gap-2">
                <Badge tone={isCanonicalPublication ? "sky" : "amber"}>
                  {isCanonicalPublication ? "Canonical episode publication" : "Supplementary reference publication"}
                </Badge>
                <Badge tone="neutral">Excluded sections {reviewSummary.excluded_section_count}</Badge>
                <Badge tone="neutral">Overlap {formatDurationMs(reviewSummary.excluded_overlap_ms)}</Badge>
              </div>
            ) : null}
          </div>
          {reviewSummary?.decision_effect_summary ? (
            <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              {reviewSummary.decision_effect_summary}
            </p>
          ) : null}
          {reviewSummary?.reviewed_leaderboard?.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="pb-2 pr-4">Person</th>
                    <th className="pb-2 pr-4">Reviewed Time</th>
                    <th className="pb-2 pr-4">Frames</th>
                    <th className="pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewSummary.reviewed_leaderboard.map((entry) => (
                    <tr key={`reviewed:${entry.person_id}`} className="border-t border-neutral-200">
                      <td className="py-2 pr-4">{entry.display_name || entry.person_id}</td>
                      <td className="py-2 pr-4">{formatScreenTimeSeconds(entry.screen_time_seconds)}</td>
                      <td className="py-2 pr-4">{entry.frame_count}</td>
                      <td className="py-2">{entry.confidence_avg ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">No reviewed totals are available for this run yet.</p>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Canonical Show Rollup</h2>
              <Badge tone="sky">{showRollup?.published_asset_count ?? 0} published assets</Badge>
            </div>
            {showRollup?.leaderboard?.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-4">Person</th>
                      <th className="pb-2 pr-4">Screen Time</th>
                      <th className="pb-2">Episodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showRollup.leaderboard.map((entry) => (
                      <tr key={entry.person_id} className="border-t border-neutral-200">
                        <td className="py-2 pr-4">{entry.display_name || entry.person_id}</td>
                        <td className="py-2 pr-4">{entry.screen_time_seconds.toFixed(3)}s</td>
                        <td className="py-2">{entry.source_version_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">No canonical show rollup is available yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Canonical Season Rollup</h2>
              <Badge tone="sky">{seasonRollup?.published_asset_count ?? 0} published assets</Badge>
            </div>
            {seasonRollup?.leaderboard?.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-4">Person</th>
                      <th className="pb-2 pr-4">Screen Time</th>
                      <th className="pb-2">Episodes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonRollup.leaderboard.map((entry) => (
                      <tr key={entry.person_id} className="border-t border-neutral-200">
                        <td className="py-2 pr-4">{entry.display_name || entry.person_id}</td>
                        <td className="py-2 pr-4">{entry.screen_time_seconds.toFixed(3)}s</td>
                        <td className="py-2">{entry.source_version_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">No canonical season rollup is available yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900">Recent Runs For Show</h2>
            <Badge tone="neutral">
              {videoClassFilter === "all" ? "All assets" : `${formatMediaFilterLabel(videoClassFilter)} only`}
            </Badge>
          </div>
          {showRuns.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Load runs for the selected show to inspect recent assets in this class.</p>
          ) : (
            <div className="mt-3 grid gap-6 xl:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Canonical Episode Runs</h3>
                  <Badge tone="sky">{canonicalRuns.length}</Badge>
                </div>
                {canonicalRuns.length === 0 ? (
                  <p className="text-sm text-neutral-500">No episode-class runs are loaded for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-neutral-500">
                        <tr>
                          <th className="pb-2 pr-4">Run</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Review</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canonicalRuns.map((showRun) => (
                          <tr key={showRun.id} className="border-t border-neutral-200">
                            <td className="py-2 pr-4">
                              <div className="font-mono text-xs">{showRun.id}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge tone="sky">
                                  {formatVideoClass(showRun.media_type, showRun.media_kind, showRun.video_class, showRun.promo_subtype)}
                                </Badge>
                                <Badge tone="neutral">{showRun.owner_scope || "n/a"}</Badge>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{showRun.status}</td>
                            <td className="py-2 pr-4">{showRun.review_status || "draft"}</td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void loadRecentRun(showRun.id)}
                                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                                >
                                  Load
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void copyRunLink(showRun.id)}
                                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                                >
                                  {copiedRunLinkId === showRun.id ? "Copied" : "Copy link"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-neutral-900">Independent Trailer / Extras Runs</h3>
                  <Badge tone="amber">{independentRuns.length}</Badge>
                </div>
                {independentRuns.length === 0 ? (
                  <p className="text-sm text-neutral-500">No trailer or extras runs are loaded for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-neutral-500">
                        <tr>
                          <th className="pb-2 pr-4">Run</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Review</th>
                          <th className="pb-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {independentRuns.map((showRun) => (
                          <tr key={showRun.id} className="border-t border-neutral-200">
                            <td className="py-2 pr-4">
                              <div className="font-mono text-xs">{showRun.id}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge tone="amber">
                                  {formatVideoClass(showRun.media_type, showRun.media_kind, showRun.video_class, showRun.promo_subtype)}
                                </Badge>
                                <Badge tone="neutral">Independent report</Badge>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{showRun.status}</td>
                            <td className="py-2 pr-4">{showRun.review_status || "draft"}</td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void loadRecentRun(showRun.id)}
                                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                                >
                                  Load
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void copyRunLink(showRun.id)}
                                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                                >
                                  {copiedRunLinkId === showRun.id ? "Copied" : "Copy link"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-900">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">No metrics persisted for this run yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="pb-2 pr-4">Person</th>
                    <th className="pb-2 pr-4">Screen Time</th>
                    <th className="pb-2 pr-4">Frames</th>
                    <th className="pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.person_id} className="border-t border-neutral-200">
                      <td className="py-2 pr-4">{entry.display_name || entry.person_id}</td>
                      <td className="py-2 pr-4">{formatScreenTimeSeconds(entry.screen_time_seconds)}</td>
                      <td className="py-2 pr-4">{entry.frame_count}</td>
                      <td className="py-2">{entry.confidence_avg ?? "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-neutral-900">Segments</h2>
            {segments.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No segments persisted for this run yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-4">Segment</th>
                      <th className="pb-2 pr-4">Person</th>
                      <th className="pb-2 pr-4">Start</th>
                      <th className="pb-2 pr-4">End</th>
                      <th className="pb-2 pr-4">Source</th>
                      <th className="pb-2">Clips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((segment) => (
                      <tr key={segment.segment_key} className="border-t border-neutral-200">
                        <td className="py-2 pr-4">{segment.segment_key}</td>
                        <td className="py-2 pr-4">{segment.display_name || "Unassigned"}</td>
                        <td className="py-2 pr-4">{segment.start_ms}</td>
                        <td className="py-2 pr-4">{segment.end_ms}</td>
                        <td className="py-2 pr-4">
                          {segment.assignment_source}
                          {segment.is_counted === false ? " (not counted)" : ""}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void generateClip(segment.segment_key, "exact")}
                              disabled={Boolean(generatingClipKey)}
                              className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900 disabled:opacity-60"
                            >
                              {generatingClipKey === `${segment.segment_key}:exact:0` ? "Generating…" : "Exact"}
                            </button>
                            {[5, 10, 20].map((duration) => (
                              <button
                                key={duration}
                                type="button"
                                onClick={() => void generateClip(segment.segment_key, "timestamp", duration)}
                                disabled={Boolean(generatingClipKey)}
                                className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900 disabled:opacity-60"
                              >
                                {generatingClipKey === `${segment.segment_key}:timestamp:${duration}` ? "Generating…" : `${duration}s`}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Evidence</h2>
              {evidence.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">No evidence persisted for this run yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {evidence.map((item) => (
                    <div key={item.evidence_key} className="rounded-xl border border-neutral-200 p-3">
                      {item.public_url && item.content_type?.startsWith("video/") ? (
                        <video controls src={item.public_url} className="h-40 w-full rounded-lg border border-neutral-200 bg-neutral-950" />
                      ) : item.public_url ? (
                        <Image
                          src={item.public_url}
                          alt={item.evidence_key}
                          width={640}
                          height={240}
                          className="h-36 w-full rounded-lg border border-neutral-200 bg-neutral-50 object-contain"
                          unoptimized
                        />
                      ) : null}
                      <div className="mt-3 grid gap-2 text-sm">
                        <div>
                          <span className="font-medium text-neutral-900">{item.evidence_type}</span>
                          <span className="ml-2 text-neutral-500">{formatDurationMs(item.timestamp_ms)}</span>
                        </div>
                        <div className="font-mono text-[11px] text-neutral-600">{item.segment_key}</div>
                        <div className="break-all font-mono text-[11px] text-neutral-500">{item.object_key}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-900">Excluded Sections</h2>
              {excludedSections.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-500">No excluded sections persisted for this run yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-neutral-500">
                      <tr>
                        <th className="pb-2 pr-4">Section</th>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Start</th>
                        <th className="pb-2 pr-4">End</th>
                        <th className="pb-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excludedSections.map((section) => (
                        <tr key={section.section_key} className="border-t border-neutral-200">
                          <td className="py-2 pr-4 font-mono text-xs">{section.section_key}</td>
                          <td className="py-2 pr-4">{section.section_type}</td>
                          <td className="py-2 pr-4">{formatDurationMs(section.start_ms)}</td>
                          <td className="py-2 pr-4">{formatDurationMs(section.end_ms)}</td>
                          <td className="py-2">{section.detection_source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {hasFrameOrFaceArtifacts ? (
        <section className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Shots</h2>
            {shots.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No shot artifacts persisted for this run yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {shots.slice(0, 12).map((shot) => (
                  <div key={shot.shot_key} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="font-mono text-[11px] text-neutral-600">{shot.shot_key}</div>
                    <div className="mt-1 text-neutral-900">
                      {formatDurationMs(shot.start_ms)} to {formatDurationMs(shot.end_ms)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {shot.observation_count} observations, {shot.assigned_person_ids?.length ?? 0} assigned people
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Scenes</h2>
            {scenes.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No scene artifacts persisted for this run yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {scenes.map((scene) => (
                  <div key={scene.scene_key} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="font-mono text-[11px] text-neutral-600">{scene.scene_key}</div>
                    <div className="mt-1 text-neutral-900">
                      {formatDurationMs(scene.start_ms)} to {formatDurationMs(scene.end_ms)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {scene.composition_type}, {scene.shot_count} shots, {scene.unknown_segment_count} unknown segments
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {(scene.dominant_person_ids?.length ?? 0) === 0
                        ? "No named cast present"
                        : (scene.dominant_person_ids ?? [])
                            .map((personId) => scene.dominant_display_names?.[personId] || personId)
                            .join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Title Card Candidates</h2>
              <Badge tone="neutral">{titleCardReferences.length} references</Badge>
            </div>
            {titleCardCandidates.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No title-card candidates persisted for this run yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {titleCardCandidates.map((candidate) => (
                  <div key={candidate.shot_key} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="font-mono text-[11px] text-neutral-600">{candidate.shot_key}</div>
                    <div className="mt-1 text-neutral-900">
                      {formatDurationMs(candidate.start_ms)} to {formatDurationMs(candidate.end_ms)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      confidence {candidate.confidence_score ?? "n/a"}
                      {candidate.evidence_key ? `, evidence ${candidate.evidence_key}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Confessional Candidates</h2>
            {confessionalCandidates.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No confessional candidates persisted for this run yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {confessionalCandidates.map((candidate) => (
                  <div key={candidate.segment_key} className="rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                    <div className="font-mono text-[11px] text-neutral-600">{candidate.segment_key}</div>
                    <div className="mt-1 text-neutral-900">{candidate.display_name || "Unknown person"}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {formatDurationMs(candidate.duration_ms)}, confidence {candidate.confidence_score ?? "n/a"}
                      {candidate.shot_count ? `, shots ${candidate.shot_count}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        ) : (
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Frame and face artifacts</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Detailed frame, scene, title-card, and confessional sections appear here when artifacts are present.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={hasRunReviewArtifacts ? "sky" : "neutral"}>shots {shots.length}</Badge>
                <Badge tone={hasRunReviewArtifacts ? "sky" : "neutral"}>scenes {scenes.length}</Badge>
                <Badge tone={hasRunReviewArtifacts ? "sky" : "neutral"}>title cards {titleCardCandidates.length}</Badge>
                <Badge tone={hasRunReviewArtifacts ? "sky" : "neutral"}>confessionals {confessionalCandidates.length}</Badge>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Cast Suggestions</h2>
            {decisionRerunRequired || decisionEffectSummary ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {decisionEffectSummary || "Accepted suggestions only affect future reruns. They do not retroactively rewrite this run's official metrics."}
              </div>
            ) : null}
            {castSuggestions.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No conservative cast suggestions persisted for this run yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-4">Candidate</th>
                      <th className="pb-2 pr-4">Support</th>
                      <th className="pb-2 pr-4">Scenes</th>
                      <th className="pb-2 pr-4">Duration</th>
                      <th className="pb-2 pr-4">Confidence</th>
                      <th className="pb-2 pr-4">Bucket</th>
                      <th className="pb-2 pr-4">Decision</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {castSuggestions.map((suggestion) => {
                      const decision = latestSuggestionDecisionByPerson.get(suggestion.person_id);
                      return (
                      <tr key={suggestion.suggestion_key} className="border-t border-neutral-200">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-neutral-900">{suggestion.display_name || suggestion.person_id}</div>
                          <div className="text-xs text-neutral-500">{suggestion.scope_hint || "episode"} scope hint</div>
                        </td>
                        <td className="py-2 pr-4">{suggestion.support_count}</td>
                        <td className="py-2 pr-4">{suggestion.scene_count}</td>
                        <td className="py-2 pr-4">{formatDurationMs(suggestion.total_duration_ms)}</td>
                        <td className="py-2 pr-4">{suggestion.confidence_score ?? "n/a"}</td>
                        <td className="py-2 pr-4">{suggestion.review_bucket || "n/a"}</td>
                        <td className="py-2 pr-4">
                          {decision ? (
                            <div className="text-xs text-neutral-600">
                              <div className="font-medium text-neutral-900">{decision.decision}</div>
                              <div>
                                {decision.owner_scope} · {decision.decided_at || "n/a"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500">No decision yet</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {(["accept", "reject", "defer"] as const).map((action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => void applySuggestionDecision(suggestion.suggestion_key, action)}
                                disabled={actingSuggestionKey !== null}
                                className="rounded-lg border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-900 disabled:opacity-60"
                              >
                                {actingSuggestionKey === `${suggestion.suggestion_key}:${action}` ? "Saving…" : action}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Unknown Review Queues</h2>
            {decisionRerunRequired || decisionEffectSummary ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {decisionEffectSummary || "Accepted unknown-review decisions only affect future reruns. They do not retroactively rewrite this run's official metrics."}
              </div>
            ) : null}
            {unknownReviewQueues.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No unknown review queues persisted for this run yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="pb-2 pr-4">Queue</th>
                      <th className="pb-2 pr-4">Support</th>
                      <th className="pb-2 pr-4">Scenes</th>
                      <th className="pb-2 pr-4">Duration</th>
                      <th className="pb-2 pr-4">Escalation</th>
                      <th className="pb-2 pr-4">Best Match</th>
                      <th className="pb-2 pr-4">Decision</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unknownReviewQueues.map((queue) => {
                      const decision = latestUnknownDecisionByGroup.get(queue.queue_group || queue.queue_key);
                      return (
                      <tr key={queue.queue_key} className="border-t border-neutral-200">
                        <td className="py-2 pr-4">{queue.candidate_display_name || "Unmatched unknowns"}</td>
                        <td className="py-2 pr-4">{queue.support_count}</td>
                        <td className="py-2 pr-4">{queue.scene_count}</td>
                        <td className="py-2 pr-4">{formatDurationMs(queue.total_duration_ms)}</td>
                        <td className="py-2 pr-4">{queue.escalation_level}</td>
                        <td className="py-2 pr-4">{queue.best_similarity_score ?? "n/a"}</td>
                        <td className="py-2 pr-4">
                          {decision ? (
                            <div className="text-xs text-neutral-600">
                              <div className="font-medium text-neutral-900">{decision.decision}</div>
                              <div>
                                {decision.owner_scope} · {decision.decided_at || "n/a"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500">No decision yet</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {(["accept", "reject", "defer"] as const).map((action) => (
                              <button
                                key={action}
                                type="button"
                                onClick={() => void applyUnknownDecision(queue.queue_key, action)}
                                disabled={actingUnknownQueueKey !== null}
                                className="rounded-lg border border-neutral-300 px-2 py-1 text-[11px] font-medium text-neutral-900 disabled:opacity-60"
                              >
                                {actingUnknownQueueKey === `${queue.queue_key}:${action}` ? "Saving…" : action}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminGlobalHeader>
  );
}
