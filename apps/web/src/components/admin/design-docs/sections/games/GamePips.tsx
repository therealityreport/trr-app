"use client";

import { PIPS } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Pips — Domino constraint placement puzzle                          */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const REGIONS: { color: string; label: string }[] = [
  { color: PIPS.lavender, label: "Lavender" },
  { color: PIPS.mint, label: "Mint" },
  { color: PIPS.peach, label: "Peach" },
  { color: PIPS.butter, label: "Butter" },
];

/** Render pip dots inside a domino half */
function PipDots({ count }: { count: number }) {
  const positions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };
  const pts = positions[count] ?? [];
  return (
    <>
      {pts.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--dd-ink-black)",
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}
    </>
  );
}

/** Single domino tile — vertical orientation */
function Domino({
  top,
  bottom,
  regionColor,
}: {
  top: number;
  bottom: number;
  regionColor: string;
}) {
  const halfStyle: React.CSSProperties = {
    position: "relative",
    width: 44,
    height: 44,
    background: regionColor,
    borderRadius: 4,
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        border: "2px solid var(--dd-ink-faint)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div style={halfStyle}>
        <PipDots count={top} />
      </div>
      <div
        style={{
          height: 1,
          background: "var(--dd-ink-faint)",
        }}
      />
      <div style={halfStyle}>
        <PipDots count={bottom} />
      </div>
    </div>
  );
}

export default function GamePips({ SectionLabel }: GameSectionProps) {
  return (
    <section
      style={{
        borderLeft: `4px solid ${PIPS.sectionColor}`,
        paddingLeft: 24,
        marginBottom: 48,
      }}
    >
      <SectionLabel>Pips</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 6px",
        }}
      >
        Place domino tiles into colored constraint regions on the board.
      </p>

      {/* ── Region palette ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {REGIONS.map((r) => (
          <div key={r.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: r.color,
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                color: "var(--dd-ink-light)",
              }}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Domino specimens ── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Domino top={3} bottom={5} regionColor={PIPS.lavender} />
        <Domino top={1} bottom={4} regionColor={PIPS.mint} />
        <Domino top={6} bottom={2} regionColor={PIPS.peach} />
        <Domino top={2} bottom={3} regionColor={PIPS.butter} />
      </div>

      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          marginTop: 10,
        }}
      >
        Constraint grid &middot; Domino placement &middot; Pastel region colors
      </p>

      {/* ── Full Color System ── */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            marginBottom: 12,
          }}
        >
          Full Color System
        </div>
        {(
          [
            { family: "Purple", colors: [
              { label: "purple", hex: PIPS.purple },
              { label: "darkPurple", hex: PIPS.darkPurple },
              { label: "darkerPurple", hex: PIPS.darkerPurple },
              { label: "lightPurple", hex: PIPS.lightPurple },
              { label: "lighterPurple", hex: PIPS.lighterPurple },
              { label: "softPink", hex: PIPS.softPink },
            ]},
            { family: "Orange", colors: [
              { label: "orange", hex: PIPS.orange },
              { label: "darkOrange", hex: PIPS.darkOrange },
              { label: "lightOrange", hex: PIPS.lightOrange },
            ]},
            { family: "Pink", colors: [
              { label: "pink", hex: PIPS.pink },
              { label: "hotPink", hex: PIPS.hotPink },
              { label: "lightPink", hex: PIPS.lightPink },
            ]},
            { family: "Blue / Teal", colors: [
              { label: "blue", hex: PIPS.blue },
              { label: "darkBlue", hex: PIPS.darkBlue },
              { label: "lightBlue", hex: PIPS.lightBlue },
            ]},
            { family: "Navy", colors: [
              { label: "navy", hex: PIPS.navy },
              { label: "darkNavy", hex: PIPS.darkNavy },
            ]},
            { family: "Green", colors: [
              { label: "green", hex: PIPS.green },
              { label: "darkGreen", hex: PIPS.darkGreen },
            ]},
            { family: "Neutrals", colors: [
              { label: "beige", hex: PIPS.beige },
              { label: "coolGray", hex: PIPS.coolGray },
              { label: "gray", hex: PIPS.gray },
              { label: "brownGray", hex: PIPS.brownGray },
            ]},
          ] as const
        ).map((group) => (
          <div key={group.family} style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--dd-ink-soft)",
                marginBottom: 6,
              }}
            >
              {group.family}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {group.colors.map((c) => (
                <div key={c.label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: c.hex,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 9,
                      color: "var(--dd-ink-light)",
                      marginTop: 3,
                      maxWidth: 48,
                    }}
                  >
                    {c.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 9,
                      color: "var(--dd-ink-light)",
                    }}
                  >
                    {c.hex}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
