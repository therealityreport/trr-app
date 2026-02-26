import { describe, expect, it } from "vitest";

import {
  buildPaletteFromImageData,
  generateSamplePoints,
  hashString,
} from "@/lib/admin/color-lab/palette-extraction";

function buildTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = (x * 11) % 256;
      data[offset + 1] = (y * 13) % 256;
      data[offset + 2] = ((x + y) * 17) % 256;
      data[offset + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("color-lab randomization", () => {
  it("keeps hash deterministic", () => {
    expect(hashString("abc:1")).toBe(hashString("abc:1"));
    expect(hashString("abc:1")).not.toBe(hashString("abc:2"));
  });

  it("generates deterministic marker points for same seed", () => {
    const first = generateSamplePoints(800, 500, 6, 12345);
    const second = generateSamplePoints(800, 500, 6, 12345);
    const third = generateSamplePoints(800, 500, 6, 67890);

    expect(first).toEqual(second);
    expect(first).not.toEqual(third);
    expect(first).toHaveLength(6);
  });

  it("changes extracted palette when slider seed step changes", () => {
    const imageData = buildTestImageData(120, 90);

    const first = buildPaletteFromImageData({
      imageData,
      count: 5,
      seedStep: 3,
      imageIdentity: "fixture-image",
    });

    const second = buildPaletteFromImageData({
      imageData,
      count: 5,
      seedStep: 3,
      imageIdentity: "fixture-image",
    });

    const third = buildPaletteFromImageData({
      imageData,
      count: 5,
      seedStep: 4,
      imageIdentity: "fixture-image",
    });

    expect(first.seed).toBe(second.seed);
    expect(first.points).toEqual(second.points);
    expect(first.colors).toEqual(second.colors);

    expect(first.seed).not.toBe(third.seed);
    expect(first.points).not.toEqual(third.points);
  });
});
