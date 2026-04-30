import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, buildInternalAdminHeadersMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  buildInternalAdminHeadersMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/ingest/live-status/stream/route";

const BACKEND_STREAM_URL = "https://backend.example.com/api/v1/admin/socials/live-status/stream";

const makeRequest = () => new NextRequest("http://localhost/api/admin/trr-api/social/ingest/live-status/stream");

describe("social live status stream proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    buildInternalAdminHeadersMock.mockReset();
    vi.restoreAllMocks();
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue(BACKEND_STREAM_URL);
    buildInternalAdminHeadersMock.mockReturnValue({ Accept: "text/event-stream", Authorization: "Bearer token" });
  });

  it("streams backend SSE chunks through the admin proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("event: status\ndata: {\"active\":true}\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(makeRequest());
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: status");
    expect(payload).toContain("\"active\":true");
    expect(fetchMock).toHaveBeenCalledWith(
      BACKEND_STREAM_URL,
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: { Accept: "text/event-stream", Authorization: "Bearer token" },
      }),
    );
  });

  it("converts backend stream termination into an SSE error event", async () => {
    const encoder = new TextEncoder();
    let reads = 0;
    const brokenBackendStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (reads === 0) {
          reads += 1;
          controller.enqueue(encoder.encode("event: status\ndata: {\"active\":true}\n\n"));
          return;
        }
        controller.error(new Error("socket closed"));
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(brokenBackendStream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
      ),
    );

    const response = await GET(makeRequest());
    const payload = await response.text();

    expect(response.status).toBe(200);
    expect(payload).toContain("event: status");
    expect(payload).toContain("event: error");
    expect(payload).toContain("socket closed");
  });
});
