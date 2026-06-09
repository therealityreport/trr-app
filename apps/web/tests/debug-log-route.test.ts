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
    delete process.env.TRR_DEBUG_LOG_SHARED_SECRET_ENABLED;
    delete process.env.TRR_REMOTE_DEBUG_LOG_ENABLED;
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

  it("accepts admin auth and redacts sensitive fields", async () => {
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "admin auth event",
        email: "admin@example.com",
        nested: { safe: "ok", cookie: "session-cookie" },
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = String(logSpy.mock.calls[0]?.[1] ?? "");
    expect(loggedPayload).toContain("[REDACTED]");
    expect(loggedPayload).not.toContain("admin@example.com");
    expect(loggedPayload).not.toContain("session-cookie");

    logSpy.mockRestore();
  });

  it("keeps remote debug logging disabled by default even for admin auth", async () => {
    process.env.TRR_REMOTE_DEBUG_LOG_ENABLED = "";
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const request = new NextRequest("https://admin.therealityreport.com/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "remote event" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "remote_debug_logging_disabled" });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it("accepts remote admin logs only when the remote kill switch is enabled", async () => {
    process.env.TRR_REMOTE_DEBUG_LOG_ENABLED = "1";
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const request = new NextRequest("https://admin.therealityreport.com/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "remote event", session: "session-secret" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
    const loggedPayload = String(logSpy.mock.calls[0]?.[1] ?? "");
    expect(loggedPayload).not.toContain("session-secret");

    logSpy.mockRestore();
  });

  it("rejects shared secret by default even when the configured secret matches", async () => {
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "shared-secret-value";
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const request = new NextRequest("http://localhost/api/debug-log", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trr-internal-admin-secret": "shared-secret-value",
      },
      body: JSON.stringify({ message: "shared secret disabled" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "forbidden" });
    expect(requireAdminMock).toHaveBeenCalledTimes(1);
  });

  it("accepts valid shared secret only when explicitly enabled and redacts sensitive fields", async () => {
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "shared-secret-value";
    process.env.TRR_DEBUG_LOG_SHARED_SECRET_ENABLED = "true";
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
