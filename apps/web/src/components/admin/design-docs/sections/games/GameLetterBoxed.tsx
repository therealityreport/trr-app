"use client";

import { LETTER_BOXED } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Letter Boxed — square letter-connection design system component    */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const SWATCHES = [
  { name: "Pink Salmon", hex: LETTER_BOXED.pinkSalmon },
  { name: "Button Default", hex: LETTER_BOXED.buttonBlue },
  { name: "Button Hover", hex: LETTER_BOXED.buttonHover },
  { name: "Button Active", hex: LETTER_BOXED.buttonActive },
  { name: "Section Color", hex: LETTER_BOXED.sectionColor },
] as const;

/** 12 letters arranged on sides of a square (3 per side) */
const SIDES: { side: string; letters: string[] }[] = [
  { side: "top", letters: ["R", "A", "M"] },
  { side: "right", letters: ["E", "L", "O"] },
  { side: "bottom", letters: ["T", "N", "I"] },
  { side: "left", letters: ["S", "U", "D"] },
];

export default function GameLetterBoxed({ SectionLabel }: GameSectionProps) {
  const boxSize = 220;
  const pad = 30;

  return (
    <section style={{ marginBottom: 48 }}>
      {/* ── Title ── */}
      <div
        style={{
          borderLeft: `4px solid ${LETTER_BOXED.sectionColor}`,
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
          Letter Boxed
        </h3>
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          Square letter-connection word game
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
          <strong style={{ color: "var(--dd-ink-black)" }}>Interface:</strong>{" "}
          {LETTER_BOXED.layout.interface}
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

      {/* ── Square Mockup ── */}
      <SectionLabel>Square Board Mockup</SectionLabel>
      <div
        style={{
          position: "relative",
          width: boxSize + pad * 2,
          height: boxSize + pad * 2,
          marginBottom: 24,
        }}
      >
        {/* Square border */}
        <div
          style={{
            position: "absolute",
            top: pad,
            left: pad,
            width: boxSize,
            height: boxSize,
            border: "2px solid var(--dd-ink-black)",
            borderRadius: 2,
          }}
        />

        {/* Connection lines (decorative SVG) */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: boxSize + pad * 2,
            height: boxSize + pad * 2,
            pointerEvents: "none",
          }}
        >
          {/* Example connection: R (top-0) -> E (right-0) -> T (bottom-0) */}
          <polyline
            points={`${pad + 36},${pad} ${pad + boxSize},${pad + 36} ${pad + 36},${pad + boxSize}`}
            fill="none"
            stroke={LETTER_BOXED.pinkSalmon}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Top letters */}
        {SIDES[0].letters.map((l, i) => (
          <div
            key={`top-${i}`}
            style={{
              position: "absolute",
              top: pad - 22,
              left: pad + (i + 0.5) * (boxSize / 3) - 10,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
            }}
          >
            {l}
          </div>
        ))}

        {/* Right letters */}
        {SIDES[1].letters.map((l, i) => (
          <div
            key={`right-${i}`}
            style={{
              position: "absolute",
              top: pad + (i + 0.5) * (boxSize / 3) - 10,
              left: pad + boxSize + 6,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
            }}
          >
            {l}
          </div>
        ))}

        {/* Bottom letters */}
        {SIDES[2].letters.map((l, i) => (
          <div
            key={`bottom-${i}`}
            style={{
              position: "absolute",
              top: pad + boxSize + 6,
              left: pad + (i + 0.5) * (boxSize / 3) - 10,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
            }}
          >
            {l}
          </div>
        ))}

        {/* Left letters */}
        {SIDES[3].letters.map((l, i) => (
          <div
            key={`left-${i}`}
            style={{
              position: "absolute",
              top: pad + (i + 0.5) * (boxSize / 3) - 10,
              left: pad - 24,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
            }}
          >
            {l}
          </div>
        ))}
      </div>

      {/* ── Custom Easing ── */}
      <SectionLabel>Custom Easing</SectionLabel>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 13,
          color: "var(--dd-ink-black)",
          backgroundColor: "var(--dd-paper-cool)",
          padding: "10px 14px",
          borderRadius: 4,
          marginBottom: 8,
          display: "inline-block",
        }}
      >
        {LETTER_BOXED.easing}
      </div>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-light)",
          margin: "4px 0 24px",
        }}
      >
        Smooth deceleration curve used for line-drawing and letter-selection
        transitions
      </p>

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
        <li>Square board: 220px, 2px border</li>
        <li>12 letters total, 3 per side</li>
        <li>Connection lines: salmon pink ({LETTER_BOXED.pinkSalmon}), 2.5px stroke</li>
        <li>Letters cannot connect to others on the same side</li>
        <li>Button states: Default → Hover → Active ({LETTER_BOXED.buttonBlue} → {LETTER_BOXED.buttonHover} → {LETTER_BOXED.buttonActive})</li>
      </ul>
    </section>
  );
}
