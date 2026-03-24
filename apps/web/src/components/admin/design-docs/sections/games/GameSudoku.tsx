"use client";

import { SUDOKU } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Sudoku — 9×9 grid design system component                        */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const SWATCHES = [
  { name: "Selected", hex: SUDOKU.select },
  { name: "Highlight", hex: SUDOKU.highlight },
  { name: "Accent", hex: SUDOKU.accent },
] as const;

/** Mini 9×9 grid — 0 = empty, number = given/filled */
const GRID: number[][] = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

/** Selected cell */
const SELECTED = { row: 4, col: 4 };

export default function GameSudoku({ SectionLabel }: GameSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      {/* ── Title ── */}
      <div
        style={{
          borderLeft: `4px solid ${SUDOKU.sectionColor}`,
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
          Sudoku
        </h3>
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          Classic 9×9 logic number puzzle
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
          {SUDOKU.layout.grid}
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

      {/* ── 9×9 Grid Mockup ── */}
      <SectionLabel>9×9 Grid Mockup</SectionLabel>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(9, 32px)",
          gridTemplateRows: "repeat(9, 32px)",
          gap: 0,
          border: `2px solid var(--dd-ink-black)`,
          marginBottom: 24,
        }}
      >
        {GRID.flatMap((row, r) =>
          row.map((val, c) => {
            const isSelected =
              r === SELECTED.row && c === SELECTED.col;
            const isHighlighted =
              !isSelected &&
              (r === SELECTED.row || c === SELECTED.col);

            let bg = "#fff";
            if (isSelected) bg = SUDOKU.select;
            else if (isHighlighted) bg = SUDOKU.highlight;

            /* Thicker borders for 3×3 box edges */
            const borderRight =
              c === 2 || c === 5
                ? "2px solid var(--dd-ink-black)"
                : "1px solid var(--dd-ink-faint)";
            const borderBottom =
              r === 2 || r === 5
                ? "2px solid var(--dd-ink-black)"
                : "1px solid var(--dd-ink-faint)";

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderRight: c < 8 ? borderRight : "none",
                  borderBottom: r < 8 ? borderBottom : "none",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: val ? 700 : 400,
                  color: val
                    ? "var(--dd-ink-black)"
                    : "var(--dd-ink-light)",
                }}
              >
                {val || ""}
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
        <li>Grid: 9×9 cells with 3×3 subgrid borders</li>
        <li>Cell size: 32px square</li>
        <li>Outer border: 2px solid black</li>
        <li>3×3 box borders: 2px solid black</li>
        <li>Inner cell borders: 1px solid faint</li>
        <li>Selected cell: yellow ({SUDOKU.select})</li>
        <li>Row/column highlight: light blue ({SUDOKU.highlight})</li>
        <li>Given numbers: bold 14px; user input: regular weight</li>
      </ul>
    </section>
  );
}
