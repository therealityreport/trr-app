"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import type { User } from "firebase/auth";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_SOCIAL_PATH, buildSocialPath } from "@/lib/admin/admin-route-paths";
import type {
  CastSocialBladeAccountSummary,
  CastSocialBladeMemberSummary,
  CastSocialBladePlatform,
  CastSocialBladeShowSummary,
  NetworkProfileSet,
  PersonTargetSummary,
  RedditDashboardSummary,
  ShowProfileSet,
  SocialHandleSummary,
  SocialLandingPlatform,
  SocialLandingPayload,
} from "@/lib/admin/social-landing";
import {
  buildSocialAccountProfileUrl,
  buildShowAdminUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";
import { normalizePersonExternalIdValue } from "@/lib/admin/person-external-ids";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const sectionEyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500";
const SOCIAL_LANDING_CACHE_KEY = "trr-admin-social-landing:v2";
const CAST_SOCIALBLADE_PLATFORM_ORDER: CastSocialBladePlatform[] = [
  "instagram",
  "youtube",
  "facebook",
];
const EDITABLE_SHOW_SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "threads",
  "twitter",
  "tiktok",
  "youtube",
] as const;
type EditableShowSocialPlatform = (typeof EDITABLE_SHOW_SOCIAL_PLATFORMS)[number];
type ShowHandleDraft = Record<EditableShowSocialPlatform, string>;
const SHOW_SOCIAL_HANDLE_FIELD_BY_PLATFORM: Record<EditableShowSocialPlatform, string> = {
  instagram: "instagram_handle",
  facebook: "facebook_handle",
  threads: "threads_handle",
  twitter: "twitter_handle",
  tiktok: "tiktok_handle",
  youtube: "youtube_handle",
};
type AddHandleTargetType = "network" | "show" | "person";
type AddHandleTargetOption = {
  key: string;
  label: string;
  helperText: string | null;
  groupLabel: "NETWORKS" | "SHOWS" | "CAST MEMBERS";
  targetType: AddHandleTargetType;
  targetId: string;
};

const formatPlatformLabel = (platform: SocialLandingPlatform): string => {
  if (platform === "twitter") return "X/Twitter";
  if (platform === "youtube") return "YouTube";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};

const formatCompactTimestamp = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const buildEmptyShowHandleDraft = (): ShowHandleDraft => ({
  instagram: "",
  facebook: "",
  threads: "",
  twitter: "",
  tiktok: "",
  youtube: "",
});

const coerceLandingPayload = (
  data: Partial<SocialLandingPayload> | undefined,
): SocialLandingPayload => ({
  network_sets: Array.isArray(data?.network_sets) ? data.network_sets : [],
  show_sets: Array.isArray(data?.show_sets) ? data.show_sets : [],
  people_profiles: Array.isArray(data?.people_profiles) ? data.people_profiles : [],
  person_targets: Array.isArray(data?.person_targets) ? data.person_targets : [],
  cast_socialblade_shows: Array.isArray(data?.cast_socialblade_shows)
    ? data.cast_socialblade_shows
    : [],
  shared_pipeline: {
    sources: Array.isArray(data?.shared_pipeline?.sources)
      ? data.shared_pipeline.sources
      : [],
    runs: Array.isArray(data?.shared_pipeline?.runs)
      ? data.shared_pipeline.runs
      : [],
    review_items: Array.isArray(data?.shared_pipeline?.review_items)
      ? data.shared_pipeline.review_items
      : [],
  },
  reddit_dashboard: {
    active_community_count:
      typeof data?.reddit_dashboard?.active_community_count === "number"
        ? data.reddit_dashboard.active_community_count
        : 0,
    archived_community_count:
      typeof data?.reddit_dashboard?.archived_community_count === "number"
        ? data.reddit_dashboard.archived_community_count
        : 0,
    show_count:
      typeof data?.reddit_dashboard?.show_count === "number"
        ? data.reddit_dashboard.show_count
        : 0,
  },
});

