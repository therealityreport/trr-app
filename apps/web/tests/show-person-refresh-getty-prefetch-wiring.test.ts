import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("show page person refresh Getty prefetch wiring", () => {
  const pagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/[showId]/page.tsx"
  );
  const pageContents = fs.readFileSync(pagePath, "utf8");

  it("attempts local Getty prefetch before full person refresh runs", () => {
    expect(pageContents).toContain("prefetchGettyLocallyForPerson");
    expect(pageContents).toContain("show?.name ?? undefined");
    expect(pageContents).toContain("getty_prefetch_attempted: true");
    expect(pageContents).toContain("getty_prefetch_succeeded: false");
    expect(pageContents).toContain("Object.assign(body, gettyPrefetch.bodyPatch)");
    expect(pageContents).toContain("Getty/NBCUMV refresh requires local Getty prefetch because Modal is blocked by Getty.");
    expect(pageContents).toContain("Getty/NBCUMV refresh was not started.");
  });

  it("passes personName through all show-page person refresh launchers", () => {
    expect(pageContents).toContain("{ mode, signal: options?.signal, personName: label }");
    expect(pageContents).toContain("{ signal: runController.signal, personName: label }");
  });
});
