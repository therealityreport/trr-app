import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PersonPage from "@/app/admin/trr-shows/people/[personId]/page";

const mocks = vi.hoisted(() => {
  const personId = "11111111-2222-3333-4444-555555555555";
  const showId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const replace = vi.fn();
  return {
    personId,
    showId,
    params: { personId },
    pathname: `/admin/trr-shows/people/${personId}`,
    searchParams: new URLSearchParams(`showId=${showId}`),
    router: { replace },
    replace,
    guardState: {
      user: { email: "admin@example.com" },
      checking: false,
      hasAccess: true,
    },
    fetchAdminWithAuth: vi.fn(),
    getClientAuthHeaders: vi.fn(),
  };
});

const PERSON_ID = mocks.personId;
const SHOW_ID = mocks.showId;

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt = "" }: { alt?: string }) => <span aria-label={alt} />,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
  getClientAuthHeaders: (...args: unknown[]) =>
    (mocks.getClientAuthHeaders as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/components/admin/ExternalLinks", () => ({
  ExternalLinks: () => null,
  TmdbLinkIcon: () => null,
  ImdbLinkIcon: () => null,
}));

vi.mock("@/components/admin/ImageLightbox", () => ({
  ImageLightbox: () => null,
}));

vi.mock("@/components/admin/FandomSyncModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/admin/ReassignImageModal", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/admin/ImageScrapeDrawer", () => ({
  ImageScrapeDrawer: () => null,
}));

vi.mock("@/components/admin/AdvancedFilterDrawer", () => ({
  AdvancedFilterDrawer: () => null,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type FetchOverrides = {
  credits?: (url: string) => Response;
  fandom?: (url: string) => Response;
  videos?: (url: string) => Response;
  news?: (url: string) => Response;
};

const createFetchMock = (overrides: FetchOverrides = {}) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);

    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)) {
      if (overrides.credits) return overrides.credits(url);
      return jsonResponse({ credits: [] });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)) {
      return jsonResponse({ photos: [] });
    }
    if (url.endsWith(`/api/admin/trr-api/people/${PERSON_ID}`)) {
      return jsonResponse({
        person: {
          id: PERSON_ID,
          full_name: "Andy Cohen",
          known_for: null,
          external_ids: {},
          created_at: "2026-02-24T00:00:00.000Z",
          updated_at: "2026-02-24T00:00:00.000Z",
        },
      });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/cover-photo`)) {
      return jsonResponse({ coverPhoto: null });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/fandom`)) {
      if (overrides.fandom) return overrides.fandom(url);
      return jsonResponse({ fandomData: [], count: 0 });
    }
    if (url.includes(`/api/admin/trr-api/shows/${SHOW_ID}/bravo/videos`)) {
      if (overrides.videos) return overrides.videos(url);
      return jsonResponse({ videos: [] });
    }
    if (url.includes(`/api/admin/trr-api/shows/${SHOW_ID}/bravo/news`)) {
      if (overrides.news) return overrides.news(url);
      return jsonResponse({ news: [] });
    }
    return jsonResponse({ error: "not mocked" }, 404);
  });

describe("people page tab runtime behavior", () => {
  beforeEach(() => {
    mocks.params.personId = PERSON_ID;
    mocks.pathname = `/admin/trr-shows/people/${PERSON_ID}`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}`);
    mocks.replace.mockReset();
    mocks.guardState.checking = false;
    mocks.guardState.hasAccess = true;
    mocks.fetchAdminWithAuth.mockReset();
    mocks.getClientAuthHeaders.mockReset();
    mocks.fetchAdminWithAuth.mockResolvedValue(jsonResponse({ seasons: [] }));
    mocks.getClientAuthHeaders.mockResolvedValue({ authorization: "Bearer test-token" });
  });

  it("lazy-loads fandom/videos/news only when their tabs open", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await screen.findByRole("heading", { name: "Andy Cohen" });

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.some((url) => url.includes("/fandom"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/bravo/videos"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/bravo/news"))).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /^Fandom/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/fandom"))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /^Videos/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/bravo/videos"))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /^News/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/bravo/news"))).toBe(true);
    });
  });

  it("keeps news data available even when videos fetch fails", async () => {
    const fetchMock = createFetchMock({
      videos: () => jsonResponse({ error: "videos boom" }, 500),
      news: () =>
        jsonResponse({
          news: [
            {
              article_url: "https://example.com/story-1",
              headline: "Andy News Story",
              image_url: null,
              published_at: "2026-02-20T12:00:00.000Z",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);
    await screen.findByRole("heading", { name: "Andy Cohen" });

    fireEvent.click(screen.getByRole("button", { name: /^Videos/i }));
    await screen.findByText(/videos boom|failed to fetch person videos/i);

    fireEvent.click(screen.getByRole("button", { name: /^News/i }));
    await screen.findByText("Andy News Story");
  });

  it("renders fandom error and supports retry from the fandom tab", async () => {
    let fandomAttempt = 0;
    const fetchMock = createFetchMock({
      fandom: () => {
        fandomAttempt += 1;
        if (fandomAttempt === 1) {
          return jsonResponse({ error: "fandom failed" }, 500);
        }
        return jsonResponse({
          fandomData: [
            {
              id: "fandom-1",
              source: "fandom",
              source_url: "https://fandom.example.com/andy",
              page_title: "Andy Cohen",
              scraped_at: "2026-02-24T00:00:00.000Z",
              summary: "Host and producer.",
            },
          ],
          count: 1,
        });
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);
    await screen.findByRole("heading", { name: "Andy Cohen" });

    fireEvent.click(screen.getByRole("button", { name: /^Fandom/i }));
    await screen.findByText(/fandom failed|failed to fetch fandom data/i);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByRole("heading", { name: "Andy Cohen" });
    await screen.findByText("Host and producer.");
  });

  it("renders credits show -> season -> episode accordion content", async () => {
    const fetchMock = createFetchMock({
      credits: () =>
        jsonResponse({
          credits: [],
          show_scope: {
            show_id: SHOW_ID,
            show_name: "The Real Housewives of Salt Lake City",
            cast_groups: [
              {
                credit_id: "credit-host",
                role: "Host",
                credit_category: "Self",
                billing_order: 1,
                source_type: "imdb",
                total_episodes: 1,
                seasons: [
                  {
                    season_number: 1,
                    episode_count: 1,
                    episodes: [
                      {
                        episode_id: "ep-1",
                        episode_number: 1,
                        episode_name: "Pilot",
                        appearance_type: "appears",
                      },
                    ],
                  },
                ],
              },
            ],
            crew_groups: [],
            cast_non_episodic: [],
            crew_non_episodic: [],
            other_show_credits: [],
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);
    await screen.findByRole("heading", { name: "Andy Cohen" });

    fireEvent.click(screen.getByRole("button", { name: /^Credits/i }));
    await screen.findByText("Cast");
    const showHeaders = await screen.findAllByText(/Real Housewives of Salt Lake City/i);
    expect(showHeaders.length).toBeGreaterThan(0);
    await screen.findByText(/Season\s+1\s+•\s+1 episode/i);
    await screen.findByText("S1E01 • Pilot");
  });
});
