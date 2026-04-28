import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  buildInternalAdminHeadersMock,
  getBackendApiUrlMock,
  requireAdminMock,
  readPostgresPoolPressureSnapshotMock,
} = vi.hoisted(() => ({
  buildInternalAdminHeadersMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  requireAdminMock: vi.fn(),
  readPostgresPoolPressureSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: (user: { uid: string; email?: string | null }) => ({
    uid: user.uid,
    email: user.email ?? null,
    verifiedAt: 1_776_000_000_000,
  }),
}));

vi.mock("@/lib/server/postgres", () => ({
  readPostgresPoolPressureSnapshot: readPostgresPoolPressureSnapshotMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

import { GET } from "@/app/api/admin/health/app-db-pressure/route";

describe("admin app DB pressure route", () => {
  beforeEach(() => {
    buildInternalAdminHeadersMock.mockReset();
    getBackendApiUrlMock.mockReset();
    requireAdminMock.mockReset();
    readPostgresPoolPressureSnapshotMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
    buildInternalAdminHeadersMock.mockReturnValue(new Headers({ authorization: "Bearer test" }));
    getBackendApiUrlMock.mockReturnValue(null);
    requireAdminMock.mockResolvedValue({ uid: "admin-1", email: "admin@example.com" });
    readPostgresPoolPressureSnapshotMock.mockReturnValue({
      application_name: "trr-app:web",
      vercel_pool_attached: false,
      pool_max: 1,
      max_concurrent_operations: 1,
      active_permit_count: 0,
      queued_operation_count: 0,
      pool_total_count: 0,
      pool_idle_count: 0,
      pool_waiting_count: 0,
    });
  });

  it("requires admin auth and returns a no-store app pool snapshot", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/health/app-db-pressure"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(payload).toMatchObject({
      status: "ok",
      scope: "app_process_pool",
      application_name: "trr-app:web",
      vercel_pool_attached: false,
      pool_max: 1,
      max_concurrent_operations: 1,
    });
    expect(payload.backend_db_pressure).toMatchObject({
      status: "unavailable",
      reason: "backend_not_configured",
      db_activity: { status: "unavailable", reason: "backend_not_configured", holders: [] },
    });
    expect(requireAdminMock).toHaveBeenCalledOnce();
  });

  it("includes sanitized backend holder groups when the backend pressure route is available", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/health/db-pressure");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          query_text: "select secret from pg_stat_activity",
          db_activity: {
            status: "available",
            holders: [
              {
                application_name: "trr-app:web",
                role: "postgres",
                state: "active",
                client_addr: "127.0.0.1",
                holder_count: 2,
                query: "select * from secrets",
                password: "redacted",
              },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new NextRequest("http://localhost/api/admin/health/app-db-pressure"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.backend_db_pressure.db_activity.holders).toEqual([
      {
        application_name: "trr-app:web",
        role: "postgres",
        state: "active",
        client_addr: "127.0.0.1",
        holder_count: 2,
      },
    ]);
    expect(JSON.stringify(payload)).not.toContain("select secret");
    expect(JSON.stringify(payload)).not.toContain("password");
  });

  it("returns an explicit permission-blocked backend pressure shape on protected backend denial", async () => {
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/health/db-pressure");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("forbidden", { status: 403 })));

    const response = await GET(new NextRequest("http://localhost/api/admin/health/app-db-pressure"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.backend_db_pressure).toMatchObject({
      status: "unavailable",
      reason: "permission_blocked",
      upstream_status: 403,
      db_activity: { status: "unavailable", reason: "permission_blocked", holders: [] },
    });
  });
});
