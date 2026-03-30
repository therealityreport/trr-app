"use client";

import { GAME_ARTICLES } from "@/lib/admin/design-docs-config";
import { WORDLE } from "./sections/games/game-palettes";
import {
  GameWordle,
  GameSpellingBee,
  GameConnections,
  GameTiles,
  GameMiniCrossword,
  GameLetterBoxed,
  GameStrands,
  GameSudoku,
  GameVertex,
  GameFlashback,
  GameCrossplay,
  GamePips,
  GameTheMidi,
} from "./sections/games";

/* ── Wordle-Specific Data ─────────────────────────────────────────── */

const WORDLE_META = {
  title: "Wordle — The New York Times",
  ogTitle: "Wordle - A daily word game",
  ogDescription: "Guess the hidden word in 6 tries. A new puzzle is available each day.",
  ogImage: "https://www.nytimes.com/games-assets/v2/assets/wordle/wordle_og_1200x630.png",
  themeColors: ["#000000", "#FFFFFF", "#6aaa64"],
  canonical: "https://www.nytimes.com/games/wordle/index.html",
  manifest: "https://www.nytimes.com/games-assets/v2/metadata/wordle-web-manifest.json",
  appleTouchIcon: "https://www.nytimes.com/games-assets/v2/metadata/wordle-apple-touch-icon.png",
  favicon: "https://www.nytimes.com/games-assets/v2/metadata/wordle-favicon.ico",
  logo32: "https://www.nytimes.com/games-assets/v2/assets/wordle/wordle_logo_32x32.png",
  logo192: "https://www.nytimes.com/games-assets/v2/assets/wordle/wordle_logo_192x192.png",
  darkModeScript: '(function(){let e;try{e=JSON.parse(localStorage.getItem("nyt-wordle-darkmode"))}catch(e){}e&&document.body.classList.add("dark")})()',
};

const WORDLE_TILES_DEMO: { letter: string; state: "correct" | "present" | "absent" | "empty" | "tbd" }[][] = [
  [
    { letter: "S", state: "absent" },
    { letter: "T", state: "absent" },
    { letter: "A", state: "present" },
    { letter: "R", state: "absent" },
    { letter: "E", state: "absent" },
  ],
  [
    { letter: "C", state: "correct" },
    { letter: "L", state: "absent" },
    { letter: "A", state: "correct" },
    { letter: "I", state: "absent" },
    { letter: "M", state: "absent" },
  ],
  [
    { letter: "C", state: "correct" },
    { letter: "H", state: "correct" },
    { letter: "A", state: "correct" },
    { letter: "N", state: "correct" },
    { letter: "T", state: "correct" },
  ],
  ...Array.from({ length: 3 }, () =>
    Array.from({ length: 5 }, () => ({ letter: "", state: "empty" as const })),
  ),
];

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
] as const;

const KEY_STATES: Record<string, "correct" | "present" | "absent"> = {
  C: "correct", H: "correct", A: "correct", N: "correct", T: "correct",
  S: "absent", R: "absent", E: "absent", L: "absent", I: "absent", M: "absent",
};

function tileColor(state: string): string {
  if (state === "correct") return WORDLE.light.correct;
  if (state === "present") return WORDLE.light.present;
  if (state === "absent") return WORDLE.light.absent;
  return "transparent";
}

function tileBorder(state: string): string {
  if (state === "empty") return `2px solid ${WORDLE.light.tone4}`;
  if (state === "tbd") return `2px solid ${WORDLE.light.tone3}`;
  return "none";
}

function keyBg(letter: string): string {
  const state = KEY_STATES[letter];
  if (state === "correct") return WORDLE.keyboard.correct;
  if (state === "present") return WORDLE.keyboard.present;
  if (state === "absent") return WORDLE.keyboard.absent;
  return WORDLE.keyboard.bg;
}

function keyTextColor(letter: string): string {
  return KEY_STATES[letter] ? WORDLE.keyboard.evaluatedText : WORDLE.keyboard.text;
}

/* ── Shared Styles ─────────────────────────────────────────────── */

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--dd-font-sans)",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--dd-brand-accent)",
  marginBottom: 8,
  marginTop: 40,
};

const monoSmall: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 10,
  color: "var(--dd-ink-light)",
};

/* ── Shared SectionLabel for game components ─────────────────── */

