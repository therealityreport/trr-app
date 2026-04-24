import "server-only";

import {
  buildPersonExternalIdUrl,
  normalizePersonExternalIdValue,
  type PersonExternalIdRecord,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";
import { SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS } from "@/lib/admin/social-account-profile";
import {
  buildSocialAccountProfileUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";
import type {
  CastSocialBladeAccountSummary,
  CastSocialBladeMemberSummary,
  CastSocialBladePlatform,
  CastSocialBladeShowSummary,
  NetworkProfileSet,
  PersonProfileShowSummary,
  PersonProfileSummary,
  PersonTargetSummary,
  RedditDashboardSummary,
  SharedAccountSourceSummary,
  SharedPipelineSummary,
  SharedReviewItemSummary,
  SharedRunSummary,
  ShowProfileSet,
  SocialHandleSummary,
  SocialLandingPayload,
  SocialLandingPlatform,
} from "@/lib/admin/social-landing";
import { listRedditCommunities } from "@/lib/server/admin/reddit-sources-repository";
import {
  getCoveredShows,
  type CoveredShow,
} from "@/lib/server/admin/covered-shows-repository";
import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import { fetchSocialBackendJson } from "@/lib/server/trr-api/social-admin-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";
import {
  listPrimaryPersonExternalIdsByPersonIds,
  listEffectivePersonSocialHandlesByPersonIds,
  listShowExternalIdsByIds,
  type PersonEffectiveSocialHandles,
} from "@/lib/server/trr-api/trr-shows-repository";
import { query } from "@/lib/server/postgres";

type SharedSourcesPayload = {
  sources?: SharedAccountSourceSummary[];
};

type SharedReviewPayload = {
  items?: SharedReviewItemSummary[];
};

type CastSummaryMember = {
  person_id?: string | null;
  full_name?: string | null;
  photo_url?: string | null;
};

type CastSummaryShow = {
  show_id?: string | null;
  cast_members?: CastSummaryMember[];
};

type CastSummaryBatchPayload = {
  shows?: CastSummaryShow[];
};

type SupportedPersonSocialSource = Extract<
  PersonExternalIdSource,
  "facebook" | "instagram" | "threads" | "twitter" | "tiktok" | "youtube"
>;

type SocialBladeSummaryRow = Record<string, unknown> & {
  id: string | null;
  person_id: string | null;
  platform: string | null;
  account_handle: string | null;
  scraped_at: string | Date | null;
  updated_at: string | Date | null;
  created_at: string | Date | null;
  stats_refreshed: boolean | null;
  socialblade_url: string | null;
};

const PERSON_SOCIAL_SOURCES: readonly SupportedPersonSocialSource[] = [
  "facebook",
  "instagram",
  "threads",
  "twitter",
  "tiktok",
  "youtube",
] as const;

const CAST_SOCIALBLADE_PLATFORMS =
  SOCIAL_ACCOUNT_SOCIALBLADE_ENABLED_PLATFORMS.filter(
    (platform): platform is CastSocialBladePlatform =>
      platform === "instagram" ||
      platform === "youtube" ||
      platform === "facebook",
  );

const SHOW_EXTERNAL_ID_KEYS: Record<
  SupportedPersonSocialSource,
  readonly string[]
> = {
  facebook: ["facebook_handle", "facebook", "facebook_id"],
  instagram: ["instagram_handle", "instagram", "instagram_id"],
  threads: ["threads_handle", "threads", "threads_id"],
  twitter: ["twitter_handle", "twitter", "x_handle", "twitter_id", "x_id"],
  tiktok: ["tiktok_handle", "tiktok", "tiktok_id"],
  youtube: ["youtube_handle", "youtube", "youtube_id"],
};

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const normalizePlatform = (
  value: string | null | undefined,
): SocialLandingPlatform | null => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "instagram" ||
    normalized === "tiktok" ||
    normalized === "twitter" ||
    normalized === "youtube" ||
    normalized === "facebook" ||
    normalized === "threads"
  ) {
    return normalized;
  }
  return null;
};

const formatHandleLabel = (
  platform: SocialLandingPlatform,
  value: string,
): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (platform === "youtube") return trimmed;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
};

