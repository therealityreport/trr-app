import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, queryMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: vi.fn(({ fallbackMessage }) => new Error(fallbackMessage)),
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import {
  createRedditCommunity,
  getStoredPostCountsByCommunityAndSeason,
  getStoredWindowPostsByCommunityAndSeason,
  listRedditCommunities,
  resolveRedditPostDetailBySlug,
  updateRedditThread,
} from "@/lib/server/admin/reddit-sources-repository";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const SEASON_ID = "66666666-6666-4666-8666-666666666666";
const THREAD_ID = "44444444-4444-4444-8444-444444444444";
const AUTH_CONTEXT = { firebaseUid: "firebase-admin-1", isAdmin: true };
const VERIFIED_ADMIN_CONTEXT = {
  uid: "firebase-admin-1",
  email: "admin@example.com",
  verifiedAt: 1_700_000_000_000,
};

const communityRow = {
  id: COMMUNITY_ID,
  trr_show_id: SHOW_ID,
  trr_show_name: "The Real Housewives of Salt Lake City",
  subreddit: "BravoRealHousewives",
  display_name: "BravoRealHousewives",
  notes: null,
  post_flairs: [],
  analysis_flairs: [],
  analysis_all_flairs: [],
  is_show_focused: false,
  network_focus_targets: ["Bravo"],
  franchise_focus_targets: ["Real Housewives"],
  episode_title_patterns: ["Live Episode Discussion"],
  post_flair_categories: {},
  post_flair_assignments: {},
  post_flairs_updated_at: null,
  is_active: true,
  created_by_firebase_uid: "firebase-admin-1",
  created_at: "2026-04-27T00:00:00.000Z",
  updated_at: "2026-04-27T00:00:00.000Z",
};

const threadRow = {
  id: THREAD_ID,
  community_id: COMMUNITY_ID,
  trr_show_id: SHOW_ID,
  trr_show_name: "The Real Housewives of Salt Lake City",
  trr_season_id: null,
  source_kind: "manual",
  reddit_post_id: "post-1",
  title: "Updated episode thread",
  url: "https://www.reddit.com/r/BravoRealHousewives/comments/post-1/thread-title/",
  permalink: null,
  author: null,
  score: 2,
  num_comments: 0,
  posted_at: null,
  notes: null,
  created_by_firebase_uid: "firebase-admin-1",
  created_at: "2026-04-27T00:00:00.000Z",
  updated_at: "2026-04-27T00:00:00.000Z",
};

describe("reddit sources repository backend boundary", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    queryMock.mockReset();
  });

  it("lists communities through the admin backend proxy", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { communities: [communityRow] },
      durationMs: 4,
    });

    const communities = await listRedditCommunities({ trrShowId: SHOW_ID });

    expect(communities).toHaveLength(1);
    expect(communities[0]?.id).toBe(COMMUNITY_ID);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/reddit/communities",
      expect.objectContaining({
        queryString: expect.stringContaining(`trr_show_id=${SHOW_ID}`),
        routeName: "reddit-sources:list-communities",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("creates communities through the backend with admin identity headers", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 201,
      data: { community: communityRow },
      durationMs: 8,
    });

    const community = await createRedditCommunity(AUTH_CONTEXT, {
      trrShowId: SHOW_ID,
      trrShowName: "The Real Housewives of Salt Lake City",
      subreddit: "BravoRealHousewives",
      displayName: "BravoRealHousewives",
      isShowFocused: false,
      networkFocusTargets: ["Bravo"],
      franchiseFocusTargets: ["Real Housewives"],
      episodeTitlePatterns: ["Live Episode Discussion"],
    });

    expect(community.id).toBe(COMMUNITY_ID);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/reddit/communities",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-TRR-Admin-User-Uid": "firebase-admin-1",
        }),
        routeName: "reddit-sources:create-community",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("updates threads through the backend with admin identity headers", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { thread: threadRow },
      durationMs: 5,
    });

    const thread = await updateRedditThread(AUTH_CONTEXT, THREAD_ID, {
      title: "Updated episode thread",
      score: 2,
    });

    expect(thread?.id).toBe(THREAD_ID);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/reddit/threads/${THREAD_ID}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-TRR-Admin-User-Uid": "firebase-admin-1",
        }),
        routeName: "reddit-sources:update-thread",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated v2 Reddit resolver without a local SQL fallback", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        reddit_post_id: "post-1",
        detail_slug: "episode-thread--u-bravofan",
        collision: false,
        post: {
          title: "Episode Thread",
          author: "BravoFan",
          posted_at: "2026-03-26T00:00:00Z",
          url: "https://reddit.com/r/show/comments/post-1",
          permalink: "/r/show/comments/post-1",
        },
      },
      durationMs: 6,
    });

    const resolved = await resolveRedditPostDetailBySlug({
      communityId: COMMUNITY_ID,
      seasonId: SEASON_ID,
      windowKey: "episode-1",
      titleSlug: "episode-thread",
      authorSlug: "bravofan",
      adminContext: VERIFIED_ADMIN_CONTEXT,
    });

    expect(resolved).toMatchObject({
      reddit_post_id: "post-1",
      detail_slug: "episode-thread--u-bravofan",
      title: "Episode Thread",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/reddit/posts/resolve",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: VERIFIED_ADMIN_CONTEXT,
        queryString: expect.stringContaining(`community_id=${COMMUNITY_ID}`),
        routeName: "reddit-sources:resolve-post",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated v2 post-window contracts with normalized pagination", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({
        status: 200,
        data: {
          counts: { "episode-1": 2 },
          total_posts: 3,
          tracked_total_posts: 2,
          tracked_flair_counts: [],
          pending_tracked_flair_counts: [],
          flair_counts: [],
        },
        durationMs: 3,
      })
      .mockResolvedValueOnce({
        status: 200,
        data: {
          pagination: { page: 1, per_page: 200, total_count: 1 },
          posts: [],
        },
        durationMs: 3,
      });

    const counts = await getStoredPostCountsByCommunityAndSeason(
      COMMUNITY_ID,
      SEASON_ID,
      { adminContext: VERIFIED_ADMIN_CONTEXT },
    );
    const posts = await getStoredWindowPostsByCommunityAndSeason(
      COMMUNITY_ID,
      SEASON_ID,
      "episode-1",
      0,
      1_000,
      { adminContext: VERIFIED_ADMIN_CONTEXT },
    );

    expect(counts.counts).toEqual({ "episode-1": 2 });
    expect(posts.pagination).toEqual({ page: 1, per_page: 200, total_count: 1 });
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      1,
      "/admin/reddit/post-window-counts",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: VERIFIED_ADMIN_CONTEXT,
        routeName: "reddit-sources:post-window-counts",
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/reddit/post-windows",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: VERIFIED_ADMIN_CONTEXT,
        queryString: expect.stringContaining("page=1&per_page=200"),
        routeName: "reddit-sources:post-windows",
      }),
    );
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("removes the governed Reddit detail and post-window SQL helpers", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/lib/server/admin/reddit-sources-repository.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");
    const governedSpan = contents.slice(contents.indexOf("export async function resolveRedditPostDetailBySlug"));

    expect(contents).not.toContain("getRedditPostDetailsByCommunityAndSeason");
    expect(governedSpan).not.toMatch(/\bquery\s*(?:<|\()/);
    expect(governedSpan).not.toMatch(/social\.reddit_(posts|period_post_matches|comments|media_mirrors)/);
    expect(governedSpan).not.toContain("buildCanonicalRedditContainerSql");
  });
});
