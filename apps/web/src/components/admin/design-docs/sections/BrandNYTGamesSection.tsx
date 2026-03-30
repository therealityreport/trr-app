"use client";

// Per-game design systems moved to individual article pages
import { HubComponents } from "./games";
import { TECH_STACK, AB_TESTS } from "./games/game-palettes";

// PROMPTS removed — AI Illustrations section removed

/* ------------------------------------------------------------------ */
/*  NYT Games Brand Section — Wordle, Connections, Strands, Spelling  */
/*  Bee, The Mini                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
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

/* ── Inline Data ──────────────────────────────────────────────────── */

const COLORS = [
  { name: "Correct / Green", hex: "#6AAA64", use: "Correct position" },
  { name: "Present / Yellow", hex: "#C9B458", use: "Wrong position" },
  { name: "Absent / Gray", hex: "#787C7E", use: "Not in word" },
  { name: "Dark BG", hex: "#121213", use: "Game board" },
  { name: "Tile Border", hex: "#D3D6DA", use: "Empty tile" },
  { name: "Key BG", hex: "#818384", use: "Keyboard key" },
  { name: "Categories Yellow", hex: "#f9df6d", use: "Connections — Easiest" },
  { name: "Categories Green", hex: "#a0c35a", use: "Connections — Medium" },
  { name: "Categories Blue", hex: "#b0c4ef", use: "Connections — Hard" },
  { name: "Categories Purple", hex: "#b4a8ff", use: "Connections — Hardest" },
] as const;

const TYPE_SCALE = [
  { size: 40, label: "Tile Letters" },
  { size: 32, label: "Display" },
  { size: 24, label: "Subhead" },
  { size: 20, label: "Secondary" },
  { size: 16, label: "Body" },
  { size: 14, label: "Caption" },
  { size: 12, label: "Fine" },
] as const;

const WORDLE_TILES: { letter: string; state: "correct" | "present" | "absent" }[] = [
  { letter: "H", state: "correct" },
  { letter: "E", state: "absent" },
  { letter: "L", state: "present" },
  { letter: "L", state: "correct" },
  { letter: "O", state: "absent" },
];

const TILE_COLORS: Record<string, string> = {
  correct: "#6AAA64",
  present: "#C9B458",
  absent: "#787C7E",
};

const CONNECTIONS_GRID = [
  { words: ["APPLE", "MANGO", "PEACH", "PLUM"], color: "#f9df6d", label: "Yellow — Easiest", revealed: true },
  { words: ["STORM", "BLAZE", "FROST", "GALE"], color: "#a0c35a", label: "Green", revealed: false },
  { words: ["BASS", "DRUM", "GUITAR", "KEYS"], color: "#b0c4ef", label: "Blue", revealed: false },
  { words: ["TRICKY", "CRAFTY", "SNEAKY", "SLY"], color: "#b4a8ff", label: "Purple — Hardest", revealed: false },
] as const;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
] as const;

const KEY_STATES: Record<string, string> = {
  H: "#6AAA64",
  L: "#6AAA64",
  E: "#787C7E",
  O: "#787C7E",
};

const RADIUS_TOKENS = [
  { label: "Wordle Tiles", value: "0px (sharp)" },
  { label: "Wordle Keyboard", value: "4px" },
  { label: "Connections Tiles", value: "8px" },
  { label: "Spelling Bee Button", value: "9999px (pill)" },
  { label: "Tiles", value: "4px" },
  { label: "Cards / Modals", value: "8\u201316px" },
  { label: "Mini Crossword", value: "0px (sharp)" },
  { label: "Pips Domino", value: "8px" },
  { label: "Vertex Dots", value: "50% (circle)" },
  { label: "Hub Game Cards", value: "8px" },
] as const;

/**
 * GAME_PORTFOLIO — ordered to match the live nav drawer (Mar 2026).
 * Vertex and Flashback are not in the live nav/footer but remain documented.
 */
