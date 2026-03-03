import { describe, expect, it } from "vitest";
import { buildShareText as buildBravodleShareText } from "@/app/bravodle/play/completed-view";
import { buildShareText as buildRealiteaseShareText } from "@/app/realitease/play/completed-view";

describe("games share text column selection", () => {
  it("uses only provided Bravodle columns (including zodiac mode)", () => {
    const text = buildBravodleShareText(
      "2026-03-02",
      [
        {
          guessNumber: 1,
          castName: "Talent One",
          submittedAt: null,
          derived: { networks: [], shows: [], wwhlEpisodes: [] },
          fields: [
            { key: "zodiac", label: "ZODIAC", value: "leo", verdict: "correct" },
            { key: "shows", label: "SHOWS", value: "RHOA", verdict: "partial" },
            { key: "age", label: "AGE", value: "40", verdict: "incorrect" },
          ],
        },
      ],
      8,
      1,
      [
        { key: "zodiac", label: "ZODIAC" },
        { key: "shows", label: "SHOWS" },
      ],
    );

    const rows = text.split("\n");
    expect(rows[0]).toContain("Bravodle 2026-03-02 1/8");
    expect(rows[1]).toBe("🟩🟨");
  });

  it("uses only provided Realitease columns (including streamers mode)", () => {
    const text = buildRealiteaseShareText(
      "2026-03-02",
      [
        {
          guessNumber: 1,
          castName: "Talent One",
          submittedAt: null,
          derived: { networks: [], shows: [], wwhlEpisodes: [] },
          fields: [
            { key: "streamers", label: "STREAMERS", value: "Peacock", verdict: "correct" },
            { key: "shows", label: "SHOWS", value: "Traitors", verdict: "multi" },
            { key: "network", label: "NETWORK", value: "Bravo", verdict: "incorrect" },
          ],
        },
      ],
      8,
      1,
      [
        { key: "streamers", label: "STREAMERS" },
        { key: "shows", label: "SHOWS" },
      ],
    );

    const rows = text.split("\n");
    expect(rows[0]).toContain("Realitease 2026-03-02 1/8");
    expect(rows[1]).toBe("🟩🟪");
  });
});
