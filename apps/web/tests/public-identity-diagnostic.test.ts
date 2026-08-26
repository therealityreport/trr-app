import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  logPublicShowIdentityFailure,
  PUBLIC_SHOW_IDENTITY_DIAGNOSTIC_RUN_ID,
} from "@/app/_lib/public-identity-diagnostic";
import { PublicIdentityApiError } from "@/lib/server/trr-api/public-identities";

let consoleErrorMock: ReturnType<typeof vi.spyOn>;

describe("public show identity diagnostics", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it("emits the frozen schema with bounded public identity fields", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "3c922bfb241eb5245f8f42757b991687c23023b1");
    const error = new PublicIdentityApiError("backend failed", {
      status: 503,
      code: "BACKEND_UNAVAILABLE",
      retryable: true,
      problem: {
        code: "BACKEND_UNAVAILABLE",
        status: 503,
        message: "backend failed",
        trace_id: "trace-123",
        request_id: "request-456",
        retryable: true,
      },
    });

    logPublicShowIdentityFailure("the-valley", error);

    expect(consoleErrorMock).toHaveBeenCalledOnce();
    expect(consoleErrorMock).toHaveBeenCalledWith({
      schema_version: 1,
      event: "e14.public_show_identity_failure",
      diagnostic_run_id: PUBLIC_SHOW_IDENTITY_DIAGNOSTIC_RUN_ID,
      route_kind: "bare_show_alias",
      show_slug: "the-valley",
      vercel_env: "preview",
      git_commit_sha: "3c922bfb241eb5245f8f42757b991687c23023b1",
      error_name: "PublicIdentityApiError",
      error_code: "BACKEND_UNAVAILABLE",
      error_status: 503,
      error_retryable: true,
      backend_trace_id: "trace-123",
      backend_request_id: "request-456",
      message: "backend failed",
      stack_frames: [],
    });
  });

  it("redacts credentials, URL data, control characters, and bounds message and frames", () => {
    const error = new Error(
      "Fetch failed https://user:password@example.com/path?token=query-secret " +
        "Authorization: Bearer bearer-secret api_key=api-secret cookie=session-secret\n" +
        "x".repeat(500),
    );
    Object.defineProperty(error, "stack", {
      configurable: true,
      value: [
        "Error: redacted",
        "    at first (/repo/TRR-APP/apps/web/src/app/first.ts:1:2)",
        "    at second (/repo/TRR-APP/apps/web/src/components/second.tsx:3:4)",
        "    at third (/repo/TRR-APP/apps/web/src/lib/third.ts:5:6)",
        "    at fourth (/repo/TRR-APP/apps/web/src/app/fourth.ts:7:8)",
        "    at fifth (/repo/TRR-APP/apps/web/src/app/fifth.ts:9:10)",
        "    at sixth (/repo/TRR-APP/apps/web/src/app/sixth.ts:11:12)",
        "    at dependency (/repo/TRR-APP/apps/web/node_modules/pkg/index.js:13:14)",
      ].join("\n"),
    });

    logPublicShowIdentityFailure("the-valley", error);

    const [record] = consoleErrorMock.mock.calls[0] as [Record<string, unknown>];
    expect(record.message).toEqual(expect.any(String));
    expect((record.message as string).length).toBeLessThanOrEqual(300);
    expect(record.message).not.toContain("password");
    expect(record.message).not.toContain("query-secret");
    expect(record.message).not.toContain("bearer-secret");
    expect(record.message).not.toContain("api-secret");
    expect(record.message).not.toContain("session-secret");
    expect(record.stack_frames).toEqual([
      "src/app/first.ts:1:2",
      "src/components/second.tsx:3:4",
      "src/lib/third.ts:5:6",
      "src/app/fourth.ts:7:8",
      "src/app/fifth.ts:9:10",
    ]);
  });

  it("does not serialize arbitrary error properties", () => {
    const error = new Error("safe message");
    Object.assign(error, { password: "do-not-log", response: { headers: "do-not-log" } });

    logPublicShowIdentityFailure("the-valley", error);

    const [record] = consoleErrorMock.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(record)).toEqual([
      "schema_version",
      "event",
      "diagnostic_run_id",
      "route_kind",
      "show_slug",
      "vercel_env",
      "git_commit_sha",
      "error_name",
      "error_code",
      "error_status",
      "error_retryable",
      "backend_trace_id",
      "backend_request_id",
      "message",
      "stack_frames",
    ]);
    expect(JSON.stringify(record)).not.toContain("do-not-log");
  });

  it("skips user-addressable notFound and redirect failures", () => {
    for (const status of [400, 404, 409]) {
      logPublicShowIdentityFailure(
        "the-valley",
        new PublicIdentityApiError(`identity error ${status}`, {
          status,
          code: `IDENTITY_${status}`,
        }),
      );
    }
    logPublicShowIdentityFailure("the-valley", {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    logPublicShowIdentityFailure("the-valley", {
      digest: "NEXT_REDIRECT;replace;/shows/the-valley;308;",
    });

    expect(consoleErrorMock).not.toHaveBeenCalled();
  });
});