const GAME_PORTFOLIO = [
  { name: "Crossplay", desc: "2-player word game", badge: "New", badgeColor: "#6aaa64", topColor: "#6366f1" },
  { name: "The Crossword", desc: "Daily puzzles since 1942", badge: "Original", badgeColor: "#787C7E", topColor: "#121213" },
  { name: "The Midi", desc: "9\u201311\u00d79\u201311 themed crossword", badge: "New", badgeColor: "#6aaa64", topColor: "#7ca8f0" },
  { name: "The Mini", desc: "5\u00d75 quick crossword", badge: "Original", badgeColor: "#787C7E", topColor: "#95befa" },
  { name: "Connections", desc: "Group related words", badge: "Core", badgeColor: "#4f85e5", topColor: "#b4a8ff" },
  { name: "Spelling Bee", desc: "Hexagon word game", badge: "Core", badgeColor: "#4f85e5", topColor: "#f7da21" },
  { name: "Wordle", desc: "Five-letter word puzzle", badge: "Core", badgeColor: "#4f85e5", topColor: "#6aaa64" },
  { name: "Pips", desc: "Domino placement puzzle", badge: "Core", badgeColor: "#4f85e5", topColor: "#9251ca" },
  { name: "Strands", desc: "Theme word pathfinding", badge: "Core", badgeColor: "#4f85e5", topColor: "#b2ded8" },
  { name: "Letter Boxed", desc: "Square letter connections", badge: "Core", badgeColor: "#4f85e5", topColor: "#fc716b" },
  { name: "Tiles", desc: "Visual pattern matching", badge: "Core", badgeColor: "#4f85e5", topColor: "#b5e352" },
  { name: "Sudoku", desc: "Logic number puzzle", badge: "Core", badgeColor: "#4f85e5", topColor: "#fb9b00" },
  { name: "Vertex", desc: "Polygon art game", badge: "Unlisted", badgeColor: "#ba81c5", topColor: "#29566c" },
  { name: "Flashback", desc: "History timeline quiz", badge: "Unlisted", badgeColor: "#ba81c5", topColor: "#c2593a" },
] as const;

const DARK_THEME_TONES = [
  { label: "Tone 1 (White)", hex: "#ffffff" },
  { label: "Tone 2", hex: "#818384" },
  { label: "Tone 3", hex: "#565758" },
  { label: "Tone 4", hex: "#3a3a3c" },
  { label: "Tone 5", hex: "#272729" },
  { label: "Tone 6", hex: "#1a1a1b" },
  { label: "Tone 7 (Black)", hex: "#121213" },
] as const;

const BUTTON_STATES = [
  { label: "Default", hex: "#4f85e5" },
  { label: "Hover", hex: "#3976e2" },
  { label: "Active", hex: "#2366de" },
] as const;

const SHADOW_SPECIMENS = [
  { label: "Small", value: "0 2px 8px rgba(0,0,0,0.08)" },
  { label: "Medium", value: "0 4px 23px rgba(0,0,0,0.15)" },
  { label: "Large", value: "3px 5px 5px rgba(0,0,0,0.15)" },
] as const;

