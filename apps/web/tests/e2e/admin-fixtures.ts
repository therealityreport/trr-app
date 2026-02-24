import { expect, type Page, type Route } from "@playwright/test";

export const SHOW_ID = "11111111-1111-4111-8111-111111111111";
export const SHOW_SLUG = "the-real-housewives-of-salt-lake-city";
export const SHOW_NAME = "The Real Housewives of Salt Lake City";
export const SEASON_ID = "season-6-id";
export const SEASON_NUMBER = 6;

const ADMIN_LOADING_MARKERS = ["Loading admin access", "Preparing admin dashboard", "Checking admin access"];

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

export async function mockAdminApi(page: Page) {
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

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/seasons`) {
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

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/seasons/${SEASON_NUMBER}/cast`) {
      return json(route, {
        cast: [],
        cast_source: "season_evidence",
        eligibility_warning: null,
      });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/cast`) {
      return json(route, { cast: [], cast_source: "episode_evidence", eligibility_warning: null });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/roles`) {
      return json(route, { roles: [] });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/cast-role-members`) {
      return json(route, { members: [], warning: null });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/links`) {
      return json(route, { links: [] });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/assets`) {
      return json(route, { assets: [] });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/seasons/${SEASON_NUMBER}/assets`) {
      return json(route, { assets: [] });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/bravo/videos`) {
      return json(route, { items: [] });
    }

    if (path === `/api/admin/trr-api/shows/${SHOW_ID}/news`) {
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
