import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: async () => ({ uid: "admin" }) }));
vi.mock("@/lib/server/admin/reddit-sources-repository", () => ({ getRedditCommunityById: async () => ({ id: "community", subreddit: "Show", trr_show_id: "show", trr_show_name: "Show", is_show_focused: true }) }));
vi.mock("@/lib/admin/reddit-flair-targeting", () => ({ resolveCommunityFlairModes: () => ({ analysisFlairs: [], analysisAllFlairs: [] }) }));
vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({ getShowById: async () => ({ name: "Show", alternative_names: [] }), getCastNamesByShowId: async () => [] }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({ fetchSocialBackendJson: backend, socialProxyErrorResponse: (error: Error) => NextResponse.json({ error: error.message }, { status: 500 }) }));
import { POST } from "@/app/api/admin/reddit/communities/[communityId]/discover/route";
const communityId = "11111111-1111-4111-8111-111111111111";
const seasonId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ communityId }) };
function request(body: Record<string, unknown>) { return new NextRequest(`http://localhost/api/admin/reddit/communities/${communityId}/discover`, { method: "POST", body: JSON.stringify({ season_id: seasonId, wait: false, ...body }) }); }
describe("Reddit discovery mutation adapter", () => {
  beforeEach(() => { backend.mockReset(); backend.mockImplementation(async (path: string) => path === "/reddit/runs" ? { run: { run_id: "33333333-3333-4333-8333-333333333333", status: "queued" } } : {}); });
  it("normalizes the force_rescrape alias without creating a conflicting missing policy", async () => { const response = await POST(request({ force_rescrape: true }), context); expect(response.status).toBe(200); const call = backend.mock.calls.find(call => call[0] === "/reddit/runs"); expect(JSON.parse(call![1].body)).toMatchObject({ refresh_policy: "force", force_rescrape: true }); });
  it("maps POST exhaustive_window to the compatibility query and preserves selected work", async () => { const response = await POST(request({ exhaustive_window: true, selected_post_ids: ["abc123"], requested_phases: ["comments", "media"] }), context); expect(response.status).toBe(200); const call = backend.mock.calls.find(call => call[0] === "/reddit/runs"); expect(JSON.parse(call![1].body)).toMatchObject({ exhaustive_window: true, selected_post_ids: ["abc123"], requested_phases: ["comments", "media"] }); expect(JSON.parse(call![1].body)).not.toHaveProperty("run_config_hash"); });
  it("rejects conflicting policies before starting a run", async () => { const response = await POST(request({ force_rescrape: true, refresh_policy: "missing" }), context); expect(response.status).toBe(400); expect(backend).not.toHaveBeenCalled(); });
  it("does not widen malformed selected-post inputs into a whole-season capture", async () => { const response = await POST(request({ selected_post_ids: "abc123" }), context); expect(response.status).toBe(400); expect(backend).not.toHaveBeenCalled(); });
});
