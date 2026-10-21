import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { guard, backend } = vi.hoisted(() => ({ guard: vi.fn(), backend: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: guard }));
vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({ fetchSocialBackendJson: backend, socialProxyErrorResponse: () => new Response("Unauthorized", { status: 401 }) }));
import { POST } from "@/app/api/admin/reddit/runs/[runId]/control/route";
import { GET } from "@/app/api/admin/reddit/runs/[runId]/targets/route";
const context = { params: Promise.resolve({ runId: "11111111-1111-4111-8111-111111111111" }) };
describe("Reddit operator proxies", () => {
  beforeEach(() => { guard.mockReset(); backend.mockReset(); backend.mockResolvedValue({ targets: [] }); });
  it("blocks upstream access when admin authentication fails", async () => { guard.mockRejectedValue(new Error("unauthorized")); const response = await GET(new NextRequest("http://localhost/api/admin/reddit/runs/id/targets"), context); expect(response.status).toBe(401); expect(backend).not.toHaveBeenCalled(); });
  it("rejects unsupported control actions", async () => { const response = await POST(new NextRequest("http://localhost/api/admin/reddit/runs/id/control", { method: "POST", body: JSON.stringify({ action: "delete" }) }), context); expect(response.status).toBe(400); expect(backend).not.toHaveBeenCalled(); });
  it("forwards only the allowed action to a fixed backend path without retrying mutations", async () => { await POST(new NextRequest("http://localhost/api/admin/reddit/runs/id/control", { method: "POST", body: JSON.stringify({ action: "retry", path: "/other", run_config_hash: "client" }) }), context); expect(backend).toHaveBeenCalledWith("/reddit/runs/11111111-1111-4111-8111-111111111111/control", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "retry" }), retries: 0 })); });
  it("keeps target pagination bounded", async () => { const response = await GET(new NextRequest("http://localhost/api/admin/reddit/runs/id/targets?limit=999"), context); expect(response.status).toBe(400); expect(backend).not.toHaveBeenCalled(); });
});
