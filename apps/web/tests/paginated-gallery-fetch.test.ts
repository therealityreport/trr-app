import { describe, expect, it } from "vitest";
import { fetchAllPaginatedGalleryRowsWithMeta } from "@/lib/admin/paginated-gallery-fetch";

describe("fetchAllPaginatedGalleryRowsWithMeta", () => {
  it("uses the smaller default first-page slice for gallery backfills", async () => {
    const requests: Array<{ cursor: string | null; limit: number }> = [];

    const result = await fetchAllPaginatedGalleryRowsWithMeta({
      async fetchPage(cursor, limit) {
        requests.push({ cursor, limit });
        return { rows: [], nextCursor: null };
      },
    });

    expect(result.rowsFetched).toBe(0);
    expect(requests).toEqual([{ cursor: null, limit: 48 }]);
  });

  it("exhausts cursor-based pagination until the backend stops returning next_cursor", async () => {
    const requests: Array<{ cursor: string | null; limit: number }> = [];

    const result = await fetchAllPaginatedGalleryRowsWithMeta({
      pageSize: 2,
      async fetchPage(cursor, limit) {
        requests.push({ cursor, limit });
        if (cursor === null) {
          return { rows: ["asset-1", "asset-2"], nextCursor: "cursor-2" };
        }
        if (cursor === "cursor-2") {
          return { rows: ["asset-3"], nextCursor: null };
        }
        return { rows: [], nextCursor: null };
      },
    });

    expect(result).toMatchObject({
      rows: ["asset-1", "asset-2", "asset-3"],
      truncated: false,
      pagesFetched: 2,
      rowsFetched: 3,
    });
    expect(requests).toEqual([
      { cursor: null, limit: 2 },
      { cursor: "cursor-2", limit: 2 },
    ]);
  });
});
