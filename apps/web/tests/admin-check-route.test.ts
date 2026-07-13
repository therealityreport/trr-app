import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/check/route";

describe("/api/admin/check route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
  });

  it("returns hasAccess true when server auth accepts the request", async () => {
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });

    const request = new NextRequest("http://admin.localhost/api/admin/check", {
      headers: { authorization: "Bearer client-id-token" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ hasAccess: true });
    expect(requireAdminMock).toHaveBeenCalledWith(request);
  });

  it("returns hasAccess false when server auth rejects the request", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest("http://admin.localhost/api/admin/check", {
      headers: { authorization: "Bearer non-admin-client-token" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ hasAccess: false });
  });
});
