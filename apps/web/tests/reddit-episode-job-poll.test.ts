import { afterEach, describe, expect, it, vi } from "vitest";
const { backend } = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({ fetchSocialBackendJson: backend }));
import { discoverEpisodeDiscussionThreads } from "@/lib/server/admin/reddit-discovery-service";
const input = { communityId: "community", subreddit: "Show", showName: "Show", seasonNumber: 1, rules: { subreddit: "Show", showName: "Show" } };
describe("episode workflow polling", () => {
  afterEach(() => { backend.mockReset(); vi.useRealTimers(); });
  it("polls a queued job and returns only its completed discovery result", async () => { backend.mockResolvedValueOnce({ job_id: "job-1", status: "queued" }).mockResolvedValueOnce({ id: "job-1", state: "completed", result: { candidates: [] } }); expect(await discoverEpisodeDiscussionThreads(input)).toEqual({ candidates: [] }); expect(backend).toHaveBeenLastCalledWith("/reddit/jobs/job-1", expect.objectContaining({ retries: 0 })); });
  it("reports failed jobs as errors", async () => { backend.mockResolvedValueOnce({ job_id: "job-1", status: "queued" }).mockResolvedValueOnce({ state: "failed", error: "Reddit temporarily unavailable" }); await expect(discoverEpisodeDiscussionThreads(input)).rejects.toThrow("Reddit temporarily unavailable"); });
  it("reports unresolved work at the deadline without cancelling the job", async () => { vi.useFakeTimers(); backend.mockResolvedValueOnce({ job_id: "job-1", status: "queued" }).mockResolvedValue({ state: "running" }); const outcome = discoverEpisodeDiscussionThreads(input).catch(error => error); await vi.advanceTimersByTimeAsync(70_000); expect((await outcome).message).toContain("still running (job job-1)"); expect(backend.mock.calls.every(call => !call[0].includes("control"))).toBe(true); });
});
