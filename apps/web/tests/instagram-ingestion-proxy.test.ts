import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: mocks.requireAdmin, toVerifiedAdminContext: () => ({ uid: "admin-1", email: null, verifiedAt: 100 }) }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/server/trr-api/social-admin-proxy")>(), fetchSocialBackendJson: mocks.fetch }));
import { GET, POST } from "@/app/api/admin/instagram-ingestion/[handle]/[...operation]/route";
import { SocialProxyError } from "@/lib/server/trr-api/social-admin-proxy";
const runId = "11111111-1111-4111-8111-111111111111";
const context = (operation: string, handle = "bravotv") => ({ params: Promise.resolve({ handle, operation: operation.split("/") }) });
const request = (operation: string, method = "GET", key?: string) => new NextRequest(`https://admin.trr.localhost/api/admin/instagram-ingestion/bravotv/${operation}`, { method, headers: key ? { "Idempotency-Key": key } : undefined, body: method === "POST" ? JSON.stringify({ action: "backfill" }) : undefined });
beforeEach(() => { mocks.requireAdmin.mockReset().mockResolvedValue({ uid: "admin-1" }); mocks.fetch.mockReset().mockResolvedValue({ enabled: false }); });
describe("dedicated ingestion proxy", () => {
  it("authenticates every read and uses the explicit v2 social route family", async () => {
    const response = await GET(request("capabilities"), context("capabilities"));
    expect(response.status).toBe(200); expect(mocks.requireAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith("/profiles/instagram/bravotv/ingestion/capabilities", expect.objectContaining({ routeFamily: "instagram-ingestion-v2", method: "GET", retries: 0, adminContext: { uid: "admin-1", email: null, verifiedAt: 100 } }));
  });
  it("forwards the stable key and exact body without mutation retries", async () => {
    const response = await POST(request(`runs/${runId}/resume`, "POST", "stable-request-key"), context(`runs/${runId}/resume`));
    expect(response.status).toBe(202);
    expect(mocks.fetch).toHaveBeenCalledWith(`/profiles/instagram/bravotv/ingestion/runs/${runId}/resume`, expect.objectContaining({ retries: 0, body: '{"action":"backfill"}', headers: { "Content-Type": "application/json", "Idempotency-Key": "stable-request-key" } }));
  });
  it.each(["../catalog/backfill", "runs/not-a-uuid", `runs/${runId}/unknown`, "https://other.example/"]) ("rejects unapproved route %s", async operation => {
    expect((await GET(request("capabilities"), context(operation))).status).toBe(404); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejects writes without identity and prevents methods from crossing route mapping", async () => {
    expect((await POST(request("runs", "POST"), context("runs"))).status).toBe(422);
    expect((await POST(request("capabilities", "POST", "key"), context("capabilities"))).status).toBe(404);
    expect((await GET(request("runs"), context("runs"))).status).toBe(404); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("forwards only supported query keys and preserves strict typed upstream errors", async () => {
    const invalid = new NextRequest("https://admin.trr.localhost/api/admin/instagram-ingestion/bravotv/runs/recent?url=https://other");
    expect((await GET(invalid, context("runs/recent"))).status).toBe(422);
    const detail = { code: "EVIDENCE_EXPIRED", status: 410, message: "Evidence has expired.", retryable: false, retry_after_ms: null, request_id: "safe-reference" };
    mocks.fetch.mockRejectedValueOnce(new SocialProxyError("Safe error", { status: 410, code: "UPSTREAM_ERROR", upstreamDetail: detail }));
    const response = await POST(request(`runs/${runId}/replay`, "POST", "key"), context(`runs/${runId}/replay`));
    expect(response.status).toBe(410); expect(await response.json()).toEqual({ detail });
  });
  it("uses the v2 backend URL and verified admin headers while preserving the legacy default", async () => {
    vi.stubEnv("TRR_API_URL", "http://127.0.0.1:8000");
    vi.stubEnv("TRR_INTERNAL_ADMIN_SHARED_SECRET", "test-only-ingestion-shared-secret-123456789");
    const transport = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", transport);
    const actual = await vi.importActual<typeof import("@/lib/server/trr-api/social-admin-proxy")>("@/lib/server/trr-api/social-admin-proxy");
    const options = { fallbackError: "Could not fetch", retries: 0, adminContext: { uid: "admin-1", email: null, verifiedAt: Date.now() } };
    await actual.fetchSocialBackendJson("/profiles/instagram/bravotv/ingestion/capabilities", { ...options, routeFamily: "instagram-ingestion-v2" });
    await actual.fetchSocialBackendJson("/profiles/instagram/bravotv/catalog/runs/recent", options);
    expect(transport.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/v2/admin/social/profiles/instagram/bravotv/ingestion/capabilities");
    expect(transport.mock.calls[1][0]).toBe("http://127.0.0.1:8000/api/v1/admin/socials/profiles/instagram/bravotv/catalog/runs/recent");
    const headers = new Headers(transport.mock.calls[0][1].headers);
    expect(headers.get("x-trr-admin-uid")).toBe("admin-1"); expect(headers.get("Authorization")?.startsWith("Bearer ")).toBe(true);
  });
  it("does not contact the backend when admin authentication fails", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("forbidden"));
    const response = await GET(request("capabilities"), context("capabilities"));
    expect(response.status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
