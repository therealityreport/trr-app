"use client";

import { VERTEX } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Vertex — geometric polygon mesh design system component           */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

const COOL_SWATCHES = [
  { name: "Deep Navy", hex: VERTEX.cool.deepNavy },
  { name: "Dark Slate", hex: VERTEX.cool.darkSlate },
  { name: "Deep Teal", hex: VERTEX.cool.deepTeal },
  { name: "Teal", hex: VERTEX.cool.teal },
  { name: "Blue", hex: VERTEX.cool.blue },
] as const;

const WARM_SWATCHES = [
  { name: "Green", hex: VERTEX.warm.green },
  { name: "Red", hex: VERTEX.warm.red },
  { name: "Gold", hex: VERTEX.warm.gold },
  { name: "Orange", hex: VERTEX.warm.orange },
  { name: "Bright Orange", hex: VERTEX.warm.brightOrange },
] as const;

const HIGHLIGHT_SWATCHES = [
  { name: "Bright Gold", hex: VERTEX.highlights.brightGold },
  { name: "Neon Pink", hex: VERTEX.highlights.neonPink },
] as const;

/** Polygon vertices for the CSS mockup (SVG coordinates) */
const POLYGONS = [
  {
    points: "60,10 110,40 100,100 30,90 10,40",
    fill: VERTEX.cool.deepTeal,
  },
  {
    points: "110,40 180,20 190,80 100,100",
    fill: VERTEX.cool.teal,
  },
  {
    points: "100,100 190,80 200,160 120,170 50,150",
    fill: VERTEX.cool.blue,
  },
  {
    points: "30,90 100,100 50,150 10,130",
    fill: VERTEX.cool.darkSlate,
  },
  {
    points: "120,170 200,160 210,220 140,230",
    fill: VERTEX.warm.green,
  },
  {
    points: "50,150 120,170 140,230 60,220 20,180",
    fill: VERTEX.warm.gold,
  },
] as const;

/** Vertex dots — placed at shared corners of polygons */
const DOTS = [
  { cx: 60, cy: 10 },
  { cx: 110, cy: 40 },
  { cx: 180, cy: 20 },
  { cx: 10, cy: 40 },
  { cx: 30, cy: 90 },
  { cx: 100, cy: 100 },
  { cx: 190, cy: 80 },
  { cx: 50, cy: 150 },
  { cx: 120, cy: 170 },
  { cx: 200, cy: 160 },
  { cx: 10, cy: 130 },
  { cx: 20, cy: 180 },
  { cx: 60, cy: 220 },
  { cx: 140, cy: 230 },
  { cx: 210, cy: 220 },
] as const;

function SwatchRow({
  label,
  swatches,
  SectionLabel,
}: {
  label: string;
  swatches: readonly { name: string; hex: string }[];
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        {swatches.map((s) => (
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
    </>
  );
}

export default function GameVertex({ SectionLabel }: GameSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      {/* ── Title ── */}
      <div
        style={{
          borderLeft: `4px solid ${VERTEX.sectionColor}`,
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
          Vertex
        </h3>
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            margin: "4px 0 0",
          }}
        >
          Geometric polygon mesh puzzle
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
          <strong style={{ color: "var(--dd-ink-black)" }}>Status:</strong>{" "}
          Special
        </div>
        <div>
          <strong style={{ color: "var(--dd-ink-black)" }}>Interface:</strong>{" "}
          {VERTEX.layout.interface}
        </div>
      </div>

      {/* ── Color Palettes ── */}
      <SwatchRow label="Cool Palette" swatches={COOL_SWATCHES} SectionLabel={SectionLabel} />
      <SwatchRow label="Warm Palette" swatches={WARM_SWATCHES} SectionLabel={SectionLabel} />
      <SwatchRow label="Highlight Palette" swatches={HIGHLIGHT_SWATCHES} SectionLabel={SectionLabel} />

      {/* ── Polygon Mockup ── */}
      <SectionLabel>Polygon Grid Mockup</SectionLabel>
      <div
        style={{
          backgroundColor: VERTEX.cool.deepNavy,
          borderRadius: 8,
          padding: 16,
          display: "inline-block",
          marginBottom: 24,
        }}
      >
        <svg width={230} height={240} viewBox="0 0 230 240">
          {/* Polygons */}
          {POLYGONS.map((p, i) => (
            <polygon
              key={i}
              points={p.points}
              fill={p.fill}
              stroke={VERTEX.cool.deepNavy}
              strokeWidth={2}
            />
          ))}

          {/* Vertex dots */}
          {DOTS.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={5}
              fill={VERTEX.highlights.brightGold}
              stroke={VERTEX.cool.deepNavy}
              strokeWidth={1.5}
            />
          ))}

          {/* One highlighted dot (neon pink) to show active state */}
          <circle
            cx={100}
            cy={100}
            r={7}
            fill={VERTEX.highlights.neonPink}
            stroke="#fff"
            strokeWidth={2}
          />
        </svg>
      </div>

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
        <li>Polygons: irregular shapes with shared edges, filled with palette colors</li>
        <li>Vertex dots: 10px diameter circles at polygon intersections</li>
        <li>Default dot color: bright gold ({VERTEX.highlights.brightGold})</li>
        <li>Active/selected dot: neon pink ({VERTEX.highlights.neonPink}), 14px diameter, white stroke</li>
        <li>Background: deep navy ({VERTEX.cool.deepNavy})</li>
        <li>Polygon stroke: 2px matching background for gap effect</li>
        <li>Cool palette for top/upper polygons, warm palette for lower regions</li>
      </ul>
    </section>
  );
}
