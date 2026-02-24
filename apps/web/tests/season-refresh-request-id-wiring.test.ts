import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("season refresh request-id diagnostics wiring", () => {
  const pagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx"
  );
  const pageContents = fs.readFileSync(pagePath, "utf8");

  it("generates per-click request ids with show+season context and monotonic counter", () => {
    expect(pageContents).toMatch(/seasonRefreshRequestCounterRef = useRef\(0\)/);
    expect(pageContents).toMatch(/const buildSeasonRefreshRequestId = useCallback\(/);
    expect(pageContents).toMatch(/season-refresh-\$\{showToken\}-s\$\{seasonToken\}-\$\{timestampToken\}-\$\{counter\}/);
  });

  it("attaches x-trr-request-id to refresh-photos stream request headers", () => {
    expect(pageContents).toMatch(/"x-trr-request-id": requestId/);
    expect(pageContents).toMatch(/fetch\(`\/api\/admin\/trr-api\/shows\/\$\{showId\}\/refresh-photos\/stream`/);
  });

  it("stamps request ids into activity log entries and renders prefixed log lines", () => {
    expect(pageContents).toMatch(/type SeasonRefreshLogEntry = \{[\s\S]*requestId\?: string \| null;/);
    expect(pageContents).toMatch(/\[req:\$\{entry\.requestId\}\] \$\{entry\.message\}/);
    expect(pageContents).toMatch(/requestId: payloadRequestId/);
  });
});