const toCanonicalInternalHandle = (
  platform: SocialLandingPlatform,
  value: string,
): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (platform === "youtube") {
    const normalizedYoutube = normalizePersonExternalIdValue("youtube", trimmed);
    if (!normalizedYoutube) return null;
    if (
      normalizedYoutube.startsWith("channel/") ||
      normalizedYoutube.startsWith("user/") ||
      normalizedYoutube.startsWith("c/")
    ) {
      return null;
    }
    return normalizeSocialAccountProfileHandle(normalizedYoutube);
  }

  if (
    platform === "facebook" ||
    platform === "instagram" ||
    platform === "twitter" ||
    platform === "tiktok"
  ) {
    return normalizeSocialAccountProfileHandle(
      normalizePersonExternalIdValue(platform, trimmed),
    );
  }

  return normalizeSocialAccountProfileHandle(trimmed);
};

const buildInternalHandleSummary = (
  platform: SocialLandingPlatform,
  value: string,
): SocialHandleSummary | null => {
  const canonicalHandle = toCanonicalInternalHandle(platform, value);
  if (!canonicalHandle) return null;
  return {
    platform,
    handle: canonicalHandle,
    display_label: formatHandleLabel(platform, canonicalHandle),
    href: buildSocialAccountProfileUrl({ platform, handle: canonicalHandle }),
    external: false,
  };
};

const buildPersonHandleSummary = (
  record: PersonExternalIdRecord,
): SocialHandleSummary | null => {
  if (!PERSON_SOCIAL_SOURCES.includes(record.source_id as SupportedPersonSocialSource)) {
    return null;
  }

  const platform = record.source_id as SupportedPersonSocialSource;
  const normalizedValue = normalizePersonExternalIdValue(platform, record.external_id);
  if (!normalizedValue) return null;

  const canonicalHandle =
    normalizeSocialAccountProfileHandle(normalizedValue) ??
    normalizedValue.replace(/^@+/, "");
  if (!canonicalHandle) return null;

  const displayValue =
    platform === "youtube" && normalizedValue.startsWith("@")
      ? `@${canonicalHandle}`
      : canonicalHandle;

  return {
    platform,
    handle: canonicalHandle,
    display_label: formatHandleLabel(platform, displayValue),
    href: buildPersonExternalIdUrl(platform, record.external_id),
    external: true,
  };
};

const buildPersonHandleSummaryFromSource = (
  source: SupportedPersonSocialSource,
  value: string | null | undefined,
): SocialHandleSummary | null => {
  if (typeof value !== "string") return null;
  const normalizedValue = normalizePersonExternalIdValue(source, value);
  if (!normalizedValue) return null;

  const canonicalHandle =
    normalizeSocialAccountProfileHandle(normalizedValue) ??
    normalizedValue.replace(/^@+/, "");
  if (!canonicalHandle) return null;

  const displayValue =
    source === "youtube" && normalizedValue.startsWith("@")
      ? `@${canonicalHandle}`
      : canonicalHandle;

  return {
    platform: source,
    handle: canonicalHandle,
    display_label: formatHandleLabel(source, displayValue),
    href: buildPersonExternalIdUrl(source, value),
    external: true,
  };
};

const buildFallbackPersonHandleSummaries = (
  handles: PersonEffectiveSocialHandles | null | undefined,
): SocialHandleSummary[] => {
  if (!handles) return [];
  return PERSON_SOCIAL_SOURCES.map((source) => {
    switch (source) {
      case "facebook":
        return buildPersonHandleSummaryFromSource(source, handles.facebook_handle);
      case "instagram":
        return buildPersonHandleSummaryFromSource(source, handles.instagram_handle);
      case "threads":
        return null;
      case "twitter":
        return buildPersonHandleSummaryFromSource(source, handles.twitter_handle);
      case "tiktok":
        return buildPersonHandleSummaryFromSource(source, handles.tiktok_handle);
      case "youtube":
        return buildPersonHandleSummaryFromSource(source, handles.youtube_handle);
      default:
        return null;
    }
  }).filter((handle): handle is SocialHandleSummary => handle !== null);
};

