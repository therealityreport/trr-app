import { describe, expect, it } from "vitest";

import { fetchAllPaginatedGalleryRowsWithMeta } from "@/lib/admin/paginated-gallery-fetch";

describe("season gallery pagination", () => {
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
