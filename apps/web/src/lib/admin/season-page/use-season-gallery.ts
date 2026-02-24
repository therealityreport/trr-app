import { useState } from "react";
import {
  DEFAULT_BATCH_JOB_CONTENT_SECTIONS,
  DEFAULT_BATCH_JOB_OPERATIONS,
} from "@/lib/admin/season-page/constants";
import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";
import type { BatchJobOperation, RefreshProgressState, SeasonRefreshLogEntry } from "@/lib/admin/season-page/types";

export function useSeasonGallery<TSeasonAsset, TJobLiveCounts>() {
  const [assets, setAssets] = useState<TSeasonAsset[]>([]);
  const [assetsVisibleCount, setAssetsVisibleCount] = useState(120);
  const [assetsTruncatedWarning, setAssetsTruncatedWarning] = useState<string | null>(null);
  const [galleryFallbackTelemetry, setGalleryFallbackTelemetry] = useState({
    fallbackRecoveredCount: 0,
    allCandidatesFailedCount: 0,
    totalImageAttempts: 0,
  });

  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const [assetsRefreshNotice, setAssetsRefreshNotice] = useState<string | null>(null);
  const [assetsRefreshError, setAssetsRefreshError] = useState<string | null>(null);
  const [assetsRefreshProgress, setAssetsRefreshProgress] = useState<RefreshProgressState | null>(null);
  const [assetsRefreshLiveCounts, setAssetsRefreshLiveCounts] = useState<TJobLiveCounts | null>(null);

  const [batchJobsOpen, setBatchJobsOpen] = useState(false);
  const [batchJobsRunning, setBatchJobsRunning] = useState(false);
  const [batchJobsError, setBatchJobsError] = useState<string | null>(null);
  const [batchJobsNotice, setBatchJobsNotice] = useState<string | null>(null);
  const [batchJobsProgress, setBatchJobsProgress] = useState<RefreshProgressState | null>(null);
  const [batchJobsLiveCounts, setBatchJobsLiveCounts] = useState<TJobLiveCounts | null>(null);
  const [batchJobOperations, setBatchJobOperations] = useState<BatchJobOperation[]>(
    DEFAULT_BATCH_JOB_OPERATIONS
  );
  const [batchJobContentSections, setBatchJobContentSections] = useState<AssetSectionKey[]>(
    DEFAULT_BATCH_JOB_CONTENT_SECTIONS
  );

  const [assetsRefreshLogOpen, setAssetsRefreshLogOpen] = useState(false);
  const [episodeLightbox, setEpisodeLightbox] = useState<{
    imageUrl: string;
    title: string;
    metadata: string;
  } | null>(null);
  const [assetLightbox, setAssetLightbox] = useState<{
    asset: TSeasonAsset;
    index: number;
    filteredAssets: TSeasonAsset[];
  } | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);

  const [addBackdropsOpen, setAddBackdropsOpen] = useState(false);
  const [unassignedBackdrops, setUnassignedBackdrops] = useState<
    Array<{
      id: string;
      source_url: string;
      hosted_url: string;
      source: string;
      source_type: string;
      confidence: number | null;
      width: number | null;
      height: number | null;
      ai_labels: string[] | null;
      created_at: string;
    }>
  >([]);
  const [backdropsLoading, setBackdropsLoading] = useState(false);
  const [backdropsError, setBackdropsError] = useState<string | null>(null);
  const [selectedBackdropIds, setSelectedBackdropIds] = useState<Set<string>>(new Set());
  const [assigningBackdrops, setAssigningBackdrops] = useState(false);
  const [refreshLogEntries, setRefreshLogEntries] = useState<SeasonRefreshLogEntry[]>([]);

  return {
    assets,
    setAssets,
    assetsVisibleCount,
    setAssetsVisibleCount,
    assetsTruncatedWarning,
    setAssetsTruncatedWarning,
    galleryFallbackTelemetry,
    setGalleryFallbackTelemetry,
    refreshingAssets,
    setRefreshingAssets,
    assetsRefreshNotice,
    setAssetsRefreshNotice,
    assetsRefreshError,
    setAssetsRefreshError,
    assetsRefreshProgress,
    setAssetsRefreshProgress,
    assetsRefreshLiveCounts,
    setAssetsRefreshLiveCounts,
    batchJobsOpen,
    setBatchJobsOpen,
    batchJobsRunning,
    setBatchJobsRunning,
    batchJobsError,
    setBatchJobsError,
    batchJobsNotice,
    setBatchJobsNotice,
    batchJobsProgress,
    setBatchJobsProgress,
    batchJobsLiveCounts,
    setBatchJobsLiveCounts,
    batchJobOperations,
    setBatchJobOperations,
    batchJobContentSections,
    setBatchJobContentSections,
    assetsRefreshLogOpen,
    setAssetsRefreshLogOpen,
    episodeLightbox,
    setEpisodeLightbox,
    assetLightbox,
    setAssetLightbox,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    textOverlayDetectError,
    setTextOverlayDetectError,
    addBackdropsOpen,
    setAddBackdropsOpen,
    unassignedBackdrops,
    setUnassignedBackdrops,
    backdropsLoading,
    setBackdropsLoading,
    backdropsError,
    setBackdropsError,
    selectedBackdropIds,
    setSelectedBackdropIds,
    assigningBackdrops,
    setAssigningBackdrops,
    refreshLogEntries,
    setRefreshLogEntries,
  };
}
