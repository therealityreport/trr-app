import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person gallery broken-row audit toggle wiring", () => {
  it("wires include_broken query flag and broken badges", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/people/[personId]/page.tsx"
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toContain("const [showBrokenRows, setShowBrokenRows] = useState(false);");
    expect(contents).toContain("params.set(\"include_broken\", \"true\")");
    expect(contents).toContain("{showBrokenRows ? \"Hide Broken\" : \"Show Broken\"}");
    expect(contents).toContain("Broken");
    expect(contents).toContain("isBrokenUnreachableGalleryStatus");
  });
});
