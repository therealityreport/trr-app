"use client";

import { WORDLE } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

const LIGHT_SWATCHES = [
  { label: "Correct", hex: WORDLE.light.correct },
  { label: "Present", hex: WORDLE.light.present },
  { label: "Absent", hex: WORDLE.light.absent },
  { label: "Tone 1", hex: WORDLE.light.tone1 },
  { label: "Tone 4 (Border)", hex: WORDLE.light.tone4 },
  { label: "Tone 7 (BG)", hex: WORDLE.light.tone7 },
];

const DARK_SWATCHES = [
  { label: "Correct", hex: WORDLE.dark.correct },
  { label: "Present", hex: WORDLE.dark.present },
  { label: "Absent", hex: WORDLE.dark.absent },
  { label: "Tone 1", hex: WORDLE.dark.tone1 },
  { label: "Tone 4", hex: WORDLE.dark.tone4 },
  { label: "Tone 7 (BG)", hex: WORDLE.dark.tone7 },
];

const COLORBLIND_SWATCHES = [
  { label: "Correct (Orange)", hex: WORDLE.colorblind.correct },
  { label: "Present (Blue)", hex: WORDLE.colorblind.present },
];

const TILE_STATES: { letter: string; state: string; bg: string }[] = [
  { letter: "W", state: "correct", bg: WORDLE.light.correct },
  { letter: "O", state: "present", bg: WORDLE.light.present },
  { letter: "R", state: "absent", bg: WORDLE.light.absent },
  { letter: "", state: "empty", bg: "transparent" },
  { letter: "E", state: "active", bg: "transparent" },
];

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const KEY_COLORS: Record<string, string> = {
  W: WORDLE.keyboard.correct,
  O: WORDLE.keyboard.present,
  R: WORDLE.keyboard.absent,
  D: WORDLE.keyboard.absent,
  E: WORDLE.keyboard.correct,
};

