import { describe, expect, it } from "vitest";
import { fetchAllPaginatedGalleryRowsWithMeta } from "@/lib/admin/paginated-gallery-fetch";

describe("fetchAllPaginatedGalleryRowsWithMeta", () => {
  it("uses the smaller default first-page slice for gallery backfills", async () => {
    const limits: number[] = [];

    const result = await fetchAllPaginatedGalleryRowsWithMeta({
      async fetchPage(_offset, limit) {
        limits.push(limit);
        return [];
      },
    });

    expect(result.rowsFetched).toBe(0);
    expect(limits).toEqual([48]);
  });
});
