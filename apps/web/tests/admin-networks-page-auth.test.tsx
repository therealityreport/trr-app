import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminNetworksPage from "@/app/admin/networks/page";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Admin networks page auth + sync UI", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads via shared auth helper and renders unresolved sync details", async () => {
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
        {
          type: "production",
          name: "Shed Media",
          available_show_count: 4,
          added_show_count: 1,
          hosted_logo_url: null,
          hosted_logo_black_url: null,
          hosted_logo_white_url: null,
          wikidata_id: null,
          wikipedia_url: null,
          resolution_status: "manual_required",
          resolution_reason: "incomplete_metadata",
          last_attempt_at: "2026-02-19T00:00:00Z",
          has_logo: false,
          has_bw_variants: false,
          has_links: false,
        },
      ],
      generated_at: "2026-02-19T00:00:00.000Z",
    };
    const syncPayload = {
      run_id: "network-streaming-20260224T210000Z",
      status: "stopped",
      resume_cursor: { entity_type: "network", entity_key: "bravo" },
      entities_synced: 2,
      providers_synced: 4,
      links_enriched: 3,
      logos_mirrored: 2,
      variants_black_mirrored: 1,
      variants_white_mirrored: 1,
      completion_total: 2,
      completion_resolved: 1,
      completion_unresolved: 1,
      completion_unresolved_total: 1,
      completion_unresolved_network: 1,
      completion_unresolved_streaming: 0,
      completion_unresolved_production: 0,
      production_missing_logos: 1,
      production_missing_bw_variants: 1,
      completion_percent: 50,
      completion_gate_passed: false,
      missing_columns: [],
      unresolved_logos_count: 2,
      unresolved_logos_truncated: true,
      unresolved_logos: [
        { type: "network", id: "77", name: "Bravo", reason: "no_logo_claim" },
        { type: "production", id: "501", name: "Shed Media", reason: "incomplete_metadata" },
      ],
      failures: 0,
    };
    const overridesPayload: unknown[] = [];

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
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

    render(<AdminNetworksPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalled();
      expect(screen.getByText("Bravo")).toBeInTheDocument();
    });
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumbNav).toBeInTheDocument();
    expect(within(breadcrumbNav).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(within(breadcrumbNav).getByText("Networks & Streaming")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Bravo" })).toHaveAttribute(
      "href",
      "/admin/networks/network/bravo",
    );
    expect(screen.getByRole("link", { name: "Peacock Premium" })).toHaveAttribute(
      "href",
      "/admin/networks/streaming/peacock-premium",
    );

    const summaryCall = mocks.fetchAdminWithAuth.mock.calls.find((call: unknown[]) =>
      String(call[0]).endsWith("/api/admin/networks-streaming/summary"),
    );
    expect(summaryCall).toBeTruthy();
    expect(screen.getByText(/Missing B\/W Variants: 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sync/Mirror Networks & Streaming" }));

    await waitFor(() => {
      expect(screen.getByText("Sync complete")).toBeInTheDocument();
    });

    const syncCall = mocks.fetchAdminWithAuth.mock.calls.find((call: unknown[]) =>
      String(call[0]).endsWith("/api/admin/networks-streaming/sync"),
    );
    expect(syncCall?.[1]).toMatchObject({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unresolved_only: false,
        refresh_external_sources: false,
        batch_size: 25,
        max_runtime_sec: 840,
      }),
    });
    expect(screen.getByText("Unresolved production entities: 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Re-run Unresolved Production Only" }));

    await waitFor(() => {
      const calls = mocks.fetchAdminWithAuth.mock.calls.filter((call: unknown[]) =>
        String(call[0]).endsWith("/api/admin/networks-streaming/sync"),
      );
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    const syncCalls = mocks.fetchAdminWithAuth.mock.calls.filter((call: unknown[]) =>
      String(call[0]).endsWith("/api/admin/networks-streaming/sync"),
    );
    const productionSyncCall = syncCalls[syncCalls.length - 1];
    expect(productionSyncCall?.[1]).toMatchObject({
      body: JSON.stringify({
        unresolved_only: true,
        refresh_external_sources: false,
        batch_size: 25,
        max_runtime_sec: 840,
        entity_type: "production",
        entity_keys: ["shed media"],
      }),
    });

    expect(screen.getByText(/Run: network-streaming-20260224T210000Z/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume Sync" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Hide unresolved/ })).toBeInTheDocument();
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing first 300 unresolved entries from sync payload/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Streaming Services" }));
    await waitFor(() => {
      expect(screen.getByText("Peacock Premium")).toBeInTheDocument();
    });
    expect(screen.queryByText("missing_bw_variants")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Network" }));
    expect(screen.getAllByText("Bravo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Peacock Premium")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Both" }));
    expect(screen.getByText("Peacock Premium")).toBeInTheDocument();
  });

  it("keeps the page in loading/recovery state while auth fetch is in-flight and then recovers", async () => {
    let resolveSummary: ((response: Response) => void) | null = null;
    const pendingSummary = new Promise<Response>((resolve) => {
      resolveSummary = resolve;
    });

    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/admin/networks-streaming/summary")) {
        return pendingSummary;
      }
      if (url.includes("/api/admin/networks-streaming/overrides")) {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    render(<AdminNetworksPage />);

    expect(screen.getByText("Loading networks and streaming summary...")).toBeInTheDocument();
    expect(screen.queryByText("Not authenticated")).not.toBeInTheDocument();

    resolveSummary?.(
      jsonResponse({
        totals: { total_available_shows: 1, total_added_shows: 1 },
        rows: [],
        generated_at: "2026-02-19T00:00:00.000Z",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Available Shows:\s*1/)).toBeInTheDocument();
      expect(screen.queryByText("Loading networks and streaming summary...")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Not authenticated")).not.toBeInTheDocument();
  });

  it("shows terminal auth error when helper rejects after retries are exhausted", async () => {
    mocks.fetchAdminWithAuth.mockRejectedValue(new Error("Not authenticated"));

    render(<AdminNetworksPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Not authenticated").length).toBeGreaterThan(0);
    });
  });
});
