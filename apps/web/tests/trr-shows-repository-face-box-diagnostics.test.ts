import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("trr shows repository face-box diagnostics mapping", () => {
  it("keeps match diagnostics fields when parsing face_boxes", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/lib/server/trr-api/trr-shows-repository.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/match_similarity\?: number \| null;/);
    expect(contents).toMatch(/match_status\?: string \| null;/);
    expect(contents).toMatch(/match_reason\?: string \| null;/);
    expect(contents).toMatch(/match_candidates\?: Array<\{/);
    expect(contents).toMatch(/const matchSimilarity =[\s\S]*candidate\.match_similarity/);
    expect(contents).toMatch(/const matchReason =[\s\S]*candidate\.match_reason/);
    expect(contents).toMatch(/const matchCandidates = Array\.isArray\(candidate\.match_candidates\)/);
    expect(contents).toMatch(/\.\.\.\(matchReason \? \{ match_reason: matchReason \} : \{\}\)/);
  });
});
