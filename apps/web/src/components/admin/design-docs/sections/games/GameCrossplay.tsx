"use client";

import { CROSSPLAY } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Crossplay — 2-player multiplayer crossword (app download only)     */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const BOARD_SIZE = 7; // display a 7x7 corner subset

/** Premium square placement — mirrors classic Scrabble corner pattern */
function squareType(r: number, c: number): "DL" | "TL" | "DW" | "TW" | null {
  if ((r === 0 && c === 0) || (r === 0 && c === 6) || (r === 6 && c === 0)) return "TW";
  if ((r === 1 && c === 1) || (r === 5 && c === 5)) return "DW";
  if ((r === 0 && c === 3) || (r === 3 && c === 0) || (r === 2 && c === 6)) return "TL";
  if ((r === 1 && c === 5) || (r === 5 && c === 1) || (r === 3 && c === 3)) return "DL";
  return null;
}

const SQUARE_COLORS: Record<string, string> = {
  DL: CROSSPLAY.doubleLetter,
  TL: CROSSPLAY.tripleLetter,
  DW: CROSSPLAY.doubleWord,
  TW: CROSSPLAY.tripleWord,
};

const SQUARE_LABELS: Record<string, string> = {
  DL: "2L",
  TL: "3L",
  DW: "2W",
  TW: "3W",
};

export default function GameCrossplay({ SectionLabel }: GameSectionProps) {
  return (
    <section
      style={{
        borderLeft: `4px solid ${CROSSPLAY.sectionColor}`,
        paddingLeft: 24,
        marginBottom: 48,
      }}
    >
      <SectionLabel>Crossplay</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 6px",
        }}
      >
        App download only — 2-player competitive crossword on a 15&times;15
        board with bonus squares.
      </p>

      {/* ── Bonus square legend ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {(
          [
            ["Double Letter", CROSSPLAY.doubleLetter],
            ["Triple Letter", CROSSPLAY.tripleLetter],
            ["Double Word", CROSSPLAY.doubleWord],
            ["Triple Word", CROSSPLAY.tripleWord],
          ] as const
        ).map(([label, hex]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: hex,
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-light)",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Board corner mockup ── */}
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 36px)`,
          gap: 2,
          background: "#e8e8e8",
          padding: 2,
          borderRadius: 6,
        }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, idx) => {
          const r = Math.floor(idx / BOARD_SIZE);
          const c = idx % BOARD_SIZE;
          const type = squareType(r, c);
          return (
            <div
              key={idx}
              style={{
                width: 36,
                height: 36,
                borderRadius: 3,
                background: type ? SQUARE_COLORS[type] : "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-ui)",
                fontSize: 9,
                fontWeight: 700,
                color: type ? "rgba(0,0,0,0.55)" : "transparent",
              }}
            >
              {type ? SQUARE_LABELS[type] : ""}
            </div>
          );
        })}
      </div>

      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          marginTop: 10,
        }}
      >
        15&times;15 board &middot; Premium squares mirror Scrabble layout
      </p>
    </section>
  );
}