const ANIMATION_SPECS = [
  { name: "Tile Flip", css: "rotateX(0) → rotateX(90deg) → rotateX(0)", duration: "500ms", easing: "ease-in" },
  { name: "Pop", css: "scale(1) → scale(1.1) → scale(1)", duration: "100ms", easing: "ease-in" },
  { name: "Shake", css: "translateX(0/±4px) wiggle", duration: "600ms", easing: "ease-in-out" },
  { name: "Bounce", css: "translateY stagger per tile", duration: "1000ms", easing: "ease" },
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GameWordle({ SectionLabel }: GameSectionProps) {
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
          borderLeft: `4px solid ${WORDLE.light.correct}`,
        }}
      >
        Wordle
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
          {WORDLE.layout.cols}&times;{WORDLE.layout.rows} Grid &middot; {WORDLE.layout.tileSize}px tiles &middot; {WORDLE.layout.maxWidth}px max
        </span>
      </div>

      {/* ── 1. Color Palette ───────────────────────────────── */}
      <SectionLabel>Light Mode</SectionLabel>
      <div style={swatchGrid}>
        {LIGHT_SWATCHES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={swatchBox(s.hex)} />
            <div style={swatchLabel}>{s.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Dark Mode</SectionLabel>
      <div style={swatchGrid}>
        {DARK_SWATCHES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={swatchBox(s.hex)} />
            <div style={swatchLabel}>{s.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Colorblind Mode</SectionLabel>
      <div style={swatchGrid}>
        {COLORBLIND_SWATCHES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={swatchBox(s.hex)} />
            <div style={swatchLabel}>{s.label}</div>
            <div style={{ ...swatchLabel, marginTop: 0 }}>{s.hex}</div>
          </div>
        ))}
      </div>

      {/* ── 2. Tile Row Specimen ───────────────────────────── */}
      <SectionLabel>Tile States</SectionLabel>
      <div
        style={{
          display: "flex",
          gap: WORDLE.layout.tileGap,
          marginBottom: 8,
        }}
      >
        {TILE_STATES.map((t, i) => {
          const isEmpty = t.state === "empty";
          const isActive = t.state === "active";
          return (
            <div
              key={i}
              style={{
                width: WORDLE.layout.tileSize,
                height: WORDLE.layout.tileSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-ui)",
                fontSize: 32,
                fontWeight: 700,
                color:
                  isEmpty || isActive ? WORDLE.light.tone1 : "#fff",
                background: t.bg,
                border: isEmpty
                  ? `2px solid ${WORDLE.light.tone4}`
                  : isActive
                    ? `2px solid ${WORDLE.light.tone3}`
                    : "none",
                borderRadius: 0,
                textTransform: "uppercase",
              }}
            >
              {t.letter}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: WORDLE.layout.tileGap,
          marginBottom: 24,
        }}
      >
        {TILE_STATES.map((t, i) => (
          <div
            key={i}
            style={{
              width: WORDLE.layout.tileSize,
              textAlign: "center",
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              color: "#999",
              textTransform: "capitalize",
            }}
          >
            {t.state}
          </div>
        ))}
      </div>

      {/* ── 3. Keyboard Mockup ─────────────────────────────── */}
      <SectionLabel>Keyboard</SectionLabel>
      <div
        style={{
          background: "#fff",
          padding: 8,
          borderRadius: 8,
          display: "inline-block",
          marginBottom: 24,
        }}
      >
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 4 }}>
            {row.map((key) => {
              const bg = KEY_COLORS[key] ?? WORDLE.keyboard.bg;
              const isEval = key in KEY_COLORS;
              const wide = key === "ENTER" || key === "DEL";
              return (
                <div
                  key={key}
                  style={{
                    minWidth: wide ? 52 : 32,
                    height: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    color: isEval ? WORDLE.keyboard.evaluatedText : WORDLE.keyboard.text,
                    fontFamily: "var(--dd-font-ui)",
                    fontSize: wide ? 10 : 13,
                    fontWeight: 700,
                    borderRadius: 4,
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  {key}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── 4. Typography Specimen ─────────────────────────── */}
      <SectionLabel>Typography</SectionLabel>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          Wordle
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999", marginBottom: 12 }}>
          nyt-karnakcondensed &rarr; Rude Slab &middot; 50px / 700
        </div>

        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontSize: 38,
            fontWeight: 400,
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          Get 6 chances to guess
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999", marginBottom: 12 }}>
          nyt-karnak &rarr; Stymie &middot; 38px / 400
        </div>

        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.4,
            marginBottom: 4,
          }}
        >
          Guess the WORDLE in 6 tries. Each guess must be a valid 5-letter word.
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999" }}>
          Clear Sans &rarr; Hamburg Serial &middot; 16px / 400 &middot; body font
        </div>
      </div>

      {/* ── 5. Animation Specs ─────────────────────────────── */}
      <SectionLabel>Animation Specs</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {ANIMATION_SPECS.map((a) => (
          <div
            key={a.name}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {a.name}
            </div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "#666", marginBottom: 2 }}>
              {a.css}
            </div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#999" }}>
              {a.duration} &middot; {a.easing}
            </div>
          </div>
        ))}
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
          ["Tile Size", `${WORDLE.layout.tileSize}px`],
          ["Tile Gap", `${WORDLE.layout.tileGap}px`],
          ["Grid", `${WORDLE.layout.cols} cols \u00d7 ${WORDLE.layout.rows} rows`],
          ["Max Width", `${WORDLE.layout.maxWidth}px`],
          ["Header", `${WORDLE.layout.headerHeight}px`],
          ["Keyboard", `${WORDLE.layout.keyboardHeight}px`],
        ].map(([k, v]) => (
          <div key={k} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <div style={{ color: "#999", fontSize: 10, marginBottom: 2 }}>{k}</div>
            <div style={{ fontWeight: 600, color: lum(WORDLE.light.correct) > 0.3 ? "#333" : "#333" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
