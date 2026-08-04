"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  Editable,
  EditableArea,
  EditableCancel,
  EditableInput,
  EditablePreview,
  EditableSubmit,
  EditableToolbar,
  EditableTrigger,
} from "@/components/ui/editable";
import { deriveShowDetailsSlugPreview } from "@/lib/admin/show-page/details-form";
import type {
  OverviewRedditCommunityRow,
  OverviewRedditGroup,
} from "@/lib/admin/show-page/overview-display";
import type { ShowDetailsForm } from "@/lib/admin/show-page/types";

type MaybeAsyncResult = void | Promise<void>;

type ShowSettingsRoleBase = {
  id: string;
  name: string;
  is_active: boolean;
};

type ShowSettingsLinkBase = {
  id: string;
  url: string;
};

export type ShowSettingsSourceBadgeProps<TSourceKind extends string = string> = {
  kind: TSourceKind;
  label: string;
  iconUrl?: string | null;
  iconOnly?: boolean;
};

type ShowSettingsSocialLink<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  id: string;
  sourceKind: TSourceKind;
  sourceLabel: string;
  text: string;
  url: string;
  link: TLink;
};

type ShowSettingsSeasonLink<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  id: string;
  url: string;
  sourceKind: TSourceKind;
  sourceLabel: string;
  iconUrl: string | null;
  linkTitle: string | null;
  link?: TLink;
};

type ShowSettingsSeasonCoverageRow<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  seasonNumber: number;
  links: ShowSettingsSeasonLink<TLink, TSourceKind>[];
};

type ShowSettingsApprovedLink<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  id: string;
  sourceKind: TSourceKind;
  sourceLabel: string;
  text: string;
  label: string;
  url: string;
  iconUrl: string | null;
  link: TLink;
};

type ShowSettingsMissingSource<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  key: TSourceKind;
  label: string;
  state: "missing" | "unvalidated";
  url: string | null;
  link: TLink | null;
};

type ShowSettingsCastMemberLinkCoverageCard<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  personId: string;
  personName: string;
  avatarUrl: string | null;
  seasons: number[];
  approvedLinkCount: number;
  approvedLinks: ShowSettingsApprovedLink<TLink, TSourceKind>[];
  missingSources: ShowSettingsMissingSource<TLink, TSourceKind>[];
};

type ShowSettingsHeaderProps = {
  showLogoSyncing: boolean;
  refreshCenterButtonLabel: string;
  onSyncShowLogoTargets: () => MaybeAsyncResult;
  onOpenRefreshLog: () => void;
};

type ShowSettingsStatusProps = {
  linksError: string | null;
  linksNotice: string | null;
  linksLoadTimedOut: boolean;
  rolesError: string | null;
  rolesWarning: string | null;
  rolesLoadTimedOut: boolean;
  showLogoSyncError: string | null;
  showLogoSyncNotice: string | null;
  onRetryLinks: () => MaybeAsyncResult;
  onRetryRoles: () => MaybeAsyncResult;
};

type ShowSettingsMetadataProps = {
  form: ShowDetailsForm;
  editing: boolean;
  saving: boolean;
  notice: string | null;
  error: string | null;
  onChangeField: (field: keyof ShowDetailsForm, value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => MaybeAsyncResult;
};

type ShowSettingsRolesProps<TRole extends ShowSettingsRoleBase> = {
  newRoleName: string;
  loading: boolean;
  rows: TRole[];
  onNewRoleNameChange: (value: string) => void;
  onCreate: () => MaybeAsyncResult;
  onRename: (role: TRole) => MaybeAsyncResult;
  onToggleActive: (role: TRole) => MaybeAsyncResult;
};

type ShowSettingsLinksProps<
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  showIsBravo: boolean;
  refreshing: boolean;
  bulkInput: string;
  bulkSaving: boolean;
  loading: boolean;
  totalCount: number;
  eligibleCastLoading: boolean;
  eligibleCastLoadedOnce: boolean;
  savingLinkIds: Readonly<Record<string, boolean>>;
  socialLinks: ShowSettingsSocialLink<TLink, TSourceKind>[];
  showPageLinks: TLink[];
  seasonUrlCoverageRows: ShowSettingsSeasonCoverageRow<TLink, TSourceKind>[];
  castMemberLinkCoverageCards: ShowSettingsCastMemberLinkCoverageCard<TLink, TSourceKind>[];
  onRefresh: () => MaybeAsyncResult;
  onBulkInputChange: (value: string) => void;
  onAdd: () => MaybeAsyncResult;
  onUpdateUrl: (linkId: string, nextUrl: string) => Promise<void>;
  onDelete: (linkId: string) => MaybeAsyncResult;
};

