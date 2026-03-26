import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

describe("typography repository", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.resetModules();
  });

  it("returns the seeded snapshot when typography tables are missing without running DDL on GET", async () => {
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM site_typography_sets")) {
        throw { code: "42P01", message: 'relation "site_typography_sets" does not exist' };
      }
      if (sql.includes("FROM site_typography_assignments")) {
        throw { code: "42P01", message: 'relation "site_typography_assignments" does not exist' };
      }
      return { rows: [], rowCount: 0 };
    });

    const { getTypographyState } = await import("@/lib/server/admin/typography-repository");
    const state = await getTypographyState();

    expect(state.sets.length).toBeGreaterThan(0);
    expect(state.assignments.length).toBeGreaterThan(0);
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE"));
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining("INSERT INTO site_typography_sets"));
  });

  it("resolves seeded snapshot set ids to persisted rows on update", async () => {
    const { buildTypographyStateSnapshot } = await import("@/lib/server/admin/typography-seed");
    const seededSet = buildTypographyStateSnapshot().sets[0]!;

    queryMock.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (
        sql.includes("SELECT id, slug, name, area, seed_source, roles, created_at, updated_at") &&
        sql.includes("FROM site_typography_sets") &&
        !sql.includes("ORDER BY area ASC, name ASC")
      ) {
        return {
          rows: [
            {
              id: "real-set-1",
              slug: seededSet.slug,
              name: seededSet.name,
              area: seededSet.area,
              seed_source: seededSet.seedSource,
              roles: seededSet.roles,
              created_at: "",
              updated_at: "",
            },
          ],
          rowCount: 1,
        };
      }
      if (sql.includes("INSERT INTO site_typography_sets")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("INSERT INTO site_typography_assignments")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes("SELECT id") && sql.includes("FROM site_typography_sets") && sql.includes("WHERE slug = $1")) {
        expect(params).toEqual([seededSet.slug]);
        return { rows: [{ id: "real-set-1" }], rowCount: 1 };
      }
      if (sql.includes("UPDATE site_typography_sets")) {
        expect(params?.at(-1)).toBe("real-set-1");
        return {
          rows: [
            {
              id: "real-set-1",
              slug: seededSet.slug,
              name: "Updated Name",
              area: seededSet.area,
              seed_source: seededSet.seedSource,
              roles: seededSet.roles,
              created_at: "",
              updated_at: "",
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const { updateTypographySet } = await import("@/lib/server/admin/typography-repository");
    const updated = await updateTypographySet(seededSet.id, { name: "Updated Name" });

    expect(updated?.id).toBe("real-set-1");
    expect(updated?.name).toBe("Updated Name");
  });
});
