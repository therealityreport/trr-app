import { describe, expect, it } from "vitest";
import {
  buildLocalCatalogCommand,
  defaultLocalCatalogCommandSelectedTasks,
} from "@/components/admin/SocialAccountProfilePage";

describe("buildLocalCatalogCommand", () => {
  it("includes selected tasks for local Backfill Posts fallback", () => {
    const command = buildLocalCatalogCommand("instagram", "bravotv", "bravo", "backfill", [
      "post_details",
      "comments",
      "media",
    ]);

    expect(command).toContain("--platform instagram");
    expect(command).toContain("--account bravotv");
    expect(command).toContain("--source-scope bravo");
    expect(command).toContain("--action backfill");
    expect(command).toContain("--selected-task post_details");
    expect(command).toContain("--selected-task comments");
    expect(command).toContain("--selected-task media");
  });

  it("uses the same default selected tasks as the Backfill Posts copy action", () => {
    expect(defaultLocalCatalogCommandSelectedTasks("instagram", "backfill")).toEqual([
      "post_details",
      "comments",
    ]);
    expect(defaultLocalCatalogCommandSelectedTasks("tiktok", "backfill")).toEqual([
      "post_details",
      "comments",
      "media",
    ]);
    expect(defaultLocalCatalogCommandSelectedTasks("instagram", "fill_missing_posts")).toEqual([]);
  });

  it("includes sanitized progress diagnostics for copied Instagram Backfill Posts commands", () => {
    const command = buildLocalCatalogCommand("instagram", "thetraitorsus", "bravo", "backfill", [
      "post_details",
      "comments",
      "media",
    ], {
      progress: {
        run_id: "run-copy-debug-1",
        run_status: "running",
        source_scope: "bravo",
        stages: {},
        per_handle: [],
        recent_log: [],
        selected_tasks: ["post_details", "comments", "media"],
        effective_selected_tasks: ["post_details", "comments", "media"],
        resume_cursor_saved: true,
        pagination_state: {
          source_scope: "bravo",
          direction: "forward",
          end_cursor: "CURSOR_123",
          doc_id_used: "DOCID_OK",
          proxy_session_key: "proxy-session-secret",
        },
        listing_progress: {
          pages_scanned: 12,
          posts_seen: 396,
          posts_upserted: 390,
        },
        details_progress: {
          status: "queued",
          total_posts: 390,
        },
        doc_id_used: "DOCID_OK",
        acceleration_feature_flags: {
          SOCIAL_INSTAGRAM_POSTS_BIDIRECTIONAL_WALK_ENABLED: false,
          SOCIAL_INSTAGRAM_POSTS_PER_IP_PACING_ENABLED: true,
          SOCIAL_INSTAGRAM_POSTS_PAGE_PROXY_ROTATION_ENABLED: true,
          SOCIAL_INSTAGRAM_POSTS_SHARED_WARMUP_ENABLED: false,
        },
        proxy_pacing: {
          mode: "per_ip",
          proxy_url: "http://user:password@proxy.example:8080",
        },
        bidirectional_probe: {
          status: "failed",
          overlap_count: 33,
        },
      },
    });

    expect(command).toContain("--selected-task post_details");
    expect(command).toContain("\"selected_tasks\":[\"post_details\",\"comments\",\"media\"]");
    expect(command).toContain("\"source_scope\":\"bravo\"");
    expect(command).toContain("\"mode\":\"resume\"");
    expect(command).toContain("\"SOCIAL_INSTAGRAM_POSTS_PER_IP_PACING_ENABLED\":true");
    expect(command).toContain("\"proxy_pacing\":{\"mode\":\"per_ip\",\"proxy_url\":\"<redacted>\"}");
    expect(command).toContain("\"bidirectional_probe\":{\"status\":\"failed\",\"overlap_count\":33}");
    expect(command).not.toContain("password");
    expect(command).not.toContain("proxy-session-secret");
  });
});
