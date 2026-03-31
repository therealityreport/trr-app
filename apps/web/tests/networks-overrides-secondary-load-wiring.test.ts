import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("networks overrides load ownership", () => {
  it("boots overrides only after summary state exists instead of firing them in the initial load effect", () => {
    const filePath = path.resolve(__dirname, "../src/app/admin/networks/page.tsx");
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).not.toContain("void loadNetworksStreamingSummary();\n      void loadOverrides();");
    expect(contents).toContain("if (checking || !userIdentity || !hasAccess || !summary) {");
    expect(contents).toContain("void loadOverrides();");
  });
});
