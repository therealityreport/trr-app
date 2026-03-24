"use client";

/* ------------------------------------------------------------------ */
/*  Maps Section — Point map, Choropleth tile map, Satellite/dark map */
/* ------------------------------------------------------------------ */

/* ── Point map data ─────────────────────────────── */
interface MapPoint {
  x: number;
  y: number;
  label: string;
  type: "base" | "air-defense" | "embassy";
}

const MAP_POINTS: MapPoint[] = [
  { x: 280, y: 130, label: "Al Asad", type: "base" },
  { x: 310, y: 145, label: "Baghdad", type: "embassy" },
  { x: 330, y: 120, label: "Erbil", type: "base" },
  { x: 295, y: 160, label: "Karbala", type: "air-defense" },
  { x: 260, y: 110, label: "Deir ez-Zor", type: "base" },
  { x: 340, y: 155, label: "Sulaymaniyah", type: "air-defense" },
  { x: 250, y: 145, label: "Damascus", type: "embassy" },
  { x: 360, y: 135, label: "Kirkuk", type: "base" },
];

function pointColor(type: MapPoint["type"]) {
  switch (type) {
    case "base": return "var(--dd-viz-red)";
    case "air-defense": return "var(--dd-viz-yellow)";
    case "embassy": return "var(--dd-viz-purple)";
  }
}

const POINT_LEGEND: { type: MapPoint["type"]; label: string }[] = [
  { type: "base", label: "Military bases" },
  { type: "air-defense", label: "Air defense sites" },
  { type: "embassy", label: "Embassies / consulates" },
];

/* ── Tile map data ──────────────────────────────── */
interface TileState {
  abbr: string;
  col: number;
  row: number;
  risk: 1 | 2 | 3 | 4 | 5 | 6;
}

const TILE_STATES: TileState[] = [
  // Row 0
  { abbr: "AK", col: 0, row: 0, risk: 2 },
  { abbr: "ME", col: 10, row: 0, risk: 2 },
  // Row 1
  { abbr: "WI", col: 5, row: 1, risk: 3 },
  { abbr: "VT", col: 9, row: 1, risk: 1 },
  { abbr: "NH", col: 10, row: 1, risk: 1 },
  // Row 2
  { abbr: "WA", col: 0, row: 2, risk: 3 },
  { abbr: "ID", col: 1, row: 2, risk: 2 },
  { abbr: "MT", col: 2, row: 2, risk: 2 },
  { abbr: "ND", col: 3, row: 2, risk: 2 },
  { abbr: "MN", col: 4, row: 2, risk: 3 },
  { abbr: "MI", col: 6, row: 2, risk: 3 },
  { abbr: "NY", col: 9, row: 2, risk: 3 },
  { abbr: "MA", col: 10, row: 2, risk: 2 },
  // Row 3
  { abbr: "OR", col: 0, row: 3, risk: 3 },
  { abbr: "NV", col: 1, row: 3, risk: 4 },
  { abbr: "WY", col: 2, row: 3, risk: 2 },
  { abbr: "SD", col: 3, row: 3, risk: 2 },
  { abbr: "IA", col: 4, row: 3, risk: 3 },
  { abbr: "IL", col: 5, row: 3, risk: 3 },
  { abbr: "IN", col: 6, row: 3, risk: 3 },
  { abbr: "OH", col: 7, row: 3, risk: 3 },
  { abbr: "PA", col: 8, row: 3, risk: 3 },
  { abbr: "NJ", col: 9, row: 3, risk: 3 },
  { abbr: "CT", col: 10, row: 3, risk: 2 },
  // Row 4
  { abbr: "CA", col: 0, row: 4, risk: 6 },
  { abbr: "UT", col: 1, row: 4, risk: 3 },
  { abbr: "CO", col: 2, row: 4, risk: 3 },
  { abbr: "NE", col: 3, row: 4, risk: 3 },
  { abbr: "MO", col: 4, row: 4, risk: 4 },
  { abbr: "KY", col: 5, row: 4, risk: 4 },
  { abbr: "WV", col: 6, row: 4, risk: 3 },
  { abbr: "VA", col: 7, row: 4, risk: 3 },
  { abbr: "MD", col: 8, row: 4, risk: 3 },
  { abbr: "DE", col: 9, row: 4, risk: 3 },
  // Row 5
  { abbr: "AZ", col: 1, row: 5, risk: 5 },
  { abbr: "NM", col: 2, row: 5, risk: 4 },
  { abbr: "KS", col: 3, row: 5, risk: 4 },
  { abbr: "AR", col: 4, row: 5, risk: 4 },
  { abbr: "TN", col: 5, row: 5, risk: 4 },
  { abbr: "NC", col: 6, row: 5, risk: 4 },
  { abbr: "SC", col: 7, row: 5, risk: 4 },
  { abbr: "DC", col: 8, row: 5, risk: 2 },
  // Row 6
  { abbr: "OK", col: 3, row: 6, risk: 5 },
  { abbr: "LA", col: 4, row: 6, risk: 6 },
  { abbr: "MS", col: 5, row: 6, risk: 5 },
  { abbr: "AL", col: 6, row: 6, risk: 5 },
  { abbr: "GA", col: 7, row: 6, risk: 4 },
  // Row 7
  { abbr: "HI", col: 0, row: 7, risk: 4 },
  { abbr: "TX", col: 3, row: 7, risk: 5 },
  { abbr: "FL", col: 7, row: 7, risk: 6 },
];

