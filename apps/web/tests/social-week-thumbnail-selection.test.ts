import { describe, expect, it } from "vitest";

import {
  isVideoLikeSocialUrl,
  pickFirstNonVideoUrl,
  selectInstagramTikTokThumbnailUrl,
  selectTwitterThumbnailUrl,
} from "../src/components/admin/social-week/social-media-thumbnails";

describe("social week twitter thumbnail selection", () => {
  it("detects video-like social URLs including video.twimg.com host", () => {
    expect(isVideoLikeSocialUrl("https://video.twimg.com/ext_tw_video/12345/pu/vid/avc1/1280x720/clip")).toBe(true);
    expect(isVideoLikeSocialUrl("https://cdn.test/social/twitter/x/thumb.mp4")).toBe(true);
    expect(isVideoLikeSocialUrl("https://cdn.test/social/twitter/x/thumb.jpg")).toBe(false);
  });

  it("returns first non-video URL in order", () => {
    const selected = pickFirstNonVideoUrl([
      "https://cdn.test/social/twitter/x/thumbnail.mp4",
      "https://cdn.test/social/twitter/x/media-02.jpg",
      "https://cdn.test/social/twitter/x/media-03.jpg",
    ]);
    expect(selected).toBe("https://cdn.test/social/twitter/x/media-02.jpg");
  });

  it("prefers non-video twitter thumbnail candidates in the configured order", () => {
    const selected = selectTwitterThumbnailUrl({
      hostedThumbnail: "https://cdn.test/social/twitter/x/thumbnail.mp4",
      thumbnail: "https://video.twimg.com/ext_tw_video/123/pu/vid/avc1/1280x720/main.mp4?tag=12",
      hostedMediaUrls: [
        "https://cdn.test/social/twitter/x/thumbnail.mp4",
        "https://cdn.test/social/twitter/x/media-02.jpg",
      ],
      mediaUrls: [
        "https://video.twimg.com/ext_tw_video/123/pu/vid/avc1/1280x720/main.mp4?tag=12",
        "https://pbs.twimg.com/ext_tw_video_thumb/123/pu/img/cover.jpg",
      ],
    });
    expect(selected).toBe("https://cdn.test/social/twitter/x/media-02.jpg");
  });

  it("falls back to video thumbnail when no non-video candidate exists", () => {
    const selected = selectTwitterThumbnailUrl({
      hostedThumbnail: "https://cdn.test/social/twitter/x/thumbnail.mp4",
      thumbnail: "https://video.twimg.com/ext_tw_video/123/pu/vid/avc1/1280x720/main.mp4?tag=12",
      hostedMediaUrls: ["https://cdn.test/social/twitter/x/media-01.mp4"],
      mediaUrls: ["https://video.twimg.com/ext_tw_video/123/pu/vid/avc1/1280x720/main.mp4?tag=12"],
    });
    expect(selected).toBe("https://cdn.test/social/twitter/x/thumbnail.mp4");
  });

  it("prefers non-video tiktok/instagram thumbnail candidates across fields", () => {
    const selected = selectInstagramTikTokThumbnailUrl({
      hostedThumbnail: "https://cdn.test/social/tiktok/x/thumbnail.mp4",
      thumbnail: "https://video.test/source-thumb.mp4",
      hostedMediaUrls: ["https://cdn.test/social/tiktok/x/media-01.mp4"],
      sourceMediaUrls: [
        "https://video.test/source-main.mp4",
        "https://images.test/source-frame.jpg",
      ],
      mediaUrls: ["https://video.test/source-main.mp4"],
    });
    expect(selected).toBe("https://images.test/source-frame.jpg");
  });

  it("falls back to first available tiktok/instagram candidate when all are video-like", () => {
    const selected = selectInstagramTikTokThumbnailUrl({
      hostedThumbnail: "",
      thumbnail: "",
      hostedMediaUrls: ["https://cdn.test/social/tiktok/x/media-01.mp4"],
      sourceMediaUrls: ["https://video.test/source-main.mp4"],
      mediaUrls: [],
    });
    expect(selected).toBe("https://cdn.test/social/tiktok/x/media-01.mp4");
  });
});
