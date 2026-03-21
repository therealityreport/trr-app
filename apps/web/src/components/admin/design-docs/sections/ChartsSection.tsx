"use client";

/* ------------------------------------------------------------------ */
/*  Charts Section — Bar, Line, Donut, Stat Cards, Data Table         */
/* ------------------------------------------------------------------ */

const BAR_DATA = [
  { label: "WWII", value: 97, highlight: false },
  { label: "Afghanistan", value: 92, highlight: false },
  { label: "Gulf War", value: 82, highlight: false },
  { label: "Iraq", value: 76, highlight: false },
  { label: "Kosovo", value: 58, highlight: false },
  { label: "Iran War", value: 41, highlight: true },
] as const;

const STAT_CARDS = [
  { number: "$3.70", unit: "/gal", delta: "+27%", label: "Avg. gas price", color: "var(--dd-viz-red)" },
  { number: "41%", unit: "", delta: "", label: "Approval rating", color: "var(--dd-viz-blue)" },
  { number: "2.1M", unit: "", delta: "+18%", label: "Displaced persons", color: "var(--dd-viz-orange)" },
  { number: "1.48", unit: "\u00B0C", delta: "", label: "Temp. anomaly", color: "var(--dd-viz-red)" },
] as const;

const TABLE_DATA = [
  { state: "Texas", pop: "+1.8%", income: "$67,321", hpi: "218", risk: "High" },
  { state: "Florida", pop: "+1.6%", income: "$61,777", hpi: "245", risk: "Very High" },
  { state: "Arizona", pop: "+1.4%", income: "$62,055", hpi: "230", risk: "High" },
  { state: "California", pop: "-0.3%", income: "$84,907", hpi: "310", risk: "Extreme" },
  { state: "New York", pop: "-0.9%", income: "$75,910", hpi: "268", risk: "Moderate" },
] as const;

/* ── Donut helpers ───────────────────────────────── */
interface DonutSlice {
  label: string;
  pct: number;
  color: string;
}

const DONUT_DATA: DonutSlice[] = [
  { label: "Social Security", pct: 30, color: "var(--dd-viz-blue)" },
  { label: "Health", pct: 20, color: "var(--dd-viz-red)" },
  { label: "Defense", pct: 15, color: "var(--dd-viz-orange)" },
  { label: "Interest", pct: 12.5, color: "var(--dd-viz-teal)" },
  { label: "Other", pct: 22.5, color: "var(--dd-ink-faint)" },
];

function donutPaths(slices: DonutSlice[], cx: number, cy: number, r: number, inner: number) {
  const paths: { d: string; color: string }[] = [];
  let cumAngle = -90; // start at top
  for (const s of slices) {
    const sweep = (s.pct / 100) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + sweep) * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + inner * Math.cos(endRad);
    const iy1 = cy + inner * Math.sin(endRad);
    const ix2 = cx + inner * Math.cos(startRad);
    const iy2 = cy + inner * Math.sin(startRad);

    paths.push({
      d: [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${inner} ${inner} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        `Z`,
      ].join(" "),
      color: s.color,
    });
    cumAngle += sweep;
  }
  return paths;
}

/* ── Line chart point generators ─────────────────── */
const LINE_YEARS = [2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026];
const WAGES =       [100,  108,  114,  120,  128,  134,  140,  148,  155];
const HOME_PRICES = [100,  108,  118,  130,  145,  170,  210,  260,  295];

function toSvgCoords(
  values: readonly number[],
  xMin: number, xMax: number,
  yMin: number, yMax: number,
  plotX: number, plotW: number,
  plotY: number, plotH: number,
) {
  return values.map((v, i) => {
    const x = plotX + (i / (values.length - 1)) * plotW;
    const y = plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    return `${x},${y}`;
  });
}

function riskColor(risk: string) {
  switch (risk) {
    case "Extreme": return "var(--dd-viz-red-dark)";
    case "Very High": return "var(--dd-viz-red)";
    case "High": return "var(--dd-viz-orange)";
    case "Moderate": return "var(--dd-viz-blue)";
    default: return "var(--dd-ink-faint)";
  }
}