type ShowSettingsRedditProps = {
  loading: boolean;
  error: string | null;
  groups: OverviewRedditGroup[];
  getCommunityHref: (community: OverviewRedditCommunityRow) => string;
};

type ShowSettingsTabWrapperProps = {
  children: ReactNode;
};

type ShowSettingsTabPresentationalProps<
  TRole extends ShowSettingsRoleBase,
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
> = {
  header: ShowSettingsHeaderProps;
  status: ShowSettingsStatusProps;
  metadata: ShowSettingsMetadataProps;
  roles: ShowSettingsRolesProps<TRole>;
  links: ShowSettingsLinksProps<TLink, TSourceKind>;
  reddit: ShowSettingsRedditProps;
  getShowPageLinkTitle: (link: TLink) => string;
  renderShowPageLinkBadge: (link: TLink) => ReactNode;
  renderSourceBadge: (props: ShowSettingsSourceBadgeProps<TSourceKind>) => ReactNode;
  usesBrandIconOnly: (kind: TSourceKind) => boolean;
};

export type ShowSettingsTabProps<
  TRole extends ShowSettingsRoleBase = ShowSettingsRoleBase,
  TLink extends ShowSettingsLinkBase = ShowSettingsLinkBase,
  TSourceKind extends string = string,
> =
  | ShowSettingsTabWrapperProps
  | ShowSettingsTabPresentationalProps<TRole, TLink, TSourceKind>;

function InlineEditableLinkUrl({
  linkId,
  url,
  openUrl,
  label,
  saving,
  onSubmit,
  children,
  actions,
  containerClassName,
  canEdit = true,
}: {
  linkId: string;
  url: string;
  openUrl?: string | null;
  label?: string;
  saving: boolean;
  onSubmit: (linkId: string, nextUrl: string) => Promise<void>;
  children?: ReactNode;
  actions?: ReactNode;
  containerClassName?: string;
  canEdit?: boolean;
}) {
  const editButton = canEdit ? (
    <EditableTrigger asChild>
      <button
        type="button"
        disabled={saving}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
        aria-label={label ? `Edit URL for ${label}` : "Edit link URL"}
        title={label ? `Edit URL for ${label}` : "Edit link URL"}
      >
        <EditActionIcon />
      </button>
    </EditableTrigger>
  ) : null;
  const openButton = openUrl ? (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50"
      aria-label={label ? `Open ${label}` : "Open link"}
      title={label ? `Open ${label}` : "Open link"}
    >
      <OpenLinkActionIcon />
    </a>
  ) : null;

  return (
    <Editable value={url} placeholder="https://example.com" onSubmit={(nextUrl) => onSubmit(linkId, nextUrl)}>
      <div className={containerClassName ? `${containerClassName} space-y-2` : "space-y-2"}>
        {(children || actions || editButton || openButton) && (
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">{children}</div>
            <div className="flex shrink-0 items-center gap-2">
              {editButton}
              {openButton}
              {actions}
            </div>
          </div>
        )}
        {!children && !actions && (editButton || openButton) && (
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              {editButton}
              {openButton}
            </div>
          </div>
        )}
        <EditableArea className="space-y-1">
          <EditablePreview className="hidden" />
          <EditableInput
            type="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-9 rounded-lg text-xs"
          />
        </EditableArea>
        <EditableToolbar className="pt-1">
          <EditableSubmit asChild>
            <button
              type="button"
              disabled={saving}
              className="rounded border border-zinc-300 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save URL"}
            </button>
          </EditableSubmit>
          <EditableCancel asChild>
            <button
              type="button"
              disabled={saving}
              className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </EditableCancel>
        </EditableToolbar>
      </div>
    </Editable>
  );
}

function EditActionIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11.8 2.2a1.7 1.7 0 0 1 2.4 2.4l-7.5 7.5-3 .6.6-3z" />
      <path d="M10.7 3.3l2 2" />
    </svg>
  );
}

function OpenLinkActionIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 3h3v3" />
      <path d="M6.5 9.5L13 3" />
    </svg>
  );
}

const isWrapperProps = <
  TRole extends ShowSettingsRoleBase,
  TLink extends ShowSettingsLinkBase,
  TSourceKind extends string,
>(
  props: ShowSettingsTabProps<TRole, TLink, TSourceKind>
): props is ShowSettingsTabWrapperProps => "children" in props;

export default function ShowSettingsTab<
  TRole extends ShowSettingsRoleBase = ShowSettingsRoleBase,
  TLink extends ShowSettingsLinkBase = ShowSettingsLinkBase,
  TSourceKind extends string = string,
>(props: ShowSettingsTabProps<TRole, TLink, TSourceKind>) {
  if (isWrapperProps(props)) {
    return (
      <section
        id="show-tabpanel-settings"
        role="tabpanel"
        aria-labelledby="show-tab-settings"
      >
        {props.children}
      </section>
    );
  }

  const {
    header: {
      showLogoSyncing,
      refreshCenterButtonLabel,
      onSyncShowLogoTargets: syncShowScopedBrandLogos,
      onOpenRefreshLog,
    },
    status: {
      linksError,
      linksNotice,
      linksLoadTimedOut,
      rolesError,
      rolesWarning,
      rolesLoadTimedOut,
      showLogoSyncError,
      showLogoSyncNotice,
      onRetryLinks,
      onRetryRoles,
    },
    metadata: {
      form: detailsForm,
      editing: detailsEditing,
      saving: detailsSaving,
      notice: detailsNotice,
      error: detailsError,
      onChangeField: onChangeDetailsField,
      onStartEdit: startDetailsEdit,
      onCancelEdit: cancelDetailsEdit,
      onSave: saveShowDetails,
    },
    roles: {
      newRoleName,
      loading: rolesLoading,
      rows: showRoles,
      onNewRoleNameChange: setNewRoleName,
      onCreate: createShowRole,
      onRename: renameShowRole,
      onToggleActive: toggleShowRoleActive,
    },
    links: {
      showIsBravo,
      refreshing: linksRefreshing,
      bulkInput: linkBulkInput,
      bulkSaving: linkBulkSaving,
      loading: linksLoading,
      totalCount: totalLinkCount,
      eligibleCastLoading: linksEligibleCastLoading,
      eligibleCastLoadedOnce: linksEligibleCastLoadedOnce,
      savingLinkIds,
      socialLinks: showSocialLinks,
      showPageLinks,
      seasonUrlCoverageRows,
      castMemberLinkCoverageCards,
      onRefresh: refreshShowLinks,
      onBulkInputChange: setLinkBulkInput,
      onAdd: addShowLinks,
      onUpdateUrl: updateShowLinkUrl,
      onDelete: deleteShowLink,
    },
    reddit: {
      loading: redditLoading,
      error: redditError,
      groups: overviewRedditGroups,
      getCommunityHref,
    },
    getShowPageLinkTitle,
    renderShowPageLinkBadge,
    renderSourceBadge,
    usesBrandIconOnly,
  } = props;

  const settingsLinkSections = [
    {
      key: "social-links",
      title: "Social Links",
      description:
        "Show-level handles routed from submitted Instagram, TikTok, X, YouTube, Threads, Facebook, and Reddit links.",
    },
    {
      key: "show-pages",
      title: "Show Pages",
      description:
        "Validated show-level pages. Fandom community roots stay internal and only page URLs render here.",
    },
    {
      key: "season-pages",
      title: "Season Pages",
      description:
        "Validated season pages only. Cast-announcement, social, and non-page links are excluded.",
    },
    {
      key: "cast-member-pages",
      title: "Cast Member Pages",
      description: showIsBravo
        ? "Cast-member profile links (BravoTV, Fandom, Wikipedia, IMDb, TMDb, and related pages)."
        : "Cast-member profile links (Fandom, Wikipedia, IMDb, TMDb, and related pages). Bravo appears only when a Bravo profile link exists.",
    },
  ] as const;
  const socialLinksSection = settingsLinkSections[0];
  const showPagesSection = settingsLinkSections[1];
  const seasonPagesSection = settingsLinkSections[2];
  const castMemberPagesSection = settingsLinkSections[3];

  return (
    <section
      id="show-tabpanel-settings"
      role="tabpanel"
      aria-labelledby="show-tab-settings"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Show Settings
            </p>
            <h3 className="text-xl font-bold text-zinc-900">
              Settings
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void syncShowScopedBrandLogos()}
              disabled={showLogoSyncing}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {showLogoSyncing ? "Syncing..." : "Sync Show Logo Targets"}
            </button>
            <button
              type="button"
              onClick={() => onOpenRefreshLog()}
              disabled={showLogoSyncing}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {refreshCenterButtonLabel}
            </button>
          </div>
        </div>

        {(linksError ||
          linksNotice ||
          rolesError ||
          rolesWarning ||
          showLogoSyncError ||
          showLogoSyncNotice) && (
          <div className="mb-4 text-sm space-y-2">
            <p
              className={`${
                linksError || rolesError || showLogoSyncError
                  ? linksLoadTimedOut || rolesLoadTimedOut
                    ? "text-amber-700"
                    : "text-red-600"
                  : "text-zinc-500"
              }`}
            >
              {linksError ||
                rolesError ||
                showLogoSyncError ||
                rolesWarning ||
                linksNotice ||
                showLogoSyncNotice}
            </p>
            {linksError && linksLoadTimedOut && (
              <button
                type="button"
                onClick={() => void onRetryLinks()}
                className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Retry links
              </button>
            )}
            {rolesError && rolesLoadTimedOut && (
              <button
                type="button"
                onClick={() => void onRetryRoles()}
                className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Retry roles
              </button>
            )}
          </div>
        )}

        <div className="space-y-6">
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-700">Editable Metadata</h4>
              <div className="flex flex-wrap items-center gap-2">
                {detailsEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelDetailsEdit}
                      disabled={detailsSaving}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveShowDetails}
                      disabled={detailsSaving}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {detailsSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startDetailsEdit}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Edit Metadata
                  </button>
                )}
              </div>
            </div>
            {(detailsNotice || detailsError) && (
              <p className={`mb-3 text-sm ${detailsError ? "text-red-600" : "text-zinc-500"}`}>
                {detailsError || detailsNotice}
              </p>
            )}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Display Name
                  </span>
                  <input
                    type="text"
                    value={detailsForm.displayName}
                    onChange={(e) => onChangeDetailsField("displayName", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Nickname / Slug
                  </span>
                  <input
                    type="text"
                    value={detailsForm.nickname}
                    onChange={(e) => onChangeDetailsField("nickname", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                  {detailsForm.nickname.trim() && (
                    <span className="mt-1 block text-xs text-zinc-400">
                      Canonical slug: <span className="font-mono">{deriveShowDetailsSlugPreview(detailsForm.nickname)}</span>
                      {" · "}
                      Hashtag: <span className="font-mono">#{detailsForm.nickname.trim().replace(/\s+/g, "")}</span>
                    </span>
                  )}
                </label>
                <div className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Premiere Date
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={detailsForm.premiereDate}
                      onChange={(e) => onChangeDetailsField("premiereDate", e.target.value)}
                      disabled={!detailsEditing}
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                    />
                    {detailsEditing && detailsForm.premiereDate && (
                      <button
                        type="button"
                        onClick={() => onChangeDetailsField("premiereDate", "")}
                        className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-50"
                        title="Clear premiere date"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Alt Names
                  </span>
                  <textarea
                    value={detailsForm.altNamesText}
                    onChange={(e) => onChangeDetailsField("altNamesText", e.target.value)}
                    rows={3}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Description
                  </span>
                  <textarea
                    value={detailsForm.description}
                    onChange={(e) => onChangeDetailsField("description", e.target.value)}
                    rows={4}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    TMDb
                  </span>
                  <input
                    type="text"
                    value={detailsForm.tmdbId}
                    onChange={(e) => onChangeDetailsField("tmdbId", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    IMDb
                  </span>
                  <input
                    type="text"
                    value={detailsForm.imdbId}
                    onChange={(e) => onChangeDetailsField("imdbId", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    TVDb
                  </span>
                  <input
                    type="text"
                    value={detailsForm.tvdbId}
                    onChange={(e) => onChangeDetailsField("tvdbId", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Wikidata
                  </span>
                  <input
                    type="text"
                    value={detailsForm.wikidataId}
                    onChange={(e) => onChangeDetailsField("wikidataId", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    TV Rage
                  </span>
                  <input
                    type="text"
                    value={detailsForm.tvRageId}
                    onChange={(e) => onChangeDetailsField("tvRageId", e.target.value)}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Genres
                  </span>
                  <textarea
                    value={detailsForm.genresText}
                    onChange={(e) => onChangeDetailsField("genresText", e.target.value)}
                    rows={2}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Networks
                  </span>
                  <textarea
                    value={detailsForm.networksText}
                    onChange={(e) => onChangeDetailsField("networksText", e.target.value)}
                    rows={2}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Streaming
                  </span>
                  <textarea
                    value={detailsForm.streamingProvidersText}
                    onChange={(e) =>
                      onChangeDetailsField("streamingProvidersText", e.target.value)
                    }
                    rows={2}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Tags
                  </span>
                  <textarea
                    value={detailsForm.tagsText}
                    onChange={(e) => onChangeDetailsField("tagsText", e.target.value)}
                    rows={2}
                    disabled={!detailsEditing}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
                  />
                </label>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">Role Catalog</h4>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="Housewife"
                  className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                />
                <button
                  type="button"
                  onClick={createShowRole}
                  disabled={rolesLoading}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  Add Role
                </button>
              </div>
              {showRoles.length === 0 ? (
                <p className="text-sm text-zinc-500">No roles configured yet.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {showRoles.map((role) => (
                    <div
                      key={`settings-role-catalog-${role.id}`}
                      className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-1"
                    >
                      <span
                        className={`text-xs font-semibold ${
                          role.is_active ? "text-zinc-700" : "text-zinc-400 line-through"
                        }`}
                      >
                        {role.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => void renameShowRole(role)}
                        className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleShowRoleActive(role)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          role.is_active
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {role.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-700">Links</h4>
              <button
                type="button"
                onClick={() => void refreshShowLinks()}
                disabled={linksRefreshing}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {linksRefreshing ? "Refreshing..." : "Refresh Links"}
              </button>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
                <p className="text-xs text-zinc-500">
                  Paste one or more URLs or handles. The classifier auto-assigns show vs season vs cast-member
                  links and routes social handles (Instagram/TikTok/X/YouTube/Threads/Facebook/Reddit) into
                  social links, with show pages, season pages, cast-member pages, and Google News topic URLs
                  routed into the matching sections below.
                </p>
                <textarea
                  value={linkBulkInput}
                  onChange={(event) => setLinkBulkInput(event.target.value)}
                  rows={4}
                  placeholder={
                    "https://thetraitors.fandom.com/wiki/The_Traitors_(US)\nhttps://news.google.com/topics/CAAqKAgKIiJDQkFTRXdvTkwyY3ZNVEZvYlhBeGVtUndNQklDWlc0b0FBUAE?ceid=US:en&oc=3\ninstagram:@thetraitorsus"
                  }
                  className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void addShowLinks()}
                    disabled={linkBulkSaving}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {linkBulkSaving ? "Adding..." : "Add Link(s)"}
                  </button>
                </div>
              </div>
              {linksLoading ? (
                <p className="text-sm text-zinc-500">Loading links...</p>
              ) : totalLinkCount === 0 ? (
                <p className="text-sm text-zinc-500">No links yet. Run discovery to populate this list.</p>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {socialLinksSection.title}
                      </p>
                      <p className="text-xs text-zinc-500">{socialLinksSection.description}</p>
                    </div>
                    {showSocialLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No show-level social handles discovered yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {showSocialLinks.map((pill) => (
                          <InlineEditableLinkUrl
                            key={`settings-social-link-${pill.id}`}
                            linkId={pill.link.id}
                            url={pill.url}
                            openUrl={pill.url}
                            label={pill.text}
                            saving={Boolean(savingLinkIds[pill.link.id])}
                            onSubmit={updateShowLinkUrl}
                            containerClassName="rounded-md border border-zinc-200 bg-white px-3 py-2"
                            actions={
                              <button
                                type="button"
                                onClick={() => void deleteShowLink(pill.link.id)}
                                className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                              >
                                Delete
                              </button>
                            }
                          >
                            <div className="inline-flex min-w-0 flex-1 items-center gap-2" title={pill.url}>
                              {renderSourceBadge({ kind: pill.sourceKind, label: pill.sourceLabel, iconOnly: true })}
                              <span className="truncate text-zinc-900">{pill.text}</span>
                            </div>
                          </InlineEditableLinkUrl>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {showPagesSection.title}
                      </p>
                      <p className="text-xs text-zinc-500">{showPagesSection.description}</p>
                    </div>
                    {showPageLinks.length === 0 ? (
                      <p className="text-sm text-zinc-500">No links in this category yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {showPageLinks.map((link) => {
                          const linkTitle = getShowPageLinkTitle(link);
                          return (
                            <InlineEditableLinkUrl
                              key={`settings-link-show-pages-${link.id}`}
                              linkId={link.id}
                              url={link.url}
                              openUrl={link.url}
                              label={linkTitle}
                              saving={Boolean(savingLinkIds[link.id])}
                              onSubmit={updateShowLinkUrl}
                              containerClassName="rounded-md border border-zinc-200 bg-white px-3 py-2"
                              actions={
                                <button
                                  type="button"
                                  onClick={() => void deleteShowLink(link.id)}
                                  className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                                >
                                  Delete
                                </button>
                              }
                            >
                              <div className="inline-flex min-w-0 flex-1 items-center gap-2">
                                {renderShowPageLinkBadge(link)}
                                <span className="shrink-0 text-zinc-300">|</span>
                                <span className="truncate text-zinc-900">{linkTitle}</span>
                              </div>
                            </InlineEditableLinkUrl>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {seasonPagesSection.title}
                      </p>
                      <p className="text-xs text-zinc-500">{seasonPagesSection.description}</p>
                    </div>
                    {seasonUrlCoverageRows.length === 0 ? (
                      <p className="text-sm text-zinc-500">No season-scoped validated links yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {seasonUrlCoverageRows.map((row) => (
                          <div
                            key={`settings-season-pages-${row.seasonNumber}`}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900">Season {row.seasonNumber}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {row.links.map((link) => (
                                  <a
                                    key={`settings-season-link-pill-${row.seasonNumber}-${link.id}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                    title={`${link.sourceLabel} | ${link.linkTitle || `Season ${row.seasonNumber}`}`}
                                  >
                                    {renderSourceBadge({
                                      kind: link.sourceKind,
                                      label: link.sourceLabel,
                                      iconUrl: link.iconUrl,
                                      iconOnly: true,
                                    })}
                                  </a>
                                ))}
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2">
                              {row.links.filter((link) => link.link).map((link) => (
                                <InlineEditableLinkUrl
                                  key={`settings-season-link-editor-${row.seasonNumber}-${link.id}`}
                                  linkId={link.link!.id}
                                  url={link.url}
                                  openUrl={link.url}
                                  label={`${link.sourceLabel} season page`}
                                  saving={Boolean(savingLinkIds[link.link!.id])}
                                  onSubmit={updateShowLinkUrl}
                                  containerClassName="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
                                  actions={
                                    <button
                                      type="button"
                                      onClick={() => void deleteShowLink(link.link!.id)}
                                      className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                                    >
                                      Delete
                                    </button>
                                  }
                                  >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                                      {renderSourceBadge({
                                        kind: link.sourceKind,
                                        label: link.sourceLabel,
                                        iconUrl: link.iconUrl,
                                        iconOnly: usesBrandIconOnly(link.sourceKind),
                                      })}
                                    <span>{link.sourceLabel}</span>
                                  </div>
                                </InlineEditableLinkUrl>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {castMemberPagesSection.title}
                      </p>
                      <p className="text-xs text-zinc-500">{castMemberPagesSection.description}</p>
                    </div>
                    {castMemberLinkCoverageCards.length === 0 ? (
                      linksEligibleCastLoading && !linksEligibleCastLoadedOnce ? (
                        <p className="text-sm text-zinc-500">Loading eligible cast roster...</p>
                      ) : (
                        <p className="text-sm text-zinc-500">No cast-member links in this category yet.</p>
                      )
                    ) : (
                      <div className="space-y-3">
                        {castMemberLinkCoverageCards.map((card) => (
                          <div
                            key={`person-link-coverage-${card.personId}`}
                            className="rounded-lg border border-zinc-200 bg-white p-3"
                          >
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                {card.avatarUrl ? (
                                  <Image
                                    src={card.avatarUrl}
                                    alt={card.personName}
                                    width={32}
                                    height={32}
                                    className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-500">
                                    {card.personName.slice(0, 1) || "?"}
                                  </div>
                                )}
                                <p className="truncate text-sm font-semibold text-zinc-900">{card.personName}</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                  {card.approvedLinkCount} approved
                                </span>
                                {card.seasons.length > 0 && (
                                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                                    Seasons {card.seasons.map((season) => `S${season}`).join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {card.approvedLinks.length === 0 ? (
                              <p className="text-sm text-zinc-500">No validated links for this person yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {card.approvedLinks.map((approvedLink) => (
                                  <InlineEditableLinkUrl
                                    key={`person-approved-link-${card.personId}-${approvedLink.id}`}
                                    linkId={approvedLink.link.id}
                                    url={approvedLink.url}
                                    openUrl={approvedLink.url}
                                    label={approvedLink.text}
                                    saving={Boolean(savingLinkIds[approvedLink.link.id])}
                                    onSubmit={updateShowLinkUrl}
                                    containerClassName="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                                    actions={
                                      <button
                                        type="button"
                                        onClick={() => void deleteShowLink(approvedLink.link.id)}
                                        className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                                      >
                                        Delete
                                      </button>
                                    }
                                  >
                                    <div
                                      className="inline-flex min-w-0 max-w-full items-center gap-2 text-xs font-semibold text-zinc-700"
                                      title={approvedLink.url}
                                    >
                                      {renderSourceBadge({
                                        kind: approvedLink.sourceKind,
                                        label: approvedLink.sourceLabel,
                                        iconUrl: approvedLink.iconUrl,
                                        iconOnly: usesBrandIconOnly(approvedLink.sourceKind),
                                      })}
                                      <span className="truncate">{approvedLink.text}</span>
                                    </div>
                                  </InlineEditableLinkUrl>
                                ))}
                              </div>
                            )}

                            {card.missingSources.length > 0 && (
                              <details className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                  Missing / Unvalidated Sources
                                </summary>
                                <div className="mt-3 space-y-2">
                                  {card.missingSources.map((source) => (
                                    <InlineEditableLinkUrl
                                      key={`person-link-source-${card.personId}-${source.key}`}
                                      linkId={source.link?.id ?? `missing-${card.personId}-${source.key}`}
                                      url={source.link?.url ?? source.url ?? ""}
                                      openUrl={source.link?.url ?? source.url ?? null}
                                      label={source.label}
                                      saving={source.link ? Boolean(savingLinkIds[source.link.id]) : false}
                                      onSubmit={updateShowLinkUrl}
                                      containerClassName="rounded-md border border-amber-200 bg-white px-3 py-2"
                                      canEdit={Boolean(source.link)}
                                      actions={
                                        source.link ? (
                                          <button
                                            type="button"
                                            onClick={() => source.link && void deleteShowLink(source.link.id)}
                                            className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                                          >
                                            Delete
                                          </button>
                                        ) : null
                                      }
                                    >
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {renderSourceBadge({ kind: source.key, label: source.label, iconOnly: true })}
                                          <span className="text-xs font-semibold text-zinc-800">
                                            {source.label}
                                          </span>
                                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                            {source.state === "unvalidated" ? "Unvalidated" : "Missing"}
                                          </span>
                                        </div>
                                        <p className="text-xs text-zinc-600">No validated source URL found</p>
                                        {source.url ? (
                                          <p className="max-w-full truncate text-xs font-medium text-zinc-700" title={source.url}>
                                            {source.url}
                                          </p>
                                        ) : null}
                                      </div>
                                    </InlineEditableLinkUrl>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-700">Reddit</h4>
              <Link
                href={"/admin/social/reddit"}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Open Reddit Admin
              </Link>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {redditLoading ? (
                <p className="text-sm text-zinc-500">Loading Reddit communities...</p>
              ) : redditError ? (
                <p className="text-sm text-red-600">{redditError}</p>
              ) : overviewRedditGroups.length === 0 ? (
                <p className="text-sm text-zinc-500">No relevant Reddit communities configured for this show.</p>
              ) : (
                <div className="space-y-4">
                  {overviewRedditGroups.map((group) => (
                    <div key={`settings-reddit-group-${group.key}`} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {group.communities.map((community) => (
                          <div
                            key={`settings-reddit-community-${community.id}`}
                            className="rounded-lg border border-zinc-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">{community.displayName}</p>
                                <p className="text-xs text-zinc-500">r/{community.subreddit}</p>
                              </div>
                              <Link
                                href={getCommunityHref(community)}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              >
                                Open Community
                              </Link>
                            </div>
                            <div className="mt-3 space-y-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                  Assigned Flairs
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {community.assignedFlairs.length > 0 ? (
                                    community.assignedFlairs.map((flair) => (
                                      <span
                                        key={`settings-reddit-flair-${community.id}-${flair}`}
                                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                      >
                                        {flair}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-zinc-500">No assigned flairs</span>
                                  )}
                                </div>
                              </div>
                              {community.postFlairs.length > 0 && (
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Post Flairs
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {community.postFlairs.map((flair) => (
                                      <span
                                        key={`settings-reddit-post-flair-${community.id}-${flair}`}
                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                      >
                                        {flair}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
