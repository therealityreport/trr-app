import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  collectionMock,
  orderByMock,
  limitMock,
  getMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  collectionMock: vi.fn(),
  orderByMock: vi.fn(),
  limitMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  adminDb: {
    collection: collectionMock,
  },
}));

import { GET } from "@/app/api/admin/games/problem-reports/route";

function buildSnapshot(entries: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (callback: (docSnap: { id: string; data: () => Record<string, unknown> }) => void) => {
      entries.forEach((entry) => {
        callback({
          id: entry.id,
          data: () => entry.data,
        });
      });
    },
  };
}

describe("/api/admin/games/problem-reports", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    collectionMock.mockReset();
    orderByMock.mockReset();
    limitMock.mockReset();
    getMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    collectionMock.mockReturnValue({ orderBy: orderByMock });
    orderByMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ get: getMock });
  });

  it("returns 403 when admin auth fails", async () => {
    requireAdminMock.mockRejectedValueOnce(new Error("forbidden"));
    const request = new NextRequest("http://localhost/api/admin/games/problem-reports");
    const response = await GET(request);
    const payload = await response.json();
    expect(response.status).toBe(403);
    expect(payload.error).toBe("forbidden");
  });

  it("validates the game query parameter", async () => {
    const request = new NextRequest("http://localhost/api/admin/games/problem-reports?game=invalid");
    const response = await GET(request);
    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBe("invalid_game");
  });

  it("returns filtered reports for a game", async () => {
    const createdAt = { toDate: () => new Date("2026-03-03T10:20:30.000Z") };
    getMock.mockResolvedValue(
      buildSnapshot([
        {
          id: "r1",
          data: {
            game: "bravodle",
            puzzleDate: "2026-03-02",
            category: "technical",
            description: "issue one",
            userId: "u1",
            createdAt,
            updatedAt: createdAt,
          },
        },
        {
          id: "r2",
          data: {
            game: "realitease",
            puzzleDate: "2026-03-02",
            category: "content",
            description: "issue two",
            userId: "u2",
            createdAt,
            updatedAt: createdAt,
          },
        },
      ]),
    );

    const request = new NextRequest("http://localhost/api/admin/games/problem-reports?game=bravodle&limit=10");
    const response = await GET(request);
    const payload = (await response.json()) as { reports: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith("problem_reports");
    expect(orderByMock).toHaveBeenCalledWith("createdAt", "desc");
    expect(limitMock).toHaveBeenCalledWith(20);
    expect(payload.reports).toHaveLength(1);
    expect(payload.reports[0]).toMatchObject({
      id: "r1",
      game: "bravodle",
      category: "technical",
      description: "issue one",
      userId: "u1",
    });
    expect(payload.reports[0]?.createdAt).toBe("2026-03-03T10:20:30.000Z");
  });

  it("caps limit and returns requested slice", async () => {
    getMock.mockResolvedValue(
      buildSnapshot(
        Array.from({ length: 3 }).map((_, index) => ({
          id: `r${index + 1}`,
          data: {
            game: "realitease",
            puzzleDate: "2026-03-02",
            category: "technical",
            description: `issue ${index + 1}`,
            userId: `u${index + 1}`,
          },
        })),
      ),
    );

    const request = new NextRequest("http://localhost/api/admin/games/problem-reports?limit=2");
    const response = await GET(request);
    const payload = (await response.json()) as { reports: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(limitMock).toHaveBeenCalledWith(2);
    expect(payload.reports.map((item) => item.id)).toEqual(["r1", "r2"]);
  });
});
