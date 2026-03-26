"use client";

import { MINI } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  The Mini — 5×5 crossword design system component                  */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const SWATCHES = [
  { name: "Yellow", hex: MINI.yellow },
  { name: "Gold", hex: MINI.gold },
  { name: "Selection", hex: MINI.selection },
  { name: "Highlight", hex: MINI.highlight },
  { name: "Red", hex: MINI.red },
  { name: "Purple", hex: MINI.purple },
  { name: "Blue", hex: MINI.blue },
  { name: "Teal", hex: MINI.teal },
  { name: "Green", hex: MINI.green },
] as const;

/** 5×5 grid cell data: null = empty, string = letter */
const GRID: (string | null)[][] = [
  ["S", "T", "A", "R", "E"],
  ["L", "O", "N", "E", "R"],
  ["A", "N", "G", "L", "E"],
  ["P", "E", "N", "C", "E"],
  ["S", "K", "A", "T", "E"],
];

/** Selected cell: row 2, col 2 (the G) */
const SELECTED = { row: 2, col: 2 };
/** Highlighted row (across clue) */
const HIGHLIGHT_ROW = 2;

export default function GameMiniCrossword({ SectionLabel }: GameSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      {/* ── Title ── */}
      <div
        style={{
          borderLeft: `4px solid ${MINI.yellow}`,
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
          The Mini
        </h3>
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          Quick 5×5 crossword puzzle
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
          <strong style={{ color: "var(--dd-ink-black)" }}>Status:</strong>{" "}
          Original
        </div>
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Grid:</strong>{" "}
          {MINI.layout.grid}
        </div>
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Interface:</strong>{" "}
          {MINI.layout.interface}
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

      {/* ── 5×5 Grid Mockup ── */}
      <SectionLabel>5×5 Grid Mockup</SectionLabel>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(5, 44px)",
          gridTemplateRows: "repeat(5, 44px)",
          gap: 1,
          backgroundColor: "var(--dd-ink-black)",
          border: "2px solid var(--dd-ink-black)",
          marginBottom: 24,
        }}
      >
        {GRID.flatMap((row, r) =>
          row.map((letter, c) => {
            const isSelected = r === SELECTED.row && c === SELECTED.col;
            const isHighlighted = r === HIGHLIGHT_ROW && !isSelected;

            let bg = "#fff";
            if (isSelected) bg = MINI.selection;
            else if (isHighlighted) bg = MINI.highlight;

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                  position: "relative",
                }}
              >
                {/* Clue number */}
                {r === 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: 3,
                      fontSize: 8,
                      fontWeight: 400,
                      color: "var(--dd-ink-light)",
                    }}
                  >
                    {c + 1}
                  </span>
                )}
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
        <li>Grid: 5×5 cells, 1px gap, black borders</li>
        <li>Cell size: 44px square</li>
        <li>Selected cell: yellow background ({MINI.selection})</li>
        <li>Highlighted clue: light blue background ({MINI.highlight})</li>
        <li>Clue numbers: 8px, top-left corner of cell</li>
        <li>Letter font: nyt-franklin (NYTFranklin) 18px bold</li>
      </ul>
    </section>
  );
}