export default function ChartsSection() {
  const donut = donutPaths(DONUT_DATA, 120, 120, 100, 60);
  const plotX = 60, plotW = 440, plotY = 20, plotH = 220;
  const wagesPoints = toSvgCoords(WAGES, 100, 300, 100, 300, plotX, plotW, plotY, plotH);
  const pricesPoints = toSvgCoords(HOME_PRICES, 100, 300, 100, 300, plotX, plotW, plotY, plotH);

  return (
    <div>
      <div className="dd-section-label">Charts</div>
      <h2 className="dd-section-title">Data Visualization</h2>
      <p className="dd-section-desc">
        Every chart earns its palette from the data it carries. Annotation-first
        design foregrounds context and uses color only where it encodes meaning.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* ── Horizontal Bar Chart ──────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">
            Public Support for Military Interventions
          </div>
          <div className="dd-chart-subhead">
            Peak public approval (%) in first month of operations
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {BAR_DATA.map((d) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 90,
                    textAlign: "right",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--dd-ink-medium)",
                    flexShrink: 0,
                  }}
                >
                  {d.label}
                </div>
                <div style={{ flex: 1, position: "relative", height: 24 }}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${d.value}%`,
                      background: d.highlight ? "var(--dd-viz-red)" : "var(--dd-viz-blue)",
                      borderRadius: "var(--dd-radius-xs)",
                      transition: "width 0.6s ease-out",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: `${100 - d.value + 1}%`,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--dd-paper-white)",
                      paddingRight: 6,
                    }}
                  >
                    {d.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="dd-chart-source">Source: Gallup Historical Polls</div>
        </div>

        {/* ── Line Chart ───────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">
            Median Home Price Has Decoupled from Wages
          </div>
          <div className="dd-chart-subhead">
            Indexed to 100 in 2010
          </div>

          <svg viewBox="0 0 520 280" style={{ width: "100%", height: "auto" }}>
            {/* Grid lines */}
            {[100, 150, 200, 250, 300].map((v) => {
              const y = plotY + plotH - ((v - 100) / 200) * plotH;
              return (
                <g key={v}>
                  <line x1={plotX} y1={y} x2={plotX + plotW} y2={y} className="dd-grid-line" />
                  <text x={plotX - 8} y={y + 4} className="dd-axis-label" textAnchor="end">
                    {v}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {LINE_YEARS.map((yr, i) => {
              const x = plotX + (i / (LINE_YEARS.length - 1)) * plotW;
              return (
                <text key={yr} x={x} y={plotY + plotH + 18} className="dd-axis-label" textAnchor="middle">
                  {yr}
                </text>
              );
            })}

            {/* Wages line */}
            <polyline
              points={wagesPoints.join(" ")}
              fill="none"
              stroke="#999"
              strokeWidth={2}
            />

            {/* Home prices line */}
            <polyline
              points={pricesPoints.join(" ")}
              fill="none"
              stroke="var(--dd-viz-red)"
              strokeWidth={2.5}
            />

            {/* Endpoint labels */}
            <text
              x={plotX + plotW + 6}
              y={Number(wagesPoints[wagesPoints.length - 1].split(",")[1])}
              className="dd-data-label"
              style={{ fill: "#999" }}
            >
              Wages
            </text>
            <text
              x={plotX + plotW + 6}
              y={Number(pricesPoints[pricesPoints.length - 1].split(",")[1])}
              className="dd-data-label"
              style={{ fill: "var(--dd-viz-red)" }}
            >
              Home Price
            </text>

            {/* 2020 annotation */}
            {(() => {
              const idx = LINE_YEARS.indexOf(2020);
              const x = plotX + (idx / (LINE_YEARS.length - 1)) * plotW;
              return (
                <g>
                  <line x1={x} y1={plotY} x2={x} y2={plotY + plotH} stroke="var(--dd-ink-faint)" strokeWidth={1} strokeDasharray="4 3" />
                  <text x={x + 4} y={plotY + 12} className="dd-annotation">
                    Gap widens dramatically
                  </text>
                </g>
              );
            })()}
          </svg>
          <div className="dd-chart-source">Source: Census Bureau, BLS</div>
        </div>

        {/* ── Donut Chart ──────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">Federal Budget Allocation</div>
          <div className="dd-chart-subhead">FY 2025 estimated spending by category</div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--dd-space-xl)", flexWrap: "wrap" }}>
            <svg viewBox="0 0 240 240" style={{ width: 200, height: 200, flexShrink: 0 }}>
              {donut.map((p, i) => (
                <path key={i} d={p.d} fill={p.color} />
              ))}
              <text
                x={120}
                y={114}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontSize: 20,
                  fontWeight: 700,
                  fill: "var(--dd-ink-black)",
                }}
              >
                $6.8T
              </text>
              <text
                x={120}
                y={134}
                textAnchor="middle"
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  fill: "var(--dd-ink-faint)",
                  textTransform: "uppercase" as never,
                }}
              >
                TOTAL
              </text>
            </svg>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {DONUT_DATA.map((d) => (
                <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "var(--dd-radius-xs)",
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      color: "var(--dd-ink-medium)",
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 11,
                      color: "var(--dd-ink-faint)",
                      marginLeft: "auto",
                    }}
                  >
                    {d.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="dd-chart-source">Source: CBO Budget Projections</div>
        </div>

        {/* ── Data Table ───────────────────────────────── */}
        <div className="dd-chart-card">
          <div className="dd-chart-headline">State-Level Economic Snapshot</div>
          <div className="dd-chart-subhead">Key indicators for top-growth and top-decline states</div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["State", "Pop. Change", "Median Income", "Home Price Idx", "Climate Risk"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          borderBottom: "2px solid var(--dd-ink-black)",
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.06em",
                          color: "var(--dd-ink-medium)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {TABLE_DATA.map((row, i) => (
                  <tr key={row.state}>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontWeight: 600,
                        color: "var(--dd-ink-black)",
                      }}
                    >
                      {row.state}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        color: row.pop.startsWith("-")
                          ? "var(--dd-viz-red)"
                          : "var(--dd-viz-green)",
                        fontWeight: 600,
                        fontFamily: "var(--dd-font-mono)",
                      }}
                    >
                      {row.pop}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontFamily: "var(--dd-font-mono)",
                        color: "var(--dd-ink-medium)",
                      }}
                    >
                      {row.income}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                        fontFamily: "var(--dd-font-mono)",
                        color: "var(--dd-ink-medium)",
                      }}
                    >
                      {row.hpi}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: "1px solid var(--dd-paper-cool)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--dd-radius-sm)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--dd-paper-white)",
                          background: riskColor(row.risk),
                        }}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dd-chart-source">Source: Census Bureau, FEMA Risk Index</div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="dd-palette-label">Stat Cards</div>
      <div className="dd-stat-grid">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="dd-stat-card">
            <div className="dd-stat-number">
              {s.number}
              <span style={{ fontSize: 18, fontWeight: 400 }}>{s.unit}</span>
            </div>
            {s.delta && (
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: s.color,
                  marginTop: 4,
                }}
              >
                {s.delta}
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                marginTop: 6,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
