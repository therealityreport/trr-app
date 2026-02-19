import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminNetworksPage from "@/app/admin/networks/page";
import { auth } from "@/lib/firebase";

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({
    user: { email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  }),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Admin networks page auth + sync UI", () => {
  beforeEach(() => {
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = {
      getIdToken: vi.fn().mockResolvedValue("test-token"),
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends bearer headers and renders unresolved sync details", async () => {
    const summaryPayload = {
      totals: { total_available_shows: 10, total_added_shows: 4 },
      rows: [
        {
          type: "network",
          name: "Bravo",
          available_show_count: 8,
          added_show_count: 3,
          hosted_logo_url: "https://cdn.example.com/bravo.png",
          hosted_logo_black_url: null,
          hosted_logo_white_url: null,
          wikidata_id: "Q123",
          wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
          resolution_status: "manual_required",
          resolution_reason: "missing_bw_variants",
          last_attempt_at: "2026-02-19T00:00:00Z",
          has_logo: true,
          has_bw_variants: false,
          has_links: true,
        },
        {
          type: "streaming",
          name: "Peacock Premium",
          available_show_count: 9,
          added_show_count: 4,
          hosted_logo_url: "https://cdn.example.com/peacock.png",
          hosted_logo_black_url: "https://cdn.example.com/peacock-black.png",
          hosted_logo_white_url: "https://cdn.example.com/peacock-white.png",
          wikidata_id: "Q67765302",
          wikipedia_url: "https://en.wikipedia.org/wiki/Peacock_(streaming_service)",
          resolution_status: "resolved",
          resolution_reason: null,
          last_attempt_at: "2026-02-19T00:00:00Z",
          has_logo: true,
          has_bw_variants: true,
          has_links: true,
        },
      ],
      generated_at: "2026-02-19T00:00:00.000Z",
    };
    const syncPayload = {
      entities_synced: 2,
      providers_synced: 4,
      links_enriched: 3,
      logos_mirrored: 2,
      variants_black_mirrored: 1,
      variants_white_mirrored: 1,
      completion_total: 2,
      completion_resolved: 1,
      completion_unresolved: 1,
      completion_percent: 50,
      completion_gate_passed: false,
      missing_columns: [],
      unresolved_logos_count: 1,
      unresolved_logos_truncated: true,
      unresolved_logos: [{ type: "network", id: "77", name: "Bravo", reason: "no_logo_claim" }],
      failures: 0,
    };
    const overridesPayload: unknown[] = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/admin/networks-streaming/summary")) {
        return jsonResponse(summaryPayload);
      }
      if (url.includes("/api/admin/networks-streaming/overrides")) {
        return jsonResponse(overridesPayload);
      }
      if (url.endsWith("/api/admin/networks-streaming/sync")) {
        return jsonResponse(syncPayload);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<AdminNetworksPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(screen.getByText("Bravo")).toBeInTheDocument();
    });

    const summaryCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith("/api/admin/networks-streaming/summary")
    );
    expect(summaryCall?.[1]).toMatchObject({
      headers: { Authorization: "Bearer test-token" },
    });
    expect(screen.getByText(/Missing B\/W Variants: 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sync/Mirror Networks & Streaming" }));

    await waitFor(() => {
      expect(screen.getByText("Sync complete")).toBeInTheDocument();
    });

    const syncCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith("/api/admin/networks-streaming/sync")
    );
    expect(syncCall?.[1]).toMatchObject({
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
    });

    expect(screen.getByRole("button", { name: /Hide unresolved/ })).toBeInTheDocument();
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing first 300 unresolved entries from sync payload/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Streaming Services" }));
    expect(screen.getByText("Peacock Premium")).toBeInTheDocument();
    expect(screen.queryByText("missing_bw_variants")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Network" }));
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Peacock Premium")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Both" }));
    expect(screen.getByText("Peacock Premium")).toBeInTheDocument();
  });

  it("shows auth error when Firebase token is unavailable", async () => {
    (auth as unknown as { currentUser?: { getIdToken: () => Promise<string> } }).currentUser = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<AdminNetworksPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Not authenticated").length).toBeGreaterThan(0);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
