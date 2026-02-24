import { useRef, useState } from "react";
import {
  SEASON_CAST_INCREMENTAL_INITIAL_LIMIT,
} from "@/lib/admin/season-page/constants";
import type {
  RefreshProgressState,
  SeasonCastSource,
  SeasonRefreshLogEntry,
} from "@/lib/admin/season-page/types";

export function useSeasonCast<TSeasonCastMember, TCastRoleMember, TCastRunFailedMember, TShowCastMember>() {
  const [cast, setCast] = useState<TSeasonCastMember[]>([]);
  const [seasonCastSource, setSeasonCastSource] = useState<SeasonCastSource>("season_evidence");
  const [seasonCastEligibilityWarning, setSeasonCastEligibilityWarning] = useState<string | null>(null);
  const [archiveCast, setArchiveCast] = useState<TSeasonCastMember[]>([]);

  const [refreshingCast, setRefreshingCast] = useState(false);
  const [enrichingCast, setEnrichingCast] = useState(false);
  const [castRefreshNotice, setCastRefreshNotice] = useState<string | null>(null);
  const [castRefreshError, setCastRefreshError] = useState<string | null>(null);
  const [castEnrichNotice, setCastEnrichNotice] = useState<string | null>(null);
  const [castEnrichError, setCastEnrichError] = useState<string | null>(null);
  const [castRefreshProgress, setCastRefreshProgress] = useState<RefreshProgressState | null>(null);
  const [castRefreshLogOpen, setCastRefreshLogOpen] = useState(false);
  const [castRunFailedMembers, setCastRunFailedMembers] = useState<TCastRunFailedMember[]>([]);
  const [castFailedMembersOpen, setCastFailedMembersOpen] = useState(false);
  const [refreshLogEntries, setRefreshLogEntries] = useState<SeasonRefreshLogEntry[]>([]);
  const refreshLogCounterRef = useRef(0);

  const [trrShowCast, setTrrShowCast] = useState<TShowCastMember[]>([]);
  const [trrShowCastLoading, setTrrShowCastLoading] = useState(false);
  const [trrShowCastError, setTrrShowCastError] = useState<string | null>(null);
  const [castRoleMembers, setCastRoleMembers] = useState<TCastRoleMember[]>([]);
  const [castRoleMembersLoadedOnce, setCastRoleMembersLoadedOnce] = useState(false);
  const [castRoleMembersLoading, setCastRoleMembersLoading] = useState(false);
  const [castRoleMembersError, setCastRoleMembersError] = useState<string | null>(null);
  const [castRoleMembersWarning, setCastRoleMembersWarning] = useState<string | null>(null);
  const [lastSuccessfulCastRoleMembersAt, setLastSuccessfulCastRoleMembersAt] = useState<number | null>(
    null
  );
  const [castSortBy, setCastSortBy] = useState<"episodes" | "season" | "name">("episodes");
  const [castSortOrder, setCastSortOrder] = useState<"desc" | "asc">("desc");
  const [castRoleFilters, setCastRoleFilters] = useState<string[]>([]);
  const [castCreditFilters, setCastCreditFilters] = useState<string[]>([]);
  const [castHasImageFilter, setCastHasImageFilter] = useState<"all" | "yes" | "no">("all");
  const [castSearchQuery, setCastSearchQuery] = useState("");
  const [castSearchQueryDebounced, setCastSearchQueryDebounced] = useState("");
  const [castRenderLimit, setCastRenderLimit] = useState(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);
  const [crewRenderLimit, setCrewRenderLimit] = useState(SEASON_CAST_INCREMENTAL_INITIAL_LIMIT);

  const [refreshingPersonIds, setRefreshingPersonIds] = useState<Record<string, boolean>>({});
  const [refreshingPersonProgress, setRefreshingPersonProgress] = useState<
    Record<string, RefreshProgressState>
  >({});
  const showCastFetchAttemptedRef = useRef(false);
  const castRoleMembersLoadedOnceRef = useRef(false);

  return {
    cast,
    setCast,
    seasonCastSource,
    setSeasonCastSource,
    seasonCastEligibilityWarning,
    setSeasonCastEligibilityWarning,
    archiveCast,
    setArchiveCast,
    refreshingCast,
    setRefreshingCast,
    enrichingCast,
    setEnrichingCast,
    castRefreshNotice,
    setCastRefreshNotice,
    castRefreshError,
    setCastRefreshError,
    castEnrichNotice,
    setCastEnrichNotice,
    castEnrichError,
    setCastEnrichError,
    castRefreshProgress,
    setCastRefreshProgress,
    castRefreshLogOpen,
    setCastRefreshLogOpen,
    castRunFailedMembers,
    setCastRunFailedMembers,
    castFailedMembersOpen,
    setCastFailedMembersOpen,
    refreshLogEntries,
    setRefreshLogEntries,
    refreshLogCounterRef,
    trrShowCast,
    setTrrShowCast,
    trrShowCastLoading,
    setTrrShowCastLoading,
    trrShowCastError,
    setTrrShowCastError,
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
    lastSuccessfulCastRoleMembersAt,
    setLastSuccessfulCastRoleMembersAt,
    castSortBy,
    setCastSortBy,
    castSortOrder,
    setCastSortOrder,
    castRoleFilters,
    setCastRoleFilters,
    castCreditFilters,
    setCastCreditFilters,
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
    refreshingPersonIds,
    setRefreshingPersonIds,
    refreshingPersonProgress,
    setRefreshingPersonProgress,
    showCastFetchAttemptedRef,
    castRoleMembersLoadedOnceRef,
  };
}
