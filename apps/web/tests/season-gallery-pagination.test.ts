import { describe, expect, it } from "vitest";

import {
  fetchAllPaginatedGalleryRowsWithMeta,
  fetchFirstPaginatedGalleryRowsWithMeta,
} from "@/lib/admin/paginated-gallery-fetch";

describe("season gallery pagination", () => {
  it("renders from the first page without exhausting later season cursors", async () => {
    const requests: Array<{ cursor: string | null; limit: number }> = [];

    const result = await fetchFirstPaginatedGalleryRowsWithMeta({
      pageSize: 48,
      async fetchPage(cursor, limit) {
        requests.push({ cursor, limit });
        return {
          rows: Array.from({ length: 48 }, (_, index) => ({ id: `season-asset-${index + 1}` })),
          nextCursor: "offset:48",
        };
      },
    });

    expect(result.rows).toHaveLength(48);
    expect(result.truncated).toBe(true);
    expect(result.pagesFetched).toBe(1);
    expect(requests).toEqual([{ cursor: null, limit: 48 }]);
  });

  it("fails fast when a backend cursor repeats and would otherwise loop forever", async () => {
    await expect(
      fetchAllPaginatedGalleryRowsWithMeta({
        pageSize: 100,
        async fetchPage() {
          return {
            rows: [{ id: "asset-1" }],
            nextCursor: "offset:100",
          };
        },
      })
    ).rejects.toThrow("Gallery pagination cursor loop detected.");
  });
});
