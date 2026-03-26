import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

process.env.TRR_ADMIN_ROUTE_CACHE_DISABLED = "1";

const { requireAdminMock, fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  updatePersonCanonicalProfileSourceOrder: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  invalidateAdminBackendCache: vi.fn(),
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminProxyErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    ),
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/route";

describe("person route parity", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("returns only the batch-1 person detail contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        person: {
          id: "person-1",
          full_name: "Brandi Glanville",
          known_for: "RHOBH",
          external_ids: { imdb: "nm123" },
          birthday: "1972-11-16",
          gender: "female",
          biography: "bio",
          place_of_birth: "Salinas, California",
          homepage: "https://example.com",
          profile_image_url: "https://cdn.example.com/profile.jpg",
          alternative_names: ["Brandi"],
        },
      },
      durationMs: 7,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1");
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      person: {
        id: "person-1",
        full_name: "Brandi Glanville",
        known_for: "RHOBH",
        external_ids: { imdb: "nm123" },
        birthday: "1972-11-16",
        gender: "female",
        biography: "bio",
        place_of_birth: "Salinas, California",
        homepage: "https://example.com",
        profile_image_url: "https://cdn.example.com/profile.jpg",
        alternative_names: ["Brandi"],
      },
    });
  });

  it("keeps 404 parity for missing people", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "Person not found" },
      durationMs: 3,
    });

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-missing");
    const response = await GET(request, { params: Promise.resolve({ personId: "person-missing" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Person not found" });
  });
});
