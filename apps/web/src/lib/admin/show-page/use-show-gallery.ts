import { useRef, useState } from "react";
import {
  DEFAULT_BATCH_JOB_CONTENT_SECTIONS,
  DEFAULT_BATCH_JOB_OPERATIONS,
  buildShowGalleryVisibleDefaults,
} from "@/lib/admin/show-page/constants";
import type {
  BatchJobOperation,
  RefreshLogEntry,
  RefreshProgressState,
  ShowGalleryVisibleBySection,
  ShowRefreshTarget,
} from "@/lib/admin/show-page/types";
import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";

export function useShowGallery<TSeasonAsset, TJobLiveCounts, TEntityContext>() {
  const [galleryAssets, setGalleryAssets] = useState<TSeasonAsset[]>([]);
  const [galleryVisibleBySection, setGalleryVisibleBySection] = useState<ShowGalleryVisibleBySection>(
    () => buildShowGalleryVisibleDefaults()
  );
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
  const [selectedGallerySeason, setSelectedGallerySeason] = useState<number | "all">("all");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryTruncatedWarning, setGalleryTruncatedWarning] = useState<string | null>(null);
  const [galleryFallbackTelemetry, setGalleryFallbackTelemetry] = useState({
    fallbackRecoveredCount: 0,
    allCandidatesFailedCount: 0,
    totalImageAttempts: 0,
  });
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [textOverlayDetectError, setTextOverlayDetectError] = useState<string | null>(null);

  const [assetLightbox, setAssetLightbox] = useState<{
    asset: TSeasonAsset;
    index: number;
    filteredAssets: TSeasonAsset[];
  } | null>(null);
  const assetTriggerRef = useRef<HTMLElement | null>(null);

  const [isCovered, setIsCovered] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  const [refreshingTargets, setRefreshingTargets] = useState<Record<ShowRefreshTarget, boolean>>({
    details: false,
    seasons_episodes: false,
    photos: false,
    cast_credits: false,
  });
  const [refreshTargetNotice, setRefreshTargetNotice] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetError, setRefreshTargetError] = useState<
    Partial<Record<ShowRefreshTarget, string>>
  >({});
  const [refreshTargetProgress, setRefreshTargetProgress] = useState<
    Partial<Record<ShowRefreshTarget, RefreshProgressState>>
  >({});
  const [refreshTargetLiveCounts, setRefreshTargetLiveCounts] = useState<
    Partial<Record<ShowRefreshTarget, TJobLiveCounts | null>>
  >({});
  const [refreshingShowAll, setRefreshingShowAll] = useState(false);
  const [refreshAllNotice, setRefreshAllNotice] = useState<string | null>(null);
  const [refreshAllError, setRefreshAllError] = useState<string | null>(null);
  const [refreshAllProgress, setRefreshAllProgress] = useState<RefreshProgressState | null>(null);
  const [refreshLogEntries, setRefreshLogEntries] = useState<RefreshLogEntry[]>([]);
  const [refreshLogOpen, setRefreshLogOpen] = useState(false);

  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);
  const [scrapeDrawerContext, setScrapeDrawerContext] = useState<TEntityContext | null>(null);

  return {
    galleryAssets,
    setGalleryAssets,
    galleryVisibleBySection,
    setGalleryVisibleBySection,
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
    selectedGallerySeason,
    setSelectedGallerySeason,
    galleryLoading,
    setGalleryLoading,
    galleryTruncatedWarning,
    setGalleryTruncatedWarning,
    galleryFallbackTelemetry,
    setGalleryFallbackTelemetry,
    advancedFiltersOpen,
    setAdvancedFiltersOpen,
    textOverlayDetectError,
    setTextOverlayDetectError,
    assetLightbox,
    setAssetLightbox,
    assetTriggerRef,
    isCovered,
    setIsCovered,
    coverageLoading,
    setCoverageLoading,
    coverageError,
    setCoverageError,
    refreshingTargets,
    setRefreshingTargets,
    refreshTargetNotice,
    setRefreshTargetNotice,
    refreshTargetError,
    setRefreshTargetError,
    refreshTargetProgress,
    setRefreshTargetProgress,
    refreshTargetLiveCounts,
    setRefreshTargetLiveCounts,
    refreshingShowAll,
    setRefreshingShowAll,
    refreshAllNotice,
    setRefreshAllNotice,
    refreshAllError,
    setRefreshAllError,
    refreshAllProgress,
    setRefreshAllProgress,
    refreshLogEntries,
    setRefreshLogEntries,
    refreshLogOpen,
    setRefreshLogOpen,
    scrapeDrawerOpen,
    setScrapeDrawerOpen,
    scrapeDrawerContext,
    setScrapeDrawerContext,
  };
}
