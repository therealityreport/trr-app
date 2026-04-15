import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PersonPage from "@/app/admin/trr-shows/people/[personId]/PersonPageClient";
import { resetAdminGetCoordinatorForTests } from "@/lib/admin/admin-fetch";

const mocks = vi.hoisted(() => {
  const personId = "11111111-2222-3333-4444-555555555555";
  const showId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const replace = vi.fn();
  return {
    personId,
    showId,
    params: { personId },
    pathname: `/people/${personId}/overview`,
    searchParams: new URLSearchParams(`showId=${showId}&tab=overview`),
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
  resolvePersonSlug?: (url: string) => Response | Promise<Response>;
  resolveShowSlug?: (url: string) => Response | Promise<Response>;
  person?: (url: string) => Response;
  credits?: (url: string) => Response;
  fandom?: (url: string) => Response;
  videos?: (url: string) => Response;
  news?: (url: string) => Response;
  googleSync?: (url: string) => Response;
  googleSyncStatus?: (url: string) => Response;
  photos?: (url: string) => Response;
};

const createFetchMock = (overrides: FetchOverrides = {}) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);

    if (url.startsWith("/api/admin/trr-api/people/resolve-slug?")) {
      if (overrides.resolvePersonSlug) return await overrides.resolvePersonSlug(url);
      return jsonResponse({
        resolved: {
          person_id: PERSON_ID,
          canonical_slug: "andy-cohen",
          slug: "andy-cohen",
        },
        show_id: SHOW_ID,
      });
    }
    if (url.startsWith("/api/admin/trr-api/shows/resolve-slug?")) {
      if (overrides.resolveShowSlug) return await overrides.resolveShowSlug(url);
      return jsonResponse({
        resolved: {
          show_id: SHOW_ID,
          canonical_slug: "the-real-housewives",
          slug: "the-real-housewives",
          show_name: "The Real Housewives",
        },
      });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)) {
      if (overrides.credits) return overrides.credits(url);
      return jsonResponse({ credits: [] });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)) {
      if (overrides.photos) return overrides.photos(url);
      return jsonResponse({
        photos: [],
        pagination: { limit: 120, offset: 0, count: 0, total_count: 0, next_offset: 0, has_more: false },
      });
    }
    if (url.startsWith(`/api/admin/trr-api/people/${PERSON_ID}`) && !url.includes("/photos") && !url.includes("/cover-photo")) {
      if (overrides.person) return overrides.person(url);
      return jsonResponse({
        person: {
          id: PERSON_ID,
          full_name: "Andy Cohen",
          known_for: null,
          external_ids: {},
          alternative_names: {
            tmdb: ["Andrew Cohen"],
            imdb: ["Andy C."],
          },
          created_at: "2026-02-24T00:00:00.000Z",
          updated_at: "2026-02-24T00:00:00.000Z",
        },
      });
    }
    if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/external-ids`)) {
      return jsonResponse({
        external_ids: [
          {
            id: 1,
            source_id: "tmdb",
            external_id: "1686599",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: "2026-02-24T00:00:00.000Z",
          },
          {
            id: 2,
            source_id: "imdb",
            external_id: "nm4541706",
            is_primary: true,
            valid_from: null,
            valid_to: null,
            observed_at: "2026-02-24T00:00:00.000Z",
          },
        ],
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
    if (url.includes(`/api/admin/trr-api/shows/${SHOW_ID}/google-news/sync/`)) {
      if (overrides.googleSyncStatus) return overrides.googleSyncStatus(url);
      return jsonResponse({ status: "completed", result: { synced: true } });
    }
    if (url.includes(`/api/admin/trr-api/shows/${SHOW_ID}/google-news/sync`)) {
      if (overrides.googleSync) return overrides.googleSync(url);
      return jsonResponse({ show_id: SHOW_ID, queued: true, job_id: "job-1", status: "queued" });
    }
    if (url.includes(`/api/admin/trr-api/shows/${SHOW_ID}/news`)) {
      if (overrides.news) return overrides.news(url);
      return jsonResponse({
        news: [],
        count: 0,
        total_count: 0,
        next_cursor: null,
        facets: { sources: [], people: [], topics: [], seasons: [] },
      });
    }
    return jsonResponse({ error: "not mocked" }, 404);
  });

const waitForPersonHeading = async (name: string) => {
  const headings = await screen.findAllByRole("heading", { name });
  expect(headings.length).toBeGreaterThan(0);
  return headings[0];
};

const waitForPrimaryGalleryBootstrap = async (fetchMock: ReturnType<typeof vi.fn>) => {
  await waitFor(() => {
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)),
    ).toBe(true);
  });
};

describe("people page tab runtime behavior", () => {
  beforeEach(() => {
    resetAdminGetCoordinatorForTests();
    mocks.params.personId = PERSON_ID;
    mocks.pathname = `/people/${PERSON_ID}/overview`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}&tab=overview`);
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

    await waitForPersonHeading("Andy Cohen");

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(
      requestedUrls.filter((url) => url.includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)).length
    ).toBe(1);
    expect(requestedUrls.some((url) => url.includes("/fandom"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/bravo/videos"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes(`/shows/${SHOW_ID}/news`))).toBe(false);

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
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/shows/${SHOW_ID}/google-news/sync`))).toBe(
        true
      );
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/shows/${SHOW_ID}/news`))).toBe(true);
    });
  });

  it("renders profile refresh controls and alternative names on the overview tab", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    expect(screen.getByRole("button", { name: "Refresh Info & Credits" })).toBeInTheDocument();
    expect(screen.getByText("Alternative Names")).toBeInTheDocument();
    expect(screen.getByText("Andrew Cohen")).toBeInTheDocument();
    expect(screen.getByText("Andy C.")).toBeInTheDocument();
  });

  it("switches the social tab between linked Instagram, Facebook, and YouTube handles", async () => {
    mocks.pathname = `/people/${PERSON_ID}/social`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}&tab=social`);
    const fetchMock = createFetchMock({
      person: () =>
        jsonResponse({
          person: {
            id: PERSON_ID,
            full_name: "Andy Cohen",
            known_for: null,
            external_ids: {
              instagram: "andycohen",
              facebook: "andycohen",
              youtube: "@andycohen",
            },
            alternative_names: {},
            created_at: "2026-02-24T00:00:00.000Z",
            updated_at: "2026-02-24T00:00:00.000Z",
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/people/") && url.includes("/social-growth?handle=andycohen")) {
        return jsonResponse({
          username: "andycohen",
          account_handle: "andycohen",
          platform: "instagram",
          scraped_at: "2026-04-08T12:00:00Z",
          freshness_status: "fresh",
          profile_stats: {
            followers: 100,
            following: 20,
            media_count: 5,
            engagement_rate: "1.2%",
            average_likes: 10,
            average_comments: 2,
          },
          rankings: { sb_rank: "1st", followers_rank: "2nd", engagement_rate_rank: "3rd", grade: "A" },
          daily_channel_metrics_60day: { period: "Last 1 Day", row_count: 1, headers: ["Date"], data: [{ Date: "2026-04-08" }] },
          daily_total_followers_chart: null,
        });
      }
      if (url.includes("/api/admin/trr-api/social/profiles/facebook/andycohen/socialblade")) {
        return jsonResponse({
          username: "andycohen",
          account_handle: "andycohen",
          platform: "facebook",
          scraped_at: "2026-04-08T12:00:00Z",
          freshness_status: "fresh",
          profile_stats_labels: { followers: "Likes", following: "Talking About", media_count: "Posts" },
          profile_stats: {
            followers: 250,
            following: 80,
            media_count: 12,
            engagement_rate: "2.4%",
            average_likes: 16,
            average_comments: 3,
          },
          rankings: { sb_rank: "4th", followers_rank: "5th", engagement_rate_rank: "6th", grade: "A-" },
          daily_channel_metrics_60day: { period: "Last 1 Day", row_count: 1, headers: ["Date"], data: [{ Date: "2026-04-08" }] },
          daily_total_followers_chart: null,
        });
      }
      if (url.includes("/api/admin/trr-api/social/profiles/youtube/andycohen/socialblade")) {
        return jsonResponse({
          username: "andycohen",
          account_handle: "andycohen",
          platform: "youtube",
          scraped_at: "2026-04-08T12:00:00Z",
          freshness_status: "fresh",
          profile_stats_labels: { followers: "Subscribers", following: "Views", media_count: "Videos" },
          profile_stats: {
            followers: 500,
            following: 1200,
            media_count: 18,
            engagement_rate: "4.6%",
            average_likes: 200,
            average_comments: 9,
          },
          rankings: { sb_rank: "7th", followers_rank: "8th", engagement_rate_rank: "9th", grade: "B+" },
          daily_channel_metrics_60day: { period: "Last 1 Day", row_count: 1, headers: ["Date"], data: [{ Date: "2026-04-08" }] },
          daily_total_followers_chart: null,
        });
      }
      return jsonResponse({ seasons: [] });
    });

    render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    await screen.findByRole("button", { name: "Instagram · @andycohen" });

    expect(screen.getByRole("link", { name: "Open account page" })).toHaveAttribute(
      "href",
      "/admin/social/instagram/andycohen/socialblade",
    );

    fireEvent.click(screen.getByRole("button", { name: "Facebook · @andycohen" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Open account page" })).toHaveAttribute(
        "href",
        "/admin/social/facebook/andycohen/socialblade",
      );
    });
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([input]) =>
        String(input).includes("/api/admin/trr-api/social/profiles/facebook/andycohen/socialblade"),
      ),
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Youtube · @andycohen" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Open account page" })).toHaveAttribute(
        "href",
        "/admin/social/youtube/andycohen/socialblade",
      );
    });
  });

  it("shows saved total on the gallery tab and ignores operations-health failures", async () => {
    mocks.pathname = `/people/${PERSON_ID}/gallery`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}&tab=gallery`);
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/operations/health")) {
        return jsonResponse({ error: "boom" }, 500);
      }
      return jsonResponse({ seasons: [] });
    });
    const fetchMock = createFetchMock({
      photos: () =>
        jsonResponse({
          photos: [
            {
              id: "photo-1",
              person_id: PERSON_ID,
              source: "imdb",
              url: "https://example.com/source-1.jpg",
              hosted_url: "https://cdn.example.com/photo-1.jpg",
              hosted_content_type: "image/jpeg",
              caption: "Brandi portrait",
              width: 640,
              height: 480,
              thumbnail_focus_x: null,
              thumbnail_focus_y: null,
              thumbnail_zoom: null,
              thumbnail_crop_mode: null,
              people_count: 1,
              people_count_source: "manual",
              face_boxes: [],
              face_crops: [],
              bucket_type: null,
              bucket_key: null,
              bucket_label: null,
              resolved_show_id: SHOW_ID,
              resolved_show_name: "The Real Housewives of Beverly Hills",
              media_asset_id: null,
              origin: "cast_photos",
              source_page_url: null,
            },
          ],
          pagination: {
            limit: 120,
            offset: 0,
            count: 1,
            total_count: 347,
            next_offset: 120,
            has_more: true,
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    const savedTotal = await screen.findByText("Saved total: 347 photos");
    expect(savedTotal).toBeInTheDocument();
    expect(savedTotal.parentElement).toHaveTextContent(/0 filtered,\s*1\+ loaded/i);
    expect(screen.queryByText(/Import target:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Failed to load active admin operations/i)).not.toBeInTheDocument();
  });

  it("renders the person shell before gallery completes and uses the exact-count primary slice", async () => {
    mocks.pathname = `/people/${PERSON_ID}/gallery`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}&tab=gallery`);
    let resolvePhotos: ((response: Response) => void) | null = null;
    mocks.fetchAdminWithAuth.mockResolvedValue(jsonResponse({ active_operations: [] }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input);

      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)) {
        return await new Promise<Response>((resolve) => {
          resolvePhotos = resolve;
        });
      }
      if (url.startsWith(`/api/admin/trr-api/people/${PERSON_ID}`) && !url.includes("/photos") && !url.includes("/cover-photo")) {
        return jsonResponse({
          person: {
            id: PERSON_ID,
            full_name: "Andy Cohen",
            known_for: null,
            external_ids: {},
            alternative_names: {
              tmdb: ["Andrew Cohen"],
            },
            created_at: "2026-02-24T00:00:00.000Z",
            updated_at: "2026-02-24T00:00:00.000Z",
          },
        });
      }
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/cover-photo`)) {
        return jsonResponse({ coverPhoto: null });
      }
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/external-ids`)) {
        return jsonResponse({ external_ids: [] });
      }
      return jsonResponse({ error: "not mocked" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    expect(screen.queryByText("Loading person data...")).not.toBeInTheDocument();

    const photosRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`),
    );
    expect(String(photosRequest?.[0])).toContain("limit=48");
    expect(String(photosRequest?.[0])).not.toContain("include_total_count=false");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/cover-photo"))).toBe(false);
    expect(
      mocks.fetchAdminWithAuth.mock.calls.some(([url]) =>
        String(url).includes("/api/admin/trr-api/operations/health"),
      ),
    ).toBe(false);

    resolvePhotos?.(
      jsonResponse({
        photos: [],
        pagination: {
          limit: 48,
          offset: 0,
          count: 0,
          total_count: 0,
          total_count_status: "exact",
          next_offset: 0,
          has_more: false,
        },
      }),
    );

    await screen.findByText("Saved total: 0 photos");
    expect(screen.queryByText("Exact saved count is loading in the background.")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/cover-photo"))).toBe(true);
    });
  });

  it("serializes slug credits bootstrap as resolve person -> person detail -> gallery -> credits", async () => {
    mocks.params.personId = "casey-allan";
    mocks.pathname = "/people/casey-allan/credits";
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}`);

    let resolvePersonSlug: ((response: Response) => void) | null = null;
    let resolvePerson: ((response: Response) => void) | null = null;
    let resolvePhotos: ((response: Response) => void) | null = null;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : String(input);

      if (url.startsWith("/api/admin/trr-api/people/resolve-slug?")) {
        return await new Promise<Response>((resolve) => {
          resolvePersonSlug = resolve;
        });
      }
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)) {
        return await new Promise<Response>((resolve) => {
          resolvePhotos = resolve;
        });
      }
      if (url.startsWith(`/api/admin/trr-api/people/${PERSON_ID}`) && !url.includes("/photos") && !url.includes("/cover-photo")) {
        return await new Promise<Response>((resolve) => {
          resolvePerson = resolve;
        });
      }
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)) {
        return jsonResponse({ credits: [] });
      }
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/cover-photo`)) {
        return jsonResponse({ coverPhoto: null });
      }
      return jsonResponse({ error: "not mocked" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).startsWith("/api/admin/trr-api/people/resolve-slug?")),
      ).toBe(true);
    });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)),
    ).toBe(false);

    resolvePersonSlug?.(
      jsonResponse({
        resolved: {
          person_id: PERSON_ID,
          canonical_slug: "casey-allan",
          slug: "casey-allan",
        },
        show_id: SHOW_ID,
      }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url]) =>
            String(url).startsWith(`/api/admin/trr-api/people/${PERSON_ID}`) &&
            !String(url).includes("/photos") &&
            !String(url).includes("/cover-photo"),
        ),
      ).toBe(true);
    });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`)),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)),
    ).toBe(false);

    resolvePerson?.(
      jsonResponse({
        person: {
          id: PERSON_ID,
          full_name: "Casey Allan",
          known_for: null,
          external_ids: {},
          alternative_names: {},
          created_at: "2026-02-24T00:00:00.000Z",
          updated_at: "2026-02-24T00:00:00.000Z",
        },
      }),
    );

    await waitForPersonHeading("Casey Allan");
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/photos`))).toBe(
        true,
      );
    });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)),
    ).toBe(false);

    resolvePhotos?.(
      jsonResponse({
        photos: [],
        pagination: {
          limit: 48,
          offset: 0,
          count: 0,
          total_count: 0,
          total_count_status: "exact",
          next_offset: 0,
          has_more: false,
        },
      }),
    );

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`))).toBe(
        true,
      );
    });
  });

  it("waits for show slug resolution before the first credits fetch so credits only load once", async () => {
    mocks.params.personId = "casey-allan";
    mocks.pathname = "/people/casey-allan/credits";
    mocks.searchParams = new URLSearchParams("showId=rhoslc");

    let resolveShowSlug: ((response: Response) => void) | null = null;
    const fetchMock = createFetchMock({
      resolvePersonSlug: async () =>
        jsonResponse({
          resolved: {
            person_id: PERSON_ID,
            canonical_slug: "casey-allan",
            slug: "casey-allan",
          },
          show_id: null,
        }),
      resolveShowSlug: async () =>
        await new Promise<Response>((resolve) => {
          resolveShowSlug = resolve;
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    await waitForPrimaryGalleryBootstrap(fetchMock);

    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)).length,
    ).toBe(0);

    resolveShowSlug?.(
      jsonResponse({
        resolved: {
          show_id: SHOW_ID,
          canonical_slug: "rhoslc",
          slug: "rhoslc",
          show_name: "The Real Housewives of Salt Lake City",
        },
      }),
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)).length,
      ).toBe(1);
    });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)).length,
    ).toBe(1);
  });

  it("keeps retryable credits saturation hidden while a follow-up retry is still in flight", async () => {
    mocks.pathname = `/people/${PERSON_ID}/credits`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}`);

    let creditsAttempts = 0;
    let resolveRetrySuccess: ((response: Response) => void) | null = null;
    const fetchMock = createFetchMock({
      credits: async () => {
        creditsAttempts += 1;
        if (creditsAttempts === 1) {
          return jsonResponse(
            {
              error: "Database service unavailable. Check runtime DB connectivity and pool sizing.",
              code: "DATABASE_SERVICE_UNAVAILABLE",
              reason: "pool_capacity",
              retryable: true,
              retry_after_ms: 1,
            },
            503,
          );
        }
        return await new Promise<Response>((resolve) => {
          resolveRetrySuccess = resolve;
        });
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<PersonPage />);

    await waitForPersonHeading("Andy Cohen");
    await waitForPrimaryGalleryBootstrap(fetchMock);

    await waitFor(() => {
      expect(creditsAttempts).toBe(2);
    });
    expect(
      screen.queryByText("Database service unavailable. Check runtime DB connectivity and pool sizing."),
    ).not.toBeInTheDocument();

    resolveRetrySuccess?.(
      jsonResponse({
        credits: [
          {
            id: "credit-1",
            show_id: SHOW_ID,
            person_id: PERSON_ID,
            show_name: "The Real Housewives of Salt Lake City",
            role: "Producer",
            billing_order: 1,
            credit_category: "Producers",
            source_type: "fullcredits_html",
            external_imdb_id: null,
            external_url: null,
            metadata: null,
          },
        ],
        credits_by_show: [
          {
            show_id: SHOW_ID,
            show_name: "The Real Housewives of Salt Lake City",
            cast_groups: [],
            crew_groups: [],
            cast_non_episodic: [],
            crew_non_episodic: [],
          },
        ],
      }),
    );

    await waitFor(() => {
      expect(container.textContent ?? "").toContain("Credits (1)");
    });
    expect(
      screen.queryByText("Database service unavailable. Check runtime DB connectivity and pool sizing."),
    ).not.toBeInTheDocument();
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
          count: 1,
          total_count: 1,
          next_cursor: null,
          facets: {
            sources: [{ token: "example.com", label: "Example", count: 1 }],
            people: [{ person_id: PERSON_ID, person_name: "Andy Cohen", count: 1 }],
            topics: [],
            seasons: [],
          },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);
    await waitForPersonHeading("Andy Cohen");

    fireEvent.click(screen.getByRole("button", { name: /^Videos/i }));
    await screen.findByText(/videos boom|failed to fetch person videos/i);

    fireEvent.click(screen.getByRole("button", { name: /^News/i }));
    await screen.findByText("Andy News Story");
  });

  it("shows External IDs and Canonical Profile in Settings instead of Overview", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    render(<PersonPage />);
    await waitForPersonHeading("Andy Cohen");

    expect(screen.queryByRole("heading", { name: "External IDs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canonical Profile" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    await screen.findByRole("heading", { name: "External IDs" });
    await screen.findByRole("heading", { name: "Canonical Profile" });
    await screen.findByText(/1\.\s+IMDb/i);
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
    await waitForPersonHeading("Andy Cohen");
    await waitForPrimaryGalleryBootstrap(fetchMock);

    fireEvent.click(screen.getByRole("button", { name: /^Fandom/i }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).includes("/fandom")).length,
      ).toBeGreaterThanOrEqual(1);
    });
    await screen.findByRole("button", { name: "Refresh" });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).includes("/fandom")).length,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders credits show -> season -> episode accordion content", async () => {
    mocks.pathname = `/people/${PERSON_ID}/credits`;
    mocks.searchParams = new URLSearchParams(`showId=${SHOW_ID}`);
    const fetchMock = createFetchMock({
      credits: () =>
        jsonResponse({
          credits: [],
          credits_by_show: [
            {
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
            },
          ],
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

    const { container } = render(<PersonPage />);
    await waitForPersonHeading("Andy Cohen");
    await waitForPrimaryGalleryBootstrap(fetchMock);
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes(`/api/admin/trr-api/people/${PERSON_ID}/credits`)),
      ).toBe(true);
      expect(container.querySelectorAll("details").length).toBeGreaterThan(0);
    });

    for (const detail of Array.from(container.querySelectorAll("details"))) {
      detail.setAttribute("open", "");
    }

    await waitFor(() => {
      expect(container.textContent ?? "").toContain("Host");
      expect(container.textContent ?? "").toContain("Season 1");
      expect(container.textContent ?? "").toContain("S1E01 • Pilot");
    });
  });
});
