import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("cast smoke preflight script", () => {
  const modulePath = pathToFileURL(
    path.resolve(__dirname, "../scripts/cast-smoke-preflight.mjs")
  ).href;

  it("returns a passing summary for healthy endpoints", async () => {
    const script = await import(modulePath);
    let tick = 1_700_000_000_000;
    const now = () => {
      tick += 15;
      return tick;
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    const report = await script.runPreflight({
      showId: "show-1",
      appOrigin: "http://admin.localhost:3000",
      backendOrigin: "http://127.0.0.1:8000",
      timeoutMs: 20_000,
      fetchImpl: fetchMock,
      now,
    });

    expect(report.ok).toBe(true);
    expect(report.summary).toEqual({ total: 3, passed: 3, failed: 0 });
    expect(report.checks.map((check: { name: string }) => check.name)).toEqual([
      "backend_health",
      "show_roles_proxy",
      "cast_role_members_proxy",
    ]);
    expect(report.checks.every((check: { status: number }) => check.status === 200)).toBe(true);
  });

  it("reports retryable metadata when roles/cast-role-members checks fail", async () => {
    const script = await import(modulePath);
    let tick = 1_700_000_100_000;
    const now = () => {
      tick += 20;
      return tick;
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "Roles request timed out after 120s",
            code: "UPSTREAM_TIMEOUT",
            retryable: true,
            upstream_status: 504,
          }),
          { status: 504 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "fetch failed",
            code: "BACKEND_UNREACHABLE",
            retryable: true,
            upstream_status: 502,
          }),
          { status: 502 }
        )
      );

    const report = await script.runPreflight({
      showId: "show-1",
      appOrigin: "http://admin.localhost:3000",
      backendOrigin: "http://127.0.0.1:8000",
      timeoutMs: 20_000,
      fetchImpl: fetchMock,
      now,
    });

    expect(report.ok).toBe(false);
    expect(report.summary).toEqual({ total: 3, passed: 1, failed: 2 });
    const rolesCheck = report.checks.find((check: { name: string }) => check.name === "show_roles_proxy");
    const castCheck = report.checks.find((check: { name: string }) => check.name === "cast_role_members_proxy");
    expect(rolesCheck).toMatchObject({
      status: 504,
      code: "UPSTREAM_TIMEOUT",
      retryable: true,
      upstream_status: 504,
    });
    expect(castCheck).toMatchObject({
      status: 502,
      code: "BACKEND_UNREACHABLE",
      retryable: true,
      upstream_status: 502,
    });
  });

  it("formats deterministic machine-readable output", async () => {
    const script = await import(modulePath);
    const report = {
      ok: true,
      show_id: "show-1",
      app_origin: "http://admin.localhost:3000",
      backend_origin: "http://127.0.0.1:8000",
      timeout_ms: 20_000,
      checked_at: "2026-02-24T00:00:00.000Z",
      checks: [
        { name: "backend_health", ok: true, status: 200, latency_ms: 11 },
        { name: "show_roles_proxy", ok: true, status: 200, latency_ms: 12 },
        { name: "cast_role_members_proxy", ok: true, status: 200, latency_ms: 13 },
      ],
      summary: {
        total: 3,
        passed: 3,
        failed: 0,
      },
    };

    const output = script.formatReport(report);
    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual(report);
  });
});
