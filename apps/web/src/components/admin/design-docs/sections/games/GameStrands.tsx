"use client";

import { STRANDS } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Strands — 6×8 letter board design system component                */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const SWATCHES = [
  { name: "Theme Word", hex: STRANDS.theme },
  { name: "Spangram", hex: STRANDS.spangram },
] as const;

/**
 * 6×8 grid of letters.
 * Highlighted cells: theme words (blue), spangram row (yellow).
 */
const GRID: string[][] = [
  ["S", "T", "R", "A", "N", "D"],
  ["B", "E", "A", "C", "H", "Y"],
  ["W", "A", "V", "E", "S", "P"],
  ["O", "C", "E", "A", "N", "S"],
  ["T", "I", "D", "E", "S", "R"],
  ["S", "H", "E", "L", "L", "A"],
  ["C", "O", "R", "A", "L", "S"],
  ["S", "A", "N", "D", "Y", "B"],
];

/** Theme-highlighted cells (blue): row, col pairs */
const THEME_CELLS = new Set([
  "0-0", "0-1", "0-2", "0-3", "0-4", "0-5", // STRAND
  "2-0", "2-1", "2-2", "2-3", "2-4",         // WAVES
  "6-0", "6-1", "6-2", "6-3", "6-4", "6-5",  // CORALS
]);

/** Spangram row (yellow): row 3 — OCEANS */
const SPANGRAM_ROW = 3;

export default function GameStrands({ SectionLabel }: GameSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      {/* ── Title ── */}
      <div
        style={{
          borderLeft: `4px solid ${STRANDS.theme}`,
          paddingLeft: 16,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            color: "var(--dd-ink-black)",
          }}
        >
          Strands
        </h3>
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          Theme word pathfinding on a 6×8 letter board
        </p>
      </div>

      {/* ── Status + Interface ── */}
      <SectionLabel>Status &amp; Interface</SectionLabel>
      <div
        style={{
          display: "flex",
          gap: 32,
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          color: "var(--dd-ink-soft)",
          marginBottom: 24,
        }}
      >
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Status:</strong> Core
        </div>
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Grid:</strong>{" "}
          {STRANDS.layout.grid}
        </div>
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Interface:</strong>{" "}
          {STRANDS.layout.interface}
        </div>
      </div>

      {/* ── Color Swatches ── */}
      <SectionLabel>Color Palette</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {SWATCHES.map((s) => (
          <div key={s.name} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 4,
                backgroundColor: s.hex,
                border: "1px solid var(--dd-ink-faint)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-soft)",
                marginTop: 4,
              }}
            >
              {s.hex}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-light)",
              }}
            >
              {s.name}
            </div>
          </div>
        ))}
      </div>

      {/* ── 6×8 Grid Mockup ── */}
      <SectionLabel>6×8 Letter Grid</SectionLabel>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(6, 40px)",
          gridTemplateRows: "repeat(8, 40px)",
          gap: 2,
          marginBottom: 24,
        }}
      >
        {GRID.flatMap((row, r) =>
          row.map((letter, c) => {
            const key = `${r}-${c}`;
            const isTheme = THEME_CELLS.has(key);
            const isSpangram = r === SPANGRAM_ROW;

            let bg = "var(--dd-paper-warm)";
            let color = "var(--dd-ink-black)";
            if (isSpangram) {
              bg = STRANDS.spangram;
              color = "var(--dd-ink-black)";
            } else if (isTheme) {
              bg = STRANDS.theme;
              color = "#fff";
            }

            return (
              <div
                key={key}
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderRadius: 6,
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 15,
                  fontWeight: 700,
                  color,
                }}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>

      {/* ── Layout Specs ── */}
      <SectionLabel>Layout Specs</SectionLabel>
      <ul
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.8,
          paddingLeft: 20,
          margin: 0,
        }}
      >
        <li>Grid: 6 columns × 8 rows, 2px gap</li>
        <li>Cell size: 40px square, 6px border-radius</li>
        <li>Theme words: blue background ({STRANDS.theme}), white text</li>
        <li>Spangram: yellow background ({STRANDS.spangram}), spans full row</li>
        <li>Default cells: warm paper background</li>
        <li>Font: Franklin Gothic 15px bold</li>
      </ul>
    </section>
  );
}
