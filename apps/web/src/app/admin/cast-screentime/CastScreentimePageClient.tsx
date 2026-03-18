"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { getAllowedReviewTransitions, getExecutionStatusLabel, getRunOverviewMessage } from "./run-state";

type OwnerScope = "show" | "season" | "episode";
type VideoClass = "episode" | "promo";
type PromoSubtype = "trailer" | "episode_teaser";
type ImportMode = "youtube_url" | "external_url" | "social_youtube_row";
type VideoClassFilter = "all" | VideoClass;

type UploadSessionPayload = {
  upload_session_id: string;
  put_url?: string;
  temp_object_key?: string;
  expires_at?: string;
  owner_scope?: OwnerScope;
  owner_id?: string;
  video_class?: VideoClass;
  promo_subtype?: PromoSubtype | null;
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
  video_class?: VideoClass | null;
  promo_subtype?: PromoSubtype | null;
  is_publishable?: boolean;
  publish_block_reason?: string | null;
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
  video_class?: VideoClass | null;
  promo_subtype?: PromoSubtype | null;
  source_import_type?: string | null;
  is_publishable?: boolean;
  publish_block_reason?: string | null;
  effective_runtime_seconds?: number | null;
  error_message?: string | null;
  completed_at?: string | null;
};

type PublishVersionEntry = {
  id: string;
  run_id: string;
  video_asset_id: string;
  version_number: number;
  is_current: boolean;
  published_at?: string | null;
  published_by?: string | null;
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
  assigned_person_ids: string[];
};

