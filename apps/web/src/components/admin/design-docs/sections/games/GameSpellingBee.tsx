"use client";

import { SPELLING_BEE } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

const PALETTE_SWATCHES = [
  { label: "Gold 1", hex: SPELLING_BEE.gold },
  { label: "Gold 2", hex: SPELLING_BEE.gold2 },
  { label: "Gold 3", hex: SPELLING_BEE.gold3 },
  { label: "Pink", hex: SPELLING_BEE.pink },
  { label: "Teal", hex: SPELLING_BEE.teal },
  { label: "Green", hex: SPELLING_BEE.green },
  { label: "Blue", hex: SPELLING_BEE.blue },
  { label: "Dark Blue", hex: SPELLING_BEE.darkBlue },
  { label: "Red", hex: SPELLING_BEE.red },
  { label: "Gray", hex: SPELLING_BEE.gray },
  { label: "Light Gray", hex: SPELLING_BEE.lightGray },
  { label: "Dark Gray", hex: SPELLING_BEE.darkGray },
];

const HEX_LETTERS = ["R", "A", "T", "N", "I", "G"];
const CENTER_LETTER = "L";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const swatchGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const swatchBox = (hex: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 4,
  background: hex,
  border: hex === "#fff" || hex === "#ffffff" ? "1px solid #d3d6da" : "none",
});

const swatchLabel: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 10,
  color: "#666",
  marginTop: 4,
  textAlign: "center",
  maxWidth: 48,
};

/**
 * CSS hexagon using clip-path.
 * The pointy-top hexagon polygon for a regular hexagon.
 */
function Hexagon({
  letter,
  isCenter,
  size = 56,
}: {
  letter: string;
  isCenter: boolean;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
        background: isCenter ? SPELLING_BEE.gold : "#e6e6e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--dd-font-sans)",
        fontSize: 20,
        fontWeight: 700,
        color: "#000",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {letter}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GameSpellingBee({ SectionLabel }: GameSectionProps) {
  return (
    <div>
      {/* ── Title ──────────────────────────────────────────── */}
      <h3
        style={{
          fontFamily: "var(--dd-font-slab)",
          fontSize: 28,
          fontWeight: 700,
          margin: "0 0 8px",
          paddingLeft: 16,
          borderLeft: `4px solid ${SPELLING_BEE.gold}`,
        }}
      >
        Spelling Bee
      </h3>

      {/* ── Metadata ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24 }}>
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 700,
            background: "#4f85e5",
            color: "#fff",
            padding: "3px 8px",
            borderRadius: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Core
        </span>
        <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "#787c7e" }}>
          Honeycomb &middot; 7 hexagons (1 center + 6 outer)
        </span>
      </div>

      {/* ── 1. Color Palette ───────────────────────────────── */}
      <SectionLabel>Palette</SectionLabel>
      <div style={swatchGrid}>
        {PALETTE_SWATCHES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={swatchBox(s.hex)} />
            <div style={swatchLabel}>{s.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
          </div>
        ))}
      </div>

      {/* ── 2. Hexagon Layout Mockup ───────────────────────── */}
      <SectionLabel>Hexagon Layout</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          marginBottom: 24,
          padding: 24,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e5e5",
        }}
      >
        {/* Row 1: 2 hexagons */}
        <div style={{ display: "flex", gap: 4 }}>
          <Hexagon letter={HEX_LETTERS[0]} isCenter={false} />
          <Hexagon letter={HEX_LETTERS[1]} isCenter={false} />
        </div>
        {/* Row 2: 3 hexagons — outer, CENTER, outer */}
        <div style={{ display: "flex", gap: 4, marginTop: -10 }}>
          <Hexagon letter={HEX_LETTERS[2]} isCenter={false} />
          <Hexagon letter={CENTER_LETTER} isCenter={true} />
          <Hexagon letter={HEX_LETTERS[3]} isCenter={false} />
        </div>
        {/* Row 3: 2 hexagons */}
        <div style={{ display: "flex", gap: 4, marginTop: -10 }}>
          <Hexagon letter={HEX_LETTERS[4]} isCenter={false} />
          <Hexagon letter={HEX_LETTERS[5]} isCenter={false} />
        </div>
      </div>

      {/* ── 3. Rank Progress Bar ───────────────────────────── */}
      <SectionLabel>Rank System</SectionLabel>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e5e5e5",
          padding: "16px 20px",
          marginBottom: 24,
        }}
      >
        {/* Progress track */}
        <div
          style={{
            position: "relative",
            height: 4,
            background: SPELLING_BEE.gray,
            borderRadius: 2,
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          {/* Filled portion — example at ~60% (Great) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: 4,
              width: "60%",
              background: SPELLING_BEE.gold,
              borderRadius: 2,
            }}
          />
          {/* Rank markers */}
          {SPELLING_BEE.ranks.map((rank, i) => {
            const pct = (i / (SPELLING_BEE.ranks.length - 1)) * 100;
            const isActive = i <= 6; // "Great" reached
            return (
              <div
                key={rank}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  top: -4,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: isActive ? SPELLING_BEE.gold : "#ccc",
                    border: "2px solid #fff",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Rank labels */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {SPELLING_BEE.ranks.map((rank, i) => (
            <div
              key={rank}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 9,
                color: i <= 6 ? "#333" : "#999",
                fontWeight: i === 6 ? 700 : 400,
                textAlign: "center",
                width: 0,
                overflow: "visible",
                whiteSpace: "nowrap",
              }}
            >
              {rank}
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Typography Specimen ─────────────────────────── */}
      <SectionLabel>Typography</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          Spelling Bee
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999", marginBottom: 12 }}>
          nyt-karnakcondensed &rarr; Rude Slab &middot; 40px / 700
        </div>

        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.5,
            marginBottom: 4,
          }}
        >
          How many words can you make with 7 letters?
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999" }}>
          nyt-franklin &rarr; Franklin Gothic &middot; 16px / 400
        </div>
      </div>

      {/* ── 5. Layout Specs ────────────────────────────────── */}
      <SectionLabel>Layout</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          fontFamily: "var(--dd-font-mono)",
          fontSize: 12,
          marginBottom: 32,
        }}
      >
        {[
          ["Interface", SPELLING_BEE.layout.interface],
          ["Center Letters", String(SPELLING_BEE.layout.centerLetter)],
          ["Outer Letters", String(SPELLING_BEE.layout.outerLetters)],
          ["Ranks", String(SPELLING_BEE.ranks.length)],
          ["Max Rank", "Queen Bee"],
          ["Pangram", "Uses all 7 letters"],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ color: "#999", fontSize: 10, marginBottom: 2 }}>{k}</div>
            <div style={{ fontWeight: 600, color: "#333" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
