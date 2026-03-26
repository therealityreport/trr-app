"use client";

/* ================================================================
   BrandNYMag — Colors Tab
   Monochrome base + single brand red + per-vertical accent colors.
   ================================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "#db2800",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

interface SwatchProps {
  name: string;
  hex: string;
}

function relativeLuminance(hex: string): number {
  if (hex.startsWith("rgba")) return 0.5;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function Swatch({ name, hex }: SwatchProps) {
  const lum = relativeLuminance(hex);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: hex,
          border: lum > 0.9 ? "1px solid #D9D9D9" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lum > 0.4 ? "#292929" : "#fff",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 9,
          flexShrink: 0,
        }}
      >
        {hex.length <= 7 ? hex : ""}
      </div>
      <div>
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
          {hex}
        </div>
      </div>
    </div>
  );
}

/* ── Color data ── */

const CORE_COLORS: SwatchProps[] = [
  { name: "NYMag Red (Brand Accent)", hex: "#db2800" },
  { name: "Ink Black", hex: "#111111" },
  { name: "Text Black", hex: "#000000" },
  { name: "Body Dark", hex: "#333333" },
  { name: "Caption Gray", hex: "#4a4a4a" },
  { name: "Mid Gray", hex: "#767676" },
  { name: "Rule Gray", hex: "#979797" },
  { name: "Border Light", hex: "#bdbdbd" },
  { name: "Divider", hex: "#d8d8d8" },
  { name: "Feed Divider", hex: "#e7e7e7" },
  { name: "Light Background", hex: "#f7f7f7" },
  { name: "Ad Background", hex: "#f4f4f4" },
  { name: "White", hex: "#ffffff" },
];

const VERTICAL_COLORS: SwatchProps[] = [
  { name: "Intelligencer Red", hex: "#db2800" },
  { name: "The Cut Gray", hex: "#949494" },
  { name: "The Cut Accent Red", hex: "#d0021b" },
  { name: "Vulture Blue", hex: "#00bcf1" },
  { name: "Strategist Orange", hex: "#f55d1f" },
  { name: "Curbed Blue", hex: "#0147a5" },
  { name: "Grub Street Green", hex: "#acca5b" },
];

const UI_COLORS: SwatchProps[] = [
  { name: "Error Red", hex: "#e26154" },
  { name: "Error Background", hex: "#ffeeea" },
  { name: "Login Blue", hex: "#1f638a" },
  { name: "Login Hover Blue", hex: "#05a7d4" },
  { name: "Facebook Blue", hex: "#2a8cc4" },
  { name: "Vulture Spotlight Yellow", hex: "#ffec14" },
];

export default function BrandNYMagColors() {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-body)",
        color: "var(--dd-ink-black)",
        maxWidth: 960,
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <SectionLabel>Colors</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Brand Palette
      </h2>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 24,
          maxWidth: 640,
        }}
      >
        NYMag uses a restrained monochrome palette — black ink on white paper —
        with a single brand red (<code>#db2800</code>) as the primary accent.
        Each of the six verticals adds its own accent color for rubric underlines,
        tab highlights, link hovers, and &ldquo;more&rdquo; buttons. The grayscale
        is carefully graduated with 8+ stops from <code>#111</code> to <code>#f7f7f7</code>.
      </p>

      {/* ── Core palette ── */}
      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Core Palette
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 32,
        }}
      >
        {CORE_COLORS.map((c) => (
          <Swatch key={c.hex + c.name} {...c} />
        ))}
      </div>

      {/* ── Vertical accent colors ── */}
      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Vertical Accent Colors
      </h3>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 13,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Each vertical&apos;s accent is used in rubric underlines, tab icon fills,
        &ldquo;Visit [vertical]&rdquo; link hovers, and nav separator borders.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 32,
        }}
      >
        {VERTICAL_COLORS.map((c) => (
          <Swatch key={c.hex + c.name} {...c} />
        ))}
      </div>

      {/* ── Vertical accent bar specimen ── */}
      <SectionLabel>Vertical Color Bar</SectionLabel>
      <div
        style={{
          display: "flex",
          borderRadius: 8,
          overflow: "hidden",
          height: 48,
          maxWidth: 560,
          marginBottom: 32,
        }}
      >
        {VERTICAL_COLORS.map((c) => (
          <div
            key={c.hex}
            style={{
              flex: 1,
              background: c.hex,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 8,
                color: relativeLuminance(c.hex) > 0.4 ? "#292929" : "#fff",
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
              }}
            >
              {c.name.split(" ").pop()}
            </span>
          </div>
        ))}
      </div>

      {/* ── UI / utility colors ── */}
      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        UI &amp; Utility Colors
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 32,
        }}
      >
        {UI_COLORS.map((c) => (
          <Swatch key={c.hex + c.name} {...c} />
        ))}
      </div>

      {/* ── Color usage rules ── */}
      <SectionLabel>Usage Rules</SectionLabel>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-ink-rule)",
          borderRadius: 6,
          padding: 16,
        }}
      >
        <ul
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-dark)",
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 20,
          }}
        >
          <li>
            <strong>#db2800</strong> is the only brand color used across all verticals
            (subscribe CTA, promotional spots, NYMag masthead hovers)
          </li>
          <li>
            Each vertical&apos;s accent applies ONLY within that vertical&apos;s
            section — never cross-pollinated
          </li>
          <li>
            Links in body text are <code>color: #000</code> with{" "}
            <code>box-shadow</code> underlines on hover — not{" "}
            <code>text-decoration</code>
          </li>
          <li>
            Section borders use a distinctive double-line pattern:{" "}
            <code>border-top: 6px solid #000</code> plus a 1px{" "}
            <code>#767676</code> rule 12px above (via <code>::before</code>)
          </li>
          <li>
            Background colors are exclusively white (<code>#fff</code>) and
            light gray (<code>#f7f7f7</code> for alerts, <code>#f4f4f4</code>{" "}
            for ad slots)
          </li>
        </ul>
      </div>
    </div>
  );
}
