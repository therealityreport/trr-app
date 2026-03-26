"use client";

import { CONNECTIONS } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

const TIER_SWATCHES: { label: string; hex: string; difficulty: string }[] = [
  { label: "Yellow", hex: CONNECTIONS.tiers.yellow, difficulty: "Easiest" },
  { label: "Green", hex: CONNECTIONS.tiers.green, difficulty: "Easy" },
  { label: "Blue", hex: CONNECTIONS.tiers.blue, difficulty: "Medium" },
  { label: "Purple", hex: CONNECTIONS.tiers.purple, difficulty: "Hardest" },
];

const GRID_WORDS = [
  /* Row 0 — revealed yellow category */
  "BASS", "DRUM", "GUITAR", "KEYS",
  /* Row 1–3 — unrevealed tiles */
  "STORM", "BLAZE", "FROST", "GALE",
  "APPLE", "MANGO", "PEACH", "PLUM",
  "TRICKY", "CRAFTY", "SNEAKY", "SLY",
];

const REVEALED_CATEGORY = {
  name: "MUSICAL INSTRUMENTS",
  words: ["BASS", "DRUM", "GUITAR", "KEYS"],
  color: CONNECTIONS.tiers.yellow,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const swatchGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 16,
};

const swatchLabel: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 10,
  color: "#666",
  marginTop: 4,
  textAlign: "center",
  maxWidth: 56,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GameConnections({ SectionLabel }: GameSectionProps) {
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
          borderLeft: `4px solid ${CONNECTIONS.tiers.purple}`,
        }}
      >
        Connections
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
          {CONNECTIONS.layout.grid} Grid &middot; {CONNECTIONS.layout.totalWords} words &middot; {CONNECTIONS.layout.groups} groups
        </span>
      </div>

      {/* ── 1. 4-Tier Palette ──────────────────────────────── */}
      <SectionLabel>4-Tier Difficulty Palette</SectionLabel>
      <div style={swatchGrid}>
        {TIER_SWATCHES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 40,
                borderRadius: 4,
                background: s.hex,
              }}
            />
            <div style={swatchLabel}>{s.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 9,
                color: "#999",
                marginTop: 2,
              }}
            >
              {s.difficulty}
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. 4x4 Grid Mockup ─────────────────────────────── */}
      <SectionLabel>4&times;4 Word Grid</SectionLabel>
      <div
        style={{
          display: "inline-block",
          background: "#fff",
          borderRadius: 12,
          padding: 8,
          border: "1px solid #e5e5e5",
          marginBottom: 24,
        }}
      >
        {/* Revealed category row */}
        <div
          style={{
            background: REVEALED_CATEGORY.color,
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: 700,
              color: "#000",
              marginBottom: 2,
            }}
          >
            {REVEALED_CATEGORY.name}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "#333",
            }}
          >
            {REVEALED_CATEGORY.words.join(", ")}
          </div>
        </div>

        {/* Remaining 3 rows of unrevealed tiles */}
        {[0, 1, 2].map((row) => (
          <div key={row} style={{ display: "flex", gap: 6, marginBottom: row < 2 ? 6 : 0 }}>
            {GRID_WORDS.slice(4 + row * 4, 8 + row * 4).map((word) => (
              <div
                key={word}
                style={{
                  width: 90,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#efefe6",
                  borderRadius: 8,
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#000",
                  textTransform: "uppercase",
                  cursor: "default",
                  userSelect: "none",
                }}
              >
                {word}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── 3. Category Reveal Specimen ─────────────────────── */}
      <SectionLabel>Category Reveal</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {TIER_SWATCHES.map((tier) => (
          <div
            key={tier.label}
            style={{
              background: tier.hex,
              borderRadius: 8,
              padding: "10px 20px",
              textAlign: "center",
              maxWidth: 400,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                marginBottom: 2,
              }}
            >
              {tier.label.toUpperCase()} CATEGORY
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "#333",
              }}
            >
              WORD, WORD, WORD, WORD
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. Typography Specimen ─────────────────────────── */}
      <SectionLabel>Typography</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          Connections
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999", marginBottom: 12 }}>
          nyt-karnakcondensed (NYTKarnak_Condensed) &middot; 32px / 700
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
          Group the 16 words into four categories of four.
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999" }}>
          nyt-franklin (NYTFranklin) &middot; 16px / 400
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
          ["Grid", CONNECTIONS.layout.grid],
          ["Total Words", String(CONNECTIONS.layout.totalWords)],
          ["Groups", String(CONNECTIONS.layout.groups)],
          ["Words/Group", String(CONNECTIONS.layout.wordsPerGroup)],
          ["Tile Radius", "8px"],
          ["Category Bar", "Rounded 8px"],
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
