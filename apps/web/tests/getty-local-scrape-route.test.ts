import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));
const {
  createGettyPrefetchJobMock,
  startGettyPrefetchJobMock,
  readGettyPrefetchPayloadMock,
} = vi.hoisted(() => ({
  createGettyPrefetchJobMock: vi.fn(),
  startGettyPrefetchJobMock: vi.fn(),
  readGettyPrefetchPayloadMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/getty-local-scrape", () => ({
  createGettyPrefetchJob: createGettyPrefetchJobMock,
  startGettyPrefetchJob: startGettyPrefetchJobMock,
  readGettyPrefetchPayload: readGettyPrefetchPayloadMock,
}));

import {
  GET,
  POST,
} from "@/app/api/admin/getty-local/scrape/route";

describe("getty local scrape route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createGettyPrefetchJobMock.mockReset();
    startGettyPrefetchJobMock.mockReset();
    readGettyPrefetchPayloadMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("starts a Getty scrape job and returns kickoff metadata", async () => {
    createGettyPrefetchJobMock.mockResolvedValue({
      token: "token-1",
      state: { status: "queued", prefetch_mode: "discovery" },
    });
    startGettyPrefetchJobMock.mockResolvedValue({
      status: "running",
      stage: "starting",
      progress_message: "Starting Getty discovery job...",
      prefetch_mode: "discovery",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/getty-local/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          person_name: "Brandi Glanville",
          show_name: "The Real Housewives of Beverly Hills",
          mode: "discovery",
        }),
      })
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(202);
    expect(payload.prefetch_token).toBe("token-1");
    expect(payload.status).toBe("running");
    expect(payload.status_url).toBe("/api/admin/getty-local/scrape?prefetch_token=token-1");
  });

  it("returns Getty scrape job status for polling", async () => {
    readGettyPrefetchPayloadMock.mockResolvedValue({
      status: "running",
      stage: "discovery",
      progress_message: "Broad Search page 2",
      heartbeat_at: "2026-03-24T16:00:00.000Z",
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/getty-local/scrape?prefetch_token=token-1")
    );
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.prefetch_token).toBe("token-1");
    expect(payload.status).toBe("running");
    expect(payload.progress_message).toBe("Broad Search page 2");
  });
});
