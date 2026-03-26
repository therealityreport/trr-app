import { describe, expect, it } from "vitest";
import { compactGettyPrefetchPayload } from "@/lib/server/admin/getty-local-scrape";

describe("compactGettyPrefetchPayload", () => {
  it("keeps Getty fields used by the backend while dropping bulky raw blobs", () => {
    const payload = compactGettyPrefetchPayload({
      merged: [
        {
          editorial_id: "1435767826",
          detail_url: "https://www.gettyimages.com/detail/news-photo/example/1435767826",
          object_name: "NUP_200263_00001.JPG",
          title: "Legends Ball 2022 BravoCon",
          caption: "Brandi Glanville attends BravoCon.",
          preview_image_url: "https://media.gettyimages.com/example-1024.jpg",
          original_image_url: "https://media.gettyimages.com/example-2048.jpg",
          keyword_texts: ["Brandi Glanville", "BravoCon"],
          people_overlay_names: ["Brandi Glanville"],
          grouped_image_count: 4,
          person_image_count: 1,
          details: {
            max_file_size: "2000 x 3000",
            restrictions: "editorial only",
            release_info: "not released",
            giant_unused_detail: "drop me",
          },
          asset: {
            id: "1435767826",
            objectName: "NUP_200263_00001.JPG",
            title: "Legends Ball 2022 BravoCon",
            caption: "Brandi Glanville attends BravoCon.",
            keywords: [{ text: "Brandi Glanville" }, { text: "BravoCon" }],
            people: [{ text: "Brandi Glanville" }],
            deliveryUrls: {
              HighResComp: "https://media.gettyimages.com/example-2048.jpg",
              Comp1024: "https://media.gettyimages.com/example-1024.jpg",
            },
            imageSizes: [{ name: "master", pixels: "2000 x 3000" }],
          },
          imageSizes: [{ name: "master", pixels: "2000 x 3000" }],
          deliveryUrls: {
            HighResComp: "https://media.gettyimages.com/example-2048.jpg",
          },
        },
      ],
      merged_events: [
        {
          event_name: "Legends Ball 2022 BravoCon",
          event_url: "https://www.gettyimages.com/photos/bravocon",
          event_id: "123",
          grouped_image_count: 4,
          source_query_scope: "bravo",
          matched_asset: {
            editorial_id: "1435767826",
            original_image_url: "https://media.gettyimages.com/example-2048.jpg",
            asset: {
              id: "1435767826",
              keywords: [{ text: "Brandi Glanville" }],
              imageSizes: [{ name: "master", pixels: "2000 x 3000" }],
            },
            deliveryUrls: { HighResComp: "https://media.gettyimages.com/example-2048.jpg" },
          },
          asset_samples: new Array(25).fill({ raw: "drop me" }),
        },
      ],
      merged_total: 1,
      merged_events_total: 1,
      query_summaries: [
        {
          label: "Broad Search",
          scope: "broad",
          phrase: "Brandi Glanville",
          query_url:
            "https://www.gettyimages.com/search/2/image?family=editorial&phrase=Brandi%20Glanville&sort=newest",
          site_image_total: 4823,
          site_event_total: 340,
          site_video_total: 62,
          fetched_asset_total: 180,
          usable_after_dedupe_total: 83,
          overlap_with_prior_queries: 97,
          giant_unused_blob: { drop: true },
        },
      ],
      auth_mode: "chrome_profile_cookies",
      auth_warning: null,
      elapsed_seconds: 12.3,
    });

    expect(payload.merged_total).toBe(1);
    expect(payload.merged_events_total).toBe(1);
    expect(payload.elapsed_seconds).toBe(12.3);
    expect(payload.auth_mode).toBe("chrome_profile_cookies");

    const asset = (payload.merged ?? [])[0] as Record<string, unknown>;
    expect(asset.editorial_id).toBe("1435767826");
    expect(asset.original_image_url).toBe("https://media.gettyimages.com/example-2048.jpg");
    expect(asset.keyword_texts).toEqual(["Brandi Glanville", "BravoCon"]);
    expect(asset.imageSizes).toBeUndefined();
    expect(asset.deliveryUrls).toBeUndefined();

    const assetDetails = asset.details as Record<string, unknown>;
    expect(assetDetails.max_file_size).toBe("2000 x 3000");
    expect(assetDetails.giant_unused_detail).toBeUndefined();

    const rawAsset = asset.asset as Record<string, unknown>;
    expect(rawAsset.id).toBe("1435767826");
    expect(rawAsset.keywords).toEqual([{ text: "Brandi Glanville" }, { text: "BravoCon" }]);
    expect(rawAsset.imageSizes).toBeUndefined();

    const event = (payload.merged_events ?? [])[0] as Record<string, unknown>;
    expect(event.event_name).toBe("Legends Ball 2022 BravoCon");
    expect(event.asset_samples).toBeUndefined();
    expect((event.matched_asset as Record<string, unknown>).original_image_url).toBe(
      "https://media.gettyimages.com/example-2048.jpg"
    );

    const summary = (payload.query_summaries ?? [])[0] as Record<string, unknown>;
    expect(summary.query_url).toContain("Brandi%20Glanville");
    expect(summary.site_image_total).toBe(4823);
    expect(summary.usable_after_dedupe_total).toBe(83);
    expect(summary.giant_unused_blob).toBeUndefined();
  });
});
