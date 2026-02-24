import { useRef, useState } from "react";
import { CAST_INCREMENTAL_INITIAL_LIMIT } from "@/lib/admin/show-page/constants";
import type { CastRunFailedMember, RefreshProgressState, ShowCastSource } from "@/lib/admin/show-page/types";

export function useShowCast<TCastMember, TCastRoleMember, TCastRefreshPhaseState, TCastMatrixSyncResult>() {
  const [cast, setCast] = useState<TCastMember[]>([]);
  const [castLoadedOnce, setCastLoadedOnce] = useState(false);
  const [castLoading, setCastLoading] = useState(false);
  const [castLoadError, setCastLoadError] = useState<string | null>(null);
  const [castPhotoEnriching, setCastPhotoEnriching] = useState(false);
  const [castPhotoEnrichError, setCastPhotoEnrichError] = useState<string | null>(null);
  const [castPhotoEnrichNotice, setCastPhotoEnrichNotice] = useState<string | null>(null);
  const [castSource, setCastSource] = useState<ShowCastSource>("episode_evidence");
  const [castEligibilityWarning, setCastEligibilityWarning] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<TCastRoleMember[]>([]);
  const [castRoleMembersLoadedOnce, setCastRoleMembersLoadedOnce] = useState(false);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [castRoleMembersWarning, setCastRoleMembersWarning] = useState<string | null>(null);
  const [castMatrixSyncLoading, setCastMatrixSyncLoading] = useState(false);
  const [castMatrixSyncError, setCastMatrixSyncError] = useState<string | null>(null);
  const [castMatrixSyncResult, setCastMatrixSyncResult] = useState<TCastMatrixSyncResult | null>(
    null
  );
  const [archiveFootageCast, setArchiveFootageCast] = useState<TCastMember[]>([]);
  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castSeasonFilters, setCastSeasonFilters] = useState<number[]>([]);
  const [castRoleAndCreditFilters, setCastRoleAndCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const [castSearchQuery, setCastSearchQuery] = useState("");
  const [castSearchQueryDebounced, setCastSearchQueryDebounced] = useState("");
  const [castRenderLimit, setCastRenderLimit] = useState(CAST_INCREMENTAL_INITIAL_LIMIT);
  const [crewRenderLimit, setCrewRenderLimit] = useState(CAST_INCREMENTAL_INITIAL_LIMIT);
  const castIncrementalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [castRefreshPipelineRunning, setCastRefreshPipelineRunning] = useState(false);
  const [castRefreshPhaseStates, setCastRefreshPhaseStates] = useState<TCastRefreshPhaseState[]>([]);
  const [castMediaEnriching, setCastMediaEnriching] = useState(false);
  const [castMediaEnrichNotice, setCastMediaEnrichNotice] = useState<string | null>(null);
  const [castMediaEnrichError, setCastMediaEnrichError] = useState<string | null>(null);
  const [castRunFailedMembers, setCastRunFailedMembers] = useState<CastRunFailedMember[]>([]);
  const [castFailedMembersOpen, setCastFailedMembersOpen] = useState(false);
  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});
  const [refreshingPersonProgress, setRefreshingPersonProgress] = useState<
    Record<string, RefreshProgressState>
  >({});
  const castRefreshAbortControllerRef = useRef<AbortController | null>(null);
  const castMediaEnrichAbortControllerRef = useRef<AbortController | null>(null);
  const castLoadAbortControllerRef = useRef<AbortController | null>(null);

  return {
    cast,
    setCast,
    castLoadedOnce,
    setCastLoadedOnce,
    castLoading,
    setCastLoading,
    castLoadError,
    setCastLoadError,
    castPhotoEnriching,
    setCastPhotoEnriching,
    castPhotoEnrichError,
    setCastPhotoEnrichError,
    castPhotoEnrichNotice,
    setCastPhotoEnrichNotice,
    castSource,
    setCastSource,
    castEligibilityWarning,
    setCastEligibilityWarning,
    castRoleMembers,
    setCastRoleMembers,
    castRoleMembersLoadedOnce,
    setCastRoleMembersLoadedOnce,
    castRoleMembersLoading,
    setCastRoleMembersLoading,
    castRoleMembersError,
    setCastRoleMembersError,
    castRoleMembersWarning,
    setCastRoleMembersWarning,
    castMatrixSyncLoading,
    setCastMatrixSyncLoading,
    castMatrixSyncError,
    setCastMatrixSyncError,
    castMatrixSyncResult,
    setCastMatrixSyncResult,
    archiveFootageCast,
    setArchiveFootageCast,
    castSortBy,
    setCastSortBy,
    castSortOrder,
    setCastSortOrder,
    castSeasonFilters,
    setCastSeasonFilters,
    castRoleAndCreditFilters,
    setCastRoleAndCreditFilters,
    castHasImageFilter,
    setCastHasImageFilter,
    castSearchQuery,
    setCastSearchQuery,
    castSearchQueryDebounced,
    setCastSearchQueryDebounced,
    castRenderLimit,
    setCastRenderLimit,
    crewRenderLimit,
    setCrewRenderLimit,
    castIncrementalTimeoutRef,
    lightboxOpen,
    setLightboxOpen,
    lightboxImage,
    setLightboxImage,
    refreshNotice,
    setRefreshNotice,
    refreshError,
    setRefreshError,
    castRefreshPipelineRunning,
    setCastRefreshPipelineRunning,
    castRefreshPhaseStates,
    setCastRefreshPhaseStates,
    castMediaEnriching,
    setCastMediaEnriching,
    castMediaEnrichNotice,
    setCastMediaEnrichNotice,
    castMediaEnrichError,
    setCastMediaEnrichError,
    castRunFailedMembers,
    setCastRunFailedMembers,
    castFailedMembersOpen,
    setCastFailedMembersOpen,
    refreshingPersonIds,
    setRefreshingPersonIds,
    refreshingPersonProgress,
    setRefreshingPersonProgress,
    castRefreshAbortControllerRef,
    castMediaEnrichAbortControllerRef,
    castLoadAbortControllerRef,
  };
}
