import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person refresh request-id diagnostics wiring", () => {
  const pagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/people/[personId]/page.tsx"
  );
  const pageContents = fs.readFileSync(pagePath, "utf8");

  it("generates per-click request ids with show+person context and monotonic counter", () => {
    expect(pageContents).toMatch(/personRefreshRequestCounterRef = useRef\(0\)/);
    expect(pageContents).toMatch(/const buildPersonRefreshRequestId = useCallback\(/);
    expect(pageContents).toMatch(/person-refresh-\$\{showToken\}-p\$\{personToken\}-\$\{timestampToken\}-\$\{counter\}/);
  });

  it("attaches x-trr-request-id header to refresh and reprocess stream requests", () => {
    expect(pageContents).toContain("/api/admin/trr-api/people/${personId}/refresh-images/stream");
    expect(pageContents).toContain("/api/admin/trr-api/people/${personId}/reprocess-images/stream");
    expect(pageContents).toMatch(/"x-trr-request-id": requestId/);
  });

  it("renders refresh logs with request-id prefix", () => {
    expect(pageContents).toMatch(/\[req:\$\{entry\.runId\}\] \$\{entry\.message\}/);
    expect(pageContents).toMatch(/runId: requestId/);
  });
});
