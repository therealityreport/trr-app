"use client";

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

/* ---------- Breakpoints ---------- */

const BREAKPOINTS = [
  { label: "SM", px: 640 },
  { label: "MD", px: 768 },
  { label: "LG", px: 1024 },
  { label: "XL", px: 1280 },
  { label: "2XL", px: 1536 },
];

const MAX_BP = 1536;

/* ---------- Typography scaling ---------- */

const TYPO_ROWS: {
  element: string;
  mobile: string;
  tablet: string;
  desktop: string;
  font: string;
}[] = [
  { element: "H1 Hero", mobile: "28px", tablet: "36px", desktop: "48px", font: "Cheltenham" },
  { element: "H2 Section", mobile: "22px", tablet: "26px", desktop: "32px", font: "Cheltenham" },
  { element: "H3 Chart", mobile: "18px", tablet: "20px", desktop: "22px", font: "Cheltenham" },
  { element: "Deck", mobile: "15px", tablet: "16px", desktop: "18px", font: "Gloucester" },
  { element: "Body", mobile: "15px", tablet: "16px", desktop: "17px", font: "Gloucester" },
  { element: "Data Labels", mobile: "10px", tablet: "11px", desktop: "12px", font: "Franklin Gothic" },
  { element: "Source Line", mobile: "10px", tablet: "10px", desktop: "11px", font: "Franklin Gothic" },
  { element: "Nav Links", mobile: "13px", tablet: "14px", desktop: "14px", font: "Hamburg Serial" },
];

/* ---------- Grid columns across breakpoints ---------- */

const GRID_ROWS: {
  component: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}[] = [
  { component: "Chart Grid", sm: "1", md: "1", lg: "2", xl: "2" },
  { component: "Stat Cards", sm: "2", md: "3", lg: "4", xl: "4" },
  { component: "IG Cards", sm: "1", md: "2", lg: "3", xl: "4" },
  { component: "Small Multiples", sm: "2", md: "3", lg: "4", xl: "6" },
  { component: "Newsletter Grid", sm: "1", md: "2", lg: "3", xl: "3" },
];

/* ---------- Shared table styles ---------- */

const thStyle: React.CSSProperties = {
  fontFamily: "var(--dd-font-sans)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
  color: "var(--dd-ink-faint)",
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "2px solid var(--dd-ink-black)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  fontFamily: "var(--dd-font-sans)",
  fontSize: 13,
  color: "var(--dd-ink-medium)",
  padding: "8px 12px",
  borderBottom: "1px solid var(--dd-paper-grey)",
  whiteSpace: "nowrap",
};

const tdMonoStyle: React.CSSProperties = {
  ...tdStyle,
  fontFamily: "var(--dd-font-mono)",
  fontSize: 12,
};

export default function ResponsiveSection() {
  return (
    <div>
      <div className="dd-section-label">Responsive</div>
      <h2 className="dd-section-title">Responsive Patterns</h2>
      <p className="dd-section-desc">
        Breakpoint definitions, type scaling rules, and grid column behavior
        that keep editorial layouts readable from phone screens to wide
        desktop monitors.
      </p>

      {/* Breakpoint scale */}
      <SectionLabel>Breakpoint Scale</SectionLabel>
      <div className="mb-12 space-y-3" style={{ maxWidth: 700 }}>
        {BREAKPOINTS.map((bp, i) => {
          const pct = (bp.px / MAX_BP) * 100;
          return (
            <div key={bp.label} className="flex items-center gap-3">
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--dd-ink-soft)",
                  width: 32,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {bp.label}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: "var(--dd-paper-cool)",
                  borderRadius: "var(--dd-radius-sm)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: `var(--dd-seq-${i + 1})`,
                    borderRadius: "var(--dd-radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: i >= 2 ? "#FFFFFF" : "var(--dd-ink-medium)",
                    }}
                  >
                    {bp.px}px
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Typography scaling table */}
      <SectionLabel>Typography Scaling</SectionLabel>
      <div className="mb-12 overflow-x-auto">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 560,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Element</th>
              <th style={thStyle}>Mobile (&lt;768)</th>
              <th style={thStyle}>Tablet</th>
              <th style={thStyle}>Desktop</th>
              <th style={thStyle}>Font</th>
            </tr>
          </thead>
          <tbody>
            {TYPO_ROWS.map((row) => (
              <tr key={row.element}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--dd-ink-black)" }}>
                  {row.element}
                </td>
                <td style={tdMonoStyle}>{row.mobile}</td>
                <td style={tdMonoStyle}>{row.tablet}</td>
                <td style={tdMonoStyle}>{row.desktop}</td>
                <td style={{ ...tdStyle, fontStyle: "italic", color: "var(--dd-ink-faint)" }}>
                  {row.font}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grid columns table */}
      <SectionLabel>Grid Columns by Breakpoint</SectionLabel>
      <div className="mb-8 overflow-x-auto">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 480,
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>Component</th>
              <th style={thStyle}>SM (640)</th>
              <th style={thStyle}>MD (768)</th>
              <th style={thStyle}>LG (1024)</th>
              <th style={thStyle}>XL (1280)</th>
            </tr>
          </thead>
          <tbody>
            {GRID_ROWS.map((row) => (
              <tr key={row.component}>
                <td style={{ ...tdStyle, fontWeight: 600, color: "var(--dd-ink-black)" }}>
                  {row.component}
                </td>
                <td style={tdMonoStyle}>{row.sm}</td>
                <td style={tdMonoStyle}>{row.md}</td>
                <td style={tdMonoStyle}>{row.lg}</td>
                <td style={tdMonoStyle}>{row.xl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