type SceneEntry = {
  scene_key: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  shot_count: number;
  composition_type: string;
  dominant_person_ids: string[];
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

type ExcludedSectionEntry = {
  section_key: string;
  section_type: string;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  detection_source: string;
};

const breadcrumbs = buildAdminSectionBreadcrumb("Cast Screen Time", "/admin/cast-screentime");
const ownerScopeOptions: OwnerScope[] = ["season", "show", "episode"];
const promoSubtypeOptions: PromoSubtype[] = ["trailer", "episode_teaser"];
const videoClassFilters: VideoClassFilter[] = ["all", "episode", "promo"];
const importModes: ImportMode[] = ["youtube_url", "external_url", "social_youtube_row"];
const decisionScopes: OwnerScope[] = ["episode", "season", "show"];

function parseOwnerScope(value: string | null): OwnerScope | null {
  return value === "show" || value === "season" || value === "episode" ? value : null;
}

function parseVideoClass(value: string | null): VideoClass | null {
  return value === "episode" || value === "promo" ? value : null;
}

function parsePromoSubtype(value: string | null): PromoSubtype | null {
  return value === "trailer" || value === "episode_teaser" ? value : null;
}

function parseImportMode(value: string | null): ImportMode | null {
  return value === "youtube_url" || value === "external_url" || value === "social_youtube_row" ? value : null;
}

function parseVideoClassFilter(value: string | null): VideoClassFilter | null {
  return value === "all" || value === "episode" || value === "promo" ? value : null;
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value / 1000).toFixed(value >= 1000 ? 2 : 3)}s`;
}

function formatVideoClass(videoClass?: string | null, promoSubtype?: string | null): string {
  if (videoClass === "promo") {
    if (promoSubtype === "episode_teaser") return "Promo · Episode Teaser";
    return "Promo · Trailer";
  }
  return "Episode";
}

function formatImportType(value?: string | null): string {
  const normalized = String(value || "").trim();
  if (!normalized) return "n/a";
  return normalized.replaceAll("_", " ");
}

function buildShowRunsPath(showId: string, videoClassFilter: VideoClassFilter): string {
  const params = new URLSearchParams({ limit: "10" });
  if (videoClassFilter !== "all") params.set("video_class", videoClassFilter);
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

export default function CastScreentimePageClient() {
  const searchParams = useSearchParams();
  const prefillContext = String(searchParams.get("prefill_context") || "").trim();
  const { checking, hasAccess } = useAdminGuard();
  const [showId, setShowId] = useState(() => String(searchParams.get("show_id") || "").trim());
  const [ownerScope, setOwnerScope] = useState<OwnerScope>(() => parseOwnerScope(searchParams.get("owner_scope")) ?? "season");
  const [ownerId, setOwnerId] = useState(() => String(searchParams.get("owner_id") || "").trim());
  const [videoClass, setVideoClass] = useState<VideoClass>(() => parseVideoClass(searchParams.get("video_class")) ?? "promo");
  const [promoSubtype, setPromoSubtype] = useState<PromoSubtype>(
    () => parsePromoSubtype(searchParams.get("promo_subtype")) ?? "trailer",
  );
  const [videoClassFilter, setVideoClassFilter] = useState<VideoClassFilter>(
    () => parseVideoClassFilter(searchParams.get("video_class_filter")) ?? "promo",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>(() => parseImportMode(searchParams.get("source_mode")) ?? "youtube_url");
  const [remoteSource, setRemoteSource] = useState(() => String(searchParams.get("source_url") || "").trim());
  const [socialYoutubeVideoId, setSocialYoutubeVideoId] = useState(
    () => String(searchParams.get("social_youtube_video_id") || "").trim(),
  );
  const [uploading, setUploading] = useState(false);
  const [importingAsset, setImportingAsset] = useState(false);
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

  const effectivePromoSubtype = videoClass === "promo" ? promoSubtype : null;

  const resetRunOutputs = () => {
    setRun(null);
    setLeaderboard([]);
    setSegments([]);
    setEvidence([]);
    setExcludedSections([]);
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
  };

  const syncShowContext = (asset?: VideoAssetPayload | null, nextRun?: RunPayload | null) => {
    const resolvedShowId = String(asset?.show_id || nextRun?.show_id || "").trim();
    if (resolvedShowId) {
      setShowId(resolvedShowId);
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

  const uploadVideo = async () => {
    if (!ownerId.trim()) {
      setError("Owner ID is required");
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
            owner_scope: ownerScope,
            owner_id: ownerId.trim(),
            filename: selectedFile.name,
            content_type: selectedFile.type || "video/mp4",
            expected_size_bytes: selectedFile.size,
            video_class: videoClass,
            promo_subtype: effectivePromoSubtype,
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
    if (!ownerId.trim()) {
      setError("Owner ID is required");
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
    try {
      const payload = await parseResponse<{ upload_session_id: string; video_asset: VideoAssetPayload }>(
        await fetchAdminWithAuth("/api/admin/trr-api/cast-screentime/video-assets/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_mode: importMode,
            source_url: importMode === "social_youtube_row" ? undefined : remoteSource.trim(),
            social_youtube_video_id: importMode === "social_youtube_row" ? socialYoutubeVideoId.trim() : undefined,
            owner_scope: ownerScope,
            owner_id: ownerId.trim(),
            video_class: "promo",
            promo_subtype: promoSubtype,
          }),
        }),
      );
      setLatestUpload({
        upload_session_id: payload.upload_session_id,
        owner_scope: ownerScope,
        owner_id: ownerId.trim(),
        video_class: "promo",
        promo_subtype: promoSubtype,
      });
      setVideoAsset(payload.video_asset);
      syncShowContext(payload.video_asset, null);
      resetRunOutputs();
      await refreshRecentRuns(payload.video_asset.show_id || undefined);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setImportingAsset(false);
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

      const [runResponse, leaderboardResponse, segmentsResponse, evidenceResponse, excludedResponse] = await Promise.all([
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/leaderboard`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/segments`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/evidence`),
        fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/excluded-sections`),
      ]);

      const runPayload = await parseResponse<RunPayload>(runResponse);
      const leaderboardPayload = await parseResponse<{ leaderboard: LeaderboardEntry[] }>(leaderboardResponse);
      const segmentsPayload = await parseResponse<{ segments: SegmentEntry[] }>(segmentsResponse);
      const evidencePayload = await parseResponse<{ evidence: EvidenceEntry[] }>(evidenceResponse);
      const excludedPayload = await parseResponse<{ excluded_sections: ExcludedSectionEntry[] }>(excludedResponse);
      setRun(runPayload);
      if (runPayload.owner_scope) {
        setDecisionScope(runPayload.owner_scope);
      }
      setLeaderboard(Array.isArray(leaderboardPayload.leaderboard) ? leaderboardPayload.leaderboard : []);
      setSegments(Array.isArray(segmentsPayload.segments) ? segmentsPayload.segments : []);
      setEvidence(Array.isArray(evidencePayload.evidence) ? evidencePayload.evidence : []);
      setExcludedSections(Array.isArray(excludedPayload.excluded_sections) ? excludedPayload.excluded_sections : []);
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
          parseResponse<{
            suggestion_decisions: SuggestionDecisionEntry[];
            unknown_review_state: UnknownReviewDecisionEntry[];
          }>(await fetchAdminWithAuth(`/api/admin/trr-api/cast-screentime/runs/${runId}/decision-state`)),
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
      setError("Show ID is required to reconcile stale runs");
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
    await refreshRun(runId);
  };

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

  const currentPublishVersion = run ? publishHistory.find((entry) => entry.run_id === run.id) ?? null : null;
  const canPublishCurrentRun =
    run?.video_class !== "promo" && run?.status === "success" && (run?.review_status || "draft") === "approved";
  const availableReviewTransitions = getAllowedReviewTransitions(run);
  const canonicalRuns = showRuns.filter((item) => item.video_class !== "promo");
  const independentRuns = showRuns.filter((item) => item.video_class === "promo");
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

  return (
    <AdminGlobalHeader bodyClassName="px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
          <h1 className="text-2xl font-semibold text-neutral-900">Cast Screen-Time</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Admin workflow for episode runs and shorter promo/test assets, including official YouTube trailers, external mirrors, and existing social YouTube rows.
          </p>
          {prefillContext === "social_week_youtube" ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
              Prefilled from a social-week YouTube post. Review owner and source URL, then import the trailer into cast screentime.
            </p>
          ) : null}
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Owner Scope
                <select
                  value={ownerScope}
                  onChange={(event) => setOwnerScope(event.target.value as OwnerScope)}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                >
                  {ownerScopeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700 md:col-span-2">
                Owner ID
                <input
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  placeholder={`UUID for core.${ownerScope}s.id`}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Asset Type
                <select
                  value={videoClass}
                  onChange={(event) => setVideoClass(event.target.value as VideoClass)}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                >
                  <option value="promo">Promo/Test Asset</option>
                  <option value="episode">Episode Asset</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Promo Subtype
                <select
                  value={promoSubtype}
                  onChange={(event) => setPromoSubtype(event.target.value as PromoSubtype)}
                  disabled={videoClass !== "promo"}
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 disabled:bg-neutral-100"
                >
                  {promoSubtypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "episode_teaser" ? "Episode Teaser" : "Trailer"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={videoClass === "promo" ? "amber" : "sky"}>{formatVideoClass(videoClass, effectivePromoSubtype)}</Badge>
            <Badge tone="neutral">Default owner linkage: season</Badge>
            {videoClass === "promo" ? <Badge tone="amber">Non-publishable</Badge> : <Badge tone="emerald">Publishable lane</Badge>}
          </div>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Direct Upload</h2>
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
                {videoClass === "promo"
                  ? "Promo uploads stay reviewable but non-publishable."
                  : "Episode uploads use the normal publishable asset class."}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Remote Import</h2>
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
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Latest Upload Session</h2>
              {latestUpload?.video_class ? (
                <Badge tone={latestUpload.video_class === "promo" ? "amber" : "sky"}>
                  {formatVideoClass(latestUpload.video_class, latestUpload.promo_subtype)}
                </Badge>
              ) : null}
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-100">
              {JSON.stringify(latestUpload, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">Current Video Asset</h2>
              {videoAsset ? (
                <>
                  <Badge tone={videoAsset.video_class === "promo" ? "amber" : "sky"}>
                    {formatVideoClass(videoAsset.video_class, videoAsset.promo_subtype)}
                  </Badge>
                  <Badge tone="neutral">{formatImportType(videoAsset.source_import_type)}</Badge>
                  {videoAsset.is_publishable === false ? <Badge tone="amber">Non-publishable</Badge> : null}
                </>
              ) : null}
            </div>
            {videoAsset ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Owner</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">
                    {videoAsset.owner_scope || "n/a"} {videoAsset.owner_id || ""}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Show</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{videoAsset.show_id || "n/a"}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">Import Type</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{formatImportType(videoAsset.source_import_type)}</p>
                </div>
              </div>
            ) : null}
            <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-100">
              {JSON.stringify(videoAsset, null, 2)}
            </pre>
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

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Run History Filter</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Promo/test runs stay in the main admin area, but can be isolated from normal episode runs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
                Show ID
                <input
                  value={showId}
                  onChange={(event) => setShowId(event.target.value)}
                  placeholder="UUID for core.shows.id"
                  className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
                />
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
                    {option === "all" ? "All" : option === "promo" ? "Promo / Test" : "Episodes"}
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900">Current Run</h2>
            {run ? (
              <>
                <Badge tone={run.video_class === "promo" ? "amber" : "sky"}>
                  {formatVideoClass(run.video_class, run.promo_subtype)}
                </Badge>
                <Badge tone="neutral">{formatImportType(run.source_import_type)}</Badge>
                {run.is_publishable === false ? <Badge tone="amber">Non-publishable</Badge> : null}
              </>
            ) : null}
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-950 p-4 text-xs text-neutral-100">
            {JSON.stringify(run, null, 2)}
          </pre>
          {run ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {getRunOverviewMessage(run, currentPublishVersion)}
            </div>
          ) : null}
          {run ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Execution</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{getExecutionStatusLabel(run)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Review</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{run.review_status || "draft"}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Owner</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{run.owner_scope || "n/a"}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Effective Runtime</p>
                <p className="mt-1 text-sm font-medium text-neutral-900">
                  {run.effective_runtime_seconds != null ? `${Number(run.effective_runtime_seconds).toFixed(2)}s` : "n/a"}
                </p>
              </div>
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
                {publishingRun
                  ? "Publishing…"
                  : currentPublishVersion?.is_current
                    ? `Published (v${currentPublishVersion.version_number})`
                    : "Publish Canonical Version"}
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

        <section className="grid gap-6 xl:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Publish History</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Canonical publish versions exist only for episode assets. Promo/test assets remain independent reports.
            </p>
            {publishHistory.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No canonical publish history exists for the current asset.</p>
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
              {videoClassFilter === "all" ? "All assets" : videoClassFilter === "promo" ? "Promo / Test only" : "Episodes only"}
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
                          <th className="pb-2">Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canonicalRuns.map((showRun) => (
                          <tr key={showRun.id} className="border-t border-neutral-200">
                            <td className="py-2 pr-4">
                              <div className="font-mono text-xs">{showRun.id}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge tone="sky">{formatVideoClass(showRun.video_class, showRun.promo_subtype)}</Badge>
                                <Badge tone="neutral">{showRun.owner_scope || "n/a"}</Badge>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{showRun.status}</td>
                            <td className="py-2 pr-4">{showRun.review_status || "draft"}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => void loadRecentRun(showRun.id)}
                                className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                              >
                                Load
                              </button>
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
                  <h3 className="text-sm font-semibold text-neutral-900">Independent Promo/Test Runs</h3>
                  <Badge tone="amber">{independentRuns.length}</Badge>
                </div>
                {independentRuns.length === 0 ? (
                  <p className="text-sm text-neutral-500">No promo/test runs are loaded for this filter.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-neutral-500">
                        <tr>
                          <th className="pb-2 pr-4">Run</th>
                          <th className="pb-2 pr-4">Status</th>
                          <th className="pb-2 pr-4">Review</th>
                          <th className="pb-2">Load</th>
                        </tr>
                      </thead>
                      <tbody>
                        {independentRuns.map((showRun) => (
                          <tr key={showRun.id} className="border-t border-neutral-200">
                            <td className="py-2 pr-4">
                              <div className="font-mono text-xs">{showRun.id}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge tone="amber">{formatVideoClass(showRun.video_class, showRun.promo_subtype)}</Badge>
                                <Badge tone="neutral">Independent report</Badge>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{showRun.status}</td>
                            <td className="py-2 pr-4">{showRun.review_status || "draft"}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => void loadRecentRun(showRun.id)}
                                className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-900"
                              >
                                Load
                              </button>
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
                      <td className="py-2 pr-4">{entry.screen_time_seconds}</td>
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
                      {shot.observation_count} observations, {shot.assigned_person_ids.length} assigned people
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
                      {scene.dominant_person_ids.length === 0
                        ? "No named cast present"
                        : scene.dominant_person_ids
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Cast Suggestions</h2>
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
