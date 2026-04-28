import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const candidateFiles = [
  "../src/lib/server/admin/social-posts-repository.ts",
  "../src/app/api/admin/trr-api/shows/[showId]/social-posts/route.ts",
  "../src/app/api/admin/social-posts/[postId]/route.ts",
];

describe("social posts app SQL boundary", () => {
  it("keeps social posts routes and compatibility surfaces free of app direct SQL", () => {
    const blockedPatterns = [
      /from\s+["']@\/lib\/server\/postgres["']/,
      /\bwithAuthTransaction\b/,
      /\bclient\.query\s*\(/,
      /\bquery\s*(?:<|\()/,
      /\badmin\.show_social_posts\b/,
      /\bshow_social_posts\b/,
    ];

    for (const relativePath of candidateFiles) {
      const filePath = path.resolve(__dirname, relativePath);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const contents = fs.readFileSync(filePath, "utf8");
      for (const pattern of blockedPatterns) {
        expect(contents, `${relativePath} matched blocked SQL pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
