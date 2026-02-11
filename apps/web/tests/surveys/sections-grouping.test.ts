import { describe, expect, it } from "vitest";

import { groupBySection } from "@/lib/surveys/section-grouping";

describe("groupBySection", () => {
  it("groups by normalized section label and pushes Ungrouped to the end", () => {
    const items = [
      { id: "q1", section: "Rankings" },
      { id: "q2", section: "" },
      { id: "q3", section: "Drama" },
      { id: "q4", section: "rankings" },
      { id: "q5", section: "   " },
    ];

    const groups = groupBySection(items, (i) => i.section);

    expect(groups.map((g) => g.key)).toEqual(["rankings", "drama", "~~ungrouped"]);
    expect(groups[0]?.label).toBe("Rankings");
    expect(groups[0]?.items.map((x) => x.index)).toEqual([0, 3]);
    expect(groups[0]?.items.map((x) => x.item.id)).toEqual(["q1", "q4"]);
    expect(groups[1]?.items.map((x) => x.item.id)).toEqual(["q3"]);
    expect(groups[2]?.label).toBe("Ungrouped");
    expect(groups[2]?.items.map((x) => x.item.id)).toEqual(["q2", "q5"]);
  });
});

