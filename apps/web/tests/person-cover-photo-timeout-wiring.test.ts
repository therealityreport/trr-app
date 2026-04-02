import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person cover photo timeout handling", () => {
  it("treats optional cover photo timeouts as a null fallback instead of a hard console error", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const isAdminRequestTimeoutError = \(error: unknown\): boolean =>/);
    expect(contents).toMatch(/error instanceof AdminRequestError/);
    expect(contents).toMatch(/error\.code === "REQUEST_TIMEOUT" \|\| error\.status === 408/);
    expect(contents).toMatch(/if \(isAdminRequestTimeoutError\(err\)\) \{/);
    expect(contents).toMatch(/setCoverPhoto\(null\);/);
    expect(contents).toMatch(/Optional cover photo request timed out/);
  });
});
