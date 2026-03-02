import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getRecentPeopleViewsMock, recordRecentPersonViewMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getRecentPeopleViewsMock: vi.fn(),
  recordRecentPersonViewMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/recent-people-repository", () => ({
  getRecentPeopleViews: getRecentPeopleViewsMock,
  recordRecentPersonView: recordRecentPersonViewMock,
}));

import { GET, POST } from "@/app/api/admin/recent-people/route";

describe("/api/admin/recent-people", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getRecentPeopleViewsMock.mockReset();
    recordRecentPersonViewMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
  });

  it("returns recent people scoped to current admin", async () => {
    getRecentPeopleViewsMock.mockResolvedValue([
      {
        person_id: "11111111-2222-3333-4444-555555555555",
        full_name: "Alan Cumming",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/recent-people?limit=5");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getRecentPeopleViewsMock).toHaveBeenCalledWith("firebase-admin-1", { limit: 5 });
    expect(payload.people).toHaveLength(1);
    expect(payload.pagination.limit).toBe(5);
  });

  it("validates personId on POST", async () => {
    const request = new NextRequest("http://localhost/api/admin/recent-people", {
      method: "POST",
      body: JSON.stringify({ personId: "not-a-uuid" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("personId");
    expect(recordRecentPersonViewMock).not.toHaveBeenCalled();
  });

  it("records recent person views and keeps show context", async () => {
    const personId = "11111111-2222-3333-4444-555555555555";
    const request = new NextRequest("http://localhost/api/admin/recent-people", {
      method: "POST",
      body: JSON.stringify({ personId, showId: "the-traitors-us" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(recordRecentPersonViewMock).toHaveBeenCalledWith(
      { firebaseUid: "firebase-admin-1", isAdmin: true },
      { personId, showContext: "the-traitors-us" },
      { cap: 20 },
    );
  });
});