const KEYFRAMES = `
@keyframes nytg-flip {
  0%   { transform: rotateX(0deg); }
  50%  { transform: rotateX(90deg); }
  100% { transform: rotateX(0deg); }
}
@keyframes nytg-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.1); }
  100% { transform: scale(1); }
}
@keyframes nytg-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
@keyframes nytg-bounce {
  0%   { transform: translateY(0); }
  40%  { transform: translateY(-16px); }
  60%  { transform: translateY(-8px); }
  80%  { transform: translateY(-12px); }
  100% { transform: translateY(0); }
}
@keyframes nytg-easing-slide {
  0%   { transform: translateX(0); }
  100% { transform: translateX(calc(100% - 48px)); }
}
`;

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTGamesSection() {
  return (
    <div className="nytg-scope">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Games</h2>
      <p className="dd-section-desc">
        Wordle, Connections, Strands, Spelling Bee, The Mini &mdash; the games
        portfolio that turned a newspaper into a daily ritual for millions.
      </p>

      {/* ── 1. Brand Header ───────────────────────────────── */}
      <SectionLabel>Brand Header</SectionLabel>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          borderRadius: 16,
          padding: "40px 32px",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 900,
            fontSize: 36,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          NYT Games
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            color: "var(--dd-brand-text-secondary)",
            fontStyle: "italic",
          }}
        >
          Playful, tactile, rewarding &mdash; where type becomes toy
        </div>
      </div>

      {/* ── 1b. Game Portfolio Grid ─────────────────────────── */}
      <div id="game-portfolio" />
      <SectionLabel>Game Portfolio</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {GAME_PORTFOLIO.map((game) => (
          <div
            key={game.name}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: 8,
              borderTop: `4px solid ${game.topColor}`,
              padding: "16px 14px 14px",
              cursor: "default",
              transition: "transform 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), box-shadow 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 4px 23px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
                background: game.badgeColor,
                borderRadius: 4,
                padding: "2px 6px",
                marginBottom: 8,
              }}
            >
              {game.badge}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {game.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {game.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── 1c. Button System ───────────────────────────────── */}
      <SectionLabel>Button System</SectionLabel>
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-end",
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        {BUTTON_STATES.map((btn) => (
          <div key={btn.label} style={{ textAlign: "center" }}>
            <div
              style={{
                background: btn.hex,
                color: "#FFFFFF",
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 700,
                fontSize: 15,
                padding: "12px 32px",
                borderRadius: 9999,
                cursor: "default",
                letterSpacing: "0.02em",
                marginBottom: 8,
              }}
            >
              Play
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              {btn.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              {btn.hex}
            </div>
          </div>
        ))}
      </div>

      {/* ── 1d. Shadow System ───────────────────────────────── */}
      <SectionLabel>Shadow System</SectionLabel>
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-end",
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        {SHADOW_SPECIMENS.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 100,
                height: 72,
                background: "#FFFFFF",
                borderRadius: 8,
                boxShadow: s.value,
                marginBottom: 8,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
                maxWidth: 120,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 1e. Easing Function ─────────────────────────────── */}
      <SectionLabel>Easing Function</SectionLabel>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 13,
            color: "var(--dd-ink-black)",
            marginBottom: 4,
          }}
        >
          cubic-bezier(0.645, 0.045, 0.355, 1)
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Primary easing &mdash; used for tile flips, button transitions, and UI motion. Hover the bar to preview.
        </div>
        <div
          style={{
            position: "relative",
            height: 48,
            background: "#F0F0F0",
            borderRadius: 8,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            const ball = e.currentTarget.querySelector("[data-easing-ball]") as HTMLElement;
            if (ball) ball.style.animation = "nytg-easing-slide 1s cubic-bezier(0.645, 0.045, 0.355, 1) forwards";
          }}
          onMouseLeave={(e) => {
            const ball = e.currentTarget.querySelector("[data-easing-ball]") as HTMLElement;
            if (ball) {
              ball.style.animation = "none";
              ball.style.transform = "translateX(0)";
            }
          }}
        >
          <div
            data-easing-ball=""
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#4f85e5",
            }}
          />
        </div>
      </div>

      {/* ── 2. Typography ─────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Primary Display — nyt-franklin (NYTFranklin) Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Primary Display &mdash; nyt-franklin Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 700,
            fontSize: 32,
            color: "var(--dd-ink-black)",
            lineHeight: 1.15,
            marginBottom: 4,
          }}
        >
          Wordle
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
          }}
        >
          Connections
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          nyt-franklin Bold (NYTFranklin) | 32px titles, 24px secondary | Game titles, headers
        </div>
      </div>

      {/* Secondary Display — nyt-stymie Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Secondary Display &mdash; nyt-stymie Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontWeight: 700,
            fontSize: 28,
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
            marginBottom: 4,
          }}
        >
          Spelling Bee
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--dd-ink-black)",
            lineHeight: 1.3,
          }}
        >
          Strands &bull; The Mini
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          nyt-stymie Bold | 28px / 20px | Decorative accents, category labels
        </div>
      </div>

      {/* Body / UI — nyt-franklin Regular */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Body / UI &mdash; nyt-franklin Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 16,
            color: "var(--dd-ink-black)",
            lineHeight: 1.55,
            maxWidth: 480,
          }}
        >
          Guess the 5-letter word in 6 tries. Each guess must be a valid word.
          The color of the tiles will change to show how close your guess was.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          nyt-franklin Regular (NYTFranklin) | 16px body | Instructions, menus, UI copy
        </div>
      </div>

      {/* Tile Letters — Clear Sans / nyt-franklin Black */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Tile Letters &mdash; Clear Sans / nyt-franklin Black
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {"ABCDE".split("").map((ch) => (
            <div
              key={ch}
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 900,
                fontSize: 40,
                color: "var(--dd-ink-black)",
                border: "2px solid #D3D6DA",
                borderRadius: 8,
              }}
            >
              {ch}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Clear Sans / nyt-franklin Black | 40px | Individual letter tiles
        </div>
      </div>

      {/* Type Scale */}
      <div
        style={{
          background: "var(--dd-brand-surface)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-brand-accent)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Type Scale
        </div>
        {TYPE_SCALE.map((t) => (
          <div
            key={t.size}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-brand-text-muted)",
                width: 40,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {t.size}px
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 700,
                fontSize: t.size,
                color: "var(--dd-brand-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Color Palette ──────────────────────────────── */}
      <div id="colors" />
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {COLORS.map((c) => (
          <div key={c.name} className="dd-swatch">
            <div
              className="dd-swatch-color"
              style={{
                background: c.hex,
                borderRadius: 8,
                border: c.hex === "#121213" ? "1px solid #333" : undefined,
              }}
            />
            <div className="dd-swatch-info">
              <div className="dd-swatch-name">{c.name}</div>
              <div className="dd-swatch-hex">{c.hex}</div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                {c.use}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dark Theme Tone Scale */}
      <div className="dd-palette-label">Dark Theme</div>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-brand-accent)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Dark-Mode Tone Scale
        </div>
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
          {DARK_THEME_TONES.map((tone) => (
            <div
              key={tone.label}
              style={{
                flex: 1,
                height: 48,
                background: tone.hex,
                border: tone.hex === "#ffffff" ? "1px solid #3a3a3c" : undefined,
              }}
              title={`${tone.label}: ${tone.hex}`}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {DARK_THEME_TONES.map((tone) => (
            <div
              key={tone.label}
              style={{
                flex: 1,
                textAlign: "center",
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                color: "var(--dd-brand-text-muted)",
                lineHeight: 1.3,
              }}
            >
              <div>{tone.hex}</div>
              <div style={{ fontSize: 8, color: "var(--dd-brand-text-muted)", marginTop: 2 }}>{tone.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Components ─────────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* Wordle Tile Row */}
      <div className="dd-palette-label">Wordle Tile Row</div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          padding: "24px 0",
          background: "var(--dd-brand-surface)",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        {WORDLE_TILES.map((t, i) => (
          <div
            key={i}
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: TILE_COLORS[t.state],
              borderRadius: 8,
              fontFamily: "var(--dd-font-ui)",
              fontWeight: 900,
              fontSize: 32,
              color: "#FFFFFF",
              border: "none",
            }}
          >
            {t.letter}
          </div>
        ))}
      </div>

      {/* Connections Grid */}
      <div className="dd-palette-label">Connections Grid</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          maxWidth: 400,
          margin: "0 auto",
          padding: "24px 16px",
          background: "var(--dd-brand-surface)",
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        {CONNECTIONS_GRID.map((row) =>
          row.revealed ? (
            <div
              key={row.label}
              style={{
                gridColumn: "1 / -1",
                background: row.color,
                borderRadius: 8,
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: 900,
                  fontSize: 13,
                  color: "#121213",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                {row.label.split(" — ")[0]}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  color: "#121213",
                }}
              >
                {row.words.join(", ")}
              </div>
            </div>
          ) : (
            row.words.map((word) => (
              <div
                key={word}
                style={{
                  background: "#EFEFE6",
                  borderRadius: 8,
                  padding: "14px 4px",
                  textAlign: "center",
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#121213",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.02em",
                }}
              >
                {word}
              </div>
            ))
          ),
        )}
      </div>

      {/* Keyboard */}
      <div className="dd-palette-label">Keyboard</div>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          borderRadius: 12,
          padding: "24px 16px",
          marginBottom: 24,
        }}
      >
        {KEYBOARD_ROWS.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 4,
              marginBottom: ri < KEYBOARD_ROWS.length - 1 ? 4 : 0,
            }}
          >
            {row.map((key) => {
              const bg = KEY_STATES[key] ?? "#818384";
              const isWide = key === "ENTER" || key === "DEL";
              return (
                <div
                  key={key}
                  style={{
                    minWidth: isWide ? 56 : 36,
                    height: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: bg,
                    borderRadius: 6,
                    fontFamily: "var(--dd-font-ui)",
                    fontWeight: 700,
                    fontSize: isWide ? 10 : 14,
                    color: "#FFFFFF",
                    cursor: "default",
                    letterSpacing: "0.02em",
                  }}
                >
                  {key}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Score Streak */}
      <div className="dd-palette-label">Score Streak</div>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 32,
          maxWidth: 400,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--dd-ink-black)",
            marginBottom: 8,
          }}
        >
          Current Streak
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          {["🟩🟩🟩🟩🟩", "🟨🟩🟩🟩🟩", "⬛🟨🟩🟩🟩", "🟩🟩🟩🟩🟩", "🟩⬛🟨🟩🟩"].map(
            (row, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 12,
                  lineHeight: 1.3,
                }}
              >
                {row}
              </div>
            ),
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            textAlign: "center",
          }}
        >
          {[
            { label: "Played", value: "142" },
            { label: "Win %", value: "96" },
            { label: "Streak", value: "5" },
            { label: "Max", value: "34" },
          ].map((s) => (
            <div key={s.label}>
              <div
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: 900,
                  fontSize: 28,
                  color: "var(--dd-ink-black)",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hub Page Components ─────────────────────────────── */}
      <div id="hub-components" />
      <SectionLabel>Hub Page Components</SectionLabel>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24, lineHeight: 1.6 }}>
        UI patterns from the live nytimes.com/crosswords hub page (commit f1a6f14) &mdash;
        header bar, Crossplay CTA, game cards, progress tracker, featured promo, navigation
        drawer (CSS Modules), and 4-column footer. All specimens verified from production HTML.
      </p>
      <HubComponents SectionLabel={SectionLabel} />

      {/* Per-game design systems moved to individual article pages at
          /admin/design-docs/nyt-games-articles/{gameId} */}

      {/* ── 5. Layout Patterns ────────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Game Board */}
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: 8,
            }}
          >
            Game Board
          </div>
          <div
            style={{
              background: "#121213",
              borderRadius: 8,
              padding: "20px 0",
              textAlign: "center",
              maxWidth: 180,
              margin: "0 auto",
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  marginBottom: row < 5 ? 4 : 0,
                }}
              >
                {[0, 1, 2, 3, 4].map((col) => (
                  <div
                    key={col}
                    style={{
                      width: 28,
                      height: 28,
                      border: "2px solid #3A3A3C",
                      borderRadius: 4,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Centered, max-width 350px, generous vertical padding
          </div>
        </div>

        {/* Results Modal */}
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: 8,
            }}
          >
            Results Modal
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #D3D6DA",
              borderRadius: 16,
              padding: 20,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 700,
                fontSize: 18,
                color: "#121213",
                marginBottom: 12,
              }}
            >
              Statistics
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 6,
              }}
            >
              {["142", "96", "5", "34"].map((v, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-ui)",
                      fontWeight: 900,
                      fontSize: 20,
                      color: "#121213",
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 9,
                      color: "#787C7E",
                    }}
                  >
                    {["Played", "Win %", "Streak", "Max"][i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Rounded 16px, centered, stats grid
          </div>
        </div>

        {/* Share Button */}
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: 16,
              alignSelf: "flex-start",
            }}
          >
            Share Button
          </div>
          <div
            style={{
              background: "#6AAA64",
              color: "#FFFFFF",
              fontFamily: "var(--dd-font-ui)",
              fontWeight: 700,
              fontSize: 16,
              padding: "12px 40px",
              borderRadius: 9999,
              cursor: "default",
              letterSpacing: "0.02em",
            }}
          >
            Share
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 12,
            }}
          >
            Pill shape, green bg, Hamburg Bold
          </div>
        </div>
      </div>

      {/* ── 6. Interactions & Motion ──────────────────────── */}
      <SectionLabel>Interactions &amp; Motion</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Tile Flip */}
        <div
          style={{
            background: "var(--dd-brand-surface)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#6AAA64",
              marginBottom: 12,
            }}
          >
            Tile Flip
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto",
              background: "#6AAA64",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-ui)",
              fontWeight: 900,
              fontSize: 28,
              color: "#FFFFFF",
              transform: "perspective(200px) rotateX(45deg)",
              transition: "transform 0.5s",
            }}
          >
            A
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-brand-text-muted)",
              marginTop: 10,
            }}
          >
            0.5s rotateX(90deg) reveal
          </div>
        </div>

        {/* Tile Pop */}
        <div
          style={{
            background: "var(--dd-brand-surface)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#C9B458",
              marginBottom: 12,
            }}
          >
            Tile Pop
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto",
              border: "2px solid #D3D6DA",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-ui)",
              fontWeight: 900,
              fontSize: 28,
              color: "#FFFFFF",
              transform: "scale(1.1)",
              animation: "nytg-pop 0.8s ease infinite",
            }}
          >
            B
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-brand-text-muted)",
              marginTop: 10,
            }}
          >
            scale(1.1) &rarr; scale(1) 0.1s
          </div>
        </div>

        {/* Shake */}
        <div
          style={{
            background: "var(--dd-brand-surface)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#787C7E",
              marginBottom: 12,
            }}
          >
            Shake
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 4,
              animation: "nytg-shake 0.6s ease infinite",
            }}
          >
            {"XYZQJ".split("").map((ch, i) => (
              <div
                key={i}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #3A3A3C",
                  borderRadius: 4,
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#FFFFFF",
                }}
              >
                {ch}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-brand-text-muted)",
              marginTop: 10,
            }}
          >
            translateX wiggle, 0.6s
          </div>
        </div>

        {/* Bounce */}
        <div
          style={{
            background: "var(--dd-brand-surface)",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#6AAA64",
              marginBottom: 12,
            }}
          >
            Bounce
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
            {"GREAT".split("").map((ch, i) => (
              <div
                key={i}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#6AAA64",
                  borderRadius: 4,
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#FFFFFF",
                  animation: `nytg-bounce 0.8s ease ${i * 0.1}s infinite`,
                }}
              >
                {ch}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-brand-text-muted)",
              marginTop: 10,
            }}
          >
            Sequential bounce, 0.1s stagger
          </div>
        </div>
      </div>

      {/* ── 7. Shapes & Radius ────────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {RADIUS_TOKENS.map((r) => (
          <div
            key={r.label}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: 12,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 8px",
                background: "#121213",
                borderRadius: r.value.startsWith("9999") ? 9999 : parseInt(r.value),
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tech Stack ───────────────────────────────────────── */}
      <div id="tech-stack" />
      <SectionLabel>Production Tech Stack</SectionLabel>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.6 }}>
        Infrastructure inventory extracted from live nytimes.com/crosswords source (commit {TECH_STACK.build.commit}, Mar 2026).
      </p>

      {/* Build */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Build &amp; Assets
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          {[
            { label: "Commit", value: TECH_STACK.build.commit },
            { label: "Page", value: TECH_STACK.build.pageName },
            { label: "Source App", value: TECH_STACK.build.sourceApp },
            { label: "CSS Chunks", value: String(TECH_STACK.build.cssChunks.length) },
            { label: "JS Chunks", value: String(TECH_STACK.build.jsChunks) },
            { label: "Cache Safe", value: String(TECH_STACK.build.cacheSafe) },
          ].map((item) => (
            <div key={item.label} style={{ background: "var(--dd-paper-cool)", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 13, color: "var(--dd-ink-black)", fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Analytics &amp; Monitoring
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[
            { service: "GTM", detail: TECH_STACK.analytics.gtm.map((g) => g.id).join(", ") },
            { service: "Datadog RUM", detail: `App: ${TECH_STACK.analytics.datadogRum.applicationId.slice(0, 8)}...` },
            { service: "Sentry", detail: `Env: ${TECH_STACK.analytics.sentry.environment}, Rate: ${TECH_STACK.analytics.sentry.sampleRate}` },
            { service: "Chartbeat Video", detail: "Enabled" },
            { service: "ComScore", detail: `ID: ${TECH_STACK.analytics.comscore.id}` },
            { service: "Brand Metrics", detail: `Site: ${TECH_STACK.analytics.brandMetrics.siteId.slice(0, 8)}...` },
            { service: "Iterate HQ", detail: "User feedback surveys" },
          ].map((item) => (
            <div key={item.service} style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 12, fontWeight: 700, color: "var(--dd-ink-black)" }}>{item.service}</div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginTop: 2 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ads */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Advertising Stack
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          {[
            { label: "Framework", value: TECH_STACK.ads.framework },
            { label: "Prebid", value: `v${TECH_STACK.ads.prebid.version} (${TECH_STACK.ads.prebid.bidders.length} bidders)` },
            { label: "Amazon A9", value: `Pub: ${TECH_STACK.ads.amazon.pubId}` },
            { label: "MediaNet", value: `CID: ${TECH_STACK.ads.mediaNet.cid}` },
            { label: "GeoEdge", value: "Ad quality monitoring" },
            { label: "Positions", value: TECH_STACK.ads.positions.join(", ") },
          ].map((item) => (
            <div key={item.label} style={{ background: "var(--dd-paper-cool)", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-ink-black)", fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Privacy &amp; Consent
        </div>
        <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 8, padding: 16 }}>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-ink-black)", marginBottom: 8 }}>
            <strong>PURR Cookie</strong> &mdash; {TECH_STACK.privacy.purrCookie}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TECH_STACK.privacy.directives.map((d) => (
              <span key={d} style={{ fontSize: 10, fontFamily: "var(--dd-font-mono)", background: "var(--dd-paper-cool)", borderRadius: 4, padding: "3px 8px", color: "var(--dd-ink-soft)" }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Feature Flags &amp; Experimentation
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 12, fontWeight: 700, color: "var(--dd-ink-black)" }}>Statsig</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginTop: 2 }}>Tier: {TECH_STACK.featureFlags.statsig.tier}</div>
          </div>
          <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 12, fontWeight: 700, color: "var(--dd-ink-black)" }}>Abra</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginTop: 2 }}>v{TECH_STACK.featureFlags.abra.version} — client-side A/B</div>
          </div>
          <div style={{ background: "var(--dd-paper-white)", border: "1px solid var(--dd-paper-grey)", borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 12, fontWeight: 700, color: "var(--dd-ink-black)" }}>Samizdat GraphQL</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-light)", marginTop: 2 }}>{TECH_STACK.data.samizdat.appType}</div>
          </div>
        </div>
      </div>

      {/* ── A/B Tests ─────────────────────────────────────────── */}
      <div id="ab-tests" />
      <SectionLabel>Active A/B Tests</SectionLabel>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 16, lineHeight: 1.6 }}>
        Categorized experiments from the Abra config (v{TECH_STACK.featureFlags.abra.version}). These control dark mode rollout, game features, paywall behavior, and ad placement.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {(Object.entries(AB_TESTS) as [string, { description: string; tests: readonly { key: string; scope: string }[] }][]).map(
          ([category, data]) => (
            <div
              key={category}
              style={{
                background: "var(--dd-paper-white)",
                border: "1px solid var(--dd-paper-grey)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "var(--dd-ink-black)", marginBottom: 4, textTransform: "capitalize" }}>
                {category.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-light)", marginBottom: 10 }}>
                {data.description}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {data.tests.map((t) => (
                  <div key={t.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "var(--dd-ink-soft)", wordBreak: "break-all" as const }}>{t.key}</span>
                    <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 9, color: "var(--dd-ink-light)", whiteSpace: "nowrap" as const, textAlign: "right" as const, flexShrink: 0 }}>{t.scope}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
