import type { User } from "firebase/auth";
import { NextRequest } from "next/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), admin: vi.fn(), backend: vi.fn() }));
vi.mock("@/lib/admin/client-auth", () => ({ fetchAdminWithAuth: mocks.client }));
vi.mock("@/lib/server/auth", () => ({
  requireAdmin: mocks.admin,
  toVerifiedAdminContext: () => ({ uid: "fixture-admin", email: null, verifiedAt: 100 }),
}));
vi.mock("@/lib/server/trr-api/social-admin-proxy", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/trr-api/social-admin-proxy")>(),
  fetchSocialBackendJson: mocks.backend,
}));

import TwitterResearchPanel from "@/components/admin/TwitterResearchPanel";
import { POST } from "@/app/api/admin/trr-api/social/twitter/search/route";
import { TWITTER_RESEARCH_ENDPOINT, type TwitterResearchResponse } from "@/lib/admin/twitter-research";

const user = { uid: "fixture-admin" } as User;
const result = (): TwitterResearchResponse => ({
  success: true, query: "Artemis", tweets_found: 1, complete: false, error: null,
  tweets: [{ tweet_id: "100", username: "NASA", date_time: "2026-11-04T00:00:00Z",
    text: "Recorded public display text", url: "https://x.com/NASA/status/100", likes: null, replies: null, views: null }],
  retrieval_meta: { retrieval_mode: "anonymous_research", provider: "lurkbird", status: "partial",
    coverage: "provider-selected subset; global coverage and freshness unknown", upstream_authentication: "unknown",
    text_scope: "mirror display text", pages_scanned: 1, max_pages: 1, max_items: 20, stop_reason: "max_pages" },
});
const request = (body: unknown) => new NextRequest(`https://admin.trr.localhost${TWITTER_RESEARCH_ENDPOINT}`, {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});
function openAndEnable() {
  render(<TwitterResearchPanel user={user} />);
  fireEvent.click(screen.getByText("X research search"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Anonymous research" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Search query" }), { target: { value: "Artemis" } });
}
beforeEach(() => {
  mocks.admin.mockReset().mockResolvedValue(user);
  mocks.backend.mockReset().mockResolvedValue(result());
  // Exercise the actual same-origin route handler in component submissions.
  mocks.client.mockReset().mockImplementation(async (_url, init) => POST(request(JSON.parse(init.body))));
});

describe("X anonymous research panel and protected proxy", () => {
  it("does not fetch on mount or opening; requires an explicit selection", () => {
    render(<TwitterResearchPanel user={user} />);
    fireEvent.click(screen.getByText("X research search"));
    expect(screen.getByRole("checkbox", { name: "Anonymous research" })).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: "Search query" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Search public posts" })).toBeDisabled();
    expect(mocks.client).not.toHaveBeenCalled();
    expect(screen.getByText(/Coverage, freshness/)).toHaveTextContent("unknown");
  });

  it("submits only the explicit modest query through the authenticated proxy", async () => {
    openAndEnable();
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Partial results: 1 posts");
    const body = { mode: "anonymous_research", provider: "lurkbird", query: "Artemis", sort: "latest",
      max_pages: 1, max_items: 20 };
    expect(JSON.parse(mocks.client.mock.calls[0][1].body)).toEqual(body);
    expect(mocks.client.mock.calls[0][2]).toEqual({ preferredUser: user });
    expect(mocks.admin).toHaveBeenCalledTimes(1);
    expect(mocks.backend).toHaveBeenCalledWith("/twitter/search", expect.objectContaining({
      body: JSON.stringify(body), method: "POST", retries: 0,
      adminContext: { uid: "fixture-admin", email: null, verifiedAt: 100 },
    }));
    expect(screen.getByText("Recorded public display text")).toBeInTheDocument();
    expect(screen.getByText("Engagement: unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/0 likes/)).not.toBeInTheDocument();
  });

  it("allows the explicit hard caps and top sort without extra requests", async () => {
    openAndEnable();
    fireEvent.change(screen.getByRole("combobox", { name: "Sort" }), { target: { value: "top" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Page limit" }), { target: { value: "2" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Post limit" }), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    await screen.findByRole("status");
    expect(JSON.parse(mocks.client.mock.calls[0][1].body)).toMatchObject({ sort: "top", max_pages: 2, max_items: 40 });
    expect(mocks.client).toHaveBeenCalledTimes(1);
  });

  it("retains partial records while showing a later provider failure", async () => {
    mocks.backend.mockResolvedValue({ ...result(), error: "Public search HTTP 429" });
    openAndEnable();
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Public search HTTP 429");
    expect(screen.getByText("Recorded public display text")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Full search coverage is unknown");
  });

  it("shows blocked or empty results as unavailable, without asserting zero matches", async () => {
    const empty = result();
    mocks.backend.mockResolvedValue({ ...empty, success: false, tweets: [], tweets_found: 0,
      error: "Public search feed unavailable; blocked or unsupported page",
      retrieval_meta: { ...empty.retrieval_meta, status: "unavailable", pages_scanned: 0 } });
    openAndEnable();
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Search unavailable or unverified");
    expect(screen.getByText("This does not prove there are no matching posts.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("blocked or unsupported");
  });

  it("disables controls during a request and aborts its own request on unmount", async () => {
    mocks.client.mockImplementation(() => new Promise(() => {}));
    const mounted = render(<TwitterResearchPanel user={user} />);
    fireEvent.click(screen.getByText("X research search"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Anonymous research" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search query" }), { target: { value: "Artemis" } });
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(screen.getByRole("button", { name: "Searching…" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Anonymous research" })).toBeDisabled();
    const signal = mocks.client.mock.calls[0][1].signal as AbortSignal;
    mounted.unmount();
    expect(signal.aborted).toBe(true);
  });

  it("preserves the admin failure without contacting the backend", async () => {
    mocks.admin.mockRejectedValue(new Error("forbidden"));
    openAndEnable();
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("forbidden");
    expect(mocks.backend).not.toHaveBeenCalled();
  });

  it("rejects unselected or other providers and returns uncached partial responses", async () => {
    expect((await POST(request({ query: "Artemis" }))).status).toBe(400);
    expect((await POST(request({ mode: "anonymous_research", provider: "other" }))).status).toBe(400);
    expect(mocks.backend).not.toHaveBeenCalled();
    const response = await POST(request({ mode: "anonymous_research", provider: "lurkbird", query: "Artemis" }));
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).complete).toBe(false);
  });

  it("shows a transport failure without a false completion", async () => {
    mocks.client.mockRejectedValue(new Error("Connection unavailable"));
    openAndEnable();
    fireEvent.click(screen.getByRole("button", { name: "Search public posts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection unavailable");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Search public posts" })).not.toBeDisabled());
  });
});
