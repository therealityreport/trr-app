import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { POST } from "@/app/api/debug-log/route";

describe("/api/debug-log route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    delete process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
  });

  it("returns 403 when unauthenticated and no shared secret is provided", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest("http://localhost/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "forbidden" });
  });

  it("accepts valid shared secret and redacts sensitive fields", async () => {
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "shared-secret-value";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/debug-log", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trr-internal-admin-secret": "shared-secret-value",
      },
      body: JSON.stringify({
        message: "auth event",
        token: "abc123",
        nested: { authorization: "Bearer xyz", safe: "ok" },
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = String(logSpy.mock.calls[0]?.[1] ?? "");
    expect(loggedPayload).toContain("[REDACTED]");
    expect(loggedPayload).not.toContain("abc123");
    expect(loggedPayload).not.toContain("Bearer xyz");

    logSpy.mockRestore();
  });
});
