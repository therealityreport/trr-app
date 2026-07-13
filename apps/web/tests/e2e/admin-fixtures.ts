import { expect, type Page, type Route } from "@playwright/test";

export const SHOW_ID = "11111111-1111-4111-8111-111111111111";
export const SHOW_SLUG = "the-real-housewives-of-salt-lake-city";
export const SHOW_NAME = "The Real Housewives of Salt Lake City";
export const SEASON_ID = "season-6-id";
export const SEASON_NUMBER = 6;
export const CAST_PERSON_PRIMARY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const CAST_PERSON_SECONDARY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const ADMIN_LOADING_MARKERS = ["Loading admin access", "Preparing admin dashboard", "Checking admin access"];
const SEASON_SOCIAL_ROUTE_RE = /\/s\d+\/social\/cast-comparison(?:\?|$)/;

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

export const buildMockGettyLocalScrapeResponse = (
  method: string,
  requestedToken: string | null,
): { body: Record<string, unknown>; status: number } => {
  const prefetchToken = requestedToken?.trim() || "mock-getty-prefetch-token";
  const statusUrl = `/api/admin/getty-local/scrape?prefetch_token=${encodeURIComponent(prefetchToken)}`;
  if (method.toUpperCase() === "POST") {
    return {
      status: 202,
      body: {
        prefetch_token: prefetchToken,
        status: "running",
        stage: "starting",
        poll_after_ms: 1000,
        status_url: statusUrl,
        prefetch_mode: "discovery",
      },
    };
  }
  return {
    status: 200,
    body: {
      prefetch_token: prefetchToken,
      status: "completed",
      poll_after_ms: 0,
      status_url: statusUrl,
      prefetch_mode: "discovery",
      discovery_ready: true,
      enrichment_pending: false,
      merged_total: 0,
      merged_events_total: 0,
      candidate_manifest_total: 0,
      detail_enrichment_total: 0,
    },
  };
};

const sleep = async (ms: number) => {
  if (!ms || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const buildSseEvent = (event: string, payload: Record<string, unknown>) =>
  `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

const fulfillSse = async (route: Route, body: string, status = 200) => {
  await route.fulfill({
    status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
    body,
  });
};

export type MockAdminApiOptions = {
  showCastMembers?: unknown[];
  seasonCastMembers?: unknown[];
  castRoleMembers?: unknown[];
  showRoles?: unknown[];
  socialGrowthByKey?: Record<string, unknown | null>;
  socialGrowthRefreshCallIdsByKey?: Record<string, string>;
  socialGrowthRefreshPollsBeforeData?: number;
  castRoleMembersDelayMs?: number;
  castRoleMembersStatus?: number;
  showRolesStatus?: number;
  personRefreshStreamDelayMs?: number;
  personReprocessStreamDelayMs?: number;
  showRefreshStreamDelayMs?: number;
};

export const buildShowCastMember = (
  personId: string,
  name: string,
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: `credit-${personId}`,
  person_id: personId,
  full_name: name,
  cast_member_name: name,
  role: "Housewife",
  billing_order: 1,
  credit_category: "cast",
  photo_url: "https://example.com/photo.jpg",
  cover_photo_url: "https://example.com/cover.jpg",
  latest_season: SEASON_NUMBER,
  total_episodes: 10,
  seasons_appeared: [SEASON_NUMBER],
  ...overrides,
});

export const buildSeasonCastMember = (
  personId: string,
  name: string,
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  person_id: personId,
  person_name: name,
  episodes_in_season: 10,
  archive_episodes_in_season: 0,
  total_episodes: 10,
  photo_url: "https://example.com/photo.jpg",
  ...overrides,
});

export const buildCastRoleMember = (
  personId: string,
  name: string,
  roles: string[] = ["Housewife"],
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  person_id: personId,
  person_name: name,
  total_episodes: 10,
  seasons_appeared: 1,
  latest_season: SEASON_NUMBER,
  roles,
  display_name: name,
  instagram_handle: name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
  instagram_handle_source: "mock",
  photo_url: "https://example.com/photo.jpg",
  ...overrides,
});

const buildSocialGrowthData = (
  handle: string,
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  username: handle,
  account_handle: handle,
  platform: "instagram",
  scraped_at: "2026-06-19T12:00:00.000Z",
  freshness_status: "fresh",
  is_stale: false,
  age_hours: 0.25,
  socialblade_url: `https://socialblade.com/instagram/user/${handle}`,
  chart_metric_label: "Followers",
  profile_stats: {
    followers: 210_000,
    following: 1_800,
    media_count: 950,
    engagement_rate: "3.20%",
    average_likes: 12_400,
    average_comments: 280,
  },
  rankings: {
    sb_rank: "#12,345",
    followers_rank: "#8,901",
    engagement_rate_rank: "#2,468",
    grade: "A-",
  },
  daily_channel_metrics_60day: {
    period: "60d",
    row_count: 2,
    headers: ["date", "followers"],
    data: [
      { date: "2026-06-17", followers: "209400" },
      { date: "2026-06-18", followers: "210000" },
    ],
  },
  daily_total_followers_chart: {
    frequency: "daily",
    metric: "followers",
    total_data_points: 2,
    date_range: { from: "2026-06-17", to: "2026-06-18" },
    data: [
      { date: "2026-06-17", followers: 209_400 },
      { date: "2026-06-18", followers: 210_000 },
    ],
  },
  ...overrides,
});

