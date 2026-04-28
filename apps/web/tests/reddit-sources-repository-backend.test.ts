import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const { fetchAdminBackendJsonMock, queryMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import {
  createRedditCommunity,
  listRedditCommunities,
  updateRedditThread,
} from "@/lib/server/admin/reddit-sources-repository";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const COMMUNITY_ID = "33333333-3333-4333-8333-333333333333";
const THREAD_ID = "44444444-4444-4444-8444-444444444444";
const AUTH_CONTEXT = { firebaseUid: "firebase-admin-1", isAdmin: true };

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
    const body = JSON.parse(fetchAdminBackendJsonMock.mock.calls[0]?.[1]?.body as string);
    expect(body).toMatchObject({
      trr_show_id: SHOW_ID,
      subreddit: "BravoRealHousewives",
      network_focus_targets: ["Bravo"],
    });
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
    const body = JSON.parse(fetchAdminBackendJsonMock.mock.calls[0]?.[1]?.body as string);
    expect(body).toMatchObject({
      title: "Updated episode thread",
      score: 2,
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("keeps migrated community/thread functions free of app direct SQL", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/lib/server/admin/reddit-sources-repository.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");
    const migratedSpan = contents.slice(
      contents.indexOf("export async function listRedditCommunities"),
      contents.indexOf("export interface RedditPostMatchContextRow"),
    );

    expect(contents).not.toMatch(/\bwithAuthTransaction\b/);
    expect(migratedSpan).not.toMatch(/\bclient\.query\s*\(/);
    expect(migratedSpan).not.toMatch(/\bquery\s*(?:<|\()/);
    expect(migratedSpan).not.toMatch(/\badmin\.reddit_communities\b/);
    expect(migratedSpan).not.toMatch(/\bFROM\s+\$\{THREADS_TABLE\}/i);
  });
});
