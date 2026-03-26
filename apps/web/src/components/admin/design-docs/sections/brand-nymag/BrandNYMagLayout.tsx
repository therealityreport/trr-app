"use client";

/* ================================================================
   BrandNYMag — Layout Tab
   Mobile-first responsive, CSS Grid + Flexbox, 3 breakpoints,
   1100px max-width desktop container.
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

const BREAKPOINTS = [
  { width: "375px", name: "Small Mobile", description: "Footer reflow, minor grid adjustments" },
  { width: "420px", name: "Mid Mobile", description: "Lede image crop changes from square to horizontal" },
  { width: "768px", name: "Tablet", description: "Major layout shift: 2-col grids, sidebar appears, nav expands" },
  { width: "1180px", name: "Desktop", description: "Full 3-col layouts, max-width 1100px centered, expanded nav" },
];

export default function BrandNYMagLayout() {
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
      <SectionLabel>Layout</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Layout Architecture
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
        Mobile-first responsive design with three major breakpoints. Desktop
        content is contained at 1100px max-width centered. The homepage uses a
        CSS Grid <code>container-lede-sidebar</code> layout for the main + sidebar
        structure, and flexbox <code>container-rail</code> for section content areas.
        All CSS is inlined in <code>&lt;style&gt;</code> blocks — no external stylesheets.
      </p>

      {/* ── Breakpoints ── */}
      <SectionLabel>Breakpoints</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {BREAKPOINTS.map((b) => (
          <div
            key={b.name}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              padding: "10px 0",
              borderBottom: "1px solid var(--dd-ink-rule)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "#db2800",
                minWidth: 56,
              }}
            >
              {b.width}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                minWidth: 110,
              }}
            >
              {b.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-faint)",
              }}
            >
              {b.description}
            </div>
          </div>
        ))}
      </div>

      {/* ── Grid structure ── */}
      <SectionLabel>Grid Structure</SectionLabel>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 12,
          lineHeight: 1.7,
          color: "var(--dd-ink-dark)",
          background: "var(--dd-paper-grey)",
          padding: 20,
          borderRadius: 8,
          maxWidth: 640,
          whiteSpace: "pre",
          overflowX: "auto",
          marginBottom: 32,
        }}
      >
{`layout-simple                    max-width: 1100px (desktop)
├── .top                         full-width ads + nav
│   ├── ad_static                970×250 / 728×90 / 1400×600
│   ├── customer-alert-banner    conditional user alerts
│   └── global-nav               vertical links + auth
├── .main
│   └── container-lede-sidebar   CSS Grid: 1fr minmax(240px, 24%)
│       ├── .container-lede      nymag-header + lede-container
│       ├── .container-sidebar   nymag-latest-feed (sticky)
│       └── .container-main
│           ├── nymag-well       flex: featured(3) + secondary(1) + primary(1)
│           ├── coverlines       magazine cover + blurbs
│           ├── container-rail   flex: main(auto) + secondary(300px)
│           │   └── most-popular numbered trending list
│           ├── collection-articles_stories   "Stories Readers Liked"
│           └── container-section × 6
│               ├── .header      SVG logo + nav links
│               ├── .lede        50% width — featured article
│               └── .main        50% — feed + secondary + silo
└── .footer                      brand logos, links, social, copyright`}
      </div>

      {/* ── Key CSS patterns ── */}
      <SectionLabel>Key CSS Patterns</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {[
          {
            name: "container-lede-sidebar",
            code: "display: grid; grid-template-columns: 1fr minmax(240px, 24%); grid-column-gap: 20px;",
            note: "Tablet: 20px gap. Desktop: 40px gap, columns 1fr 240px.",
          },
          {
            name: "container-rail",
            code: "display: flex; flex-flow: row nowrap;",
            note: "Main: flex 1 1 auto. Secondary: flex 0 0 300px, margin-left 39px.",
          },
          {
            name: "container-section (lede variant)",
            code: ".container-section-body { display: flex; } .lede { flex: 0 0 auto; width: 50%; margin: 0 40px 0 0; }",
            note: "Section body splits into lede + main on tablet+.",
          },
          {
            name: "Section double-border",
            code: "border-top: 6px solid #000; position: relative; &::before { background: #767676; height: 1px; top: -12px; width: 100%; }",
            note: "Distinctive double-line pattern: thick black + thin gray 12px above.",
          },
          {
            name: "Lede image border",
            code: "border: 1px solid #979797; padding: 20px;",
            note: "Featured article images get a 1px gray border with 20px inset padding.",
          },
        ].map((p) => (
          <div
            key={p.name}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 14,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                marginBottom: 6,
              }}
            >
              .{p.name}
            </div>
            <code
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-dark)",
                display: "block",
                marginBottom: 6,
                wordBreak: "break-all",
              }}
            >
              {p.code}
            </code>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
              }}
            >
              {p.note}
            </div>
          </div>
        ))}
      </div>

      {/* ── Spacing tokens ── */}
      <SectionLabel>Spacing Tokens</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          { value: "10px", usage: "Small gap, nav link padding" },
          { value: "15px", usage: "Feed item padding, nav link margins" },
          { value: "20px", usage: "Standard page margin (mobile), image padding, component gaps" },
          { value: "25px", usage: "Coverlines container padding" },
          { value: "30px", usage: "Desktop section header padding, well margins" },
          { value: "34px", usage: "Tablet page margins" },
          { value: "40px", usage: "Section bottom margins, desktop grid gap, lede margin-right" },
          { value: "50px", usage: "Mobile article bottom margin, lede teaser top space" },
          { value: "1100px", usage: "Desktop max-width (content area)" },
          { value: "1180px", usage: "Desktop breakpoint trigger" },
        ].map((s) => (
          <div
            key={s.value}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 10,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "#db2800",
                marginBottom: 4,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
              }}
            >
              {s.usage}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
