import { expect, type Page, type Route } from "@playwright/test";

export const SHOW_ID = "11111111-1111-4111-8111-111111111111";
export const SHOW_SLUG = "the-real-housewives-of-salt-lake-city";
export const SHOW_NAME = "The Real Housewives of Salt Lake City";
export const SEASON_ID = "season-6-id";
export const SEASON_NUMBER = 6;
export const CAST_PERSON_PRIMARY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const CAST_PERSON_SECONDARY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const ADMIN_LOADING_MARKERS = ["Loading admin access", "Preparing admin dashboard", "Checking admin access"];

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
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
  photo_url: "https://example.com/photo.jpg",
  ...overrides,
});

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

  await page.route("**/api/admin/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const path = requestUrl.pathname;

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}`) {
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

    if (showRefreshStreamPathRe.test(path)) {
      await sleep(options.showRefreshStreamDelayMs ?? 0);
      return fulfillSse(
        route,
        [
          buildSseEvent("progress", {
            stage: "cast_credits_show_cast",
            message: "Syncing cast credits...",
            current: 1,
            total: 4,
          }),
          buildSseEvent("complete", {
            counts: {
              cast_credits_show_cast: 1,
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
