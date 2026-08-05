"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CastMatrixSyncPanel, type CastMatrixSyncResult } from "@/components/admin/CastMatrixSyncPanel";
import {
  CastPhoto,
} from "@/app/admin/trr-shows/[showId]/ShowPageMedia";
import {
  ShowCreditsCastMembers,
  ShowCreditsCastViewControls,
  ShowCreditsCrewSections,
  type ShowCreditsCastViewMode,
  type ShowCreditsCrewSectionData,
  type ShowCreditsGalleryColumns,
} from "@/components/admin/show-tabs/ShowCreditsViews";

type ShowCastTabWrapperProps = {
  children: ReactNode;
};

export type ShowCastTabPhaseRow = {
  id: string;
  label: string;
  message: string | null;
  statusClassName: string;
  statusLabel: string;
};

export type ShowCastTabRoleCreditFilterOption = {
  key: string;
  label: string;
};

export type ShowCastArchiveFootageMember = {
  id: string;
  person_id: string;
  full_name: string | null;
  cast_member_name: string | null;
  photo_url: string | null;
  cover_photo_url: string | null;
  thumbnail_focus_x?: number | null;
  thumbnail_focus_y?: number | null;
  thumbnail_zoom?: number | null;
  thumbnail_crop_mode?: "manual" | "auto" | null;
  archive_episode_count?: number | null;
};

export type ShowCastTabProps<TCastMember extends { id: string | number } = { id: string | number }> =
  | ShowCastTabWrapperProps
  | {
      renderedCastCount: number;
      matchedCastCount: number;
      totalCastCount: number;
      renderedCrewCount: number;
      matchedCrewCount: number;
      totalCrewCount: number;
      renderedVisibleCount: number;
      matchedVisibleCount: number;
      totalVisibleCount: number;
      castMediaEnriching: boolean;
      isCastRefreshBusy: boolean;
      castPhotoEnriching: boolean;
      castLoading: boolean;
      missingCastPhotoCount: number;
      castRefreshButtonLabel: string;
      showCancelRunButton: boolean;
      castRefreshCanceling: boolean;
      castRefreshCancelButtonLabel: string;
      onEnrichCastMedia: () => void;
      onEnrichMissingCastPhotos: () => void;
      onRefreshShowCast: () => void;
      onCancelShowCastWorkflow: () => void;
      castCreditsRefreshNotice: string | null;
      castCreditsRefreshError: string | null;
      castRefreshPhaseRows: ShowCastTabPhaseRow[];
      castRefreshPipelineRunning: boolean;
      refreshNotice: string | null;
      refreshError: string | null;
      castPhotoEnrichNotice: string | null;
      castPhotoEnrichError: string | null;
      castMediaEnrichNotice: string | null;
      castMediaEnrichError: string | null;
      castLoadWarning: string | null;
      castLoadError: string | null;
      onRetryCast: () => void;
      showCreditsError: string | null;
      onRetryCrew: () => void;
      showCreditsLoading: boolean;
      showCreditsLoadedOnce: boolean;
      showCreditsSourceUrl: string | null;
      castRoleMembersWarningWithSnapshotAge: string | null;
      onRetryCastRoleMembers: () => void;
      rolesWarningWithSnapshotAge: string | null;
      onRetryRoles: () => void;
      showCastIntelligenceUnavailable: boolean;
      castRoleMembersError: string | null;
      rolesError: string | null;
      castRoleEditorDeepLinkWarning: string | null;
      castEligibilityWarning: string | null;
      castRunFailedMembers: Array<{
        personId: string;
        name: string;
        reason: string;
      }>;
      castFailedMembersOpen: boolean;
      onToggleCastFailedMembersOpen: () => void;
      onRetryFailedCastMediaEnrich: () => void;
      castMatrixSyncLoading: boolean;
      castMatrixSyncError: string | null;
      castMatrixSyncResult: CastMatrixSyncResult | null;
      castMatrixSyncScopeLabel: string;
      onSyncCastMatrixRoles: () => void;
      castSearchQuery: string;
      onSetCastSearchQuery: (value: string) => void;
      castSortBy: "episodes" | "season" | "name";
      onSetCastSortBy: (value: "episodes" | "season" | "name") => void;
      castSortOrder: "desc" | "asc";
      onSetCastSortOrder: (value: "desc" | "asc") => void;
      castHasImageFilter: "all" | "yes" | "no";
      onSetCastHasImageFilter: (value: "all" | "yes" | "no") => void;
      onClearCastFilters: () => void;
      castExactEpisodeCount: number | null;
      onSetCastExactEpisodeCount: (value: number | null) => void;
      castMinEpisodeCount: number | null;
      onSetCastMinEpisodeCount: (value: number | null) => void;
      castMaxEpisodeCount: number | null;
      onSetCastMaxEpisodeCount: (value: number | null) => void;
      availableCastSeasons: number[];
      castSeasonFilters: number[];
      onToggleCastSeasonFilter: (seasonNumber: number) => void;
      castEpisodeScopeLabel: string;
      shouldShowRoleCreditEmptyState: boolean;
      castUiTerminalReady: boolean;
      availableCastRoleAndCreditFilters: ShowCastTabRoleCreditFilterOption[];
      castRoleAndCreditFilters: string[];
      onToggleCastRoleAndCreditFilter: (key: string) => void;
      castRoleMembersLoading: boolean;
      castLoadedOnce: boolean;
      castRenderProgressLabel: string | null;
      castRosterReady: boolean;
      castViewMode: ShowCreditsCastViewMode;
      castGalleryColumns: ShowCreditsGalleryColumns;
      onSetCastViewMode: (viewMode: ShowCreditsCastViewMode) => void;
      onSetCastGalleryColumns: (columns: ShowCreditsGalleryColumns) => void;
      castGalleryMembers: TCastMember[];
      castCount: number;
      archiveFootageCount: number;
      visibleCastMembers: TCastMember[];
      renderCastMember: (member: TCastMember) => ReactNode;
      crewDisplaySections: ShowCreditsCrewSectionData[];
      visibleCrewSections: ShowCreditsCrewSectionData[];
      archiveFootageCast: ShowCastArchiveFootageMember[];
      getPersonOverviewHref: (person: { personId: string; personName: string | null }) => string;
    };

const parsePositiveIntegerInputValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isWrapperProps = <TCastMember extends { id: string | number }>(
  props: ShowCastTabProps<TCastMember>
): props is ShowCastTabWrapperProps => "children" in props;

export default function ShowCastTab<TCastMember extends { id: string | number }>(
  props: ShowCastTabProps<TCastMember>
) {
  if (isWrapperProps(props)) {
    return (
      <section
        id="show-tabpanel-cast"
        role="tabpanel"
        aria-labelledby="show-tab-cast"
      >
        {props.children}
      </section>
    );
  }

  const {
    renderedCastCount,
    matchedCastCount,
    totalCastCount,
    renderedCrewCount,
    matchedCrewCount,
    totalCrewCount,
    renderedVisibleCount,
    matchedVisibleCount,
    totalVisibleCount,
    castMediaEnriching,
    isCastRefreshBusy,
    castPhotoEnriching,
    castLoading,
    missingCastPhotoCount,
    castRefreshButtonLabel,
    showCancelRunButton,
    castRefreshCanceling,
    castRefreshCancelButtonLabel,
    onEnrichCastMedia,
    onEnrichMissingCastPhotos,
    onRefreshShowCast,
    onCancelShowCastWorkflow,
    castCreditsRefreshNotice,
    castCreditsRefreshError,
    castRefreshPhaseRows,
    castRefreshPipelineRunning,
    refreshNotice,
    refreshError,
    castPhotoEnrichNotice,
    castPhotoEnrichError,
    castMediaEnrichNotice,
    castMediaEnrichError,
    castLoadWarning,
    castLoadError,
    onRetryCast,
    showCreditsError,
    onRetryCrew,
    showCreditsLoading,
    showCreditsLoadedOnce,
    showCreditsSourceUrl,
    castRoleMembersWarningWithSnapshotAge,
    onRetryCastRoleMembers,
    rolesWarningWithSnapshotAge,
    onRetryRoles,
    showCastIntelligenceUnavailable,
    castRoleMembersError,
    rolesError,
    castRoleEditorDeepLinkWarning,
    castEligibilityWarning,
    castRunFailedMembers,
    castFailedMembersOpen,
    onToggleCastFailedMembersOpen,
    onRetryFailedCastMediaEnrich,
    castMatrixSyncLoading,
    castMatrixSyncError,
    castMatrixSyncResult,
    castMatrixSyncScopeLabel,
    onSyncCastMatrixRoles,
    castSearchQuery,
    onSetCastSearchQuery,
    castSortBy,
    onSetCastSortBy,
    castSortOrder,
    onSetCastSortOrder,
    castHasImageFilter,
    onSetCastHasImageFilter,
    onClearCastFilters,
    castExactEpisodeCount,
    onSetCastExactEpisodeCount,
    castMinEpisodeCount,
    onSetCastMinEpisodeCount,
    castMaxEpisodeCount,
    onSetCastMaxEpisodeCount,
    availableCastSeasons,
    castSeasonFilters,
    onToggleCastSeasonFilter,
    castEpisodeScopeLabel,
    shouldShowRoleCreditEmptyState,
    castUiTerminalReady,
    availableCastRoleAndCreditFilters,
    castRoleAndCreditFilters,
    onToggleCastRoleAndCreditFilter,
    castRoleMembersLoading,
    castLoadedOnce,
    castRenderProgressLabel,
    castRosterReady,
    castViewMode,
    castGalleryColumns,
    onSetCastViewMode,
    onSetCastGalleryColumns,
    castGalleryMembers,
    castCount,
    archiveFootageCount,
    visibleCastMembers,
    renderCastMember,
    crewDisplaySections,
    visibleCrewSections,
    archiveFootageCast,
    getPersonOverviewHref,
  } = props;

  return (
    <section
      id="show-tabpanel-cast"
      role="tabpanel"
      aria-labelledby="show-tab-cast"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-zinc-900">Credits</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
              {renderedCastCount}/{matchedCastCount}/{totalCastCount} cast ·{" "}
              {renderedCrewCount}/{matchedCrewCount}/{totalCrewCount} crew ·{" "}
              {renderedVisibleCount}/{matchedVisibleCount}/{totalVisibleCount} visible
            </span>
            <button
              type="button"
              onClick={onEnrichCastMedia}
              disabled={isCastRefreshBusy}
              title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {castMediaEnriching ? "Enriching..." : "Enrich Media"}
            </button>
            <button
              type="button"
              onClick={onEnrichMissingCastPhotos}
              disabled={isCastRefreshBusy || castPhotoEnriching || castLoading || missingCastPhotoCount <= 0}
              title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {castPhotoEnriching
                ? "Enriching..."
                : `Enrich Missing Cast Photos${missingCastPhotoCount > 0 ? ` (${missingCastPhotoCount})` : ""}`}
            </button>
            <button
              type="button"
              onClick={onRefreshShowCast}
              disabled={isCastRefreshBusy}
              title={isCastRefreshBusy ? "Cast sync in progress" : undefined}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {castRefreshButtonLabel}
            </button>
            {showCancelRunButton && (
              <button
                type="button"
                onClick={onCancelShowCastWorkflow}
                disabled={castRefreshCanceling}
                className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {castRefreshCancelButtonLabel}
              </button>
            )}
          </div>
        </div>
        {(castCreditsRefreshNotice || castCreditsRefreshError) && (
          <p
            className={`mb-4 text-sm ${
              castCreditsRefreshError ? "text-red-600" : "text-zinc-500"
            }`}
          >
            {castCreditsRefreshError || castCreditsRefreshNotice}
          </p>
        )}
        {(castRefreshPipelineRunning || castRefreshPhaseRows.length > 0) && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Credits Refresh Pipeline
              </p>
              {castRefreshPipelineRunning && (
                <p className="text-[11px] text-zinc-500">Fail-fast timeout policy enabled</p>
              )}
            </div>
            <div className="space-y-2">
              {castRefreshPhaseRows.map((phase, index) => (
                <div
                  key={`cast-refresh-phase-${phase.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">
                      {index + 1}. {phase.label}
                    </p>
                    {phase.message && <p className="truncate text-xs text-zinc-500">{phase.message}</p>}
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${phase.statusClassName}`}
                  >
                    {phase.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(refreshNotice || refreshError) && (
          <p className={`mb-4 text-sm ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
            {refreshError || refreshNotice}
          </p>
        )}
        {(castPhotoEnrichNotice || castPhotoEnrichError) && (
          <p className={`mb-4 text-sm ${castPhotoEnrichError ? "text-red-600" : "text-zinc-500"}`}>
            {castPhotoEnrichError || castPhotoEnrichNotice}
          </p>
        )}
        {(castMediaEnrichNotice || castMediaEnrichError) && (
          <p className={`mb-4 text-sm ${castMediaEnrichError ? "text-red-600" : "text-zinc-500"}`}>
            {castMediaEnrichError || castMediaEnrichNotice}
          </p>
        )}
        {castLoadWarning && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>{castLoadWarning}</span>
            <button
              type="button"
              onClick={onRetryCast}
              className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Retry Cast
            </button>
          </div>
        )}
        {castLoadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span>{castLoadError}</span>
            <button
              type="button"
              onClick={onRetryCast}
              className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Retry Cast
            </button>
          </div>
        )}
        {showCreditsError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span>{showCreditsError}</span>
            <button
              type="button"
              onClick={onRetryCrew}
              className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              Retry Crew
            </button>
          </div>
        )}
        {showCreditsLoading && !showCreditsLoadedOnce && (
          <p className="mb-4 text-sm text-zinc-500">Loading crew credits...</p>
        )}
        {showCreditsSourceUrl && (
          <p className="mb-4 text-xs text-zinc-500">
            Crew source:{" "}
            <a
              href={showCreditsSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-zinc-700 underline decoration-zinc-300 underline-offset-2"
            >
              IMDb Full Credits
            </a>
          </p>
        )}
        {castRoleMembersWarningWithSnapshotAge && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>{castRoleMembersWarningWithSnapshotAge}</span>
            <button
              type="button"
              onClick={onRetryCastRoleMembers}
              className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Retry
            </button>
          </div>
        )}
        {rolesWarningWithSnapshotAge && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>{rolesWarningWithSnapshotAge}</span>
            <button
              type="button"
              onClick={onRetryRoles}
              className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Retry Roles
            </button>
          </div>
        )}
        {showCastIntelligenceUnavailable && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-semibold">
              Cast intelligence unavailable; showing base cast snapshot.
            </p>
            {(castRoleMembersError || rolesError) && (
              <p className="mt-1 text-xs">
                {[castRoleMembersError, rolesError].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRetryCastRoleMembers}
                className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Retry Cast Intelligence
              </button>
              <button
                type="button"
                onClick={onRetryRoles}
                className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Retry Roles
              </button>
            </div>
          </div>
        )}
        {castRoleEditorDeepLinkWarning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {castRoleEditorDeepLinkWarning}
          </div>
        )}
        {castEligibilityWarning && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {castEligibilityWarning}
          </div>
        )}
        {castRunFailedMembers.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-amber-900">
                Failed Members ({castRunFailedMembers.length})
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleCastFailedMembersOpen}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  {castFailedMembersOpen ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={onRetryFailedCastMediaEnrich}
                  disabled={isCastRefreshBusy}
                  className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Retry failed only
                </button>
              </div>
            </div>
            {castFailedMembersOpen && (
              <ul className="mt-3 space-y-2 text-xs text-amber-900">
                {castRunFailedMembers.map((member) => (
                  <li
                    key={`${member.personId}-${member.name}-${member.reason}`}
                    className="rounded-md border border-amber-200 bg-white px-2 py-1"
                  >
                    <span className="font-semibold">{member.name}</span>: {member.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <CastMatrixSyncPanel
          loading={castMatrixSyncLoading}
          error={castMatrixSyncError}
          result={castMatrixSyncResult}
          scopeLabel={castMatrixSyncScopeLabel}
          onSync={onSyncCastMatrixRoles}
        />

        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 md:col-span-2">
              Search Name
              <input
                value={castSearchQuery}
                onChange={(event) => onSetCastSearchQuery(event.target.value)}
                placeholder="Search cast or crew..."
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sort By
              <select
                value={castSortBy}
                onChange={(event) => onSetCastSortBy(event.target.value as "episodes" | "season" | "name")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              >
                <option value="episodes">Episodes</option>
                <option value="season">Season Recency</option>
                <option value="name">Name</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Order
              <select
                value={castSortOrder}
                onChange={(event) => onSetCastSortOrder(event.target.value as "desc" | "asc")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Has Image
              <select
                value={castHasImageFilter}
                onChange={(event) => onSetCastHasImageFilter(event.target.value as "all" | "yes" | "no")}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              >
                <option value="all">All</option>
                <option value="yes">With Image</option>
                <option value="no">Without Image</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onClearCastFilters}
              className="self-end rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Episode Exact
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={castExactEpisodeCount ?? ""}
                onChange={(event) => onSetCastExactEpisodeCount(parsePositiveIntegerInputValue(event.target.value))}
                placeholder="Any"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Episode Min
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={castMinEpisodeCount ?? ""}
                onChange={(event) => onSetCastMinEpisodeCount(parsePositiveIntegerInputValue(event.target.value))}
                placeholder="Any"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Episode Max
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={castMaxEpisodeCount ?? ""}
                onChange={(event) => onSetCastMaxEpisodeCount(parsePositiveIntegerInputValue(event.target.value))}
                placeholder="Any"
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
              />
            </label>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Seasons
              </span>
              {availableCastSeasons.length === 0 ? (
                <span className="text-xs text-zinc-500">No season recency data yet.</span>
              ) : (
                availableCastSeasons.map((seasonNumber) => {
                  const active = castSeasonFilters.includes(seasonNumber);
                  return (
                    <button
                      key={`season-filter-${seasonNumber}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleCastSeasonFilter(seasonNumber)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600"
                      }`}
                    >
                      S{seasonNumber}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Season filters use season-scoped role assignments plus global season-0 roles.{" "}
              {castEpisodeScopeLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Roles & Credit
              </span>
              {shouldShowRoleCreditEmptyState ? (
                <span className="text-xs text-zinc-500">No role or credit filters available.</span>
              ) : !castUiTerminalReady ? (
                <span className="text-xs text-zinc-500">Loading role and credit filters...</span>
              ) : (
                availableCastRoleAndCreditFilters.map((option) => {
                  const active = castRoleAndCreditFilters.includes(option.key);
                  return (
                    <button
                      key={`role-credit-filter-${option.key}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleCastRoleAndCreditFilter(option.key)}
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        {castRoleMembersLoading && (
          <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
            Refreshing cast intelligence...
          </p>
        )}
        {castLoading && !castLoadedOnce && (
          <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
            Loading cast members...
          </p>
        )}
        {castLoading && castLoadedOnce && castCount === 0 && (
          <p className="mb-4 text-sm text-zinc-500" aria-live="polite">
            Cast list unavailable; retrying cast roster...
          </p>
        )}
        {castRenderProgressLabel && (
          <p className="mb-3 text-xs text-zinc-500" role="status" aria-live="polite">
            {castRenderProgressLabel}
          </p>
        )}
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Cast
              </p>
              <ShowCreditsCastViewControls
                viewMode={castViewMode}
                galleryColumns={castGalleryColumns}
                onViewModeChange={onSetCastViewMode}
                onGalleryColumnsChange={onSetCastGalleryColumns}
              />
            </div>
            {castGalleryMembers.length === 0 ? (
              !castRosterReady ? (
                <p className="text-sm text-zinc-500">Loading cast roster...</p>
              ) : castCount === 0 && archiveFootageCount === 0 ? (
                <p className="text-sm text-zinc-500">No cast members found for this show.</p>
              ) : (
                <p className="text-sm text-zinc-500">No cast members match the selected filters.</p>
              )
            ) : (
              <ShowCreditsCastMembers
                members={visibleCastMembers}
                viewMode={castViewMode}
                galleryColumns={castGalleryColumns}
                renderMember={renderCastMember}
              />
            )}
          </section>

          {crewDisplaySections.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Crew
              </p>
              <ShowCreditsCrewSections
                sections={visibleCrewSections}
                renderPersonName={(row) => (
                  <Link
                    href={getPersonOverviewHref({
                      personId: row.personId,
                      personName: row.personName,
                    })}
                    className="hover:underline"
                  >
                    {row.personName || "Unknown"}
                  </Link>
                )}
              />
            </section>
          )}

          {archiveFootageCast.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Archive Footage
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {archiveFootageCast.map((member) => {
                  const thumbnailUrl = member.cover_photo_url || member.photo_url;
                  const archiveLabel =
                    typeof member.archive_episode_count === "number"
                      ? `${member.archive_episode_count} archive footage episodes`
                      : "Archive footage appearance";
                  const personName = member.full_name || member.cast_member_name || "Unknown";

                  return (
                    <Link
                      key={`archive-${member.id}`}
                      href={getPersonOverviewHref({
                        personId: member.person_id,
                        personName: member.full_name || member.cast_member_name,
                      })}
                      className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 transition hover:border-amber-300 hover:bg-amber-100/40"
                    >
                      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-lg bg-zinc-200">
                        {thumbnailUrl ? (
                          <CastPhoto
                            src={thumbnailUrl}
                            alt={personName}
                            thumbnail_focus_x={member.thumbnail_focus_x}
                            thumbnail_focus_y={member.thumbnail_focus_y}
                            thumbnail_zoom={member.thumbnail_zoom}
                            thumbnail_crop_mode={member.thumbnail_crop_mode}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-zinc-900">{personName}</p>
                      <p className="text-sm text-amber-700">{archiveLabel}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </div>
    </section>
  );
}
