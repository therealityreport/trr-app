"use client";

import { FLASHBACK } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Flashback — Weekly timeline ordering puzzle from The Upshot        */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const TIMELINE_CARDS = [
  { year: "1969", event: "Moon Landing" },
  { year: "1973", event: "Watergate" },
  { year: "1986", event: "Challenger" },
  { year: "1989", event: "Berlin Wall" },
  { year: "1997", event: "Dolly Cloned" },
  { year: "2001", event: "Wikipedia" },
  { year: "2008", event: "iPhone" },
  { year: "2020", event: "Pandemic" },
] as const;

export default function GameFlashback({ SectionLabel }: GameSectionProps) {
  return (
    <section
      style={{
        borderLeft: `4px solid ${FLASHBACK.sectionColor}`,
        paddingLeft: 24,
        marginBottom: 48,
      }}
    >
      <SectionLabel>Flashback</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 6px",
        }}
      >
        Weekly puzzle from The Upshot — drag 8 historical events into
        chronological order.
      </p>

      {/* ── Palette strip ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["Cream", FLASHBACK.cream],
            ["Terracotta", FLASHBACK.terracotta],
            ["Rust", FLASHBACK.rust],
            ["Beige", FLASHBACK.beige],
          ] as const
        ).map(([name, hex]) => (
          <div key={name} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 6,
                background: hex,
                border: "1px solid var(--dd-ink-faint)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                color: "var(--dd-ink-light)",
              }}
            >
              {hex}
            </span>
          </div>
        ))}
      </div>

      {/* ── Timeline card mockup ── */}
      <div
        style={{
          background: FLASHBACK.cream,
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
        }}
      >
        {TIMELINE_CARDS.map((card, i) => (
          <div
            key={i}
            style={{
              width: 110,
              padding: "14px 10px",
              borderRadius: 8,
              background: `linear-gradient(165deg, ${FLASHBACK.cream}, #f3efeb, ${FLASHBACK.beige})`,
              border: `1.5px solid ${FLASHBACK.rust}`,
              textAlign: "center",
              cursor: "grab",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-slab)",
                fontSize: 18,
                fontWeight: 700,
                color: FLASHBACK.terracotta,
                marginBottom: 4,
              }}
            >
              {card.year}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.3,
              }}
            >
              {card.event}
            </div>
          </div>
        ))}
      </div>

      {/* ── Format note ── */}
      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          marginTop: 10,
        }}
      >
        Format: Weekly puzzle &middot; 8 draggable cards &middot; The Upshot
      </p>
    </section>
  );
}
