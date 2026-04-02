import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, buildTypographyStateSnapshotMock, buildSeededTypographyStateMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  buildTypographyStateSnapshotMock: vi.fn(),
  buildSeededTypographyStateMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

vi.mock("@/lib/server/admin/typography-seed", () => ({
  buildTypographyStateSnapshot: buildTypographyStateSnapshotMock,
  buildSeededTypographyState: buildSeededTypographyStateMock,
}));

import { getTypographyState } from "@/lib/server/admin/typography-repository";

describe("typography repository read path", () => {
  beforeEach(() => {
    queryMock.mockReset();
    buildTypographyStateSnapshotMock.mockReset();
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

  it("falls back to the snapshot when typography tables are absent", async () => {
    buildTypographyStateSnapshotMock.mockReturnValue({
      sets: [{ id: "fallback-set" }],
      assignments: [{ id: "fallback-assignment" }],
    });
    queryMock.mockRejectedValue({
      code: "42P01",
      message: 'relation "site_typography_sets" does not exist',
    });

    const state = await getTypographyState();

    expect(state).toEqual({
      sets: [{ id: "fallback-set" }],
      assignments: [{ id: "fallback-assignment" }],
    });
    expect(buildTypographyStateSnapshotMock).toHaveBeenCalledTimes(1);
  });
});