const buildAddHandleTargetOptions = (
  networkSets: readonly NetworkProfileSet[],
  showSets: readonly ShowProfileSet[],
  personTargets: readonly PersonTargetSummary[],
): AddHandleTargetOption[] => [
  ...networkSets.map((network) => ({
    key: `network:${network.key}`,
    label: network.title,
    helperText: network.description,
    groupLabel: "NETWORKS" as const,
    targetType: "network" as const,
    targetId: network.key,
  })),
  ...showSets.map((show) => ({
    key: `show:${show.show_id}`,
    label: show.show_name,
    helperText: show.fallback_note,
    groupLabel: "SHOWS" as const,
    targetType: "show" as const,
    targetId: show.show_id,
  })),
  ...personTargets.map((person) => ({
    key: `person:${person.person_id}`,
    label: person.full_name,
    helperText:
      person.shows.length > 0
        ? person.shows.map((show) => show.show_name).join(", ")
        : null,
    groupLabel: "CAST MEMBERS" as const,
    targetType: "person" as const,
    targetId: person.person_id,
  })),
];

const buildShowHandleDraft = (show: ShowProfileSet): ShowHandleDraft => {
  const draft = buildEmptyShowHandleDraft();
  for (const handle of show.handles) {
    if ((EDITABLE_SHOW_SOCIAL_PLATFORMS as readonly string[]).includes(handle.platform)) {
      draft[handle.platform as EditableShowSocialPlatform] = handle.handle;
    }
  }
  return draft;
};

const buildEditableShowHandleSummary = (
  platform: EditableShowSocialPlatform,
  rawValue: string,
): SocialHandleSummary | null => {
  const normalizedValue = normalizePersonExternalIdValue(platform, rawValue);
  if (!normalizedValue) return null;
  if (
    platform === "youtube" &&
    (normalizedValue.startsWith("channel/") ||
      normalizedValue.startsWith("user/") ||
      normalizedValue.startsWith("c/"))
  ) {
    return null;
  }
  const canonicalHandle = normalizeSocialAccountProfileHandle(normalizedValue);
  if (!canonicalHandle) return null;

  const displayLabel =
    platform === "youtube"
      ? normalizedValue.startsWith("@")
        ? `@${canonicalHandle}`
        : canonicalHandle
      : `@${canonicalHandle}`;

  return {
    platform,
    handle: canonicalHandle,
    display_label: displayLabel,
    href: buildSocialAccountProfileUrl({ platform, handle: canonicalHandle }),
    external: false,
  };
};

const applyShowHandleDraft = (
  show: ShowProfileSet,
  draft: ShowHandleDraft,
): ShowProfileSet => {
  const handles = EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) =>
    buildEditableShowHandleSummary(platform, draft[platform]),
  ).filter((handle): handle is SocialHandleSummary => handle !== null);

  return {
    ...show,
    handles,
  };
};