function SectionLabelStyled({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

interface Props {
  gameId: string;
}

export default function GameArticleDetailPage({ gameId }: Props) {
  const game = GAME_ARTICLES.find((g) => g.id === gameId);
  if (!game) {
    return <div>Game not found: {gameId}</div>;
  }

  // Map game IDs to their design-system components
  const GAME_COMPONENTS: Record<string, React.ComponentType<{ SectionLabel: React.ComponentType<{ children: React.ReactNode }> }>> = {
    wordle: GameWordle,
    "spelling-bee": GameSpellingBee,
    connections: GameConnections,
    tiles: GameTiles,
    mini: GameMiniCrossword,
    "letter-boxed": GameLetterBoxed,
    strands: GameStrands,
    sudoku: GameSudoku,
    vertex: GameVertex,
    flashback: GameFlashback,
    crossplay: GameCrossplay,
    pips: GamePips,
    "the-midi": GameTheMidi,
  };

  // Wordle has the full detailed article page with OG meta, board specimen, keyboard, etc.
  if (gameId === "wordle") {
    return <WordleDetailPage game={game} />;
  }

  // All other games render their Game*.tsx component (same content that was in the anchor sections)
  const GameComponent = GAME_COMPONENTS[gameId];

  return (
    <div className="nytg-scope">
      <div className="dd-section-label">NYT Games &bull; Design Breakdown</div>
      <h2 className="dd-section-title">{game.name}</h2>
      <p className="dd-section-desc">{game.description}</p>

      {GameComponent ? (
        <GameComponent SectionLabel={SectionLabelStyled} />
      ) : (
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, color: "var(--dd-ink-light)", marginTop: 24 }}>
          Design system component not yet available for {game.name}.
        </p>
      )}
    </div>
  );
}

/* ── Wordle Detail Page ───────────────────────────────────────── */

