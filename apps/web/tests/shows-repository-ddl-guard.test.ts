import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("shows repository schema ownership", () => {
  it("does not execute DDL from app request-time repository code", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/lib/server/shows/shows-repository.ts",
    );
    const contents = fs.readFileSync(filePath, "utf8");
    const ddlPatterns = [
      /\bALTER\s+TABLE\b/i,
      /\bCREATE\s+TABLE\b/i,
      /\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/i,
      /\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b/i,
      /\bCREATE\s+TRIGGER\b/i,
    ];

    for (const pattern of ddlPatterns) {
      expect(contents, `blocked DDL pattern ${pattern}`).not.toMatch(pattern);
    }
  });
});
