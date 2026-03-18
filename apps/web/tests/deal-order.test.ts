import { describe, it, expect } from "vitest";
import { generateDealOrder } from "@/lib/flashback/deal-order";

describe("generateDealOrder", () => {
  it("returns anchor near the middle (floor(eventCount/2))", () => {
    const result = generateDealOrder(8, "test-seed");
    expect(result.anchorIndex).toBe(Math.floor(8 / 2)); // 4

    const result6 = generateDealOrder(6, "test-seed");
    expect(result6.anchorIndex).toBe(Math.floor(6 / 2)); // 3

    const result10 = generateDealOrder(10, "seed-abc");
    expect(result10.anchorIndex).toBe(Math.floor(10 / 2)); // 5
  });

  it("returns N-1 deal indices for N events (7 for 8 events)", () => {
    const result = generateDealOrder(8, "test-seed");
    expect(result.dealOrder).toHaveLength(7);

    const result5 = generateDealOrder(5, "another-seed");
    expect(result5.dealOrder).toHaveLength(4);

    const result12 = generateDealOrder(12, "seed-xyz");
    expect(result12.dealOrder).toHaveLength(11);
  });

  it("does not include anchor index in deal order", () => {
    const result = generateDealOrder(8, "test-seed");
    expect(result.dealOrder).not.toContain(result.anchorIndex);
  });

  it("is deterministic -- same seed produces same output", () => {
    const a = generateDealOrder(8, "deterministic-seed");
    const b = generateDealOrder(8, "deterministic-seed");
    expect(a.anchorIndex).toBe(b.anchorIndex);
    expect(a.dealOrder).toEqual(b.dealOrder);
  });

  it("produces different orders for different seeds", () => {
    const a = generateDealOrder(8, "seed-alpha");
    const b = generateDealOrder(8, "seed-beta");
    // Anchor is always floor(8/2) = 4 regardless of seed, so only check deal order
    expect(a.dealOrder).not.toEqual(b.dealOrder);
  });

  it("all indices (deal + anchor) cover every event index exactly once", () => {
    const eventCount = 8;
    const result = generateDealOrder(eventCount, "coverage-seed");

    const allIndices = [...result.dealOrder, result.anchorIndex].sort(
      (a, b) => a - b,
    );
    const expected = Array.from({ length: eventCount }, (_, i) => i);
    expect(allIndices).toEqual(expected);
  });

  it("works with minimum event count (2 events)", () => {
    const result = generateDealOrder(2, "min-seed");
    expect(result.anchorIndex).toBe(1); // floor(2/2)
    expect(result.dealOrder).toHaveLength(1);
    expect(result.dealOrder[0]).toBe(0);

    // Verify coverage
    const allIndices = [...result.dealOrder, result.anchorIndex].sort(
      (a, b) => a - b,
    );
    expect(allIndices).toEqual([0, 1]);
  });

  it("works with odd event counts", () => {
    const result = generateDealOrder(7, "odd-seed");
    expect(result.anchorIndex).toBe(3); // floor(7/2)
    expect(result.dealOrder).toHaveLength(6);
    expect(result.dealOrder).not.toContain(3);

    // Verify full coverage
    const allIndices = [...result.dealOrder, result.anchorIndex].sort(
      (a, b) => a - b,
    );
    const expected = Array.from({ length: 7 }, (_, i) => i);
    expect(allIndices).toEqual(expected);
  });

  it("throws for fewer than 2 events", () => {
    expect(() => generateDealOrder(1, "fail")).toThrow(
      "generateDealOrder requires at least 2 events",
    );
    expect(() => generateDealOrder(0, "fail")).toThrow(
      "generateDealOrder requires at least 2 events",
    );
  });
});
