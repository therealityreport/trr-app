"use client";

/* ------------------------------------------------------------------ */
/*  Tables & Data Section — Editorial, Compact, Ranked, Sparkline      */
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
        color: "var(--dd-viz-blue)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

/* ── Data ─────────────────────────────────────────── */

const EDITORIAL_DATA = [
  { state: "Texas", pop: "30,503,301", income: "$67,321", growth: "+1.8%", risk: "High" },
  { state: "Florida", pop: "22,610,726", income: "$61,777", growth: "+1.6%", risk: "Very High" },
  { state: "Arizona", pop: "7,359,197", income: "$62,055", growth: "+1.4%", risk: "High" },
  { state: "California", pop: "38,965,193", income: "$84,907", growth: "-0.3%", risk: "Moderate" },
  { state: "New York", pop: "19,571,216", income: "$75,910", growth: "-0.9%", risk: "Low" },
] as const;

const COMPACT_DATA = [
  { id: "S-001", show: "Love Island", network: "Peacock", eps: 42, rating: "4.2", status: "Active" },
  { id: "S-002", show: "Below Deck", network: "Bravo", eps: 18, rating: "3.8", status: "Active" },
  { id: "S-003", show: "The Bachelor", network: "ABC", eps: 24, rating: "2.9", status: "Hiatus" },
  { id: "S-004", show: "Survivor", network: "CBS", eps: 14, rating: "5.1", status: "Active" },
  { id: "S-005", show: "Big Brother", network: "CBS", eps: 36, rating: "3.5", status: "Hiatus" },
  { id: "S-006", show: "The Challenge", network: "MTV", eps: 20, rating: "2.7", status: "Active" },
] as const;

const RANKED_DATA = [
  { rank: 1, name: "Lisa Vanderpump", network: "Bravo", appearances: 312, share: "4.8%" },
  { rank: 2, name: "NeNe Leakes", network: "Bravo", appearances: 287, share: "4.2%" },
  { rank: 3, name: "Teresa Giudice", network: "Bravo", appearances: 264, share: "3.9%" },
  { rank: 4, name: "Kim Kardashian", network: "E!", appearances: 251, share: "3.7%" },
  { rank: 5, name: "Bethenny Frankel", network: "Bravo", appearances: 238, share: "3.5%" },
  { rank: 6, name: "Kris Jenner", network: "E!", appearances: 224, share: "3.2%" },
  { rank: 7, name: "Kyle Richards", network: "Bravo", appearances: 210, share: "3.0%" },
  { rank: 8, name: "Erika Jayne", network: "Bravo", appearances: 196, share: "2.8%" },
  { rank: 9, name: "Porsha Williams", network: "Bravo", appearances: 183, share: "2.6%" },
  { rank: 10, name: "Dorinda Medley", network: "Bravo", appearances: 171, share: "2.4%" },
] as const;

const SPARKLINE_DATA = [
  { metric: "Viewers (M)", current: "2.41", change: "+12%", up: true, points: [8, 10, 9, 12, 11, 14, 13, 15] },
  { metric: "Engagement", current: "68.3%", change: "+4.1%", up: true, points: [10, 11, 10, 12, 13, 12, 14, 14] },
  { metric: "Social Mentions", current: "34.2K", change: "-8%", up: false, points: [15, 14, 13, 14, 12, 11, 10, 9] },
  { metric: "Ad Revenue", current: "$1.2M", change: "+22%", up: true, points: [6, 7, 8, 9, 10, 12, 13, 15] },
  { metric: "Churn Rate", current: "3.1%", change: "-1.2%", up: false, points: [14, 13, 12, 13, 11, 10, 9, 8] },
] as const;

/* ── Helpers ──────────────────────────────────────── */

function riskColor(risk: string) {
  switch (risk) {
    case "Very High":
      return "var(--dd-viz-red)";
    case "High":
      return "var(--dd-viz-orange)";
    case "Moderate":
      return "var(--dd-viz-blue)";
    default:
      return "var(--dd-viz-green)";
  }
}

function sparklinePath(points: readonly number[], w: number, h: number): string {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");
}

/* ── Specimens ───────────────────────────────────── */

function EditorialDataTable() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Editorial Data Table
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Clean table with strong header rule, right-aligned numerics, and conditional risk highlighting.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["State", "Population", "Median Income", "Growth", "Risk"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 ? "left" : "right",
                    padding: "10px 12px",
                    borderBottom: "2px solid var(--dd-ink-black)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-medium)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EDITORIAL_DATA.map((row) => (
              <tr
                key={row.state}
                style={{ transition: "background 0.15s" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-body)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {row.state}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-body)",
                    fontSize: 14,
                    color: "var(--dd-ink-medium)",
                    textAlign: "right",
                  }}
                >
                  {row.pop}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-body)",
                    fontSize: 14,
                    color: "var(--dd-ink-medium)",
                    textAlign: "right",
                  }}
                >
                  {row.income}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: row.growth.startsWith("-") ? "var(--dd-viz-red)" : "var(--dd-viz-green)",
                    textAlign: "right",
                  }}
                >
                  {row.growth}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    textAlign: "right",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "var(--dd-radius-sm)",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "var(--dd-font-sans)",
                      color:
                        row.risk === "Very High" || row.risk === "High"
                          ? "var(--dd-paper-white)"
                          : "var(--dd-ink-medium)",
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
    </div>
  );
}

