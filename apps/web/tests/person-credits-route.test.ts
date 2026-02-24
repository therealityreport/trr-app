import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  getCreditsByPersonIdMock,
  getCreditsForPersonShowScopeMock,
  getEpisodeCreditsByPersonShowIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getCreditsByPersonIdMock: vi.fn(),
  getCreditsForPersonShowScopeMock: vi.fn(),
  getEpisodeCreditsByPersonShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getCreditsByPersonId: getCreditsByPersonIdMock,
  getCreditsForPersonShowScope: getCreditsForPersonShowScopeMock,
  getEpisodeCreditsByPersonShowId: getEpisodeCreditsByPersonShowIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/credits/route";

describe("person credits route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getCreditsByPersonIdMock.mockReset();
    getCreditsForPersonShowScopeMock.mockReset();
    getEpisodeCreditsByPersonShowIdMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
  });

  it("keeps legacy credits shape when showId is not provided", async () => {
    getCreditsByPersonIdMock.mockResolvedValue([
      {
        id: "credit-1",
        show_id: "show-1",
        person_id: "person-1",
        show_name: "Show One",
        role: "Self",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
    ]);

    const request = new NextRequest("http://localhost/api/admin/trr-api/people/person-1/credits?limit=50");
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.credits).toHaveLength(1);
    expect(payload.show_scope).toBeUndefined();
    expect(getEpisodeCreditsByPersonShowIdMock).not.toHaveBeenCalled();
  });

  it("returns show_scope with cast/crew grouping and role separation", async () => {
    const showId = "11111111-2222-3333-4444-555555555555";
    const scopedCredits = [
      {
        id: "credit-host",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Host",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
      {
        id: "credit-guest-host",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Guest Host",
        billing_order: 3,
        credit_category: "Self",
        source_type: "imdb",
      },
      {
        id: "credit-exec",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Executive Producer",
        billing_order: 2,
        credit_category: "Producer",
        source_type: "imdb",
      },
      {
        id: "credit-other-show",
        show_id: "99999999-aaaa-bbbb-cccc-dddddddddddd",
        person_id: "person-1",
        show_name: "WWHL",
        role: "Self",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
    ];
    getCreditsByPersonIdMock.mockResolvedValue(scopedCredits);
    getCreditsForPersonShowScopeMock.mockResolvedValue(scopedCredits);

    getEpisodeCreditsByPersonShowIdMock.mockResolvedValue([
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-201",
        season_number: 2,
        episode_number: 1,
        episode_name: "Welcome Back",
        appearance_type: "appears",
      },
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-101",
        season_number: 1,
        episode_number: 1,
        episode_name: "Pilot",
        appearance_type: "appears",
      },
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-202",
        season_number: 2,
        episode_number: 2,
        episode_name: "Dinner Party",
        appearance_type: "appears",
      },
      {
        credit_id: "credit-guest-host",
        credit_category: "Self",
        role: "Guest Host",
        billing_order: 3,
        source_type: "imdb",
        episode_id: "ep-203",
        season_number: 2,
        episode_number: 3,
        episode_name: "Trip",
        appearance_type: "appears",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/people/person-1/credits?limit=50&showId=${showId}`
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.credits).toHaveLength(4);
    expect(getCreditsByPersonIdMock).toHaveBeenCalledWith("person-1", {
      limit: 50,
      offset: 0,
    });
    expect(getCreditsForPersonShowScopeMock).toHaveBeenCalledWith("person-1", showId);
    expect(getEpisodeCreditsByPersonShowIdMock).toHaveBeenCalledWith(
      "person-1",
      showId,
      { includeArchiveFootage: false }
    );

    expect(payload.show_scope.show_id).toBe(showId);
    expect(payload.show_scope.cast_groups).toHaveLength(2);
    expect(payload.show_scope.cast_groups.map((g: { role: string }) => g.role)).toEqual([
      "Host",
      "Guest Host",
    ]);

    const hostGroup = payload.show_scope.cast_groups.find(
      (g: { credit_id: string }) => g.credit_id === "credit-host"
    );
    expect(hostGroup.seasons.map((s: { season_number: number }) => s.season_number)).toEqual([2, 1]);
    expect(hostGroup.seasons[0].episodes.map((e: { episode_number: number }) => e.episode_number)).toEqual([1, 2]);

    expect(payload.show_scope.crew_non_episodic).toHaveLength(1);
    expect(payload.show_scope.crew_non_episodic[0].role).toBe("Executive Producer");
    expect(payload.show_scope.other_show_credits).toHaveLength(1);
    expect(payload.show_scope.other_show_credits[0].show_name).toBe("WWHL");
  });

  it("places credits with Self episode evidence into cast_groups even when base category differs", async () => {
    const showId = "11111111-2222-3333-4444-555555555555";
    const scopedCredits = [
      {
        id: "credit-host",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Host",
        billing_order: 1,
        credit_category: "Producer",
        source_type: "imdb",
      },
    ];
    getCreditsByPersonIdMock.mockResolvedValue(scopedCredits);
    getCreditsForPersonShowScopeMock.mockResolvedValue(scopedCredits);

    getEpisodeCreditsByPersonShowIdMock.mockResolvedValue([
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-201",
        season_number: 2,
        episode_number: 1,
        episode_name: "Welcome Back",
        appearance_type: "appears",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/people/person-1/credits?limit=50&showId=${showId}`
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show_scope.cast_groups).toHaveLength(1);
    expect(payload.show_scope.crew_groups).toHaveLength(0);
    expect(payload.show_scope.cast_groups[0].credit_category).toBe("Self");
  });

  it("suppresses null-role Self cast groups when explicit cast role exists", async () => {
    const showId = "11111111-2222-3333-4444-555555555555";
    const scopedCredits = [
      {
        id: "credit-host",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Host",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
      {
        id: "credit-self-null-role",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: null,
        billing_order: 2,
        credit_category: "Self",
        source_type: "imdb",
      },
      {
        id: "credit-exec",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Executive Producer",
        billing_order: 3,
        credit_category: "Producer",
        source_type: "imdb",
      },
    ];
    getCreditsByPersonIdMock.mockResolvedValue(scopedCredits);
    getCreditsForPersonShowScopeMock.mockResolvedValue(scopedCredits);

    getEpisodeCreditsByPersonShowIdMock.mockResolvedValue([
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-201",
        season_number: 2,
        episode_number: 1,
        episode_name: "Welcome Back",
        appearance_type: "appears",
      },
      {
        credit_id: "credit-self-null-role",
        credit_category: "Self",
        role: null,
        billing_order: 2,
        source_type: "imdb",
        episode_id: "ep-202",
        season_number: 2,
        episode_number: 2,
        episode_name: "Dinner Party",
        appearance_type: "appears",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/people/person-1/credits?limit=50&showId=${showId}`
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show_scope.cast_groups).toHaveLength(1);
    expect(payload.show_scope.cast_groups[0].credit_id).toBe("credit-host");
    expect(payload.show_scope.cast_non_episodic).toHaveLength(0);
    expect(payload.show_scope.crew_non_episodic).toHaveLength(1);
    expect(payload.show_scope.crew_non_episodic[0].id).toBe("credit-exec");
  });

  it("keeps null-role Self cast groups when no explicit cast role exists", async () => {
    const showId = "11111111-2222-3333-4444-555555555555";
    const scopedCredits = [
      {
        id: "credit-self-null-role",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: null,
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
    ];
    getCreditsByPersonIdMock.mockResolvedValue(scopedCredits);
    getCreditsForPersonShowScopeMock.mockResolvedValue(scopedCredits);

    getEpisodeCreditsByPersonShowIdMock.mockResolvedValue([
      {
        credit_id: "credit-self-null-role",
        credit_category: "Self",
        role: null,
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-101",
        season_number: 1,
        episode_number: 1,
        episode_name: "Pilot",
        appearance_type: "appears",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/people/person-1/credits?limit=50&showId=${showId}`
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.show_scope.cast_groups).toHaveLength(1);
    expect(payload.show_scope.cast_groups[0].credit_id).toBe("credit-self-null-role");
    expect(payload.show_scope.cast_non_episodic).toHaveLength(0);
    expect(payload.show_scope.crew_groups).toHaveLength(0);
    expect(payload.show_scope.crew_non_episodic).toHaveLength(0);
  });

  it("rejects invalid showId", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/credits?showId=not-a-uuid"
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("showId must be a UUID");
    expect(getCreditsByPersonIdMock).not.toHaveBeenCalled();
  });

  it("builds show_scope from full-scope credits even when paged credits omit scoped rows", async () => {
    const showId = "11111111-2222-3333-4444-555555555555";
    getCreditsByPersonIdMock.mockResolvedValue([
      {
        id: "credit-other-show",
        show_id: "99999999-aaaa-bbbb-cccc-dddddddddddd",
        person_id: "person-1",
        show_name: "WWHL",
        role: "Host",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
    ]);
    getCreditsForPersonShowScopeMock.mockResolvedValue([
      {
        id: "credit-host",
        show_id: showId,
        person_id: "person-1",
        show_name: "RHOSLC",
        role: "Host",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
      {
        id: "credit-other-show",
        show_id: "99999999-aaaa-bbbb-cccc-dddddddddddd",
        person_id: "person-1",
        show_name: "WWHL",
        role: "Host",
        billing_order: 1,
        credit_category: "Self",
        source_type: "imdb",
      },
    ]);

    getEpisodeCreditsByPersonShowIdMock.mockResolvedValue([
      {
        credit_id: "credit-host",
        credit_category: "Self",
        role: "Host",
        billing_order: 1,
        source_type: "imdb",
        episode_id: "ep-201",
        season_number: 2,
        episode_number: 1,
        episode_name: "Welcome Back",
        appearance_type: "appears",
      },
    ]);

    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/people/person-1/credits?limit=1&showId=${showId}`
    );
    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.credits).toHaveLength(1);
    expect(payload.show_scope.cast_groups).toHaveLength(1);
    expect(payload.show_scope.cast_groups[0].credit_id).toBe("credit-host");
    expect(payload.show_scope.other_show_credits).toHaveLength(1);
  });
});
