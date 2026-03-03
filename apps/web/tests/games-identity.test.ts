import { describe, expect, it } from "vitest";
import { addIdentityToken, buildIdentityVariants } from "@/lib/games/identity";

describe("games identity token normalization", () => {
  it("normalizes strings to lowercase with compact variant", () => {
    expect(buildIdentityVariants("  NeNe-Leakes  ")).toEqual(["nene-leakes", "neneleakes"]);
  });

  it("adds normalized variants and deduplicates in a set", () => {
    const tokens = new Set<string>();
    addIdentityToken(tokens, "Phaedra Parks");
    addIdentityToken(tokens, "phaedra-parks");

    expect(tokens.has("phaedra parks")).toBe(true);
    expect(tokens.has("phaedraparks")).toBe(true);
    expect(tokens.has("phaedra-parks")).toBe(true);
    expect(tokens.size).toBe(3);
  });

  it("supports finite numeric identifiers and ignores unsupported values", () => {
    const tokens = new Set<string>();
    addIdentityToken(tokens, 12345);
    addIdentityToken(tokens, null);
    addIdentityToken(tokens, undefined);
    addIdentityToken(tokens, { id: "abc" });

    expect(Array.from(tokens)).toEqual(["12345"]);
  });
});
