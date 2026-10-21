import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: fetchMock }));
import RedditCapturePanel from "@/components/admin/RedditCapturePanel";
const communityId = "11111111-1111-4111-8111-111111111111";
const seasonId = "22222222-2222-4222-8222-222222222222";
describe("Reddit capture tools", () => {
  beforeEach(() => { cleanup(); fetchMock.mockReset(); fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("settings") ? { schedule_enabled: false, ai_enabled: false } : url.includes("/runs?") ? { runs: [] } : { capture_evidence: "unknown" } })); });
  it("does not request or enqueue work before opening and keeps AI disabled", async () => {
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("button", { name: "Run AI analysis" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Enable schedule" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Enable AI analysis" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Enable daily AI analysis" })).not.toBeChecked();
    expect(fetchMock.mock.calls.every(call => call[1].method === "GET")).toBe(true);
    expect(fetchMock.mock.calls.every(call => call[2]?.allowDevAdminBypass === true)).toBe(true);
  });
  it("captures only the selected post with the selected policy via POST", async () => {
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} postId="abc123" />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Capture 1 selected posts" })).not.toBeDisabled());
    fireEvent.change(screen.getByRole("combobox", { name: "Refresh policy" }), { target: { value: "stale" } });
    fireEvent.click(screen.getByRole("button", { name: "Capture 1 selected posts" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => call[0].endsWith("/discover") && call[1].method === "POST")).toBe(true));
    const call = fetchMock.mock.calls.find(call => call[0].endsWith("/discover"));
    expect(JSON.parse(call![1].body)).toMatchObject({ season_id: seasonId, refresh_policy: "stale", selected_post_ids: ["abc123"], requested_phases: ["discovery", "comments", "media"] });
  });
  it("displays an inline error and keeps settings disabled when loading fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Service unavailable" }) });
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    expect(screen.getByRole("button", { name: "Save settings" })).toBeDisabled();
  });
  it("shows authoritative phase evidence without treating legacy completion as capture proof", async () => {
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("coverage") ? { runs: [{ id: "old", contract_version: 1, satisfied: 99 }], posts: [{ reddit_post_id: "abc123", capture_state: { comments: { state: "committed", successful_at: "2026-10-21T12:00:00Z" }, media: { state: "retry_wait", next_retry_at: "2026-10-21T13:00:00Z" } } }] } : url.includes("settings") ? { schedule_enabled: false, ai_enabled: false } : { runs: [] } }));
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} postId="abc123" />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    expect(await screen.findByText("Unknown legacy capture evidence")).toBeInTheDocument();
    expect(screen.getByText(/Comments: committed/)).toHaveTextContent("Last successful capture: 2026-10-21T12:00:00Z");
    expect(screen.getByText(/Media: retry wait/)).toHaveTextContent("Retry after: 2026-10-21T13:00:00Z");
    expect(screen.queryByText(/99 satisfied/)).not.toBeInTheDocument();
  });

  it("selects a post from a backend work target and retries only that post", async () => {
    const runId = "33333333-3333-4333-8333-333333333333";
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("/targets") ? { targets: [{ id: "target", kind: "comments", target_key: "abc123", reddit_post_id: "abc123", state: "failed" }] } : url.includes("/runs?") ? { runs: [{ run_id: runId, status: "partial" }] } : url.includes("settings") ? { schedule_enabled: false, ai_enabled: false } : {} }));
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Run" }).querySelectorAll("option")).toHaveLength(2));
    fireEvent.change(screen.getByRole("combobox", { name: "Run" }), { target: { value: runId } });
    fireEvent.click(screen.getByRole("button", { name: "View work targets" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "comments · abc123 · failed" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry selected work" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => call[0].endsWith("/discover"))).toBe(true));
    const call = fetchMock.mock.calls.find(call => call[0].endsWith("/discover"));
    expect(JSON.parse(call![1].body).selected_post_ids).toEqual(["abc123"]);
  });

  it("omits an unset capture template so settings-only saves do not submit an invalid payload", async () => {
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save settings" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => call[1].method === "PATCH")).toBe(true));
    const call = fetchMock.mock.calls.find(call => call[1].method === "PATCH");
    expect(JSON.parse(call![1].body).schedule).not.toHaveProperty("capture_payload");
  });
  it("preserves a complete existing capture template when saving settings", async () => {
    const template = { community_id: communityId, season_id: seasonId, period_key: "current-season", subreddit: "Show", show_name: "Show", refresh_policy: "stale", cast_names: ["Cast"], analysis_flairs: ["Show"] };
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("settings") ? { schedule_enabled: false, ai_enabled: false, capture_payload: template } : { runs: [] } }));
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save settings" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(call => call[1].method === "PATCH")).toBe(true));
    expect(JSON.parse(fetchMock.mock.calls.find(call => call[1].method === "PATCH")![1].body).schedule.capture_payload).toEqual(template);
  });

  it("shows requested coverage boundaries and unresolved child evidence", async () => {
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes("/targets") ? { targets: [{ id: "target", kind: "comments", target_key: "abc123", reddit_post_id: "abc123", state: "retry_wait", attempt_count: 2, checkpoint: { pending_children: ["child123"], comments: [{ body: "Do not dump raw checkpoint content" }] } }] } : url.includes("/runs?") ? { runs: [{ id: "run", status: "partial" }] } : url.includes("coverage") ? { runs: [{ id: "run", contract_version: 2, requested: 1, satisfied: 0, unresolved: 1, coverage: { state: "partial", requested_start: "2026-10-20T12:00:00Z", reasons: ["page_budget_exhausted"] } }] } : { schedule_enabled: false, ai_enabled: false } }));
    render(<RedditCapturePanel communityId={communityId} seasonId={seasonId} />);
    fireEvent.click(screen.getByRole("button", { name: "Capture and analysis tools" }));
    expect(await screen.findByText("2026-10-20T12:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("page_budget_exhausted")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Run" }), { target: { value: "run" } });
    fireEvent.click(screen.getByRole("button", { name: "View work targets" }));
    expect(await screen.findByText("child123")).toBeInTheDocument();
    expect(screen.queryByText("Do not dump raw checkpoint content")).not.toBeInTheDocument();
  });

});
