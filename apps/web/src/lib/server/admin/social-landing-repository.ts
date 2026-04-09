import "server-only";

import {
  buildPersonExternalIdUrl,
  normalizePersonExternalIdValue,
  type PersonExternalIdRecord,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";
import {
  buildSocialAccountProfileUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";
import type {
  NetworkProfileSet,
  PersonProfileShowSummary,
  PersonProfileSummary,
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
import {
  getShowById,
  listPersonExternalIds,
  type TrrCastMember,
  type TrrShow,
} from "@/lib/server/trr-api/trr-shows-repository";

type SharedSourcesPayload = {
  sources?: SharedAccountSourceSummary[];
};

type SharedReviewPayload = {
  items?: SharedReviewItemSummary[];
};

type CastPayload = {
  cast_members?: TrrCastMember[];
};

type SupportedPersonSocialSource = Extract<
  PersonExternalIdSource,
  "facebook" | "instagram" | "twitter" | "tiktok" | "youtube"
>;

const PERSON_SOCIAL_SOURCES: readonly SupportedPersonSocialSource[] = [
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "youtube",
] as const;

const SHOW_EXTERNAL_ID_KEYS: Record<
  SupportedPersonSocialSource,
  readonly string[]
> = {
  facebook: ["facebook_id", "facebook", "facebook_handle"],
  instagram: ["instagram_id", "instagram", "instagram_handle"],
  twitter: ["twitter_id", "twitter", "twitter_handle", "x_id", "x_handle"],
  tiktok: ["tiktok_id", "tiktok", "tiktok_handle"],
  youtube: ["youtube_id", "youtube", "youtube_handle"],
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

const safeLoadSharedSources = async (): Promise<SharedAccountSourceSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/sources", {
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

const safeLoadSharedRuns = async (): Promise<SharedRunSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/ingest/runs", {
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

const safeLoadSharedReviewItems = async (): Promise<SharedReviewItemSummary[]> => {
  try {
    const payload = await fetchSocialBackendJson("/shared/review-queue", {
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

const safeLoadShowDetail = async (showId: string): Promise<TrrShow | null> => {
  try {
    return await getShowById(showId);
  } catch (error) {
    console.warn("[social-landing] Failed to load show detail", { showId, error });
    return null;
  }
};

const safeLoadShowCast = async (showId: string): Promise<TrrCastMember[]> => {
  try {
    const upstream = await fetchAdminBackendJson(
      `/admin/trr-api/shows/${showId}/cast?limit=500&offset=0&include_photos=false&eligibility_mode=links`,
      {
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "show-cast",
      },
    );
    if (upstream.status !== 200) return [];
    const payload = upstream.data as CastPayload;
    return Array.isArray(payload.cast_members) ? payload.cast_members : [];
  } catch (error) {
    console.warn("[social-landing] Failed to load show cast", { showId, error });
    return [];
  }
};

const safeLoadPersonExternalIds = async (
  personId: string,
): Promise<PersonExternalIdRecord[]> => {
  try {
    return await listPersonExternalIds(personId);
  } catch (error) {
    console.warn("[social-landing] Failed to load person external ids", {
      personId,
      error,
    });
    return [];
  }
};

const extractShowHandles = (show: TrrShow | null): SocialHandleSummary[] => {
  const externalIds = toRecord(show?.external_ids);
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
      description: "Bravo-owned shared social profiles and pipeline state.",
      handles: activeHandles,
    },
  ];
};

const buildShowSets = (
  coveredShows: readonly CoveredShow[],
  showDetails: ReadonlyMap<string, TrrShow | null>,
  sharedSources: readonly SharedAccountSourceSummary[],
): ShowProfileSet[] => {
  return [...coveredShows]
    .sort((left, right) => left.show_name.localeCompare(right.show_name))
    .map((coveredShow) => {
      const directHandles = extractShowHandles(
        showDetails.get(coveredShow.trr_show_id) ?? null,
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
  castByShowId: ReadonlyMap<string, TrrCastMember[]>,
): Promise<PersonProfileSummary[]> => {
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
      const personId = member.person_id?.trim();
      const fullName = member.full_name?.trim();
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

  const hydrated = await Promise.all(
    [...people.values()].map(async (person) => {
      const records = await safeLoadPersonExternalIds(person.person_id);
      const handles = dedupeHandles(
        records
          .map((record) => buildPersonHandleSummary(record))
          .filter((handle): handle is SocialHandleSummary => handle !== null),
      );
      if (handles.length === 0) return null;

      return {
        person_id: person.person_id,
        full_name: person.full_name,
        shows: [...person.shows.values()].sort((left, right) =>
          left.show_name.localeCompare(right.show_name),
        ),
        handles,
      } satisfies PersonProfileSummary;
    }),
  );

  return hydrated
    .filter((person): person is PersonProfileSummary => person !== null)
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
};

export async function getSocialLandingPayload(): Promise<SocialLandingPayload> {
  const [coveredShows, sharedSources, sharedRuns, sharedReviewItems, redditDashboard] =
    await Promise.all([
      getCoveredShows(),
      safeLoadSharedSources(),
      safeLoadSharedRuns(),
      safeLoadSharedReviewItems(),
      safeLoadRedditDashboardSummary(),
    ]);

  const showPairs = await Promise.all(
    coveredShows.map(async (show) => {
      const [showDetail, castMembers] = await Promise.all([
        safeLoadShowDetail(show.trr_show_id),
        safeLoadShowCast(show.trr_show_id),
      ]);
      return {
        show_id: show.trr_show_id,
        detail: showDetail,
        cast_members: castMembers,
      };
    }),
  );

  const showDetails = new Map(
    showPairs.map((entry) => [entry.show_id, entry.detail] as const),
  );
  const castByShowId = new Map(
    showPairs.map((entry) => [entry.show_id, entry.cast_members] as const),
  );

  return {
    network_sets: buildNetworkSets(sharedSources),
    show_sets: buildShowSets(coveredShows, showDetails, sharedSources),
    people_profiles: await buildPeopleProfiles(coveredShows, castByShowId),
    shared_pipeline: {
      sources: sharedSources,
      runs: sharedRuns,
      review_items: sharedReviewItems,
    } satisfies SharedPipelineSummary,
    reddit_dashboard: redditDashboard,
  };
}
