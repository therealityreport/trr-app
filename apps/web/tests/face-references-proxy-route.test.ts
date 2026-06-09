import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

import { GET, POST } from "@/app/api/admin/trr-api/face-references/[...path]/route";

describe("face references admin proxy", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "internal-secret";
    requireAdminMock.mockResolvedValue({ uid: "admin-test-user" });
    getBackendApiUrlMock.mockImplementation((path: string) => `https://backend.example.com/api/v1${path}`);
  });

  it("forwards review queue requests to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: "ref-1", person_name: "Person One" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/face-references/review-queue?limit=10"),
      { params: Promise.resolve({ path: ["review-queue"] }) },
    );
    const payload = (await response.json()) as { items?: Array<{ id?: string }> };

    expect(response.status).toBe(200);
    expect(payload.items?.[0]?.id).toBe("ref-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/api/v1/admin/face-references/review-queue?limit=10",
      expect.objectContaining({ method: "GET" }),
    );
    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer /);
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("forwards review decisions with the original JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "ref-1", review_status: "approved" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/trr-api/face-references/ref-1/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: "approved" }),
      }),
      { params: Promise.resolve({ path: ["ref-1", "review"] }) },
    );
    const payload = (await response.json()) as { review_status?: string };

    expect(response.status).toBe(200);
    expect(payload.review_status).toBe("approved");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ review_status: "approved" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("returns an actionable error when the internal admin secret is missing", async () => {
    const expectedError = captureExpectedConsoleError(
      /^\[api\] Face references proxy failed .*TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured/,
    );
    delete process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/face-references/review-queue"),
      { params: Promise.resolve({ path: ["review-queue"] }) },
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(payload.error).toBe("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
    expectedError.expectCalled();
  });
});