function WordleDetailPage({ game }: { game: (typeof GAME_ARTICLES)[number] }) {
  return (
    <div className="nytg-scope">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="dd-section-label">NYT Games &bull; Design Breakdown</div>
      <h2 className="dd-section-title">Wordle</h2>
      <p className="dd-section-desc">
        Five-letter word puzzle &mdash; 5&times;6 grid, keyboard state management,
        flip animations, dark mode, colorblind mode, and share grid. The most viral
        word game since Scrabble, now a core NYT Games product.
      </p>

      {/* ── OG / Meta ──────────────────────────────────── */}
      <div style={sectionLabel}>Open Graph &amp; Meta</div>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 32,
        }}
      >
        {/* OG Image preview */}
        <div style={{ background: "var(--dd-brand-surface)", padding: 24, textAlign: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              aspectRatio: "1200/630",
              background: `linear-gradient(135deg, ${WORDLE.light.correct} 0%, #4e8a4a 100%)`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--dd-font-ui)",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 auto",
            }}
          >
            Wordle
          </div>
          <div style={{ ...monoSmall, marginTop: 8 }}>
            wordle_og_1200x630.png (1200&times;630)
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 14, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 4 }}>
            {WORDLE_META.ogTitle}
          </div>
          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "var(--dd-ink-soft)", lineHeight: 1.5 }}>
            {WORDLE_META.ogDescription}
          </div>
          <div style={{ ...monoSmall, marginTop: 8 }}>
            canonical: {game.canonical}
          </div>
        </div>
      </div>

      {/* ── Color Palette ──────────────────────────────── */}
      <div style={sectionLabel}>Color Palette</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {/* Light mode */}
        <div>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Light Mode</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Correct", hex: WORDLE.light.correct, css: "--color-correct" },
              { label: "Present", hex: WORDLE.light.present, css: "--color-present" },
              { label: "Absent", hex: WORDLE.light.absent, css: "--color-absent" },
              { label: "Tone 1", hex: WORDLE.light.tone1 },
              { label: "Tone 4", hex: WORDLE.light.tone4 },
              { label: "Tone 7", hex: WORDLE.light.tone7 },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, background: c.hex, borderRadius: 6, border: "1px solid var(--dd-brand-border)" }} />
                <div style={{ fontSize: 10, fontFamily: "var(--dd-font-sans)", fontWeight: 700, marginTop: 4, color: "var(--dd-ink-black)" }}>{c.label}</div>
                <div style={monoSmall}>{c.hex}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Dark mode */}
        <div>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Dark Mode</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Correct", hex: WORDLE.dark.correct },
              { label: "Present", hex: WORDLE.dark.present },
              { label: "Absent", hex: WORDLE.dark.absent },
              { label: "Tone 1", hex: WORDLE.dark.tone1 },
              { label: "Tone 7", hex: WORDLE.dark.tone7 },
            ].map((c) => (
              <div key={c.label} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, background: c.hex, borderRadius: 6, border: "1px solid #333" }} />
                <div style={{ fontSize: 10, fontFamily: "var(--dd-font-sans)", fontWeight: 700, marginTop: 4, color: "var(--dd-ink-black)" }}>{c.label}</div>
                <div style={monoSmall}>{c.hex}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Colorblind */}
        <div>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Colorblind Mode</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: WORDLE.colorblind.correct, borderRadius: 6 }} />
              <div style={{ fontSize: 10, fontFamily: "var(--dd-font-sans)", fontWeight: 700, marginTop: 4 }}>Correct</div>
              <div style={monoSmall}>{WORDLE.colorblind.correct}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, background: WORDLE.colorblind.present, borderRadius: 6 }} />
              <div style={{ fontSize: 10, fontFamily: "var(--dd-font-sans)", fontWeight: 700, marginTop: 4 }}>Present</div>
              <div style={monoSmall}>{WORDLE.colorblind.present}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Game Board Specimen ─────────────────────────── */}
      <div style={sectionLabel}>Game Board</div>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          border: "1px solid var(--dd-brand-border)",
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        {/* 6×5 Grid */}
        <div
          style={{
            display: "inline-grid",
            gridTemplateRows: `repeat(6, ${WORDLE.layout.tileSize}px)`,
            gridTemplateColumns: `repeat(5, ${WORDLE.layout.tileSize}px)`,
            gap: WORDLE.layout.tileGap,
          }}
        >
          {WORDLE_TILES_DEMO.flat().map((tile, i) => (
            <div
              key={i}
              style={{
                width: WORDLE.layout.tileSize,
                height: WORDLE.layout.tileSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tile.state === "empty" || tile.state === "tbd" ? "transparent" : tileColor(tile.state),
                border: tileBorder(tile.state),
                borderRadius: WORDLE.radius.tile,
                color: tile.state === "empty" || tile.state === "tbd" ? "#000" : "#fff",
                fontFamily: '"Clear Sans", "Helvetica Neue", Arial, sans-serif',
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1,
                boxSizing: "border-box",
              }}
            >
              {tile.letter}
            </div>
          ))}
        </div>
        <div style={{ ...monoSmall, marginTop: 12 }}>
          5&times;6 grid | tile: {WORDLE.layout.tileSize}px | gap: {WORDLE.layout.tileGap}px | radius: {WORDLE.radius.tile} | maxWidth: {WORDLE.layout.maxWidth}px
        </div>
      </div>

      {/* ── Keyboard Specimen ──────────────────────────── */}
      <div style={sectionLabel}>Keyboard</div>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          border: "1px solid var(--dd-brand-border)",
          borderRadius: 12,
          padding: 20,
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 4 }}>
              {row.map((key) => (
                <div
                  key={key}
                  style={{
                    minWidth: key.length > 1 ? 56 : 36,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: keyBg(key),
                    color: keyTextColor(key),
                    borderRadius: WORDLE.radius.keyboard,
                    fontFamily: '"Clear Sans", "Helvetica Neue", Arial, sans-serif',
                    fontSize: key.length > 1 ? 11 : 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {key}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ ...monoSmall, marginTop: 12 }}>
          3 rows | key radius: {WORDLE.radius.keyboard} | height: {WORDLE.layout.keyboardHeight}px | states: available / correct / present / absent
        </div>
      </div>

      {/* ── Dark Mode Implementation ──────────────────── */}
      <div style={sectionLabel}>Dark Mode</div>
      <div
        style={{
          background: WORDLE.dark.tone7,
          border: "1px solid #333",
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 14, fontWeight: 700, color: WORDLE.dark.tone1, marginBottom: 8 }}>
          localStorage-based toggle
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: WORDLE.dark.tone2, marginBottom: 16, lineHeight: 1.6 }}>
          Key: &quot;nyt-wordle-darkmode&quot; &rarr; JSON.parse() &rarr; body.classList.add(&quot;dark&quot;)
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "BG", hex: WORDLE.dark.tone7 },
            { label: "Correct", hex: WORDLE.dark.correct },
            { label: "Present", hex: WORDLE.dark.present },
            { label: "Absent", hex: WORDLE.dark.absent },
            { label: "Text", hex: WORDLE.dark.tone1 },
          ].map((c) => (
            <div key={c.label} style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, background: c.hex, borderRadius: 6, border: "1px solid #555" }} />
              <div style={{ fontSize: 9, color: WORDLE.dark.tone2, marginTop: 4, fontFamily: "var(--dd-font-mono)" }}>{c.label}</div>
              <div style={{ fontSize: 9, color: WORDLE.dark.tone3, fontFamily: "var(--dd-font-mono)" }}>{c.hex}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Layout Dimensions ─────────────────────────── */}
      <div style={sectionLabel}>Layout Dimensions</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 32 }}>
        {[
          { label: "Header Height", value: `${WORDLE.layout.headerHeight}px` },
          { label: "Keyboard Height", value: `${WORDLE.layout.keyboardHeight}px` },
          { label: "Max Width", value: `${WORDLE.layout.maxWidth}px` },
          { label: "Tile Size", value: `${WORDLE.layout.tileSize}px` },
          { label: "Tile Gap", value: `${WORDLE.layout.tileGap}px` },
          { label: "Grid", value: `${WORDLE.layout.rows} rows × ${WORDLE.layout.cols} cols` },
        ].map((item) => (
          <div key={item.label} style={{ background: "var(--dd-paper-cool)", borderRadius: 6, padding: "8px 12px" }}>
            <div style={monoSmall}>{item.label}</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 14, fontWeight: 600, color: "var(--dd-ink-black)", marginTop: 2 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── Build Info ─────────────────────────────────── */}
      <div style={sectionLabel}>Build &amp; Assets</div>
      <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 8, padding: 16, marginBottom: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={monoSmall}>Page Name</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>{game.pageName}</div>
          </div>
          <div>
            <div style={monoSmall}>Ad Unit Path</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>{game.adUnitPath}</div>
          </div>
          <div>
            <div style={monoSmall}>CSS Chunks</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>{game.cssChunks.length}</div>
          </div>
          <div>
            <div style={monoSmall}>JS Chunks</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>{game.jsChunkCount}</div>
          </div>
          <div>
            <div style={monoSmall}>Dark Mode Key</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)" }}>{game.darkModeKey ?? "none"}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ ...monoSmall, marginBottom: 4 }}>CSS Files</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {game.cssChunks.map((c) => (
              <span key={c} style={{ fontSize: 9, fontFamily: "var(--dd-font-mono)", background: "var(--dd-paper-cool)", borderRadius: 3, padding: "2px 6px", color: "var(--dd-ink-soft)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── A/B Tests ─────────────────────────────────── */}
      <div style={sectionLabel}>Wordle A/B Tests</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
        {game.abTestKeys.map((key) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: 4,
            }}
          >
            <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "var(--dd-ink-black)", flex: 1 }}>{key}</span>
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 600,
                color: key.startsWith("DFP") ? "#fb9b00" : key.startsWith("ON_") ? "#4f85e5" : "#6aaa64",
                textTransform: "uppercase",
              }}
            >
              {key.startsWith("DFP") ? "Ad" : key.startsWith("ON_") ? "Onboarding" : key.startsWith("AMS_") ? "Welcome" : "Game"}
            </span>
          </div>
        ))}
      </div>

      {/* ── Fonts ─────────────────────────────────────── */}
      <div style={sectionLabel}>Typography</div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 8, padding: 16 }}>
          {Object.entries(WORDLE.fonts).map(([role, family]) => (
            <div key={role} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--dd-paper-grey)" }}>
              <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "var(--dd-ink-black)", textTransform: "capitalize" }}>{role}</span>
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-ink-soft)" }}>{family}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Radius Tokens ─────────────────────────────── */}
      <div style={sectionLabel}>Border Radius</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        {Object.entries(WORDLE.radius).map(([label, value]) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: WORDLE.light.correct, borderRadius: value === "0px" ? 0 : parseInt(value), margin: "0 auto 6px" }} />
            <div style={{ fontSize: 11, fontFamily: "var(--dd-font-sans)", fontWeight: 700, color: "var(--dd-ink-black)", textTransform: "capitalize" }}>{label}</div>
            <div style={monoSmall}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