/* ── Satellite map cities ───────────────────────── */
interface CityDot {
  x: number;
  y: number;
  label: string;
  brightness: "bright" | "dim" | "faint";
}

const SATELLITE_CITIES: CityDot[] = [
  { x: 140, y: 100, label: "Havana", brightness: "bright" },
  { x: 175, y: 115, label: "Matanzas", brightness: "dim" },
  { x: 230, y: 130, label: "Santa Clara", brightness: "dim" },
  { x: 310, y: 140, label: "Camag\u00FCey", brightness: "dim" },
  { x: 410, y: 135, label: "Holgu\u00EDn", brightness: "faint" },
  { x: 440, y: 155, label: "Santiago", brightness: "faint" },
];

function dotBrightness(b: CityDot["brightness"]) {
  switch (b) {
    case "bright": return { r: 6, opacity: 1 };
    case "dim": return { r: 4, opacity: 0.65 };
    case "faint": return { r: 3, opacity: 0.35 };
  }
}

export default function MapsSection() {
  const tileSize = 38;
  const tileGap = 3;
  const tileCols = 11;
  const tileRows = 8;
  const tileW = tileCols * (tileSize + tileGap);
  const tileH = tileRows * (tileSize + tileGap);

  return (
    <div>
      <div className="dd-section-label">Maps</div>
      <h2 className="dd-section-title">Map Visualizations</h2>
      <p className="dd-section-desc">
        Maps anchor geographic stories. Point maps locate events, tile
        choropleths encode state-level data, and dark satellite views show light
        intensity and urban patterns.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* ── Point Map ────────────────────────────────── */}
        <div className="dd-chart-card lg:col-span-2">
          <div className="dd-chart-headline">Sites Struck in Military Operations</div>
          <div className="dd-chart-subhead">
            Simplified illustration of target categories across the region
          </div>

          <svg
            viewBox="0 0 500 280"
            style={{ width: "100%", height: "auto", background: "var(--dd-paper-cool)", borderRadius: "var(--dd-radius-sm)" }}
          >
            {/* Simplified landmass */}
            <path
              d="M160,80 C200,60 260,55 320,70 C380,85 420,100 450,120
                 C460,135 440,170 400,180 C360,190 300,195 260,185
                 C220,175 180,165 160,150 C140,135 145,95 160,80Z"
              fill="var(--dd-paper-grey)"
              stroke="var(--dd-paper-mid)"
              strokeWidth={1}
            />
            {/* Secondary landmass */}
            <path
              d="M200,170 C220,165 250,190 280,200
                 C260,210 230,205 210,195 C195,185 195,175 200,170Z"
              fill="var(--dd-paper-grey)"
              stroke="var(--dd-paper-mid)"
              strokeWidth={1}
            />

            {/* Points */}
            {MAP_POINTS.map((p) => (
              <g key={p.label}>
                <circle cx={p.x} cy={p.y} r={6} fill={pointColor(p.type)} opacity={0.85} />
                <circle cx={p.x} cy={p.y} r={3} fill="var(--dd-paper-white)" opacity={0.6} />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fill: "var(--dd-ink-medium)",
                    fontFamily: "var(--dd-font-sans)",
                  }}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>

          {/* Legend */}
          <div style={{ display: "flex", gap: "var(--dd-space-lg)", marginTop: "var(--dd-space-md)", flexWrap: "wrap" }}>
            {POINT_LEGEND.map((l) => (
              <div key={l.type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "var(--dd-radius-full)",
                    background: pointColor(l.type),
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {l.label}
                </span>
              </div>
            ))}
          </div>
          <div className="dd-chart-source">Source: Illustration only, not real operational data</div>
        </div>

        {/* ── Choropleth Tile Map ──────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">Climate Risk by State</div>
          <div className="dd-chart-subhead">
            FEMA composite risk score mapped to a sequential blue scale
          </div>

          <svg
            viewBox={`0 0 ${tileW + 10} ${tileH + 10}`}
            style={{ width: "100%", height: "auto" }}
          >
            {TILE_STATES.map((s) => {
              const x = s.col * (tileSize + tileGap);
              const y = s.row * (tileSize + tileGap);
              return (
                <g key={s.abbr}>
                  <rect
                    x={x}
                    y={y}
                    width={tileSize}
                    height={tileSize}
                    rx={2}
                    fill={`var(--dd-seq-${s.risk})`}
                  />
                  <text
                    x={x + tileSize / 2}
                    y={y + tileSize / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: s.risk >= 4 ? "var(--dd-paper-white)" : "var(--dd-ink-medium)",
                      fontFamily: "var(--dd-font-sans)",
                    }}
                  >
                    {s.abbr}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Sequential legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: "var(--dd-space-md)" }}>
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginRight: 6,
              }}
            >
              Low
            </span>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <div
                key={level}
                style={{
                  width: 28,
                  height: 12,
                  background: `var(--dd-seq-${level})`,
                  borderRadius: level === 1 ? "3px 0 0 3px" : level === 6 ? "0 3px 3px 0" : 0,
                }}
              />
            ))}
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginLeft: 6,
              }}
            >
              High
            </span>
          </div>
          <div className="dd-chart-source">Source: FEMA National Risk Index</div>
        </div>

        {/* ── Satellite / Dark Map ─────────────────────── */}
        <div className="dd-chart-card" style={{ background: "linear-gradient(180deg, #0a1628 0%, #142040 100%)", border: "none" }}>
          <div className="dd-chart-headline" style={{ color: "var(--dd-paper-cool)" }}>
            Light Intensity Comparison
          </div>
          <div className="dd-chart-subhead" style={{ color: "rgba(255,255,255,0.45)" }}>
            Nighttime radiance across Cuba, illustrating urban energy disparities
          </div>

          <svg viewBox="0 0 500 220" style={{ width: "100%", height: "auto" }}>
            {/* Island outline */}
            <path
              d="M80,120 C100,90 150,75 200,80 C260,85 320,95 380,105
                 C420,112 460,130 470,145 C460,160 430,165 390,162
                 C340,158 280,155 220,150 C170,146 120,140 90,135 C75,130 75,125 80,120Z"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
            />
            {/* Water texture lines */}
            {[60, 90, 180, 200].map((y, i) => (
              <line
                key={i}
                x1={20}
                y1={y}
                x2={480}
                y2={y}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={0.5}
              />
            ))}

            {/* City dots */}
            {SATELLITE_CITIES.map((c) => {
              const { r, opacity } = dotBrightness(c.brightness);
              return (
                <g key={c.label}>
                  {/* Glow */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r * 2.5}
                    fill="var(--dd-accent-saffron)"
                    opacity={opacity * 0.2}
                  />
                  {/* Core */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={r}
                    fill="var(--dd-accent-saffron)"
                    opacity={opacity}
                  />
                  <text
                    x={c.x}
                    y={c.y - r - 6}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      fill: `rgba(255,255,255,${opacity * 0.8})`,
                      fontFamily: "var(--dd-font-sans)",
                    }}
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="dd-chart-source" style={{ color: "rgba(255,255,255,0.3)", borderTopColor: "rgba(255,255,255,0.1)" }}>
            Source: NASA VIIRS Nighttime Lights
          </div>
        </div>
      </div>
    </div>
  );
}
