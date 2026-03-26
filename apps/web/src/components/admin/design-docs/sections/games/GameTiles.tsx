"use client";

import { TILES } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

interface SwatchEntry {
  label: string;
  hex: string;
}

const BLUE_SWATCHES: SwatchEntry[] = [
  { label: "Navy", hex: TILES.blues.navy },
  { label: "Blue 1", hex: TILES.blues.blue1 },
  { label: "Blue 2", hex: TILES.blues.blue2 },
  { label: "Teal", hex: TILES.blues.teal },
  { label: "Sky", hex: TILES.blues.sky },
  { label: "Light Teal", hex: TILES.blues.lightTeal },
];

const GREEN_SWATCHES: SwatchEntry[] = [
  { label: "Dark", hex: TILES.greens.dark },
  { label: "Mint", hex: TILES.greens.mint },
  { label: "Light", hex: TILES.greens.light },
];

const RED_SWATCHES: SwatchEntry[] = [
  { label: "Dark", hex: TILES.reds.dark },
  { label: "Bright", hex: TILES.reds.bright },
  { label: "Pink", hex: TILES.reds.pink },
  { label: "Hot Pink", hex: TILES.reds.hotPink },
];

const GOLD_SWATCHES: SwatchEntry[] = [
  { label: "Gold", hex: TILES.golds.gold },
  { label: "Orange", hex: TILES.golds.orange },
  { label: "Bright", hex: TILES.golds.bright },
];

const NEUTRAL_SWATCHES: SwatchEntry[] = [
  { label: "Tan", hex: TILES.neutrals.tan },
  { label: "Brown", hex: TILES.neutrals.brown },
  { label: "Dark Brown", hex: TILES.neutrals.darkBrown },
  { label: "Warm Gray", hex: TILES.neutrals.warmGray },
  { label: "Cream", hex: TILES.neutrals.cream },
];

const HUE_FAMILIES: { name: string; swatches: SwatchEntry[] }[] = [
  { name: "Blues (6)", swatches: BLUE_SWATCHES },
  { name: "Greens (3)", swatches: GREEN_SWATCHES },
  { name: "Reds (4)", swatches: RED_SWATCHES },
  { name: "Golds (3)", swatches: GOLD_SWATCHES },
  { name: "Neutrals (5)", swatches: NEUTRAL_SWATCHES },
];

const BACKGROUND_TONES = [
  { label: "Warm BG 1", hex: "#f2eae2" },
  { label: "Warm BG 2", hex: "#f2daae" },
  { label: "Warm BG 3", hex: "#faecbf" },
  { label: "Warm BG 4", hex: "#eadac5" },
];

/** The 4x4 mockup grid — random sample of colors from the palette */
const MOCK_GRID_COLORS: string[] = [
  TILES.blues.navy, TILES.reds.bright, TILES.golds.gold, TILES.greens.mint,
  TILES.blues.sky, TILES.blues.navy, TILES.reds.pink, TILES.golds.orange,
  TILES.greens.dark, TILES.golds.gold, TILES.blues.teal, TILES.reds.bright,
  TILES.reds.hotPink, TILES.greens.light, TILES.blues.blue1, TILES.neutrals.tan,
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function lum(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const f = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const swatchGrid: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginBottom: 8,
};

const swatchBox = (hex: string): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: 4,
  background: hex,
});

const swatchLabel: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 10,
  color: "#666",
  marginTop: 4,
  textAlign: "center",
  maxWidth: 48,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GameTiles({ SectionLabel }: GameSectionProps) {
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
          borderLeft: `4px solid ${TILES.sectionColor}`,
        }}
      >
        Tiles
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
          {TILES.layout.interface} &middot; 21 colors across 5 hue families
        </span>
      </div>

      {/* ── 1. Color Spectrum by Hue Family ────────────────── */}
      <SectionLabel>Color Spectrum (21 colors)</SectionLabel>
      {HUE_FAMILIES.map((family) => (
        <div key={family.name} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "#666",
              marginBottom: 6,
            }}
          >
            {family.name}
          </div>
          <div style={swatchGrid}>
            {family.swatches.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={swatchBox(s.hex)} />
                <div style={swatchLabel}>{s.label}</div>
                <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── 2. Tile Grid Mockup ────────────────────────────── */}
      <SectionLabel>Tile Grid Mockup</SectionLabel>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "repeat(4, 56px)",
          gap: 4,
          padding: 12,
          background: "#f2eae2",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        {MOCK_GRID_COLORS.map((hex, i) => (
          <div
            key={i}
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              background: hex,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-mono)",
              fontSize: 8,
              color: lum(hex) > 0.3 ? "#333" : "#fff",
              opacity: 0.85,
            }}
          >
            {hex}
          </div>
        ))}
      </div>

      {/* ── 3. Background Tones ────────────────────────────── */}
      <SectionLabel>Background Tones</SectionLabel>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {BACKGROUND_TONES.map((bg) => (
          <div key={bg.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 72,
                height: 48,
                borderRadius: 8,
                background: bg.hex,
                border: "1px solid #e0d6cc",
              }}
            />
            <div style={swatchLabel}>{bg.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{bg.hex}</div>
          </div>
        ))}
      </div>

      {/* ── 4. Named Tilesets ────────────────────────────── */}
      <SectionLabel>Named Tilesets (14)</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {Object.entries(TILES.tilesets).map(([name, colors]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                color: "#333",
                width: 72,
                textTransform: "capitalize",
              }}
            >
              {name}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.entries(colors).map(([colorName, hex]) => (
                <div key={colorName} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: hex,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                  <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#999", marginTop: 3 }}>
                    {hex}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Typography Specimen ────────────────────────── */}
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
          Tiles
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
          Match the tiles to clear the board. Each pair shares a color pattern.
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999" }}>
          nyt-franklin (NYTFranklin) &middot; 16px / 400
        </div>
      </div>

      {/* ── 6. Layout Specs ────────────────────────────────── */}
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
          ["Interface", TILES.layout.interface],
          ["Total Colors", "21"],
          ["Hue Families", "5 (Blue, Green, Red, Gold, Neutral)"],
          ["Tile Radius", "6px"],
          ["Grid Gap", "4px"],
          ["BG Color", "#f2eae2 (warm)"],
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
