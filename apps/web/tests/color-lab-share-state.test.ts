import { describe, expect, it } from "vitest";

import {
  decodeColorLabShareState,
  encodeColorLabShareState,
  type ColorLabShareState,
} from "@/lib/admin/color-lab/share-state";

describe("color-lab share state", () => {
  it("round-trips URL and media-library backed state", () => {
    const input: ColorLabShareState = {
      sourceType: "url",
      sourceImageUrl: "https://images.example.com/palette-source.png",
      trrShowId: "11111111-1111-4111-8111-111111111111",
      seasonNumber: 2,
      colors: ["#111111", "#222222", "#333333"],
      seed: 42,
      markerPoints: [
        { x: 0.15, y: 0.25, radius: 18 },
        { x: 0.45, y: 0.55, radius: 18 },
        { x: 0.75, y: 0.35, radius: 18 },
      ],
      selectedPaletteEntryId: "22222222-2222-4222-8222-222222222222",
    };

    const encoded = encodeColorLabShareState(input);
    const decoded = decodeColorLabShareState(encoded);

    expect(decoded).toEqual(input);
  });

  it("round-trips upload-derived state without a remote image URL", () => {
    const input: ColorLabShareState = {
      sourceType: "upload",
      sourceImageUrl: null,
      trrShowId: "11111111-1111-4111-8111-111111111111",
      seasonNumber: null,
      colors: ["#ABCDEF", "#123456", "#654321"],
      seed: 18,
      markerPoints: [
        { x: 0.2, y: 0.2, radius: 12 },
        { x: 0.5, y: 0.5, radius: 12 },
        { x: 0.8, y: 0.8, radius: 12 },
      ],
      selectedPaletteEntryId: null,
    };

    const decoded = decodeColorLabShareState(encodeColorLabShareState(input));

    expect(decoded).toEqual(input);
  });

  it("returns null for invalid payloads", () => {
    expect(decodeColorLabShareState("not-valid")).toBeNull();
    expect(
      decodeColorLabShareState(
        Buffer.from(JSON.stringify({ v: 1, colors: ["#111111"] }), "utf8").toString("base64url"),
      ),
    ).toBeNull();
  });
});
