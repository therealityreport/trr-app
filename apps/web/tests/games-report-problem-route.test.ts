import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireUserMock, collectionMock, addMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  collectionMock: vi.fn(),
  addMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireUser: requireUserMock,
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: collectionMock,
  },
}));

import { POST } from "@/app/api/games/report-problem/route";

describe("/api/games/report-problem", () => {
  let activeUid = "user-123";

  beforeEach(() => {
    activeUid = `user-${Math.random().toString(36).slice(2, 8)}`;
    requireUserMock.mockReset();
    collectionMock.mockReset();
    addMock.mockReset();
    requireUserMock.mockResolvedValue({ uid: activeUid });
    collectionMock.mockReturnValue({ add: addMock });
    addMock.mockResolvedValue({ id: "report-1" });
  });

  it("returns 401 when user is unauthorized", async () => {
    requireUserMock.mockRejectedValueOnce(new Error("unauthorized"));

    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "realitease",
        puzzleDate: "2026-03-02",
        category: "technical",
        description: "broken tile flip",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized");
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("validates payload fields", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "invalid",
        puzzleDate: "2026-03-02",
        category: "technical",
        description: "broken tile flip",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid game/i);
    expect(collectionMock).not.toHaveBeenCalled();
  });

  it("rejects invalid categories", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "realitease",
        puzzleDate: "2026-03-02",
        category: "bug",
        description: "broken tile flip",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Invalid category/i);
  });

  it("rejects future puzzle dates", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "realitease",
        puzzleDate: "2099-12-31",
        category: "technical",
        description: "broken tile flip",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/future/i);
  });

  it("rejects descriptions over limit", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "realitease",
        puzzleDate: "2026-03-02",
        category: "technical",
        description: "a".repeat(2001),
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/<= 2000/i);
  });

  it("persists a valid report", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "bravodle",
        puzzleDate: "2026-03-02",
        category: "technical",
        description: "animation stutter on flip",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true, reportId: "report-1" });
    expect(collectionMock).toHaveBeenCalledWith("problem_reports");
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0][0]).toMatchObject({
      game: "bravodle",
      puzzleDate: "2026-03-02",
      category: "technical",
      description: "animation stutter on flip",
      userId: activeUid,
    });
  });

  it("sanitizes control characters in descriptions", async () => {
    const request = new NextRequest("http://localhost/api/games/report-problem", {
      method: "POST",
      body: JSON.stringify({
        game: "bravodle",
        puzzleDate: "2026-03-02",
        category: "technical",
        description: "line\u0000break\nwith\tcontrols",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(addMock.mock.calls[0][0]).toMatchObject({
      description: "line break with controls",
    });
  });

  it("rate limits excessive report submissions per user", async () => {
    activeUid = "rate-limited-user";
    requireUserMock.mockResolvedValue({ uid: activeUid });

    const buildRequest = () =>
      new NextRequest("http://localhost/api/games/report-problem", {
        method: "POST",
        body: JSON.stringify({
          game: "bravodle",
          puzzleDate: "2026-03-02",
          category: "technical",
          description: "animation stutter on flip",
        }),
        headers: { "content-type": "application/json" },
      });

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(buildRequest());
      expect(response.status).toBe(200);
    }

    const blockedResponse = await POST(buildRequest());
    const payload = await blockedResponse.json();
    expect(blockedResponse.status).toBe(429);
    expect(payload.error).toMatch(/Too many reports/i);
  });
});