function CompactDashboardTable() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Compact Dashboard Table
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Tighter spacing, alternating row backgrounds, sortable header indicators, and a fixed first column.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                { label: "ID", sortable: false },
                { label: "Show", sortable: true },
                { label: "Network", sortable: true },
                { label: "Episodes", sortable: true },
                { label: "Rating", sortable: true },
                { label: "Status", sortable: false },
              ].map((h) => (
                <th
                  key={h.label}
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-medium)",
                    whiteSpace: "nowrap",
                    cursor: h.sortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {h.label}
                  {h.sortable && (
                    <span style={{ marginLeft: 4, fontSize: 9, color: "var(--dd-ink-faint)" }}>
                      ▲▼
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPACT_DATA.map((row, i) => (
              <tr
                key={row.id}
                style={{
                  background: i % 2 === 0 ? "var(--dd-paper-white)" : "var(--dd-paper-cool)",
                }}
              >
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 11,
                    color: "var(--dd-ink-faint)",
                    fontWeight: 600,
                    position: "sticky",
                    left: 0,
                    background: "inherit",
                  }}
                >
                  {row.id}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {row.show}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    color: "var(--dd-ink-medium)",
                  }}
                >
                  {row.network}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 12,
                    color: "var(--dd-ink-medium)",
                  }}
                >
                  {row.eps}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 12,
                    color: "var(--dd-ink-medium)",
                  }}
                >
                  {row.rating}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      row.status === "Active" ? "var(--dd-viz-green)" : "var(--dd-ink-faint)",
                  }}
                >
                  {row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankedListTable() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Ranked List Table
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Large rank numbers in Cheltenham Bold, saffron accent on top 3, metric columns right-aligned.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["#", "Name", "Network", "Appearances", "Share"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i >= 3 ? "right" : "left",
                    padding: "8px 12px",
                    borderBottom: "2px solid var(--dd-ink-black)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-medium)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RANKED_DATA.map((row) => (
              <tr
                key={row.rank}
                style={{
                  borderLeft: row.rank <= 3 ? "3px solid var(--dd-accent-saffron)" : "3px solid transparent",
                }}
              >
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-headline)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: row.rank <= 3 ? "var(--dd-ink-black)" : "var(--dd-ink-faint)",
                    width: 48,
                  }}
                >
                  {row.rank}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {row.name}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {row.network}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 13,
                    color: "var(--dd-ink-medium)",
                    textAlign: "right",
                  }}
                >
                  {row.appearances}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 13,
                    color: "var(--dd-ink-medium)",
                    textAlign: "right",
                  }}
                >
                  {row.share}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginTop: 8,
          fontStyle: "italic",
        }}
      >
        Source: TRR Internal Analytics, Q1 2026
      </div>
    </div>
  );
}

function SparklineTable() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Table with Inline Sparklines
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Mini SVG sparklines embedded in a table column showing 8-week trend alongside current values.
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Metric", "Current", "Trend", "Change"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i >= 1 && i !== 2 ? "right" : "left",
                    padding: "8px 12px",
                    borderBottom: "2px solid var(--dd-ink-black)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-medium)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPARKLINE_DATA.map((row) => (
              <tr key={row.metric}>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {row.metric}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                    textAlign: "right",
                  }}
                >
                  {row.current}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                  }}
                >
                  <svg
                    width={40}
                    height={16}
                    viewBox="0 0 40 16"
                    style={{ display: "block" }}
                  >
                    <polyline
                      points={sparklinePath(row.points, 40, 16)}
                      fill="none"
                      stroke="var(--dd-viz-blue)"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid var(--dd-paper-grey)",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: row.up ? "var(--dd-viz-green)" : "var(--dd-viz-red)",
                    textAlign: "right",
                  }}
                >
                  {row.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────── */

export default function TablesDataSection() {
  return (
    <div>
      <div className="dd-section-label">Tables</div>
      <h2 className="dd-section-title">Data Table Patterns</h2>
      <p className="dd-section-desc">
        Tables are the editorial backbone of data-driven storytelling. Each
        variant balances information density with readability, using typographic
        hierarchy and restrained color to guide the eye.
      </p>

      <div className="grid grid-cols-1 gap-8" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* Editorial */}
        <SectionLabel>Editorial Data Table</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <EditorialDataTable />
        </div>

        {/* Compact */}
        <SectionLabel>Compact Dashboard Table</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <CompactDashboardTable />
        </div>

        {/* Ranked */}
        <SectionLabel>Ranked List Table</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <RankedListTable />
        </div>

        {/* Sparkline */}
        <SectionLabel>Table with Inline Sparklines</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <SparklineTable />
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        All tables: border-collapse &bull; Franklin Gothic headers 11px &bull; 0.06em tracking &bull;
        hover states on editorial rows &bull; right-align numeric columns
      </div>
    </div>
  );
}
