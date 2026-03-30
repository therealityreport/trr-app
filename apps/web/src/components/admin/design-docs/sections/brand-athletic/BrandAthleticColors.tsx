"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Colors                                            */
/*  Complete color system from NFL fourth-down article                  */
/* ------------------------------------------------------------------ */

function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h3
      id={id}
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid var(--dd-brand-accent)",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--dd-brand-text-primary)",
        marginBottom: 8,
        marginTop: 20,
      }}
    >
      {children}
    </div>
  );
}

function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

interface SwatchProps {
  name: string;
  hex: string;
  meta?: string;
}

function Swatch({ name, hex, meta }: SwatchProps) {
  const isRgba = hex.startsWith("rgba");
  const displayHex = hex;
  const bgColor = hex;
  const lum = isRgba ? 0.5 : relativeLuminance(hex);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: bgColor,
          border: lum < 0.05 && !isRgba ? "1px solid #e5e5e5" : "1px solid #e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lum > 0.4 || isRgba ? "#121212" : "#fff",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 8,
          flexShrink: 0,
        }}
      >
        {!isRgba ? hex : ""}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
          }}
        >
          {displayHex}
        </div>
        {meta && (
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-brand-text-muted)",
            }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

function SwatchGrid({ swatches }: { swatches: SwatchProps[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {swatches.map((s) => (
        <Swatch key={s.name + s.hex} {...s} />
      ))}
    </div>
  );
}

/* ── Color Data ─────────────────────────────────────────────────────── */

const PAGE_COLORS: SwatchProps[] = [
  { name: "primaryText", hex: "#121212", meta: "h1, h2, h3, body, byline" },
  { name: "secondaryText", hex: "#323232", meta: "showcase excerpt, description" },
  { name: "tertiaryText", hex: "#52524F", meta: "DW headers, image credit" },
  { name: "mutedText", hex: "#969693", meta: "ad slug (--Gray60)" },
  { name: "pureBlack", hex: "#000000", meta: "puzzle title, SVG fills" },
  { name: "background", hex: "#FFFFFF", meta: "page bg, table cells" },
  { name: "linkBlue", hex: "#386C92", meta: "body links, author bio" },
];

const HEADER_COLORS: SwatchProps[] = [
  { name: "background", hex: "#121212", meta: "dark nav bar bg" },
  { name: "primaryText", hex: "#FFFFFF", meta: "SVG wordmark, league labels" },
  { name: "secondaryText", hex: "#DBDBD9", meta: "nav link text" },
  { name: "dividerBorder", hex: "#52524F", meta: "vertical nav divider" },
];

const FOOTER_COLORS: SwatchProps[] = [
  { name: "background", hex: "#121212", meta: "footer bg (same as header)" },
  { name: "sectionHeader", hex: "#F0F0EE", meta: "FooterSectionHeader" },
  { name: "linkText", hex: "#C4C4C0", meta: "FooterLink" },
];

const DARK_MODE_COLORS: SwatchProps[] = [
  { name: "background", hex: "#121212", meta: "native mobile dark" },
  { name: "primaryText", hex: "#F0F0EE", meta: "text on dark bg" },
  { name: "secondaryText", hex: "#C4C4C0", meta: "excerpt on dark bg" },
];

const BORDER_COLORS: SwatchProps[] = [
  { name: "showcaseDivider", hex: "rgba(150, 150, 147, 0.4)", meta: "showcase border-top/bottom" },
  { name: "tableBorder", hex: "#C2C2C0", meta: "DW th/td border, storyline" },
  { name: "contentDivider", hex: "#E8E5E0", meta: "general section dividers" },
];

const CHART_PALETTE: SwatchProps[] = [
  { name: "gold", hex: "#FDBA58", meta: "warm gold accent" },
  { name: "gray", hex: "#CCCCCC", meta: "neutral secondary data" },
  { name: "teal", hex: "#409797", meta: "heatmap mid-tone" },
  { name: "darkTeal", hex: "#002728", meta: "deepest heatmap value" },
  { name: "warmOrange", hex: "#F89A1E", meta: "heatmap warm mid-tone" },
  { name: "deepOrange", hex: "#904406", meta: "heatmap floor / worst" },
];

/* Heatmap gradient stops */
const HEATMAP_GRADIENT = ["#904406", "#BD6910", "#F89A1E", "#FBC46D", "#98E9E7", "#409797", "#136060", "#002728"];

/* Per-row heatmap colors */
const HEATMAP_EXACT: { label: string; bg: string; fg: string }[] = [
  { label: "+18.1%", bg: "#002728", fg: "#FFFFFF" },
  { label: "+16.9%", bg: "#023334", fg: "#FFFFFF" },
  { label: "+14.7%", bg: "#0A4C4C", fg: "#FFFFFF" },
  { label: "+12.9%", bg: "#136060", fg: "#FFFFFF" },
  { label: "+11.9%", bg: "#1D6B6B", fg: "#FFFFFF" },
  { label: "+9.6%", bg: "#318383", fg: "#FFFFFF" },
  { label: "+6.9%", bg: "#4FA4A4", fg: "#FFFFFF" },
  { label: "+1.9%", bg: "#ADE4D7", fg: "#121212" },
  { label: "-0.6%", bg: "#DED4A0", fg: "#121212" },
  { label: "-4.8%", bg: "#FBBC5F", fg: "#121212" },
  { label: "-13.1%", bg: "#E08618", fg: "#FFFFFF" },
  { label: "-19.1%", bg: "#B15F0D", fg: "#FFFFFF" },
  { label: "-23.1%", bg: "#974A07", fg: "#FFFFFF" },
  { label: "-24.2%", bg: "#904406", fg: "#FFFFFF" },
];

/* CSS Variables — 18-step gray system + semantic + brand */
const CSS_GRAYS: { name: string; hex: string; meta: string }[] = [
  { name: "Gray10", hex: "#FFFFFF", meta: "page bg, icons" },
  { name: "Gray15", hex: "#FAFAFA", meta: "" },
  { name: "Gray20", hex: "#F7F7F4", meta: "ad bg (--adBackground)" },
  { name: "Gray25", hex: "#FBFBFB", meta: "" },
  { name: "Gray30", hex: "#F0F0EE", meta: "skeleton, borders, footer header" },
  { name: "Gray31", hex: "#F2F2F2", meta: "" },
  { name: "Gray32", hex: "#E2E2E2", meta: "" },
  { name: "Gray33", hex: "#333333", meta: "" },
  { name: "Gray34", hex: "#DADADA", meta: "" },
  { name: "Gray35", hex: "#DBDBD9", meta: "nav secondary text" },
  { name: "Gray40", hex: "#C4C4C0", meta: "footer link text" },
  { name: "Gray45", hex: "#969693", meta: "ad slug / muted text" },
  { name: "Gray49", hex: "#706B66", meta: "" },
  { name: "Gray50", hex: "#52524F", meta: "tertiary text, DW headers" },
  { name: "Gray60", hex: "#323232", meta: "secondary text" },
  { name: "Gray62", hex: "#2B2B2B", meta: "" },
  { name: "Gray63", hex: "#262627", meta: "" },
  { name: "Gray65", hex: "#1A1A1A", meta: "" },
  { name: "Gray70", hex: "#121212", meta: "primary text (body color)" },
  { name: "Gray78", hex: "#181818", meta: "" },
  { name: "Gray80", hex: "#000000", meta: "pure black" },
];

const CSS_SEMANTIC: SwatchProps[] = [
  { name: "errorDark", hex: "#CB3939", meta: "--error-dark" },
  { name: "errorMain", hex: "#F24A4A", meta: "--error-main / --primary-main" },
  { name: "primaryLight", hex: "#EAB4B0", meta: "--primary-light" },
  { name: "secondaryMain", hex: "#012F6C", meta: "--secondary-main" },
  { name: "link", hex: "#386C92", meta: "--Link: body text links" },
];

const CSS_BRAND: SwatchProps[] = [
  { name: "maroon", hex: "#943848", meta: "--Maroon" },
  { name: "red", hex: "#CB3939", meta: "--Red" },
  { name: "chalkRed", hex: "#B72424", meta: "--chalkRed" },
  { name: "orange", hex: "#E95F33", meta: "--Orange" },
  { name: "darkOrange", hex: "#C04300", meta: "--DarkOrange" },
  { name: "yellow", hex: "#F89A1E", meta: "--Yellow (heatmap mid)" },
  { name: "lightYellow", hex: "#FEF0DD", meta: "--LightYellow" },
  { name: "brightGreen", hex: "#4EAB75", meta: "--BrightGreen" },
  { name: "green", hex: "#3C5634", meta: "--Green" },
  { name: "turquoise", hex: "#105E5E", meta: "--Turqoise" },
  { name: "royal", hex: "#497AB8", meta: "--Royal" },
  { name: "navy", hex: "#1C3C64", meta: "--Navy" },
  { name: "blue", hex: "#225FA7", meta: "--Blue / --Blue10" },
  { name: "green10", hex: "#026A2E", meta: "--Green10" },
  { name: "red10", hex: "#B72424", meta: "--Red10" },
  { name: "purple", hex: "#403C5C", meta: "--Purple" },
];

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticColors() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="dd-brand-card"
        style={{
          padding: "32px 40px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 32,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Colors
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Complete color system from the NFL fourth-down article &mdash; the most extensive color config of any Athletic article
        </div>
      </div>

      {/* ── Page Colors ────────────────────────────────── */}
      <SectionLabel id="page-colors">Page Colors</SectionLabel>
      <SwatchGrid swatches={PAGE_COLORS} />

      {/* ── Header Colors ──────────────────────────────── */}
      <SectionLabel id="header-colors">Header &amp; Navigation</SectionLabel>
      <SwatchGrid swatches={HEADER_COLORS} />

      {/* ── Footer Colors ──────────────────────────────── */}
      <SectionLabel id="footer-colors">Footer</SectionLabel>
      <SwatchGrid swatches={FOOTER_COLORS} />

      {/* ── Dark Mode ──────────────────────────────────── */}
      <SectionLabel id="dark-mode">Dark Mode (Native Mobile)</SectionLabel>
      <SwatchGrid swatches={DARK_MODE_COLORS} />

      {/* ── Borders & Dividers ─────────────────────────── */}
      <SectionLabel id="borders">Borders &amp; Dividers</SectionLabel>
      <SwatchGrid swatches={BORDER_COLORS} />

      {/* ── Datawrapper Heatmap ────────────────────────── */}
      <SectionLabel id="heatmap">Datawrapper Heatmap Gradient</SectionLabel>
      <SubSectionLabel>8-Stop Continuous Gradient (xGC+ column)</SubSectionLabel>
      <div
        style={{
          height: 48,
          borderRadius: 8,
          background: `linear-gradient(to right, ${HEATMAP_GRADIENT.join(", ")})`,
          marginBottom: 8,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        {HEATMAP_GRADIENT.map((c) => (
          <span
            key={c}
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
            }}
          >
            {c}
          </span>
        ))}
      </div>

      <SubSectionLabel>Per-Row Computed Heatmap Colors (14 exact values)</SubSectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {HEATMAP_EXACT.map((row) => (
          <div
            key={row.label}
            style={{
              background: row.bg,
              borderRadius: 6,
              padding: "10px 12px",
              textAlign: "center",
              border: "1px solid #e5e5e5",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 16,
                color: row.fg,
                marginBottom: 4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: row.fg,
                opacity: 0.7,
              }}
            >
              {row.bg}
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart Palette ──────────────────────────────── */}
      <SectionLabel id="chart-palette">Chart Accent Palette</SectionLabel>
      <SwatchGrid swatches={CHART_PALETTE} />

      {/* ── CSS Variables: Gray System ─────────────────── */}
      <SectionLabel id="gray-system">CSS Variables: 18-Step Gray System</SectionLabel>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 12,
        }}
      >
        {CSS_GRAYS.map((g) => {
          const lum = relativeLuminance(g.hex);
          return (
            <div
              key={g.name}
              style={{
                width: 56,
                height: 56,
                borderRadius: 4,
                background: g.hex,
                border: lum > 0.9 ? "1px solid #e5e5e5" : lum < 0.05 ? "1px solid #e5e5e5" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 8,
                  fontWeight: 600,
                  color: lum > 0.4 ? "#121212" : "#FFFFFF",
                }}
              >
                {g.name.replace("Gray", "")}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          overflowX: "auto",
          marginBottom: 40,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {["Variable", "Hex", "Usage"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-brand-text-muted)",
                    borderBottom: "1px solid var(--dd-brand-border-subtle)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CSS_GRAYS.map((g) => (
              <tr key={g.name}>
                <td style={{ padding: "4px 10px", borderBottom: "1px solid #E8E5E0", color: "var(--dd-ink-black)", fontWeight: 600 }}>
                  --{g.name}
                </td>
                <td style={{ padding: "4px 10px", borderBottom: "1px solid #E8E5E0", color: "var(--dd-ink-soft)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        background: g.hex,
                        border: relativeLuminance(g.hex) > 0.9 ? "1px solid #ccc" : "none",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {g.hex}
                  </span>
                </td>
                <td style={{ padding: "4px 10px", borderBottom: "1px solid #E8E5E0", color: "var(--dd-brand-text-muted)" }}>
                  {g.meta || "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CSS Variables: Semantic Colors ─────────────── */}
      <SectionLabel id="semantic-colors">Semantic Colors</SectionLabel>
      <SwatchGrid swatches={CSS_SEMANTIC} />

      {/* ── CSS Variables: Brand Colors ────────────────── */}
      <SectionLabel id="brand-colors">Brand Colors</SectionLabel>
      <SwatchGrid swatches={CSS_BRAND} />
    </div>
  );
}