const getMemberInitials = (fullName: string): string => {
  const initials = fullName
    .split(/\s+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return initials || "?";
};

const groupCastAccountsByPlatform = (
  accounts: readonly CastSocialBladeAccountSummary[],
): Partial<Record<CastSocialBladePlatform, CastSocialBladeAccountSummary[]>> =>
  accounts.reduce<Partial<Record<CastSocialBladePlatform, CastSocialBladeAccountSummary[]>>>(
    (grouped, account) => ({
      ...grouped,
      [account.platform]: [...(grouped[account.platform] ?? []), account],
    }),
    {},
  );

const CastMemberAvatar = ({
  member,
}: {
  member: CastSocialBladeMemberSummary;
}) => {
  const fallback = (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
      {getMemberInitials(member.full_name)}
    </div>
  );

  if (!member.photo_url) return fallback;

  return (
    <img
      src={member.photo_url}
      alt={`${member.full_name} profile`}
      className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 bg-white object-cover"
    />
  );
};

const CastSocialBladeSection = ({
  shows,
}: {
  shows: readonly CastSocialBladeShowSummary[];
}) => {
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);

  useEffect(() => {
    const firstAvailableShowId = shows[0]?.show_id ?? null;
    setSelectedShowId((currentShowId) => {
      if (
        currentShowId &&
        shows.some((show) => show.show_id === currentShowId)
      ) {
        return currentShowId;
      }
      return currentShowId === firstAvailableShowId
        ? currentShowId
        : firstAvailableShowId;
    });
  }, [shows]);

  const selectedShow =
    shows.find((show) => show.show_id === selectedShowId) ?? shows[0] ?? null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={sectionEyebrowClass}>Cast SocialBlade</p>
          <h2 className="text-lg font-semibold text-zinc-900">
            CAST SOCIALBLADE
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Pick a show to inspect cast SocialBlade coverage by platform.
          </p>
        </div>
        <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
          {shows.length} show{shows.length === 1 ? "" : "s"}
        </span>
      </div>

      {shows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          No cast SocialBlade rows are available yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="space-y-2">
            {shows.map((show) => {
              const isSelected = selectedShow?.show_id === show.show_id;
              const latestScraped = formatCompactTimestamp(show.latest_scraped_at);
              return (
                <button
                  key={show.show_id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedShowId(show.show_id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 hover:border-zinc-300 hover:bg-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">{show.show_name}</span>
                  <span
                    className={`mt-2 block text-xs ${
                      isSelected ? "text-zinc-200" : "text-zinc-500"
                    }`}
                  >
                    {show.cast_member_count.toLocaleString()} cast members
                    {latestScraped ? ` · latest ${latestScraped}` : ""}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {CAST_SOCIALBLADE_PLATFORM_ORDER.map((platform) => {
                      const count = show.platform_counts[platform] ?? 0;
                      if (count === 0) return null;
                      return (
                        <span
                          key={`${show.show_id}:${platform}`}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            isSelected
                              ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                              : "border-zinc-200 bg-white text-zinc-600"
                          }`}
                        >
                          {formatPlatformLabel(platform)} {count}
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedShow ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    {selectedShow.show_name}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedShow.members.length.toLocaleString()} cast members with
                    linked SocialBlade account data.
                  </p>
                </div>
                {formatCompactTimestamp(selectedShow.latest_scraped_at) ? (
                  <span className="w-fit rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    Latest scrape {formatCompactTimestamp(selectedShow.latest_scraped_at)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {selectedShow.members.map((member) => {
                  const accountsByPlatform = groupCastAccountsByPlatform(member.accounts);
                  return (
                    <div
                      key={member.person_id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <CastMemberAvatar member={member} />
                        <div>
                          <p className="font-semibold text-zinc-900">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {member.accounts.length.toLocaleString()} account
                            {member.accounts.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {CAST_SOCIALBLADE_PLATFORM_ORDER.map((platform) => {
                          const accounts = accountsByPlatform[platform] ?? [];
                          if (accounts.length === 0) return null;
                          return (
                            <div
                              key={`${member.person_id}:${platform}`}
                              className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                {formatPlatformLabel(platform)}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {accounts.map((account) => {
                                  const scrapedAt = formatCompactTimestamp(account.scraped_at);
                                  const updatedAt = formatCompactTimestamp(account.updated_at);
                                  return (
                                    <Link
                                      key={`${member.person_id}:${account.platform}:${account.handle}`}
                                      href={account.account_href as Route}
                                      aria-label={`${formatPlatformLabel(account.platform)} ${account.display_label}`}
                                      className="inline-flex flex-col rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm transition hover:border-zinc-300 hover:bg-zinc-50"
                                    >
                                      <span className="font-semibold text-zinc-900">
                                        {account.display_label}
                                      </span>
                                      <span className="mt-1 text-xs text-zinc-500">
                                        {scrapedAt ? `Scraped ${scrapedAt}` : "No scrape timestamp"}
                                        {updatedAt ? ` · updated ${updatedAt}` : ""}
                                        {account.stats_refreshed ? " · refreshed" : ""}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
              Select a show to view cast members and grouped platform accounts.
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const loadLandingData = async (
  currentUser: User,
): Promise<SocialLandingPayload> => {
  const response = await fetchAdminWithAuth("/api/admin/social/landing", undefined, {
    allowDevAdminBypass: true,
    preferredUser: currentUser,
  });
  const data = (await response.json().catch(() => ({}))) as
    | ({ error?: string } & Partial<SocialLandingPayload>)
    | undefined;
  if (!response.ok) {
    throw new Error(data?.error || "Failed to load social landing data");
  }
  return coerceLandingPayload(data);
};

const readCachedLandingData = (): SocialLandingPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOCIAL_LANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: SocialLandingPayload } | null;
    const payload = parsed?.payload;
    if (!payload || typeof payload !== "object") return null;
    return coerceLandingPayload(payload);
  } catch {
    return null;
  }
};

const writeCachedLandingData = (payload: SocialLandingPayload): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SOCIAL_LANDING_CACHE_KEY,
      JSON.stringify({
        cached_at: new Date().toISOString(),
        payload,
      }),
    );
  } catch {
    // Ignore localStorage failures and keep the live response.
  }
};

const HandleChip = ({ handle }: { handle: SocialHandleSummary }) => {
  const className =
    "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50";
  const content = (
    <>
      <span className="text-zinc-500">{formatPlatformLabel(handle.platform)}</span>
      <span className="font-semibold text-zinc-900">{handle.display_label}</span>
    </>
  );

  if (!handle.href) {
    return <span className={className}>{content}</span>;
  }

  if (handle.external) {
    return (
      <a
        href={handle.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={handle.href as Route} className={className}>
      {content}
    </Link>
  );
};

const ShowCard = ({
  show,
  onSaveHandleOverrides,
}: {
  show: ShowProfileSet;
  onSaveHandleOverrides: (show: ShowProfileSet, draft: ShowHandleDraft) => Promise<void>;
}) => {
  const routeSlug = resolvePreferredShowRouteSlug({
    alternativeNames: show.alternative_names,
    canonicalSlug: show.canonical_slug,
    fallback: show.show_name,
  });
  const socialHref = buildShowAdminUrl({
    showSlug: routeSlug,
    tab: "social",
    socialView: "official",
  }) as Route;
  const [editingHandles, setEditingHandles] = useState(false);
  const [savingHandles, setSavingHandles] = useState(false);
  const [handleDraft, setHandleDraft] = useState<ShowHandleDraft>(() =>
    buildShowHandleDraft(show),
  );
  const [handleSaveMessage, setHandleSaveMessage] = useState<string | null>(null);
  const [handleSaveError, setHandleSaveError] = useState<string | null>(null);

  useEffect(() => {
    setHandleDraft(buildShowHandleDraft(show));
  }, [show]);

  const saveHandles = async () => {
    setSavingHandles(true);
    setHandleSaveError(null);
    setHandleSaveMessage(null);
    try {
      await onSaveHandleOverrides(show, handleDraft);
      setHandleSaveMessage("Saved social handle overrides.");
      setEditingHandles(false);
    } catch (error) {
      setHandleSaveError(
        error instanceof Error ? error.message : "Failed to save social handle overrides",
      );
    } finally {
      setSavingHandles(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">{show.show_name}</p>
          {show.fallback_note ? (
            <p className="mt-1 text-sm text-zinc-500">{show.fallback_note}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Direct show profiles and shared-account duplicates where applicable.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingHandles((current) => !current);
              setHandleSaveError(null);
              setHandleSaveMessage(null);
              setHandleDraft(buildShowHandleDraft(show));
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:bg-zinc-100"
          >
            {editingHandles ? "Close Editor" : "Edit Handles"}
          </button>
          <Link
            href={socialHref}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:bg-zinc-100"
          >
            Open Analytics
          </Link>
        </div>
      </div>

      {handleSaveError ? (
        <p className="mt-3 text-sm text-red-600">{handleSaveError}</p>
      ) : null}
      {handleSaveMessage ? (
        <p className="mt-3 text-sm text-zinc-500">{handleSaveMessage}</p>
      ) : null}

      {editingHandles ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) => (
              <label key={`${show.show_id}:${platform}`} className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {formatPlatformLabel(platform)}
                </span>
                <input
                  type="text"
                  value={handleDraft[platform]}
                  onChange={(event) =>
                    setHandleDraft((current) => ({
                      ...current,
                      [platform]: event.target.value,
                    }))
                  }
                  placeholder={`No ${formatPlatformLabel(platform)} handle`}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Leave a field blank to remove that stored handle. Saved values update this card immediately and refresh the
            linked profile route in the background.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingHandles(false);
                setHandleDraft(buildShowHandleDraft(show));
                setHandleSaveError(null);
              }}
              disabled={savingHandles}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void saveHandles();
              }}
              disabled={savingHandles}
              className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingHandles ? "Saving…" : "Save Handles"}
            </button>
          </div>
        </div>
      ) : show.handles.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {show.handles.map((handle) => (
            <HandleChip
              key={`${show.show_id}:${handle.platform}:${handle.handle}`}
              handle={handle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const RedditDashboardCard = ({
  summary,
}: {
  summary: RedditDashboardSummary;
}) => {
  const totalCommunities =
    summary.active_community_count + summary.archived_community_count;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={sectionEyebrowClass}>Reddit</p>
          <h2 className="text-lg font-semibold text-zinc-900">REDDIT DASHBOARD</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Open the dedicated Reddit control center to review saved communities
            across shows and jump into existing community workflows.
          </p>
        </div>
        <Link
          href={buildSocialPath("reddit")}
          className="inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Open Reddit Dashboard
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Total Communities
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {totalCommunities.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Active
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.active_community_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Archived
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.archived_community_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Shows Covered
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.show_count.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
};

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [landing, setLanding] = useState<SocialLandingPayload | null>(null);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sharedActionState, setSharedActionState] = useState<string | null>(null);
  const [addHandleTargetKey, setAddHandleTargetKey] = useState("");
  const [addHandlePlatform, setAddHandlePlatform] =
    useState<SocialLandingPlatform>("instagram");
  const [addHandleValue, setAddHandleValue] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const [addHandleMessage, setAddHandleMessage] = useState<string | null>(null);
  const [addHandleError, setAddHandleError] = useState<string | null>(null);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;

    let cancelled = false;
    const cachedPayload = readCachedLandingData();
    if (cachedPayload) {
      setLanding(cachedPayload);
      setLoadingLanding(false);
    }
    const load = async () => {
      setLoadingLanding(!cachedPayload);
      if (!cachedPayload) {
        setLoadError(null);
      }
      try {
        const payload = await loadLandingData(user);
        if (cancelled) return;
        setLanding(payload);
        writeCachedLandingData(payload);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        if (!cachedPayload) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load social landing data",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLanding(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  const runSharedIngest = async () => {
    if (!user) return;
    setSharedActionState("Running shared ingest…");
    try {
      const response = await fetchAdminWithAuth(
        "/api/admin/trr-api/social/shared/ingest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_scope: "bravo" }),
        },
        { allowDevAdminBypass: true, preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        run_id?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to start shared ingest");
      }

      setSharedActionState(
        data.message ||
          (data.run_id ? `Queued run ${data.run_id}` : "Shared ingest queued"),
      );

      const payload = await loadLandingData(user);
      setLanding(payload);
      writeCachedLandingData(payload);
    } catch (error) {
      setSharedActionState(
        error instanceof Error
          ? error.message
          : "Failed to start shared ingest",
      );
    }
  };

  const saveShowHandleOverrides = async (
    show: ShowProfileSet,
    draft: ShowHandleDraft,
  ) => {
    if (!user) return;
    const payload = Object.fromEntries(
      EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) => [
        SHOW_SOCIAL_HANDLE_FIELD_BY_PLATFORM[platform],
        draft[platform].trim(),
      ]),
    );

    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${encodeURIComponent(show.show_id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { allowDevAdminBypass: true, preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Failed to save show handle overrides");
    }

    const optimisticShow = applyShowHandleDraft(show, draft);
    setLanding((current) => {
      if (!current) return current;
      const nextPayload: SocialLandingPayload = {
        ...current,
        show_sets: current.show_sets.map((entry) =>
          entry.show_id === show.show_id ? optimisticShow : entry,
        ),
      };
      writeCachedLandingData(nextPayload);
      return nextPayload;
    });

    void loadLandingData(user)
      .then((payload) => {
        setLanding(payload);
        writeCachedLandingData(payload);
      })
      .catch(() => {
        // Keep the optimistic card state if the background refresh fails.
      });
  };

  const networkSets = landing?.network_sets ?? [];
  const showSets = landing?.show_sets ?? [];
  const peopleProfiles = landing?.people_profiles ?? [];
  const personTargets = landing?.person_targets ?? [];
  const castSocialBladeShows = landing?.cast_socialblade_shows ?? [];
  const addHandleTargetOptions = buildAddHandleTargetOptions(
    networkSets,
    showSets,
    personTargets,
  );

  useEffect(() => {
    if (addHandleTargetOptions.length === 0) {
      if (addHandleTargetKey) {
        setAddHandleTargetKey("");
      }
      return;
    }
    if (
      addHandleTargetKey &&
      addHandleTargetOptions.some((option) => option.key === addHandleTargetKey)
    ) {
      return;
    }
    setAddHandleTargetKey(addHandleTargetOptions[0]?.key ?? "");
  }, [addHandleTargetKey, addHandleTargetOptions]);

  const selectedAddHandleTarget =
    addHandleTargetOptions.find((option) => option.key === addHandleTargetKey) ?? null;

  const saveLandingHandle = async () => {
    if (!user) return;
    if (!selectedAddHandleTarget) {
      setAddHandleError("Select a network, show, or cast member.");
      return;
    }
    if (!addHandleValue.trim()) {
      setAddHandleError("Enter a username, handle, or URL.");
      return;
    }

    setSavingHandle(true);
    setAddHandleError(null);
    setAddHandleMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        "/api/admin/social/landing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_type: selectedAddHandleTarget.targetType,
            target_id: selectedAddHandleTarget.targetId,
            platform: addHandlePlatform,
            value: addHandleValue,
          }),
        },
        { allowDevAdminBypass: true, preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as
        | ({ error?: string } & Partial<SocialLandingPayload>)
        | undefined;
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save social handle");
      }

      const nextPayload = coerceLandingPayload(data);
      setLanding(nextPayload);
      writeCachedLandingData(nextPayload);
      setAddHandleValue("");
      setAddHandleMessage(
        `Saved ${formatPlatformLabel(addHandlePlatform)} for ${selectedAddHandleTarget.label}.`,
      );
    } catch (error) {
      setAddHandleError(
        error instanceof Error ? error.message : "Failed to save social handle",
      );
    } finally {
      setSavingHandle(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
            Access Required
          </p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in but do not have permission to view Social Analytics.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const redditDashboard = landing?.reddit_dashboard ?? {
    active_community_count: 0,
    archived_community_count: 0,
    show_count: 0,
  };

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs
                items={buildAdminSectionBreadcrumb("Social Analytics", ADMIN_SOCIAL_PATH)}
                className="mb-1"
              />
              <h1 className="text-3xl font-bold text-zinc-900">
                Social Analytics
              </h1>
              <p className="text-sm text-zinc-500">
                Review network profiles, dedicated show social sets, and cast
                handles already stored in TRR.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {loadingLanding ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-sm">
              Loading social landing data…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {loadError}
            </div>
          ) : (
            <div className="space-y-6">
              <RedditDashboardCard summary={redditDashboard} />

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className={sectionEyebrowClass}>Directory</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      ADD SOCIAL HANDLE
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm text-zinc-500">
                      Attach a saved social handle to a network, show, or cast member.
                      Submitting updates the matching container on this landing page.
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {addHandleTargetOptions.length} targets
                  </span>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveLandingHandle();
                  }}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_minmax(0,1fr)_auto] lg:items-end">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        NETWORK SHOW or CAST MEMBER
                      </span>
                      <select
                        value={addHandleTargetKey}
                        onChange={(event) => {
                          setAddHandleTargetKey(event.target.value);
                          setAddHandleError(null);
                          setAddHandleMessage(null);
                        }}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                      >
                        {addHandleTargetOptions.length === 0 ? (
                          <option value="">No targets available</option>
                        ) : null}
                        {(["NETWORKS", "SHOWS", "CAST MEMBERS"] as const).map((groupLabel) => {
                          const options = addHandleTargetOptions.filter(
                            (option) => option.groupLabel === groupLabel,
                          );
                          if (options.length === 0) return null;
                          return (
                            <optgroup key={groupLabel} label={groupLabel}>
                              {options.map((option) => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      {selectedAddHandleTarget?.helperText ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          {selectedAddHandleTarget.helperText}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        THE PLATFORM
                      </span>
                      <select
                        value={addHandlePlatform}
                        onChange={(event) => {
                          setAddHandlePlatform(event.target.value as SocialLandingPlatform);
                          setAddHandleError(null);
                          setAddHandleMessage(null);
                        }}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                      >
                        {EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) => (
                          <option key={platform} value={platform}>
                            {formatPlatformLabel(platform)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        USERNAME/HANDLE (or URL)
                      </span>
                      <input
                        type="text"
                        value={addHandleValue}
                        onChange={(event) => {
                          setAddHandleValue(event.target.value);
                          setAddHandleError(null);
                          setAddHandleMessage(null);
                        }}
                        placeholder="@andycohen or full profile URL"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={savingHandle || addHandleTargetOptions.length === 0}
                      className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingHandle ? "Submitting…" : "Submit"}
                    </button>
                  </div>

                  {addHandleError ? (
                    <p className="text-sm text-red-600">{addHandleError}</p>
                  ) : null}
                  {addHandleMessage ? (
                    <p className="text-sm text-zinc-500">{addHandleMessage}</p>
                  ) : null}
                </form>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>Networks</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      NETWORKS
                    </h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {networkSets.length} set
                    {networkSets.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-4">
                  {networkSets.map((network) => (
                    <div
                      key={network.key}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Profile Set
                          </p>
                          <h3 className="text-lg font-semibold text-zinc-900">
                            {network.title}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {network.description}
                          </p>
                        </div>
                        {network.key === "bravo-tv" ? (
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <button
                              type="button"
                              onClick={() => {
                                void runSharedIngest();
                              }}
                              className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                            >
                              Run Shared Ingest
                            </button>
                            {sharedActionState ? (
                              <p className="text-xs text-zinc-500">
                                {sharedActionState}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {network.handles.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {network.handles.map((handle) => (
                            <HandleChip
                              key={`${network.key}:${handle.platform}:${handle.handle}`}
                              handle={handle}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-zinc-500">
                          No linked profiles are configured for this set.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>Shows</p>
                    <h2 className="text-lg font-semibold text-zinc-900">SHOWS</h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {showSets.length} covered
                  </span>
                </div>

                {showSets.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No covered shows found. Add shows in the Shows admin page
                    first.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {showSets.map((show) => (
                      <ShowCard
                        key={show.show_id}
                        show={show}
                        onSaveHandleOverrides={saveShowHandleOverrides}
                      />
                    ))}
                  </div>
                )}
              </section>

              <CastSocialBladeSection shows={castSocialBladeShows} />

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>People</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      PEOPLE
                    </h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {peopleProfiles.length} profiles
                  </span>
                </div>

                {peopleProfiles.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No cast members with stored social handles were found for the
                    current covered-show set.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {peopleProfiles.map((person) => (
                      <div
                        key={person.person_id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-base font-semibold text-zinc-900">
                              {person.full_name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {person.shows.map((show) => (
                                <span
                                  key={`${person.person_id}:${show.show_id}`}
                                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                >
                                  {show.show_name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {person.handles.map((handle) => (
                              <HandleChip
                                key={`${person.person_id}:${handle.platform}:${handle.handle}`}
                                handle={handle}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