const buildSeasonSocialSnapshot = () => ({
  data: {
    analytics: null,
    targets: [],
    runs: [],
    run_summaries: [],
    jobs: [],
    worker_health: {
      queue_enabled: true,
      healthy: true,
      healthy_workers: 1,
      reason: null,
      checked_at: "2026-06-19T12:00:00.000Z",
    },
    shared_status: {
      live_status: "idle",
      sync_status: "idle",
      ingest_status: "idle",
    },
    generated_at: "2026-06-19T12:00:00.000Z",
    cache_age_ms: 0,
    stale: false,
  },
  generated_at: "2026-06-19T12:00:00.000Z",
  cache_age_ms: 0,
  stale: false,
});

type PendingSocialGrowthRefresh = {
  callId: string;
  pollsRemaining: number;
  history: Array<Record<string, unknown>>;
  data: Record<string, unknown>;
};

export async function mockAdminApi(page: Page, options: MockAdminApiOptions = {}) {
  const showSeasonsPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/seasons$/;
  const showCastPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/cast$/;
  const seasonCastPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/seasons\/[^/]+\/cast$/;
  const showRolesPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/roles$/;
  const castRoleMembersPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/cast-role-members$/;
  const showRefreshStreamPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/refresh\/stream$/;
  const showLinksPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/links$/;
  const showAssetsPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/assets$/;
  const seasonAssetsPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/seasons\/[^/]+\/assets$/;
  const showNewsPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/news$/;
  const showBravoVideosPathRe = /^\/api\/admin\/trr-api\/shows\/[^/]+\/bravo\/videos$/;
  const seasonSocialSnapshotPathRe =
    /^\/api\/admin\/trr-api\/shows\/[^/]+\/seasons\/[^/]+\/social\/analytics\/snapshot$/;

  const socialGrowthByKey = new Map<string, Record<string, unknown>>(
    Object.entries(options.socialGrowthByKey ?? {}).flatMap(([key, value]) =>
      value && typeof value === "object" ? [[key, value as Record<string, unknown>]] : []
    )
  );
  const pendingSocialGrowthByKey = new Map<string, PendingSocialGrowthRefresh>();
  const socialGrowthHistoryByKey = new Map<string, Array<Record<string, unknown>>>();
  const socialGrowthRefreshPollsBeforeData = Math.max(1, options.socialGrowthRefreshPollsBeforeData ?? 1);

  await page.route("**/api/admin/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path === "/api/admin/getty-local/scrape") {
      const response = buildMockGettyLocalScrapeResponse(
        route.request().method(),
        requestUrl.searchParams.get("prefetch_token"),
      );
      return json(route, response.body, response.status);
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}` || path === `/api/admin/trr-api/shows/${SHOW_SLUG}`) {
      return json(route, {
        show: {
          id: SHOW_ID,
          name: SHOW_NAME,
          slug: SHOW_SLUG,
          canonical_slug: SHOW_SLUG,
          alternative_names: [],
          imdb_id: null,
          tmdb_id: null,
          show_total_seasons: 6,
          show_total_episodes: 100,
          description: "",
          premiere_date: "2025-01-01",
          networks: ["Bravo"],
          genres: ["Reality"],
          tags: [],
          tmdb_status: null,
          tmdb_vote_average: null,
          imdb_rating_value: null,
          logo_url: null,
          streaming_providers: [],
          watch_providers: [],
        },
      });
    }

    if (path === "/api/admin/trr-api/shows/resolve-slug") {
      return json(route, {
        resolved: {
          show_id: SHOW_ID,
          slug: SHOW_SLUG,
        },
      });
    }

    if (showSeasonsPathRe.test(path)) {
      return json(route, {
        seasons: [
          {
            id: SEASON_ID,
            show_id: SHOW_ID,
            season_number: SEASON_NUMBER,
            name: `Season ${SEASON_NUMBER}`,
            title: `Season ${SEASON_NUMBER}`,
            overview: "",
            air_date: "2025-01-01",
            premiere_date: "2025-01-01",
            url_original_poster: null,
            tmdb_season_id: null,
          },
        ],
      });
    }

    if (path === `/api/admin/trr-api/seasons/${SEASON_ID}/episodes`) {
      return json(route, { episodes: [] });
    }

    if (seasonCastPathRe.test(path)) {
      return json(route, {
        cast: options.seasonCastMembers ?? [],
        cast_source: "season_evidence",
        eligibility_warning: null,
      });
    }

    if (showCastPathRe.test(path)) {
      return json(route, {
        cast: options.showCastMembers ?? [],
        cast_source: "episode_evidence",
        eligibility_warning: null,
      });
    }

    if (showRolesPathRe.test(path)) {
      if (typeof options.showRolesStatus === "number" && options.showRolesStatus >= 400) {
        return json(route, { error: "Failed to load roles" }, options.showRolesStatus);
      }
      return json(route, options.showRoles ?? []);
    }

    if (castRoleMembersPathRe.test(path)) {
      await sleep(options.castRoleMembersDelayMs ?? 0);
      if (
        typeof options.castRoleMembersStatus === "number" &&
        options.castRoleMembersStatus >= 400
      ) {
        return json(route, { error: "Failed to load cast role members" }, options.castRoleMembersStatus);
      }
      return json(route, options.castRoleMembers ?? []);
    }

    if (seasonSocialSnapshotPathRe.test(path)) {
      return json(route, buildSeasonSocialSnapshot());
    }

    if (showRefreshStreamPathRe.test(path)) {
      await sleep(options.showRefreshStreamDelayMs ?? 0);
      return fulfillSse(
        route,
        [
          buildSseEvent("progress", {
            stage: "credits_fullcredits_sync",
            message: "Syncing IMDb Full Credits (cast + crew)...",
            current: 1,
            total: 4,
          }),
          buildSseEvent("complete", {
            counts: {
              credits_fullcredits_sync: 1,
            },
          }),
        ].join("")
      );
    }

    if (/^\/api\/admin\/trr-api\/people\/[^/]+\/refresh-profile\/stream$/.test(path)) {
      await sleep(options.personRefreshStreamDelayMs ?? 0);
      return fulfillSse(
        route,
        [
          buildSseEvent("progress", {
            stage: "profile_imdb",
            message: "Refreshing IMDb profile...",
            current: 1,
            total: 1,
          }),
          buildSseEvent("complete", {
            summary: {
              skips: [],
              failures: [],
              profile_fields_changed: 1,
              aliases_added: 0,
            },
          }),
        ].join("")
      );
    }

    if (/^\/api\/admin\/trr-api\/people\/[^/]+\/refresh-images\/stream$/.test(path)) {
      await sleep(options.personRefreshStreamDelayMs ?? 0);
      return fulfillSse(
        route,
        [
          buildSseEvent("progress", {
            stage: "sync_tmdb",
            message: "Refreshing cast member...",
            current: 1,
            total: 1,
          }),
          buildSseEvent("complete", {
            synced: 1,
          }),
        ].join("")
      );
    }

    if (/^\/api\/admin\/trr-api\/people\/[^/]+\/reprocess-images\/stream$/.test(path)) {
      await sleep(options.personReprocessStreamDelayMs ?? 0);
      return fulfillSse(
        route,
        [
          buildSseEvent("progress", {
            stage: "resizing",
            message: "Enriching cast media...",
            current: 1,
            total: 1,
          }),
          buildSseEvent("complete", {
            resized: 1,
          }),
        ].join("")
      );
    }

    if (showLinksPathRe.test(path)) {
      return json(route, { links: [] });
    }

    if (showAssetsPathRe.test(path)) {
      return json(route, { assets: [] });
    }

    if (seasonAssetsPathRe.test(path)) {
      return json(route, { assets: [] });
    }

    if (showBravoVideosPathRe.test(path)) {
      return json(route, { items: [] });
    }

    if (showNewsPathRe.test(path)) {
      return json(route, {
        items: [],
        total_count: 0,
        page_count: 0,
        facets: { sources: [], people: [], topics: [], seasons: [] },
        next_cursor: null,
      });
    }

    if (/^\/api\/admin\/trr-api\/people\/[^/]+\/social-growth$/.test(path)) {
      const personId = path.split("/")[5] ?? "";
      const handle = String(requestUrl.searchParams.get("handle") ?? "").trim();
      const key = `${personId}:${handle}`;
      const pending = pendingSocialGrowthByKey.get(key);
      const data = socialGrowthByKey.get(key) ?? (pending?.pollsRemaining === 0 ? pending.data : null);
      if (!data) {
        return json(route, { error: "No SocialBlade data found" }, 404);
      }
      return json(route, data);
    }

    if (path === "/api/admin/trr-api/social-growth/cast-comparison/snapshot") {
      const snapshot = buildSeasonSocialSnapshot();
      const items = requestUrl.searchParams.getAll("item").map((rawItem) => {
        const [personId, ...handleParts] = rawItem.split(":");
        const handle = handleParts.join(":").trim();
        const key = `${personId.trim()}:${handle}`;
        const pending = pendingSocialGrowthByKey.get(key);
        if (pending) {
          const nextPollsRemaining = Math.max(0, pending.pollsRemaining - 1);
          pendingSocialGrowthByKey.set(key, { ...pending, pollsRemaining: nextPollsRemaining });
          if (nextPollsRemaining === 0) {
            socialGrowthByKey.set(key, pending.data);
            socialGrowthHistoryByKey.set(key, pending.history);
          }
        }

        const currentPending = pendingSocialGrowthByKey.get(key);
        const data =
          socialGrowthByKey.get(key) ?? (currentPending && currentPending.pollsRemaining === 0 ? currentPending.data : null);
        return {
          personId: personId.trim(),
          handle,
          data,
          error: data ? null : "No SocialBlade data found",
          not_found: !data,
        };
      });
      return json(route, {
        ...snapshot,
        data: {
          ...snapshot.data,
          items,
        },
      });
    }

    if (path === "/api/admin/trr-api/social-growth/refresh-batch" && route.request().method() === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        items?: Array<{ personId?: string; handle?: string }>;
      };
      const accepted = Array.isArray(body.items)
        ? body.items.flatMap((item, index) => {
            const personId = String(item.personId ?? "").trim();
            const handle = String(item.handle ?? "").trim();
            if (!personId || !handle) return [];
            const key = `${personId}:${handle}`;
            const callId =
              options.socialGrowthRefreshCallIdsByKey?.[key] ??
              `modal-${handle.slice(0, 4).padEnd(4, "x")}-${index + 1}`;
            const data =
              socialGrowthByKey.get(key) ??
              buildSocialGrowthData(handle, {
                refresh_status: "refreshed",
                stats_refreshed: true,
              });
            const history = [
              {
                call_id: callId,
                status: "completed",
                source: "cast_comparison",
                handle,
                person_id: personId,
                scraped_at: "2026-06-19T12:00:00.000Z",
              },
            ];
            pendingSocialGrowthByKey.set(key, {
              callId,
              pollsRemaining: socialGrowthRefreshPollsBeforeData,
              history,
              data,
            });
            return [{ personId, handle, callId }];
          })
        : [];
      return json(route, { accepted, skipped: [], errors: [] }, 202);
    }

    if (
      /^\/api\/admin\/trr-api\/social-growth\/(?:calls|call-status)\/[^/]+(?:\/status)?$/.test(path)
    ) {
      const callId = path.match(/\/(?:calls|call-status)\/([^/]+)(?:\/status)?$/)?.[1] ?? "";
      const pendingEntry = [...pendingSocialGrowthByKey.values()].find((entry) => entry.callId === callId);
      const completedEntry = [...socialGrowthHistoryByKey.entries()].find(([, history]) =>
        history.some((item) => item.call_id === callId)
      );
      if (pendingEntry) {
        const status = pendingEntry.pollsRemaining >= socialGrowthRefreshPollsBeforeData ? "queued" : "running";
        return json(route, { call_id: callId, status });
      }
      if (completedEntry) {
        return json(route, { call_id: callId, status: "completed" });
      }
      return json(route, { call_id: callId, status: "not_found" }, 404);
    }

    if (
      path === "/api/admin/trr-api/social-growth/history" ||
      /^\/api\/admin\/trr-api\/people\/[^/]+\/social-growth\/history$/.test(path)
    ) {
      const personId =
        /^\/api\/admin\/trr-api\/people\/[^/]+\/social-growth\/history$/.test(path)
          ? path.split("/")[5] ?? ""
          : String(requestUrl.searchParams.get("personId") ?? "").trim();
      const handle = String(requestUrl.searchParams.get("handle") ?? "").trim();
      const key = `${personId}:${handle}`;
      return json(route, {
        items: socialGrowthHistoryByKey.get(key) ?? [],
      });
    }

    if (path === `/api/admin/covered-shows/${SHOW_ID}`) {
      return json(route, { show_id: SHOW_ID }, 404);
    }

    if (path === "/api/admin/covered-shows" && route.request().method() === "POST") {
      return json(route, { ok: true });
    }

    if (path === `/api/admin/covered-shows/${SHOW_ID}` && route.request().method() === "DELETE") {
      return json(route, { ok: true });
    }

    return json(route, {});
  });
}

export async function waitForAdminReady(page: Page, timeoutMs = 90_000) {
  await expect
    .poll(
      async () => {
        const bodyText = await page.locator("body").innerText();
        return ADMIN_LOADING_MARKERS.some((marker) => bodyText.includes(marker));
      },
      {
        timeout: timeoutMs,
        intervals: [500, 1_000, 2_000, 3_000],
      },
    )
    .toBe(false);
}

export async function gotoSeasonSocialCastContent(page: Page) {
  const legacyRoute =
    `/admin/trr-shows/${SHOW_ID}/seasons/${SEASON_NUMBER}?tab=social&social_view=cast-content`;
  const canonicalRoute = `/${SHOW_SLUG}/s${SEASON_NUMBER}/social/cast-comparison`;

  await page.goto(legacyRoute);
  await waitForAdminReady(page);

  if (!SEASON_SOCIAL_ROUTE_RE.test(page.url())) {
    await page.goto(canonicalRoute);
    await waitForAdminReady(page);
  }

  await expect(page.getByRole("tab", { name: "Social" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Cast Comparison").first()).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(SEASON_SOCIAL_ROUTE_RE, { timeout: 20_000 });
}
