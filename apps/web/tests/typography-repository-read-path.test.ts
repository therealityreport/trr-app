import { beforeEach, describe, expect, it, vi } from "vitest";

const EMPTY_SEEDED_STATE = { sets: [], assignments: [] };

const { queryMock, buildTypographyStateSnapshotMock, buildSeededTypographyStateMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  buildTypographyStateSnapshotMock: vi.fn().mockReturnValue({ sets: [], assignments: [] }),
  buildSeededTypographyStateMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

vi.mock("@/lib/server/admin/typography-seed", () => ({
  buildTypographyStateSnapshot: buildTypographyStateSnapshotMock,
  buildSeededTypographyState: buildSeededTypographyStateMock,
}));

vi.mock("@/lib/server/admin/route-response-cache", () => ({
  getRouteResponseCache: vi.fn().mockReturnValue(null),
  setRouteResponseCache: vi.fn(),
  getOrCreateRouteResponsePromise: vi.fn(
    (_ns: string, _key: string, factory: () => Promise<unknown>) => factory(),
  ),
  invalidateRouteResponseCache: vi.fn(),
}));

import { getTypographyState } from "@/lib/server/admin/typography-repository";

describe("typography repository read path", () => {
  beforeEach(() => {
    queryMock.mockReset();
    buildSeededTypographyStateMock.mockReset();
    buildSeededTypographyStateMock.mockReturnValue({ sets: [], assignments: [] });
  });

  it("reads persisted state without schema bootstrap on GET", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "set-1",
            slug: "headline",
            name: "Headline",
            area: "admin",
            seed_source: "seed",
            roles: {},
            created_at: "2026-03-25T00:00:00Z",
            updated_at: "2026-03-25T00:00:00Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "assignment-1",
            area: "admin",
            page_key: "page",
            instance_key: null,
            set_id: "set-1",
            source_path: "src/app/page.tsx",
            notes: null,
            created_at: "2026-03-25T00:00:00Z",
            updated_at: "2026-03-25T00:00:00Z",
          },
        ],
      });

    const state = await getTypographyState();

    expect(state.sets).toHaveLength(1);
    expect(state.assignments).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledTimes(2);
    for (const call of queryMock.mock.calls) {
      expect(String(call[0]).toLowerCase()).not.toContain("create table");
      expect(String(call[0]).toLowerCase()).not.toContain("insert into site_typography_sets");
      expect(String(call[0]).toLowerCase()).not.toContain("insert into site_typography_assignments");
    }
  });

  it("falls back to the seeded snapshot when typography tables are absent", async () => {
    queryMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "site_typography_sets" does not exist',
    });

    const state = await getTypographyState();

    // When tables are missing, readPersistedTypographyState returns null and
    // getTypographyState falls back to the module-level SEEDED_SNAPSHOT which
    // was captured once at import time from the mocked buildTypographyStateSnapshot.
    expect(state).toEqual(EMPTY_SEEDED_STATE);
  });
});
