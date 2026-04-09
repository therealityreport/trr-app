import { describe, expect, it } from "vitest";

import { fetchAllPaginatedGalleryRowsWithMeta } from "@/lib/admin/paginated-gallery-fetch";

describe("show gallery pagination", () => {
  it("aggregates all pages exposed by backend cursors without a fixed page cap", async () => {
    const requests: Array<{ cursor: string | null; limit: number }> = [];

    const result = await fetchAllPaginatedGalleryRowsWithMeta({
      pageSize: 500,
      async fetchPage(cursor, limit) {
        requests.push({ cursor, limit });
        if (cursor === null) {
          return {
            rows: Array.from({ length: 500 }, (_, index) => ({ id: `asset-${index + 1}` })),
            nextCursor: "offset:500",
          };
        }
        return {
          rows: [{ id: "asset-501" }],
          nextCursor: null,
        };
      },
    });

    expect(result.rows).toHaveLength(501);
    expect(result.truncated).toBe(false);
    expect(result.pagesFetched).toBe(2);
    expect(requests).toEqual([
      { cursor: null, limit: 500 },
      { cursor: "offset:500", limit: 500 },
    ]);
  });
});