const dedupeHandles = (
  handles: readonly SocialHandleSummary[],
): SocialHandleSummary[] => {
  const seen = new Set<string>();
  return handles
    .filter((handle) => {
      const key = `${handle.platform}:${handle.handle}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      if (left.platform !== right.platform) {
        return left.platform.localeCompare(right.platform);
      }
      return left.handle.localeCompare(right.handle);
    });
};

const safeLoadSharedSources = async (
  adminContext?: VerifiedAdminContext,
): Promise<SharedAccountSourceSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/sources", {
      adminContext,
      queryString: "source_scope=bravo&include_inactive=true",
      fallbackError: "Failed to fetch shared social account sources",
      retries: 0,
      timeoutMs: 30_000,
    });
    return Array.isArray((payload as SharedSourcesPayload).sources)
      ? ((payload as SharedSourcesPayload).sources ?? [])
          .map((source) => {
            const platform = normalizePlatform(source.platform);
            if (!platform || typeof source.account_handle !== "string") return null;
            return {
              ...source,
              platform,
              account_handle:
                toCanonicalInternalHandle(platform, source.account_handle) ??
                source.account_handle.trim().replace(/^@+/, ""),
            } satisfies SharedAccountSourceSummary;
          })
          .filter(
            (source): source is SharedAccountSourceSummary => source !== null,
          )
      : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load shared sources", error);
    return [];
  }
};

const safeLoadSharedRuns = async (
  adminContext?: VerifiedAdminContext,
): Promise<SharedRunSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/ingest/runs", {
      adminContext,
      queryString: "source_scope=bravo&limit=5",
      fallbackError: "Failed to fetch shared social ingest runs",
      retries: 0,
      timeoutMs: 30_000,
    });
    return Array.isArray(payload)
      ? payload.filter(
          (run): run is SharedRunSummary =>
            Boolean(run) &&
            typeof run === "object" &&
            typeof (run as SharedRunSummary).id === "string" &&
            typeof (run as SharedRunSummary).status === "string",
        )
      : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load shared runs", error);
    return [];
  }
};

const safeLoadSharedReviewItems = async (
  adminContext?: VerifiedAdminContext,
): Promise<SharedReviewItemSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/review-queue", {
      adminContext,
      queryString: "source_scope=bravo&review_status=open&limit=10",
      fallbackError: "Failed to fetch shared social review queue",
      retries: 0,
      timeoutMs: 30_000,
    });
    return Array.isArray((payload as SharedReviewPayload).items)
      ? ((payload as SharedReviewPayload).items ?? []).filter(
          (item): item is SharedReviewItemSummary =>
            normalizePlatform(item.platform) !== null &&
            typeof item.id === "string" &&
            typeof item.source_id === "string",
        )
      : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load shared review items", error);
    return [];
  }
};

const safeLoadRedditDashboardSummary = async (): Promise<RedditDashboardSummary> => {
  try {
    const communities = await listRedditCommunities({ includeInactive: true });
    const showIds = new Set(
      communities
        .map((community) => community.trr_show_id?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    const activeCommunityCount = communities.filter((community) => community.is_active)
      .length;
    const archivedCommunityCount = communities.length - activeCommunityCount;

    return {
      active_community_count: activeCommunityCount,
      archived_community_count: archivedCommunityCount,
      show_count: showIds.size,
    };
  } catch (error) {
    console.warn("[social-landing] Failed to load reddit dashboard summary", error);
    return {
      active_community_count: 0,
      archived_community_count: 0,
      show_count: 0,
    };
  }
};

const safeLoadShowExternalIdsMap = async (
  showIds: readonly string[],
): Promise<ReadonlyMap<string, Record<string, unknown> | null>> => {
  try {
    return await listShowExternalIdsByIds(showIds);
  } catch (error) {
    console.warn("[social-landing] Failed to load show external ids", { showIds, error });
    return new Map();
  }
};

const safeLoadShowCastSummaryMap = async (
  showIds: readonly string[],
  adminContext?: VerifiedAdminContext,
): Promise<ReadonlyMap<string, CastSummaryMember[]>> => {
  if (showIds.length === 0) return new Map();

  try {
    const upstream = await fetchAdminBackendJson(
      "/admin/shows/cast-summary",
      {
        adminContext,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_ids: showIds }),
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "show-cast-summary",
      },
    );
    if (upstream.status !== 200) return new Map();

    const payload = upstream.data as CastSummaryBatchPayload;
    const shows = Array.isArray(payload.shows) ? payload.shows : [];
    return new Map(
      shows
        .map((show) => {
          const showId = typeof show.show_id === "string" ? show.show_id.trim() : "";
          if (!showId) return null;
          return [
            showId,
            Array.isArray(show.cast_members) ? show.cast_members : [],
          ] as const;
        })
        .filter(
          (
            entry,
          ): entry is readonly [string, CastSummaryMember[]] => entry !== null,
        ),
    );
  } catch (error) {
    console.warn("[social-landing] Failed to load show cast summary", {
      showIds,
      error,
    });
    return new Map();
  }
};

const safeLoadPrimaryPersonExternalIdsMap = async (
  personIds: readonly string[],
): Promise<ReadonlyMap<string, PersonExternalIdRecord[]>> => {
  try {
    return await listPrimaryPersonExternalIdsByPersonIds(personIds);
  } catch (error) {
    console.warn("[social-landing] Failed to load person external ids", { personIds, error });
    return new Map();
  }
};

const safeLoadEffectivePersonSocialHandlesMap = async (
  personIds: readonly string[],
): Promise<ReadonlyMap<string, PersonEffectiveSocialHandles>> => {
  try {
    return await listEffectivePersonSocialHandlesByPersonIds(personIds);
  } catch (error) {
    console.warn("[social-landing] Failed to load fallback person social handles", {
      personIds,
      error,
    });
    return new Map();
  }
};

const toIsoStringOrNull = (value: string | Date | null | undefined): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeCastSocialBladePlatform = (
  value: string | null | undefined,
): CastSocialBladePlatform | null => {
  const platform = normalizePlatform(value);
  return platform && CAST_SOCIALBLADE_PLATFORMS.includes(platform as CastSocialBladePlatform)
    ? (platform as CastSocialBladePlatform)
    : null;
};

const buildSocialBladeAccountKey = (
  platform: CastSocialBladePlatform,
  handle: string,
): string => `${platform}:${handle}`.toLowerCase();

type SocialBladeCurrentLookupEntry = {
  key: string;
  platform: CastSocialBladePlatform;
  handle: string;
  matchRank: number;
};

type NormalizedSocialBladeHandle = {
  platform: CastSocialBladePlatform;
  handle: string;
};

const normalizeSocialBladeCurrentHandles = (
  handles: readonly SocialHandleSummary[],
): NormalizedSocialBladeHandle[] =>
  handles
    .map((handle) => {
      const platform = normalizeCastSocialBladePlatform(handle.platform);
      const normalizedHandle = normalizeSocialAccountProfileHandle(handle.handle);
      return platform && normalizedHandle
        ? { platform, handle: normalizedHandle }
        : null;
    })
    .filter(
      (handle): handle is NormalizedSocialBladeHandle => handle !== null,
    );

const buildSocialBladeLegacyAliasKeys = (
  platform: CastSocialBladePlatform,
  handle: string,
): string[] => {
  if (platform !== "youtube") return [];
  return ["user", "c", "channel"].map((prefix) =>
    buildSocialBladeAccountKey(platform, `${prefix}${handle}`),
  );
};

const buildSocialBladeAccountHandleCandidates = (
  handles: readonly NormalizedSocialBladeHandle[],
): string[] => {
  const candidates = new Set<string>();
  for (const handle of handles) {
    candidates.add(handle.handle);
    candidates.add(`@${handle.handle}`);
    if (handle.platform === "youtube") {
      for (const prefix of ["user", "c", "channel"]) {
        candidates.add(`${prefix}/${handle.handle}`);
        candidates.add(`${prefix}${handle.handle}`);
      }
    }
  }
  return [...candidates].sort((left, right) => left.localeCompare(right));
};

type SocialBladeCurrentLookup = {
  entriesByPersonId: ReadonlyMap<string, SocialBladeCurrentLookupEntry[]>;
  ownersByKey: ReadonlyMap<string, ReadonlySet<string>>;
  accountHandleCandidates: string[];
};

const buildCurrentSocialBladeLookup = (
  handlesByPersonId: ReadonlyMap<string, readonly SocialHandleSummary[]>,
): SocialBladeCurrentLookup => {
  const normalizedHandlesByPersonId = new Map<
    string,
    NormalizedSocialBladeHandle[]
  >();
  const allCurrentHandles: NormalizedSocialBladeHandle[] = [];

  for (const [personId, handles] of handlesByPersonId) {
    const normalizedHandles = normalizeSocialBladeCurrentHandles(handles);
    normalizedHandlesByPersonId.set(personId, normalizedHandles);
    allCurrentHandles.push(...normalizedHandles);
  }

  const exactKeys = new Set(
    allCurrentHandles.map((handle) =>
      buildSocialBladeAccountKey(handle.platform, handle.handle),
    ),
  );
  const aliasCounts = new Map<string, number>();
  for (const handle of allCurrentHandles) {
    for (const aliasKey of buildSocialBladeLegacyAliasKeys(
      handle.platform,
      handle.handle,
    )) {
      aliasCounts.set(aliasKey, (aliasCounts.get(aliasKey) ?? 0) + 1);
    }
  }

  const mutableOwnersByKey = new Map<string, Set<string>>();
  const entriesByPersonId = new Map<string, SocialBladeCurrentLookupEntry[]>();
  for (const [personId, handles] of normalizedHandlesByPersonId) {
    const entries = new Map<string, SocialBladeCurrentLookupEntry>();
    for (const handle of handles) {
      const exactKey = buildSocialBladeAccountKey(handle.platform, handle.handle);
      const owners = mutableOwnersByKey.get(exactKey) ?? new Set<string>();
      owners.add(personId);
      mutableOwnersByKey.set(exactKey, owners);
      entries.set(exactKey, { key: exactKey, ...handle, matchRank: 0 });
      for (const aliasKey of buildSocialBladeLegacyAliasKeys(
        handle.platform,
        handle.handle,
      )) {
        if (exactKeys.has(aliasKey)) continue;
        if ((aliasCounts.get(aliasKey) ?? 0) !== 1) continue;
        entries.set(aliasKey, { key: aliasKey, ...handle, matchRank: 1 });
      }
    }
    entriesByPersonId.set(personId, [...entries.values()]);
  }

  return {
    entriesByPersonId,
    ownersByKey: mutableOwnersByKey,
    accountHandleCandidates:
      buildSocialBladeAccountHandleCandidates(allCurrentHandles),
  };
};

const normalizeSocialBladeRowHandle = (
  platform: CastSocialBladePlatform,
  value: string,
): string | null => {
  if (platform !== "youtube") {
    return toCanonicalInternalHandle(platform, value);
  }

  const normalizedValue = normalizePersonExternalIdValue("youtube", value);
  if (!normalizedValue) return null;
  const routeMatch = normalizedValue.match(/^(?:user|c|channel)\/(.+)$/i);
  const handleCandidate = routeMatch?.[1] ?? normalizedValue;
  return normalizeSocialAccountProfileHandle(handleCandidate);
};

const buildSocialBladeRowAccountKey = (
  row: Pick<SocialBladeSummaryRow, "platform" | "account_handle">,
): string | null => {
  const platform = normalizeCastSocialBladePlatform(row.platform);
  if (!platform || typeof row.account_handle !== "string") return null;
  const handle = normalizeSocialBladeRowHandle(platform, row.account_handle);
  return handle ? buildSocialBladeAccountKey(platform, handle) : null;
};

const safeLoadCastSocialBladeRows = async (
  personIds: readonly string[],
  accountHandleCandidates: readonly string[],
): Promise<SocialBladeSummaryRow[]> => {
  if (personIds.length === 0 && accountHandleCandidates.length === 0) return [];

  const socialBladePlatforms = CAST_SOCIALBLADE_PLATFORMS.map((platform) =>
    platform.toLowerCase(),
  );
  const socialBladePersonIds = [...new Set(personIds)];
  const socialBladeAccountHandles = [...new Set(accountHandleCandidates)];

  try {
    const result = await query<SocialBladeSummaryRow>(
      `
        SELECT
          id::text AS id,
          person_id::text AS person_id,
          platform,
          account_handle,
          scraped_at,
          updated_at,
          created_at,
          stats_refreshed,
          raw_response->>'socialblade_url' AS socialblade_url
        FROM pipeline.socialblade_growth_data
        WHERE platform = ANY($1::text[])
          AND (
            person_id = ANY($2::uuid[])
            OR (
              account_handle = ANY($3::text[])
            )
          )
        ORDER BY
          platform ASC,
          account_handle ASC,
          person_id ASC NULLS LAST,
          updated_at DESC NULLS LAST,
          scraped_at DESC NULLS LAST,
          created_at DESC NULLS LAST,
          id ASC
      `,
      [socialBladePlatforms, socialBladePersonIds, socialBladeAccountHandles],
    );
    return result.rows;
  } catch (error) {
    console.warn("[social-landing] Failed to load cast SocialBlade rows", error);
    return [];
  }
};

const extractShowHandles = (
  externalIdsValue: Record<string, unknown> | null | undefined,
): SocialHandleSummary[] => {
  const externalIds = toRecord(externalIdsValue);
  if (!externalIds) return [];

  const handles: SocialHandleSummary[] = [];
  for (const platform of PERSON_SOCIAL_SOURCES) {
    for (const key of SHOW_EXTERNAL_ID_KEYS[platform]) {
      const rawValue = externalIds[key];
      if (typeof rawValue !== "string" || !rawValue.trim()) continue;
      const handle = buildInternalHandleSummary(platform, rawValue);
      if (handle) handles.push(handle);
      break;
    }
  }
  return dedupeHandles(handles);
};

const isWwhlShow = (
  show: Pick<CoveredShow, "show_name" | "canonical_slug" | "alternative_names">,
): boolean => {
  const candidates = [
    show.show_name,
    show.canonical_slug ?? "",
    ...(show.alternative_names ?? []),
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some(
    (candidate) =>
      candidate.includes("watch what happens live") || candidate === "wwhl",
  );
};

const isWwhlSharedSource = (source: SharedAccountSourceSummary): boolean => {
  const canonicalHandle = normalizeSocialAccountProfileHandle(source.account_handle);
  return canonicalHandle === "bravowwhl" || canonicalHandle === "wwhl";
};

const buildNetworkSets = (
  sharedSources: readonly SharedAccountSourceSummary[],
): NetworkProfileSet[] => {
  const activeHandles = dedupeHandles(
    sharedSources
      .filter((source) => source.is_active)
      .map((source) => buildInternalHandleSummary(source.platform, source.account_handle))
      .filter((source): source is SocialHandleSummary => source !== null),
  );

  return [
    {
      key: "bravo-tv",
      title: "Bravo TV",
      description: "Shared Bravo social handles used in sends and profile backfills.",
      handles: activeHandles,
    },
  ];
};

const buildShowSets = (
  coveredShows: readonly CoveredShow[],
  showExternalIdsById: ReadonlyMap<string, Record<string, unknown> | null>,
  sharedSources: readonly SharedAccountSourceSummary[],
): ShowProfileSet[] => {
  return [...coveredShows]
    .sort((left, right) => left.show_name.localeCompare(right.show_name))
    .map((coveredShow) => {
      const directHandles = extractShowHandles(
        showExternalIdsById.get(coveredShow.trr_show_id) ?? null,
      );
      const duplicatedWwhlHandles = isWwhlShow(coveredShow)
        ? sharedSources
            .filter((source) => source.is_active && isWwhlSharedSource(source))
            .map((source) =>
              buildInternalHandleSummary(source.platform, source.account_handle),
            )
            .filter(
              (handle): handle is SocialHandleSummary => handle !== null,
            )
        : [];
      const handles = dedupeHandles([...directHandles, ...duplicatedWwhlHandles]);

      return {
        show_id: coveredShow.trr_show_id,
        show_name: coveredShow.show_name,
        canonical_slug: coveredShow.canonical_slug ?? null,
        alternative_names: coveredShow.alternative_names ?? null,
        handles,
        fallback_note:
          handles.length === 0 ? "Shared coverage via Bravo TV" : null,
      };
    });
};

const buildPeopleProfiles = async (
  coveredShows: readonly CoveredShow[],
  castByShowId: ReadonlyMap<string, CastSummaryMember[]>,
): Promise<{
  peopleProfiles: PersonProfileSummary[];
  personTargets: PersonTargetSummary[];
  personHandlesByPersonId: ReadonlyMap<string, SocialHandleSummary[]>;
}> => {
  const people = new Map<
    string,
    {
      person_id: string;
      full_name: string;
      shows: Map<string, PersonProfileShowSummary>;
    }
  >();

  for (const show of coveredShows) {
    const castMembers = castByShowId.get(show.trr_show_id) ?? [];
    for (const member of castMembers) {
      const personId =
        typeof member.person_id === "string" ? member.person_id.trim() : "";
      const fullName =
        typeof member.full_name === "string" ? member.full_name.trim() : "";
      if (!personId || !fullName) continue;

      const existing =
        people.get(personId) ??
        {
          person_id: personId,
          full_name: fullName,
          shows: new Map<string, PersonProfileShowSummary>(),
        };
      existing.shows.set(show.trr_show_id, {
        show_id: show.trr_show_id,
        show_name: show.show_name,
        canonical_slug: show.canonical_slug ?? null,
      });
      people.set(personId, existing);
    }
  }

  const peopleList = [...people.values()];
  const personIds = peopleList.map((person) => person.person_id);
  const [externalIdsByPersonId, fallbackHandlesByPersonId] = await Promise.all([
    safeLoadPrimaryPersonExternalIdsMap(personIds),
    safeLoadEffectivePersonSocialHandlesMap(personIds),
  ]);

  const personTargets = peopleList
    .map(
      (person) =>
        ({
          person_id: person.person_id,
          full_name: person.full_name,
          shows: [...person.shows.values()].sort((left, right) =>
            left.show_name.localeCompare(right.show_name),
          ),
        }) satisfies PersonTargetSummary,
    )
    .sort((left, right) => left.full_name.localeCompare(right.full_name));

  const personHandlesByPersonId = new Map<string, SocialHandleSummary[]>();
  const hydrated = personTargets.map((person) => {
    const records = externalIdsByPersonId.get(person.person_id) ?? [];
    const handles = dedupeHandles(
      [
        ...records
          .map((record) => buildPersonHandleSummary(record))
          .filter((handle): handle is SocialHandleSummary => handle !== null),
        ...buildFallbackPersonHandleSummaries(
          fallbackHandlesByPersonId.get(person.person_id),
        ),
      ],
    );
    personHandlesByPersonId.set(person.person_id, handles);
    if (handles.length === 0) return null;

    return {
      person_id: person.person_id,
      full_name: person.full_name,
      shows: person.shows,
      handles,
    } satisfies PersonProfileSummary;
  });

  return {
    peopleProfiles: hydrated
      .filter((person): person is PersonProfileSummary => person !== null)
      .sort((left, right) => left.full_name.localeCompare(right.full_name)),
    personTargets,
    personHandlesByPersonId,
  };
};

const buildCastSocialBladeAccountSummary = (
  row: SocialBladeSummaryRow,
  matchedHandle?: string,
): CastSocialBladeAccountSummary | null => {
  const platform = normalizeCastSocialBladePlatform(row.platform);
  if (!platform || typeof row.account_handle !== "string") return null;
  const handle =
    (matchedHandle ? normalizeSocialAccountProfileHandle(matchedHandle) : null) ??
    normalizeSocialBladeRowHandle(platform, row.account_handle);
  if (!handle) return null;

  return {
    platform,
    handle,
    display_label: formatHandleLabel(platform, handle),
    account_href: buildSocialAccountProfileUrl({
      platform,
      handle,
      tab: "socialblade",
    }),
    socialblade_url:
      typeof row.socialblade_url === "string" && row.socialblade_url.trim()
        ? row.socialblade_url.trim()
        : null,
    scraped_at: toIsoStringOrNull(row.scraped_at),
    updated_at: toIsoStringOrNull(row.updated_at),
    stats_refreshed: row.stats_refreshed === true,
  };
};

type CastSocialBladeRowCandidate = {
  row: SocialBladeSummaryRow;
  matchedHandle: string;
  matchRank: number;
};

const toTimestampMs = (value: string | Date | null | undefined): number => {
  const isoValue = toIsoStringOrNull(value);
  if (!isoValue) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(isoValue);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const compareCastSocialBladeRowCandidates = (
  personId: string,
  left: CastSocialBladeRowCandidate,
  right: CastSocialBladeRowCandidate,
): number => {
  if (left.matchRank !== right.matchRank) {
    return left.matchRank - right.matchRank;
  }

  const leftPersonRank = left.row.person_id === personId ? 0 : 1;
  const rightPersonRank = right.row.person_id === personId ? 0 : 1;
  if (leftPersonRank !== rightPersonRank) {
    return leftPersonRank - rightPersonRank;
  }

  for (const field of ["updated_at", "scraped_at", "created_at"] as const) {
    const leftTimestamp = toTimestampMs(left.row[field]);
    const rightTimestamp = toTimestampMs(right.row[field]);
    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }
  }

  const leftId = String(left.row.id ?? "");
  const rightId = String(right.row.id ?? "");
  if (leftId !== rightId) {
    return leftId.localeCompare(rightId);
  }

  const stableFields = [
    "platform",
    "account_handle",
    "person_id",
    "socialblade_url",
  ] as const;
  for (const field of stableFields) {
    const leftValue = String(left.row[field] ?? "");
    const rightValue = String(right.row[field] ?? "");
    if (leftValue !== rightValue) {
      return leftValue.localeCompare(rightValue);
    }
  }

  return 0;
};

const latestTimestamp = (values: readonly (string | null)[]): string | null => {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp) || timestamp <= latestMs) continue;
    latest = value;
    latestMs = timestamp;
  }
  return latest;
};

const buildCastSocialBladeShows = async (
  coveredShows: readonly CoveredShow[],
  castByShowId: ReadonlyMap<string, CastSummaryMember[]>,
  personHandlesByPersonId: ReadonlyMap<string, SocialHandleSummary[]>,
): Promise<CastSocialBladeShowSummary[]> => {
  const personIds = [...personHandlesByPersonId.keys()];
  const currentLookup = buildCurrentSocialBladeLookup(personHandlesByPersonId);
  const socialBladeRows = await safeLoadCastSocialBladeRows(
    personIds,
    currentLookup.accountHandleCandidates,
  );

  const rowsByAccountKey = new Map<string, SocialBladeSummaryRow[]>();
  for (const row of socialBladeRows) {
    const rowAccountKey = buildSocialBladeRowAccountKey(row);
    if (!rowAccountKey) continue;
    const rows = rowsByAccountKey.get(rowAccountKey) ?? [];
    rows.push(row);
    rowsByAccountKey.set(rowAccountKey, rows);
  }

  return [...coveredShows]
    .sort((left, right) => left.show_name.localeCompare(right.show_name))
    .map((show) => {
      const members = (castByShowId.get(show.trr_show_id) ?? [])
        .map((member): CastSocialBladeMemberSummary | null => {
          const personId =
            typeof member.person_id === "string" ? member.person_id.trim() : "";
          const fullName =
            typeof member.full_name === "string" ? member.full_name.trim() : "";
          if (!personId || !fullName) return null;

          const currentAccounts =
            currentLookup.entriesByPersonId.get(personId) ?? [];

          const rowCandidates: CastSocialBladeRowCandidate[] = [];
          for (const currentAccount of currentAccounts) {
            const owners = currentLookup.ownersByKey.get(currentAccount.key);
            const isAmbiguousCurrentHandle = owners ? owners.size > 1 : false;
            for (const row of rowsByAccountKey.get(currentAccount.key) ?? []) {
              if (isAmbiguousCurrentHandle && row.person_id !== personId) {
                continue;
              }
              rowCandidates.push({
                row,
                matchedHandle: currentAccount.handle,
                matchRank: currentAccount.matchRank,
              });
            }
          }

          const seenAccounts = new Set<string>();
          const accounts = rowCandidates
            .sort((left, right) =>
              compareCastSocialBladeRowCandidates(personId, left, right),
            )
            .map((candidate) =>
              buildCastSocialBladeAccountSummary(
                candidate.row,
                candidate.matchedHandle,
              ),
            )
            .filter((account): account is CastSocialBladeAccountSummary => {
              if (!account) return false;
              const key = buildSocialBladeAccountKey(account.platform, account.handle);
              if (seenAccounts.has(key)) return false;
              seenAccounts.add(key);
              return true;
            })
            .sort((left, right) => {
              if (left.platform !== right.platform) {
                return left.platform.localeCompare(right.platform);
              }
              return left.handle.localeCompare(right.handle);
            });

          if (accounts.length === 0) return null;
          return {
            person_id: personId,
            full_name: fullName,
            photo_url:
              typeof member.photo_url === "string" && member.photo_url.trim()
                ? member.photo_url.trim()
                : null,
            accounts,
          };
        })
        .filter(
          (member): member is CastSocialBladeMemberSummary => member !== null,
        )
        .sort((left, right) => left.full_name.localeCompare(right.full_name));

      if (members.length === 0) return null;

      const platformCounts: Partial<Record<CastSocialBladePlatform, number>> = {};
      for (const member of members) {
        for (const account of member.accounts) {
          platformCounts[account.platform] =
            (platformCounts[account.platform] ?? 0) + 1;
        }
      }

      return {
        show_id: show.trr_show_id,
        show_name: show.show_name,
        canonical_slug: show.canonical_slug ?? null,
        platform_counts: platformCounts,
        cast_member_count: members.length,
        latest_scraped_at: latestTimestamp(
          members.flatMap((member) =>
            member.accounts.map((account) => account.scraped_at),
          ),
        ),
        members,
      } satisfies CastSocialBladeShowSummary;
    })
    .filter((show): show is CastSocialBladeShowSummary => show !== null);
};

export async function getSocialLandingPayload(
  adminContext?: VerifiedAdminContext,
): Promise<SocialLandingPayload> {
  const [coveredShows, redditDashboard] = await Promise.all([
    getCoveredShows(),
    safeLoadRedditDashboardSummary(),
  ]);
  const sharedSources = await safeLoadSharedSources(adminContext);
  const sharedRuns = await safeLoadSharedRuns(adminContext);
  const sharedReviewItems = await safeLoadSharedReviewItems(adminContext);

  const showExternalIdsById = await safeLoadShowExternalIdsMap(
    coveredShows.map((show) => show.trr_show_id),
  );
  const castByShowId = await safeLoadShowCastSummaryMap(
    coveredShows.map((show) => show.trr_show_id),
    adminContext,
  );
  const { peopleProfiles, personTargets, personHandlesByPersonId } = await buildPeopleProfiles(
    coveredShows,
    castByShowId,
  );
  const castSocialBladeShows = await buildCastSocialBladeShows(
    coveredShows,
    castByShowId,
    personHandlesByPersonId,
  );

  return {
    network_sets: buildNetworkSets(sharedSources),
    show_sets: buildShowSets(coveredShows, showExternalIdsById, sharedSources),
    people_profiles: peopleProfiles,
    person_targets: personTargets,
    cast_socialblade_shows: castSocialBladeShows,
    shared_pipeline: {
      sources: sharedSources,
      runs: sharedRuns,
      review_items: sharedReviewItems,
    } satisfies SharedPipelineSummary,
    reddit_dashboard: redditDashboard,
  };
}
