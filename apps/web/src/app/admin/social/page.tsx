"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Route } from "next";
import Image from "next/image";
import type { User } from "firebase/auth";
import Link from "next/link";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import SocialPlatformTabIcon, {
  type SocialPlatformTabIconKey,
} from "@/components/admin/SocialPlatformTabIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CircularProgress,
  CircularProgressIndicator,
  CircularProgressRange,
  CircularProgressTrack,
  CircularProgressValueText,
} from "@/components/ui/circular-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_SOCIAL_PATH, buildSocialPath } from "@/lib/admin/admin-route-paths";
import { PALETTE } from "@/lib/design-system/tokens";
import type {
  CastSocialBladeAccountSummary,
  CastSocialBladeMemberSummary,
  CastSocialBladePlatform,
  CastSocialBladeShowSummary,
  NetworkProfileSet,
  PersonTargetSummary,
  SharedAccountSourceSummary,
  SocialAccountProgressLaneKey,
  SocialAccountProgressLaneSummary,
  SocialAccountProgressSummary,
  SharedAccountSourceSet,
  SharedAccountSourceSetScope,
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
const SOCIAL_LANDING_CACHE_KEY = "trr-admin-social-landing:v5";
const SOCIAL_SOURCE_SET_DEFINITIONS: Omit<SharedAccountSourceSet, "sources">[] = [
  {
    key: "bravo-tv",
    title: "Bravo TV",
    source_scope: "network",
    description: "Configured network-level shared social accounts.",
  },
  {
    key: "news",
    title: "News",
    source_scope: "news",
    description: "Outlet and publication accounts used for social news coverage.",
  },
  {
    key: "creators",
    title: "Creators",
    source_scope: "creator",
    description: "Independent creator and fan account sources.",
  },
];
const CAST_SOCIALBLADE_PLATFORM_ORDER: CastSocialBladePlatform[] = [
  "instagram",
  "tiktok",
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
type SharedSourceDraft = {
  platform: SocialLandingPlatform;
  handle: string;
  displayName: string;
};
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

const getPlatformIconKey = (
  platform: SocialLandingPlatform,
): SocialPlatformTabIconKey => platform === "twitter" ? "twitter" : platform;

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const getSharedSourceDisplayName = (source: SharedAccountSourceSummary): string =>
  getMetadataString(source.metadata, ["display_name", "name", "title"]) ||
  `@${source.account_handle}`;

const getSharedSourceAvatarUrl = (
  source: SharedAccountSourceSummary,
): string | null =>
  getMetadataString(source.metadata, [
    "avatar_url",
    "profile_pic_url",
    "profile_image_url",
    "hosted_profile_pic_url",
    "photo_url",
  ]);

const getInitials = (value: string): string => {
  const initials = value
    .split(/\s+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return initials || "?";
};

type SharedSourceGroup = {
  key: string;
  name: string;
  avatarUrl: string | null;
  sources: SharedAccountSourceSummary[];
};

const buildSharedSourceGroups = (
  sources: readonly SharedAccountSourceSummary[],
): SharedSourceGroup[] => {
  const groups = new Map<string, SharedSourceGroup>();
  for (const source of sources) {
    const name = getSharedSourceDisplayName(source).replace(/^@/, "");
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || source.account_handle;
    const existing = groups.get(key);
    if (existing) {
      existing.sources.push(source);
      existing.avatarUrl = existing.avatarUrl || getSharedSourceAvatarUrl(source);
      continue;
    }
    groups.set(key, {
      key,
      name,
      avatarUrl: getSharedSourceAvatarUrl(source),
      sources: [source],
    });
  }
  return Array.from(groups.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
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

const formatInventoryCount = (count: number, total: number): string =>
  `${count.toLocaleString()} / ${total.toLocaleString()}`;

const formatProgressPercent = (value: number): string =>
  `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;

const SOCIAL_PROGRESS_LANE_ORDER: SocialAccountProgressLaneKey[] = [
  "socialblade",
  "posts",
  "comments",
  "media",
];

const SOCIAL_PROGRESS_LANE_COLORS: Record<SocialAccountProgressLaneKey, string> = {
  socialblade: PALETTE.cobalt,
  posts: PALETTE.forest,
  comments: PALETTE.tangerine,
  media: PALETTE.orchid,
};

const SOCIAL_PROGRESS_LANE_LABELS: Record<SocialAccountProgressLaneKey, string> = {
  socialblade: "Social Blade + Following List",
  posts: "Posts",
  comments: "Comments",
  media: "Media",
};
const SOCIALBLADE_SOURCE_PLATFORMS = new Set<SocialLandingPlatform>([
  "instagram",
  "tiktok",
  "youtube",
]);

const buildEmptyShowHandleDraft = (): ShowHandleDraft => ({
  instagram: "",
  facebook: "",
  threads: "",
  twitter: "",
  tiktok: "",
  youtube: "",
});

const buildEmptySharedSourceDraft = (): SharedSourceDraft => ({
  platform: "instagram",
  handle: "",
  displayName: "",
});

const buildEmptySharedSourceSets = (): SharedAccountSourceSet[] =>
  SOCIAL_SOURCE_SET_DEFINITIONS.map((definition) => ({
    ...definition,
    sources: [],
  }));

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
  shared_source_sets: SOCIAL_SOURCE_SET_DEFINITIONS.map((definition) => {
    const sourceSet = Array.isArray(data?.shared_source_sets)
      ? data.shared_source_sets.find(
          (entry) => entry.source_scope === definition.source_scope,
        )
      : undefined;
    return {
      ...definition,
      sources: Array.isArray(sourceSet?.sources) ? sourceSet.sources : [],
    };
  }),
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

const iconActionClassName =
  "inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 [&_svg]:size-4";

const IconActionButton = ({
  label,
  children,
  onClick,
  type = "button",
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type={type}
        aria-label={label}
        onClick={onClick}
        className={iconActionClassName}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const IconActionLink = ({
  href,
  label,
  children,
}: {
  href: Route;
  label: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link href={href} aria-label={label} className={iconActionClassName}>
        {children}
      </Link>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
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
    <Image
      src={member.photo_url}
      alt={`${member.full_name} profile`}
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 rounded-full border border-zinc-200 bg-white object-cover"
    />
  );
};

const PeopleSocialBladeSection = ({
  shows,
}: {
  shows: readonly CastSocialBladeShowSummary[];
}) => {
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showQuery, setShowQuery] = useState("");

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
  const filteredShows = shows.filter((show) =>
    show.show_name.toLowerCase().includes(showQuery.trim().toLowerCase()),
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={sectionEyebrowClass}>People</p>
          <h2 className="text-lg font-semibold text-zinc-900">PEOPLE</h2>
        </div>
        {selectedShow ? (
          <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-white"
              >
                <span className="truncate">{selectedShow.show_name}</span>
                <ChevronsUpDown aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(420px,calc(100vw-2rem))] p-2">
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  value={showQuery}
                  onChange={(event) => setShowQuery(event.target.value)}
                  placeholder="Search shows"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </div>
              <div className="mt-2 max-h-72 overflow-auto">
                {filteredShows.length > 0 ? (
                  filteredShows.map((show) => {
                    const isSelected = selectedShow.show_id === show.show_id;
                    return (
                      <button
                        key={show.show_id}
                        type="button"
                        onClick={() => {
                          setSelectedShowId(show.show_id);
                          setSelectorOpen(false);
                          setShowQuery("");
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-zinc-100"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {show.show_name}
                          </span>
                          <span className="block text-xs text-zinc-500">
                            {show.cast_member_count.toLocaleString()} people
                          </span>
                        </span>
                        {isSelected ? <Check aria-hidden="true" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-sm text-zinc-500">
                    No shows match that search.
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {shows.length} show{shows.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {shows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          No people SocialBlade rows are available yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {selectedShow ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm text-zinc-500">
                  {selectedShow.members.length.toLocaleString()} people with
                  linked SocialBlade account data.
                </p>
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
                              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                <SocialPlatformTabIcon tab={getPlatformIconKey(platform)} />
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
  options: { refresh?: boolean } = {},
): Promise<{ payload: SocialLandingPayload; cacheable: boolean }> => {
  const url = options.refresh
    ? "/api/admin/social/landing?refresh=1"
    : "/api/admin/social/landing";
  const response = await fetchAdminWithAuth(url, undefined, {
    allowDevAdminBypass: true,
    preferredUser: currentUser,
  });
  const data = (await response.json().catch(() => ({}))) as
    | ({ error?: string } & Partial<SocialLandingPayload>)
    | undefined;
  if (!response.ok) {
    throw new Error(data?.error || "Failed to load social landing data");
  }
  return {
    payload: coerceLandingPayload(data),
    cacheable: response.headers.get("x-trr-cacheable") !== "0",
  };
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
      <SocialPlatformTabIcon tab={getPlatformIconKey(handle.platform)} />
      <span className="sr-only">{formatPlatformLabel(handle.platform)}</span>
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

const buildFallbackProgressLanes = (
  progress: SocialAccountProgressSummary,
): SocialAccountProgressLaneSummary[] => [
  {
    key: "socialblade",
    label: "Social Blade + Following List",
    saved_count: 0,
    scraped_count: 0,
    total_count: 0,
    saved_percent: 0,
    scraped_percent: 0,
    status: "missing",
    detail: "No scrape",
  },
  {
    key: "posts",
    label: "Posts",
    saved_count: progress.saved_count,
    scraped_count: progress.scraped_count,
    total_count: progress.total_count,
    saved_percent: progress.saved_percent,
    scraped_percent: progress.scraped_percent,
    status: null,
    detail: null,
  },
  {
    key: "comments",
    label: "Comments",
    saved_count: 0,
    scraped_count: 0,
    total_count: 0,
    saved_percent: 0,
    scraped_percent: 0,
    status: "missing",
    detail: "No snapshot",
  },
  {
    key: "media",
    label: "Media",
    saved_count: 0,
    scraped_count: 0,
    total_count: 0,
    saved_percent: 0,
    scraped_percent: 0,
    status: "missing",
    detail: "No snapshot",
  },
];

const getOrderedProgressLanes = (
  progress: SocialAccountProgressSummary,
): SocialAccountProgressLaneSummary[] => {
  const source = progress.lanes?.length ? progress.lanes : buildFallbackProgressLanes(progress);
  const byKey = new Map(source.map((lane) => [lane.key, lane]));
  return SOCIAL_PROGRESS_LANE_ORDER.map((key) => {
    const lane = byKey.get(key);
    return lane
      ? { ...lane, label: lane.label || SOCIAL_PROGRESS_LANE_LABELS[key] }
      : {
          key,
          label: SOCIAL_PROGRESS_LANE_LABELS[key],
          saved_count: 0,
          scraped_count: 0,
          total_count: 0,
          saved_percent: 0,
          scraped_percent: 0,
          status: "missing",
          detail: "No snapshot",
        };
  });
};

const getLaneProgressPercent = (lane: SocialAccountProgressLaneSummary): number => {
  if (lane.status === "unsupported") return 0;
  if (Number.isFinite(lane.saved_percent)) return Math.max(0, Math.min(100, lane.saved_percent));
  if (lane.total_count > 0) return Math.max(0, Math.min(100, (lane.saved_count / lane.total_count) * 100));
  return 0;
};

const getLaneOverallSharePercent = (
  lane: SocialAccountProgressLaneSummary,
  laneCount: number,
): number => (laneCount > 0 ? getLaneProgressPercent(lane) / laneCount : 0);

const getOverallProgressPercent = (
  lanes: readonly SocialAccountProgressLaneSummary[],
): number =>
  lanes.reduce(
    (total, lane) => total + getLaneOverallSharePercent(lane, lanes.length),
    0,
  );

const formatLaneCount = (lane: SocialAccountProgressLaneSummary): string => {
  if (lane.status === "unsupported") return "N/A";
  if (lane.key === "socialblade") {
    if (lane.total_count > 1) return formatInventoryCount(lane.saved_count, lane.total_count);
    if (lane.scraped_count > 0) return lane.saved_count > 0 ? "Refreshed" : "Scraped";
    return lane.detail ?? "No scrape";
  }
  if (lane.total_count <= 0) return lane.detail ?? "No snapshot";
  return formatInventoryCount(lane.saved_count, lane.total_count);
};

const getLaneDisplayLabel = (
  lane: SocialAccountProgressLaneSummary,
  platform?: SocialLandingPlatform,
): string => {
  if (lane.key !== "socialblade") return SOCIAL_PROGRESS_LANE_LABELS[lane.key] ?? lane.label;
  return platform && !SOCIALBLADE_SOURCE_PLATFORMS.has(platform)
    ? "Following List"
    : "Social Blade + Following List";
};

const ProgressLaneTooltip = ({
  lane,
  platform,
  subject,
}: {
  lane: SocialAccountProgressLaneSummary;
  platform?: SocialLandingPlatform;
  subject: string;
}) => {
  const percent = getLaneProgressPercent(lane);
  const percentLabel =
    lane.status === "unsupported" ? "N/A" : formatProgressPercent(percent);
  return (
    <div className="grid gap-1 text-left">
      <p className="font-semibold">{getLaneDisplayLabel(lane, platform)}</p>
      <p>{subject}</p>
      <p>Progress: {percentLabel}</p>
      {lane.status === "unsupported" ? (
        <p>Not available for this platform.</p>
      ) : (
        <>
          <p>
            Saved: {lane.saved_count.toLocaleString()} /{" "}
            {lane.total_count.toLocaleString()}
          </p>
          <p>
            Scraped: {lane.scraped_count.toLocaleString()} /{" "}
            {lane.total_count.toLocaleString()}
          </p>
        </>
      )}
      {lane.detail ? <p>{lane.detail}</p> : null}
    </div>
  );
};

const SocialSegmentedProgress = ({
  lanes,
  subject,
  platform,
}: {
  lanes: SocialAccountProgressLaneSummary[];
  subject: string;
  platform?: SocialLandingPlatform;
}) => {
  const overallPercent = getOverallProgressPercent(lanes);
  return (
    <div className="grid gap-3">
      <div
        className="relative h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-label={`Overall collection progress for ${subject}: ${formatProgressPercent(overallPercent)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number(overallPercent.toFixed(1))}
      >
        <div className="flex h-full">
          {lanes.map((lane) => {
            const color = SOCIAL_PROGRESS_LANE_COLORS[lane.key];
            return (
              <div
                key={`${lane.key}:fill`}
                className="h-full shrink-0 transition-all duration-500"
                style={{
                  width: `${getLaneOverallSharePercent(lane, lanes.length)}%`,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(lanes.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {lanes.map((lane) => {
            const label = getLaneDisplayLabel(lane, platform);
            return (
              <Tooltip key={`${lane.key}:hit-area`}>
                <TooltipTrigger asChild>
                  <div
                    className="min-w-0"
                    aria-label={`${label}: ${formatLaneCount(lane)}`}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs items-start text-left">
                  <ProgressLaneTooltip lane={lane} platform={platform} subject={subject} />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {lanes.map((lane) => {
          const color = SOCIAL_PROGRESS_LANE_COLORS[lane.key];
          const percent = getLaneProgressPercent(lane);
          const percentLabel = lane.status === "unsupported" ? "N/A" : formatProgressPercent(percent);
          const label = getLaneDisplayLabel(lane, platform);
          return (
            <Tooltip key={lane.key}>
              <TooltipTrigger asChild>
                <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2">
                  <div className="flex items-center gap-2">
                    <CircularProgress
                      value={lane.status === "unsupported" ? 0 : percent}
                      size={42}
                      thickness={4}
                      aria-label={`${label} progress for ${subject}: ${formatLaneCount(lane)}`}
                      className="shrink-0"
                    >
                      <CircularProgressIndicator>
                        <CircularProgressTrack style={{ color: `${color}24` }} />
                        <CircularProgressRange style={{ color }} />
                      </CircularProgressIndicator>
                      <CircularProgressValueText className="text-[10px] font-bold" style={{ color }}>
                        {percentLabel}
                      </CircularProgressValueText>
                    </CircularProgress>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
                      <p className="truncate text-xs font-semibold text-zinc-800">{formatLaneCount(lane)}</p>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs items-start text-left">
                <ProgressLaneTooltip lane={lane} platform={platform} subject={subject} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

const SocialProgressSummary = ({
  progress,
  subject,
  platform,
}: {
  progress: SocialAccountProgressSummary | null | undefined;
  subject: string;
  platform?: SocialLandingPlatform;
}) => {
  if (!progress) {
    return (
      <p className="text-xs text-zinc-500">
        No saved/scraped snapshot yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <SocialSegmentedProgress
        lanes={getOrderedProgressLanes(progress)}
        platform={platform}
        subject={subject}
      />
      {progress.last_catalog_run_at || progress.last_catalog_run_status ? (
        <p className="text-xs text-zinc-500">
          Catalog
          {progress.last_catalog_run_status
            ? ` ${progress.last_catalog_run_status}`
            : ""}
          {formatCompactTimestamp(progress.last_catalog_run_at)
            ? ` · ${formatCompactTimestamp(progress.last_catalog_run_at)}`
            : ""}
        </p>
      ) : null}
    </div>
  );
};

const HandleInventoryCard = ({
  handle,
}: {
  handle: SocialHandleSummary;
}) => (
  <div className="grid min-w-0 gap-3 rounded-xl border border-zinc-200 bg-white p-3">
    <HandleChip handle={handle} />
    <SocialProgressSummary
      progress={handle.progress}
      platform={handle.platform}
      subject={`${formatPlatformLabel(handle.platform)} ${handle.display_label}`}
    />
  </div>
);

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
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <IconActionButton
            label={
              editingHandles
                ? `Close handle editor for ${show.show_name}`
                : `Edit handles for ${show.show_name}`
            }
            onClick={() => {
              setEditingHandles((current) => !current);
              setHandleSaveError(null);
              setHandleSaveMessage(null);
              setHandleDraft(buildShowHandleDraft(show));
            }}
          >
            <Pencil aria-hidden="true" />
          </IconActionButton>
          <IconActionLink href={socialHref} label={`Open analytics for ${show.show_name}`}>
            <BarChart3 aria-hidden="true" />
          </IconActionLink>
        </div>
      </div>

      {handleSaveError ? (
        <p className="mt-3 text-sm text-red-600">{handleSaveError}</p>
      ) : null}
      {handleSaveMessage ? (
        <p className="mt-3 text-sm text-zinc-500">{handleSaveMessage}</p>
      ) : null}

      {!editingHandles && show.hashtag_suggestions?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {show.hashtag_suggestions.map((suggestion) => (
            <span
              key={`${show.show_id}:${suggestion.platform}:${suggestion.account_handle}:${suggestion.hashtag}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700"
            >
              <SocialPlatformTabIcon tab={getPlatformIconKey(suggestion.platform)} />
              <span>{suggestion.hashtag}</span>
              <span className="text-zinc-500">on @{suggestion.account_handle}</span>
            </span>
          ))}
        </div>
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
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {show.handles.map((handle) => (
            <HandleInventoryCard
              key={`${show.show_id}:${handle.platform}:${handle.handle}`}
              handle={handle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const AddSocialHandleDialog = ({
  open,
  onOpenChange,
  targetOptions,
  selectedTargetKey,
  onTargetChange,
  selectedTarget,
  platform,
  onPlatformChange,
  value,
  onValueChange,
  saving,
  error,
  message,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetOptions: readonly AddHandleTargetOption[];
  selectedTargetKey: string;
  onTargetChange: (key: string) => void;
  selectedTarget: AddHandleTargetOption | null;
  platform: SocialLandingPlatform;
  onPlatformChange: (platform: SocialLandingPlatform) => void;
  value: string;
  onValueChange: (value: string) => void;
  saving: boolean;
  error: string | null;
  message: string | null;
  onSubmit: () => Promise<boolean>;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <button
        type="button"
        aria-label="Add social handle"
        className={iconActionClassName}
      >
        <Plus aria-hidden="true" />
      </button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Social Handle</DialogTitle>
        <DialogDescription>
          Attach a saved social handle to a network, show, or cast member.
        </DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit().then((saved) => {
            if (saved) onOpenChange(false);
          });
        }}
      >
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Network, show, or cast member
          </span>
          <select
            value={selectedTargetKey}
            onChange={(event) => onTargetChange(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {targetOptions.length === 0 ? (
              <option value="">No targets available</option>
            ) : null}
            {(["NETWORKS", "SHOWS", "CAST MEMBERS"] as const).map((groupLabel) => {
              const options = targetOptions.filter(
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
          {selectedTarget?.helperText ? (
            <p className="mt-2 text-xs text-zinc-500">{selectedTarget.helperText}</p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Platform
          </span>
          <select
            value={platform}
            onChange={(event) =>
              onPlatformChange(event.target.value as SocialLandingPlatform)
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            {EDITABLE_SHOW_SOCIAL_PLATFORMS.map((item) => (
              <option key={item} value={item}>
                {formatPlatformLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Username, handle, or URL
          </span>
          <input
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="@andycohen or full profile URL"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-zinc-500">{message}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || targetOptions.length === 0}
          >
            {saving ? "Saving..." : "Save Handle"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

const AddSharedSourceDialog = ({
  sourceSet,
  onSaveSource,
}: {
  sourceSet: SharedAccountSourceSet;
  onSaveSource: (
    sourceScope: SharedAccountSourceSetScope,
    draft: SharedSourceDraft,
  ) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SharedSourceDraft>(() =>
    buildEmptySharedSourceDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveSource = async (): Promise<boolean> => {
    if (!draft.handle.trim()) {
      setError("Enter a username, handle, or URL.");
      return false;
    }
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await onSaveSource(sourceSet.source_scope, draft);
      setDraft(buildEmptySharedSourceDraft());
      setMessage(`Saved ${formatPlatformLabel(draft.platform)} source.`);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save shared source",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Add ${sourceSet.title} source`}
          className={iconActionClassName}
        >
          <Pencil aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {sourceSet.title} Source</DialogTitle>
          <DialogDescription>
            Add a profile source without expanding the landing page layout.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSource().then((saved) => {
              if (saved) setOpen(false);
            });
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Platform
            </span>
            <select
              value={draft.platform}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  platform: event.target.value as SocialLandingPlatform,
                }));
                setError(null);
                setMessage(null);
              }}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {EDITABLE_SHOW_SOCIAL_PLATFORMS.map((item) => (
                <option key={`${sourceSet.source_scope}:${item}`} value={item}>
                  {formatPlatformLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Handle or URL
            </span>
            <input
              type="text"
              value={draft.handle}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  handle: event.target.value,
                }));
                setError(null);
                setMessage(null);
              }}
              placeholder="@accountname or full profile URL"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Display name
            </span>
            <input
              type="text"
              value={draft.displayName}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  displayName: event.target.value,
                }));
                setError(null);
                setMessage(null);
              }}
              placeholder="Optional"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-zinc-500">{message}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SharedSourceSection = ({
  sourceSet,
  onSaveSource,
}: {
  sourceSet: SharedAccountSourceSet;
  onSaveSource: (
    sourceScope: SharedAccountSourceSetScope,
    draft: SharedSourceDraft,
  ) => Promise<void>;
}) => (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={sectionEyebrowClass}>{sourceSet.title}</p>
          <h2 className="text-lg font-semibold uppercase text-zinc-900">
            {sourceSet.source_scope === "creator"
              ? "CREATORS"
              : sourceSet.source_scope === "news"
                ? "NEWS"
                : sourceSet.title}
          </h2>
          {sourceSet.description ? (
            <p className="mt-1 max-w-3xl text-sm text-zinc-500">
              {sourceSet.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
            {sourceSet.sources.length} source
            {sourceSet.sources.length === 1 ? "" : "s"}
          </span>
          <AddSharedSourceDialog
            sourceSet={sourceSet}
            onSaveSource={onSaveSource}
          />
        </div>
      </div>

      <div className="grid gap-3">
          {sourceSet.sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
              No {sourceSet.title.toLowerCase()} social sources have been added yet.
            </div>
          ) : (
            sourceSet.sources.map((source) => {
              const displayName =
                typeof source.metadata?.display_name === "string" &&
                source.metadata.display_name.trim()
                  ? source.metadata.display_name.trim()
                  : `@${source.account_handle}`;
              return (
                <div
                  key={`${sourceSet.source_scope}:${source.platform}:${source.account_handle}`}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <SocialPlatformTabIcon tab={getPlatformIconKey(source.platform)} />
                      <div className="min-w-0">
                      <p className="font-semibold text-zinc-900">{displayName}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        @{source.account_handle}
                      </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                        Priority {source.scrape_priority}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          source.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-white text-zinc-500"
                        }`}
                      >
                        {source.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
                    <SocialProgressSummary
                      progress={source.progress}
                      platform={source.platform}
                      subject={`${formatPlatformLabel(source.platform)} @${source.account_handle}`}
                    />
                  </div>
                </div>
              );
            })
          )}
      </div>
    </section>
);

const NetworkSourceGroupCard = ({
  group,
  networkKey,
}: {
  group: SharedSourceGroup;
  networkKey: string;
}) => {
  const [expanded, setExpanded] = useState(true);
  const contentId = `network-source-group-${networkKey}-${group.key}`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-11 border border-zinc-200">
            {group.avatarUrl ? (
              <AvatarImage src={group.avatarUrl} alt={`${group.name} profile`} />
            ) : null}
            <AvatarFallback>{getInitials(group.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-zinc-900">{group.name}</p>
            <p className="text-xs text-zinc-500">
              {group.sources.length.toLocaleString()} profile
              {group.sources.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${group.name} profile set`}
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 [&_svg]:size-4"
        >
          <ChevronDown
            aria-hidden="true"
            className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
      </div>
      {expanded ? (
        <div id={contentId} className="mt-4 grid gap-3">
          {group.sources.map((source) => (
            <div
              key={`${group.key}:${source.platform}:${source.account_handle}`}
              className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800">
                <SocialPlatformTabIcon tab={getPlatformIconKey(source.platform)} />
                @{source.account_handle}
              </span>
              <SocialProgressSummary
                progress={source.progress}
                platform={source.platform}
                subject={`${formatPlatformLabel(source.platform)} @${source.account_handle}`}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [landing, setLanding] = useState<SocialLandingPayload | null>(null);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addHandleDialogOpen, setAddHandleDialogOpen] = useState(false);
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
        const { payload, cacheable } = await loadLandingData(user);
        if (cancelled) return;
        setLanding(payload);
        if (cacheable) {
          writeCachedLandingData(payload);
        }
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
      .then(({ payload, cacheable }) => {
        setLanding(payload);
        if (cacheable) {
          writeCachedLandingData(payload);
        }
      })
      .catch(() => {
        // Keep the optimistic card state if the background refresh fails.
    });
  };

  const saveSharedSource = async (
    sourceScope: SharedAccountSourceSetScope,
    draft: SharedSourceDraft,
  ) => {
    if (!user) return;
    const response = await fetchAdminWithAuth(
      "/api/admin/social/landing",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: "shared_source",
          target_id: sourceScope,
          source_scope: sourceScope,
          platform: draft.platform,
          value: draft.handle,
          display_name: draft.displayName,
        }),
      },
      { allowDevAdminBypass: true, preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as
      | ({ error?: string } & Partial<SocialLandingPayload>)
      | undefined;
    if (!response.ok) {
      throw new Error(data?.error || "Failed to save shared source");
    }

    const nextPayload = coerceLandingPayload(data);
    const cacheable = response.headers.get("x-trr-cacheable") !== "0";
    setLanding(nextPayload);
    if (cacheable) {
      writeCachedLandingData(nextPayload);
    }
  };

  const networkSets = landing?.network_sets ?? [];
  const showSets = landing?.show_sets ?? [];
  const personTargets = landing?.person_targets ?? [];
  const castSocialBladeShows = landing?.cast_socialblade_shows ?? [];
  const sharedSourceSets = landing?.shared_source_sets ?? buildEmptySharedSourceSets();
  const networkSourceSet =
    sharedSourceSets.find((sourceSet) => sourceSet.source_scope === "network") ?? {
      key: "bravo-tv",
      title: "Bravo TV",
      source_scope: "network",
      description: "Configured network-level shared social accounts.",
      sources: [],
    };
  const networkSourceGroups = buildSharedSourceGroups(networkSourceSet.sources);
  const newsSourceSet =
    sharedSourceSets.find((sourceSet) => sourceSet.source_scope === "news") ?? {
      key: "news",
      title: "News",
      source_scope: "news",
      description: "Outlet and publication accounts used for social news coverage.",
      sources: [],
    };
  const creatorSourceSet =
    sharedSourceSets.find((sourceSet) => sourceSet.source_scope === "creator") ?? {
      key: "creators",
      title: "Creators",
      source_scope: "creator",
      description: "Independent creator and fan account sources.",
      sources: [],
    };
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

  const openAddHandleDialogForTarget = (targetKey?: string) => {
    if (targetKey && addHandleTargetOptions.some((option) => option.key === targetKey)) {
      setAddHandleTargetKey(targetKey);
    }
    setAddHandleError(null);
    setAddHandleMessage(null);
    setAddHandleDialogOpen(true);
  };

  const saveLandingHandle = async (): Promise<boolean> => {
    if (!user) return false;
    if (!selectedAddHandleTarget) {
      setAddHandleError("Select a network, show, or cast member.");
      return false;
    }
    if (!addHandleValue.trim()) {
      setAddHandleError("Enter a username, handle, or URL.");
      return false;
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
      const cacheable = response.headers.get("x-trr-cacheable") !== "0";
      setLanding(nextPayload);
      if (cacheable) {
        writeCachedLandingData(nextPayload);
      }
      setAddHandleValue("");
      setAddHandleMessage(
        `Saved ${formatPlatformLabel(addHandlePlatform)} for ${selectedAddHandleTarget.label}.`,
      );
      return true;
    } catch (error) {
      setAddHandleError(
        error instanceof Error ? error.message : "Failed to save social handle",
      );
      return false;
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

  return (
    <ClientOnly>
      <TooltipProvider>
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
            <div className="flex items-start gap-2 sm:items-end">
              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  className="inline-flex justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Back to Admin
                </Link>
                <Link
                  href={buildSocialPath("reddit")}
                  className="inline-flex justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Reddit Dashboard
                </Link>
              </div>
              <AddSocialHandleDialog
                open={addHandleDialogOpen}
                onOpenChange={setAddHandleDialogOpen}
                targetOptions={addHandleTargetOptions}
                selectedTargetKey={addHandleTargetKey}
                onTargetChange={(key) => {
                  setAddHandleTargetKey(key);
                  setAddHandleError(null);
                  setAddHandleMessage(null);
                }}
                selectedTarget={selectedAddHandleTarget}
                platform={addHandlePlatform}
                onPlatformChange={(nextPlatform) => {
                  setAddHandlePlatform(nextPlatform);
                  setAddHandleError(null);
                  setAddHandleMessage(null);
                }}
                value={addHandleValue}
                onValueChange={(nextValue) => {
                  setAddHandleValue(nextValue);
                  setAddHandleError(null);
                  setAddHandleMessage(null);
                }}
                saving={savingHandle}
                error={addHandleError}
                message={addHandleMessage}
                onSubmit={saveLandingHandle}
              />
            </div>
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
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>Networks</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      NETWORKS
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {networkSets.length} set
                      {networkSets.length === 1 ? "" : "s"}
                    </span>
                    <IconActionButton
                      label="Edit network handles"
                      onClick={() =>
                        openAddHandleDialogForTarget(
                          networkSets[0]?.key ? `network:${networkSets[0].key}` : undefined,
                        )
                      }
                    >
                      <Pencil aria-hidden="true" />
                    </IconActionButton>
                  </div>
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
                        </div>
                      </div>

                      {networkSourceGroups.length > 0 ? (
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          {networkSourceGroups.map((group) => (
                            <NetworkSourceGroupCard
                              key={`${network.key}:${group.key}`}
                              group={group}
                              networkKey={network.key}
                            />
                          ))}
                        </div>
                      ) : network.handles.length > 0 ? (
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          {network.handles.map((handle) => (
                            <HandleInventoryCard
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
                  <div className="grid gap-3">
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

              <PeopleSocialBladeSection shows={castSocialBladeShows} />

              <SharedSourceSection
                sourceSet={newsSourceSet}
                onSaveSource={saveSharedSource}
              />

              <SharedSourceSection
                sourceSet={creatorSourceSet}
                onSaveSource={saveSharedSource}
              />
            </div>
          )}
        </main>
      </div>
      </TooltipProvider>
    </ClientOnly>
  );
}
