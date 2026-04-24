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
      "media",
    ]);
    expect(defaultLocalCatalogCommandSelectedTasks("tiktok", "backfill")).toEqual([
      "post_details",
      "comments",
      "media",
    ]);
    expect(defaultLocalCatalogCommandSelectedTasks("instagram", "fill_missing_posts")).toEqual([]);
  });
});
