"use client";

import { THE_MIDI } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  The Midi — Smaller themed crossword (9×9 to 11×11)                 */
/*  Introduced 2025, edited by Ian Livengood                           */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const GRID_SIZE = 9;

/**
 * Black-cell pattern for a 9×9 themed mini crossword.
 * Rotationally symmetric (standard crossword rule).
 */
const BLACK_CELLS = new Set([
  "0,4", "1,4",
  "2,0", "2,7",
  "3,3", "3,5",
  "4,0", "4,8",
  "5,3", "5,5",
  "6,1", "6,8",
  "7,4", "8,4",
]);

export default function GameTheMidi({ SectionLabel }: GameSectionProps) {
  return (
    <section
      style={{
        borderLeft: `4px solid ${THE_MIDI.sectionColor}`,
        paddingLeft: 24,
        marginBottom: 48,
      }}
    >
      <SectionLabel>The Midi</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 4px",
        }}
      >
        {THE_MIDI.layout.grid} themed crossword &mdash; sits between The Mini
        and the full Crossword in difficulty.
      </p>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-light)",
          margin: "0 0 14px",
          fontStyle: "italic",
        }}
      >
        New &mdash; introduced 2025, edited by Ian Livengood
      </p>

      {/* ── Mini grid mockup ── */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, 28px)`,
          gap: 1,
          background: THE_MIDI.sectionColor,
          padding: 1,
          borderRadius: 4,
        }}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
          const r = Math.floor(idx / GRID_SIZE);
          const c = idx % GRID_SIZE;
          const isBlack = BLACK_CELLS.has(`${r},${c}`);

          /* Show clue numbers in top-left of some white cells */
          let clueNum: number | null = null;
          if (!isBlack) {
            const leftBlocked =
              c === 0 || BLACK_CELLS.has(`${r},${c - 1}`);
            const topBlocked =
              r === 0 || BLACK_CELLS.has(`${r - 1},${c}`);
            if (leftBlocked || topBlocked) {
              clueNum = idx + 1; // simplified numbering
            }
          }

          return (
            <div
              key={idx}
              style={{
                width: 28,
                height: 28,
                background: isBlack ? THE_MIDI.sectionColor : "#fff",
                position: "relative",
              }}
            >
              {clueNum !== null && (
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    left: 2,
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 7,
                    fontWeight: 600,
                    color: "var(--dd-ink-light)",
                    lineHeight: 1,
                  }}
                >
                  {/* Show sequential clue label */}
                  {clueNum <= 20 ? clueNum : ""}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Spec notes ── */}
      <div
        style={{
          marginTop: 12,
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          lineHeight: 1.6,
        }}
      >
        <div>Grid: {THE_MIDI.layout.grid} &middot; Themed &middot; Rotationally symmetric</div>
        <div>Shares crossword palette (black &amp; white cells)</div>
      </div>
    </section>
  );
}
