"use client";

/* ================================================================
   BrandNYMagSection — New York Magazine brand reference
   Classic editorial magazine: Intelligencer, The Cut, Vulture,
   The Strategist, Curbed, Grub Street.
   Built on Vox Media Clay CMS. All CSS inline (no external sheets).
   Uses dd-* CSS variables throughout for design-docs consistency.
   ================================================================ */

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
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
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid var(--dd-brand-accent)",
        paddingLeft: 10,
      }}
    >
      {children}
    </div>
  );
}

function SpecimenMeta({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
        color: "var(--dd-ink-faint)",
        marginTop: 8,
      }}
    >
      {text}
    </div>
  );
}

interface SwatchProps {
  name: string;
  hex: string;
}

function relativeLuminance(hex: string): number {
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
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
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
        }}
      >
        {hex}
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

/* ------------------------------------------------------------------ */
/*  Data Constants                                                     */
/* ------------------------------------------------------------------ */

const NYMAG_COLORS: SwatchProps[] = [
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
  { name: "White", hex: "#ffffff" },
];

const VERTICAL_COLORS: SwatchProps[] = [
  { name: "Intelligencer Red", hex: "#db2800" },
  { name: "The Cut Gray", hex: "#949494" },
  { name: "The Cut Red", hex: "#d0021b" },
  { name: "Vulture Blue", hex: "#00bcf1" },
  { name: "Strategist Orange", hex: "#f55d1f" },
  { name: "Curbed Blue", hex: "#0147a5" },
  { name: "Grub Street Green", hex: "#acca5b" },
];

const UTILITY_COLORS: SwatchProps[] = [
  { name: "Error Red", hex: "#e26154" },
  { name: "Error Background", hex: "#ffeeea" },
  { name: "Login Blue", hex: "#1f638a" },
  { name: "Facebook Blue", hex: "#2a8cc4" },
  { name: "Subscribe Button Shadow", hex: "rgba(0,0,0,0.24)" },
];

interface FontEntry {
  family: string;
  role: string;
  weights: string;
  source: string;
  usedIn: string;
}

const FONTS: FontEntry[] = [
  {
    family: "Egyptienne",
    role: "Headline Serif",
    weights: "Variable (Regular + Italic)",
    source: "fonts.nymag.com — NY_Egyptienne_Legacy_Romans_Variable.woff2",
    usedIn: "Headlines: 50px/.84, 40px/.84, 32px/28px, 30px/30px",
  },
  {
    family: "EgyptienneRubric",
    role: "Rubric / Label Serif",
    weights: "Regular",
    source: "fonts.nymag.com — NY_Egyptienne_Legacy_Rubric.woff2",
    usedIn: "Rubrics: 14px/1, 13px/16px, letter-spacing 1.5px, uppercase",
  },
  {
    family: "egyptienneComBold",
    role: "Condensed Display",
    weights: "Bold",
    source: "fonts.nymag.com — NYEgyptinneCompressed-Bold3.woff2",
    usedIn: "Section headers: 31px/33px, letter-spacing 3.5px, uppercase",
  },
  {
    family: "Miller Display",
    role: "Display Serif",
    weights: "300 (Light), 600 (Semi Bold) + Italics",
    source: "fonts.nymag.com — Miller_Display_*.woff2",
    usedIn: "Feature teasers: 30px/32px, 26px/28px, 25px/27px",
  },
  {
    family: "Miller Text",
    role: "Body Serif",
    weights: "400 (Regular), 700 (Bold) + Italics",
    source: "fonts.nymag.com — Miller_Text_*.woff2",
    usedIn: "Body: 20px/22px, 17px/20px; Nav: 11px/13px, 2px spacing; Bylines: 11px/1.45",
  },
  {
    family: "LibreFranklin",
    role: "Sans-Serif UI",
    weights: "400, 500, 600, 700, 800 + Italics",
    source: "fonts.nymag.com — LibreFranklin-*.woff2",
    usedIn: "Customer alerts, live indicators, subscription UI",
  },
  {
    family: "NY Slab / NY Slab Text",
    role: "Slab Serif Display",
    weights: "Bold 700 + Italic",
    source: "fonts.nymag.com — NY_Slab_*.otf",
    usedIn: "Special display contexts",
  },
];

interface ComponentEntry {
  name: string;
  description: string;
  pattern: string;
}

const COMPONENTS: ComponentEntry[] = [
  {
    name: "Global Nav",
    description: "Top bar with 7 vertical links, Magazine dropdown, auth controls, subscribe CTA",
    pattern: "Responsive: hidden verticals on mobile, full bar desktop. Dropdown with search + columns.",
  },
  {
    name: "Lede Container",
    description: "3-article hero: large center image + 2 side stories with rubrics, headlines, teasers",
    pattern: "Mobile stacked → Tablet 2-col → Desktop 3-col with center hero at 44% width",
  },
  {
    name: "Latest Feed (Tabbed)",
    description: "7-tab feed: Latest News + 6 verticals. Each tab shows date-stamped article links.",
    pattern: "Sticky sidebar on desktop. Mobile: collapsed with expand button. Tab triggers with brand icons.",
  },
  {
    name: "Well Container",
    description: "Featured + secondary + primary article grid. Featured has bordered image, centered text.",
    pattern: "Mobile stacked → Desktop 3-column: featured (flex 3) + secondary (flex 1) + primary (flex 1)",
  },
  {
    name: "Coverlines",
    description: "Magazine cover display with rotated cover image, blurb text, subscribe/read-more CTAs",
    pattern: "Mobile column-reverse → Desktop flex-row. Cover image rotated 5deg with box-shadow.",
  },
  {
    name: "Collection Package",
    description: "Curated article carousel with sponsor, title, teaser, article thumbnails",
    pattern: "Border-top 6px black + 1px gray. Carousel with snap-scrolling on mobile.",
  },
  {
    name: "Most Popular",
    description: "Numbered 1-5 trending article list with counter pseudo-elements",
    pattern: "Counter-reset with Egyptienne numbers (26px). Desktop: single-line overflow ellipsis.",
  },
  {
    name: "Container Section (Brand Block)",
    description: "Per-vertical content block: logo SVG, nav links, lede article, feed, secondary stories",
    pattern: "6 instances on homepage. Lede + main on tablet, lede + well + feature-column on desktop.",
  },
  {
    name: "Promotional Spot",
    description: "Inline banner with dotted-border top/bottom, italic text, CTA link",
    pattern: "Fade transition on show/hide. Background-image dashed border pattern.",
  },
  {
    name: "TV Recap Feed",
    description: "Vulture-specific: show + season/episode with image thumbnails, horizontal scroll",
    pattern: "Mobile: horizontal scroll. Desktop: vertical list with Vulture arrow icons.",
  },
  {
    name: "Customer Alert Banner",
    description: "Conditional user alerts: card expiry, past due, marketing promotions",
    pattern: "3 alert types: error-tout (red bg), warning-tout (gray bg), marketing-tout (serif italic)",
  },
  {
    name: "Nav Dropdown",
    description: "Hamburger menu → full overlay with 8-column navigation, search, social icons",
    pattern: "Mobile: full-viewport overlay. Tablet: 375px bordered dropdown. Desktop: 768px bordered.",
  },
];

interface BreakpointEntry {
  name: string;
  width: string;
  description: string;
}

const BREAKPOINTS: BreakpointEntry[] = [
  { name: "Small Mobile", width: "375px", description: "Minor layout adjustments, footer reflow" },
  { name: "Mid Mobile", width: "420px", description: "Lede image crop changes to horizontal" },
  { name: "Tablet", width: "768px", description: "Major layout shift: 2-col grids, sidebar appears, nav expands" },
  { name: "Desktop", width: "1180px", description: "Full 3-col layouts, max-width 1100px, expanded navigation" },
];

/* ------------------------------------------------------------------ */
/*  Specimen Components                                                */
/* ------------------------------------------------------------------ */

function LedeArticle() {
  return (
    <div
      style={{
        maxWidth: 500,
        border: "1px solid #979797",
        padding: 20,
        background: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 180,
          background: "linear-gradient(135deg, #e7e7e7 0%, #bdbdbd 100%)",
          marginBottom: 10,
        }}
      />
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "EgyptienneRubric, Georgia, serif",
            fontSize: 13,
            letterSpacing: 1.5,
            textTransform: "uppercase" as const,
            boxShadow: "0 2px 0 0 #fff, 0 3px 0 0 #db2800",
            display: "inline-block",
            marginBottom: 10,
          }}
        >
          getting around
        </span>
        <div
          style={{
            fontFamily: "Egyptienne, Georgia, serif",
            fontSize: 40,
            lineHeight: "34px",
            marginBottom: 5,
          }}
        >
          A La Guardia TSA Agent Tells All
        </div>
        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 20,
            lineHeight: 1.1,
            marginBottom: 5,
          }}
        >
          On the shutdown, ICE agents, and making your flight.
        </div>
        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
          }}
        >
          By Clio Chang
        </div>
      </div>
    </div>
  );
}

function FeedItem() {
  return (
    <div
      style={{
        borderBottom: "1px solid #bdbdbd",
        padding: "15px 0",
        maxWidth: 300,
      }}
    >
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: "uppercase" as const,
          color: "#db2800",
          display: "block",
          marginBottom: 3,
        }}
      >
        Mar. 25, 2026
      </span>
      <div
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 17,
          lineHeight: "20px",
          fontWeight: 700,
          display: "inline",
        }}
      >
        Does Either Party Really Want to End the DHS Shutdown?
      </div>{" "}
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 17,
          lineHeight: "20px",
          color: "#767676",
        }}
      >
        In the past 40 days, the two parties have switched sides.
      </span>
    </div>
  );
}

function VerticalBadge({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 4,
        border: `1px solid ${color}`,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 1.8,
          textTransform: "uppercase" as const,
          color: "#111",
        }}
      >
        {name}
      </span>
    </div>
  );
}

function RubricExample() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
      {[
        { text: "early and often", color: "#db2800" },
        { text: "style", color: "#949494" },
        { text: "tv review", color: "#00bcf1" },
        { text: "don't dillydally", color: "#f55d1f" },
        { text: "getting around", color: "#0147a5" },
        { text: "underground gourmet", color: "#acca5b" },
      ].map((r) => (
        <span
          key={r.text}
          style={{
            fontFamily: "EgyptienneRubric, Georgia, serif",
            fontSize: 13,
            letterSpacing: 1.5,
            textTransform: "uppercase" as const,
            boxShadow: `0 2px 0 0 #fff, 0 3px 0 0 ${r.color}`,
            display: "inline-block",
            alignSelf: "flex-start",
          }}
        >
          {r.text}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function BrandNYMagSection() {
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
      {/* ── Brand Header ── */}
      <div style={{ marginBottom: 48 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "Georgia, serif",
              fontSize: 20,
              fontStyle: "italic",
              fontWeight: 700,
            }}
          >
            NY
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 32,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              New York Magazine
            </h1>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                marginTop: 4,
              }}
            >
              nymag.com &middot; Vox Media Clay CMS &middot; Est. 1968
            </div>
          </div>
        </div>
        <p
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 15,
            lineHeight: 1.7,
            color: "var(--dd-ink-dark)",
            maxWidth: 640,
          }}
        >
          New York Magazine obsessively chronicles the ideas, people, and cultural
          events that are forever reshaping our world. The brand encompasses six
          verticals — Intelligencer, The Cut, Vulture, The Strategist, Curbed, and
          Grub Street — each with its own accent color and editorial voice,
          unified by a shared typographic system rooted in Egyptienne, Miller, and
          custom serif fonts.
        </p>
      </div>

      {/* ── Typography ── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Typeface System
      </h2>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--dd-ink-dark)",
          marginBottom: 24,
          maxWidth: 640,
        }}
      >
        NYMag&apos;s type system is deeply editorial — all serif, no sans-serif in
        content. Egyptienne handles headlines and rubric labels, Miller Display
        provides elegant feature teasers, and Miller Text serves as the
        workhorse body and navigation face. LibreFranklin appears only in UI
        chrome (alerts, live badges).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
        {FONTS.map((f) => (
          <div
            key={f.family}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                }}
              >
                {f.family}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-brand-accent)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                }}
              >
                {f.role}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              Weights: {f.weights}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              Used in: {f.usedIn}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                opacity: 0.7,
              }}
            >
              {f.source}
            </div>
          </div>
        ))}
      </div>

      <SectionLabel>Type Scale Specimens</SectionLabel>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          border: "1px solid var(--dd-ink-rule)",
          borderRadius: 8,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <div style={{ fontFamily: "Egyptienne, Georgia, serif", fontSize: 50, lineHeight: 0.84, marginBottom: 20 }}>
          The Stories That Define New York
        </div>
        <SpecimenMeta text="Egyptienne — 50px / .84 line-height — Homepage lede headline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div style={{ fontFamily: "'Miller Display', Georgia, serif", fontSize: 30, lineHeight: "32px", fontWeight: 300, marginBottom: 8 }}>
          A deep dive into the economics of city living
        </div>
        <SpecimenMeta text="Miller Display Light — 30px / 32px — Feature teaser" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div style={{ fontFamily: "'Miller Text', Georgia, serif", fontSize: 20, lineHeight: "22px", marginBottom: 8 }}>
          The New MTA App Maps Your Commute Down to the Train Car
        </div>
        <SpecimenMeta text="Miller Text — 20px / 22px — Feed headline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div style={{ fontFamily: "'Miller Text', Georgia, serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 8 }}>
          By Christopher Bonanos
        </div>
        <SpecimenMeta text="Miller Text — 11px / 1.45 — Byline: uppercase, 2px letter-spacing" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div style={{ fontFamily: "EgyptienneRubric, Georgia, serif", fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" as const, marginBottom: 8 }}>
          <span style={{ boxShadow: "0 2px 0 0 #fff, 0 3px 0 0 #db2800" }}>early and often</span>
        </div>
        <SpecimenMeta text="EgyptienneRubric — 14px / 1 — Rubric with colored underline accent" />
      </div>

      <SectionLabel>Rubric Underlines by Vertical</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
        }}
      >
        Each vertical uses its accent color as a box-shadow underline on rubric labels:
      </p>
      <RubricExample />

      {/* ── Colors ── */}
      <div id="colors" style={{ marginTop: 48 }} />
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
        with a single brand red (#db2800) as the primary accent. Each vertical
        adds its own accent color for rubric underlines, tab highlights, and
        hover states.
      </p>

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
        {NYMAG_COLORS.map((c) => (
          <Swatch key={c.hex + c.name} {...c} />
        ))}
      </div>

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

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Utility Colors
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 8,
          marginBottom: 32,
        }}
      >
        {UTILITY_COLORS.map((c) => (
          <Swatch key={c.hex + c.name} {...c} />
        ))}
      </div>

      {/* ── Components ── */}
      <div id="components" style={{ marginTop: 48 }} />
      <SectionLabel>Components</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Component Catalog
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
        NYMag&apos;s homepage uses Vox Media&apos;s Clay CMS component system.
        Each component is identified by <code>data-uri</code> attributes.
        The homepage assembles 12 distinct component patterns:
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {COMPONENTS.map((c) => (
          <div
            key={c.name}
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
                fontSize: 14,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              {c.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-dark)",
                marginBottom: 6,
              }}
            >
              {c.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              {c.pattern}
            </div>
          </div>
        ))}
      </div>

      {/* ── Component Specimens ── */}
      <SectionLabel>Component Specimens</SectionLabel>

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Lede Article Card
      </h3>
      <LedeArticle />
      <SpecimenMeta text="Lede article: bordered image, centered rubric with colored underline, Egyptienne headline, Miller teasers" />

      <div style={{ height: 32 }} />

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Feed Item
      </h3>
      <FeedItem />
      <SpecimenMeta text="Latest feed item: date rubric, bold headline inline with gray teaser" />

      <div style={{ height: 32 }} />

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Vertical Badges
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <VerticalBadge name="Intelligencer" color="#db2800" />
        <VerticalBadge name="The Cut" color="#949494" />
        <VerticalBadge name="Vulture" color="#00bcf1" />
        <VerticalBadge name="Strategist" color="#f55d1f" />
        <VerticalBadge name="Curbed" color="#0147a5" />
        <VerticalBadge name="Grub Street" color="#acca5b" />
      </div>
      <SpecimenMeta text="Vertical badges: circle indicator + uppercase Miller Text label, per-vertical border color" />

      {/* ── AI Illustrations ── */}
      <div id="ai-illustrations" style={{ marginTop: 48 }} />
      <SectionLabel>AI Illustrations</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-faint)",
        }}
      >
        AI illustration prompts not yet configured for this brand. Add prompts
        to <code>illustration-prompts.json</code> under the &quot;nymag&quot; key.
      </p>

      {/* ── Layout ── */}
      <div id="layout" style={{ marginTop: 48 }} />
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
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Mobile-first responsive design with three breakpoints. Desktop content
        lives inside a 1100px max-width centered container. The homepage uses a
        CSS Grid <code>container-lede-sidebar</code> layout for the main + sidebar
        structure, and flexbox <code>container-rail</code> for section content areas.
      </p>

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Breakpoints
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
        {BREAKPOINTS.map((b) => (
          <div
            key={b.name}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-brand-accent)",
                minWidth: 48,
              }}
            >
              {b.width}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                minWidth: 100,
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

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Grid Structure
      </h3>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--dd-ink-dark)",
          background: "var(--dd-paper-grey)",
          padding: 16,
          borderRadius: 6,
          maxWidth: 600,
          whiteSpace: "pre",
          overflowX: "auto",
          marginBottom: 32,
        }}
      >
{`layout-simple                    max-width: 1100px (desktop)
├── .top                         full-width ads + nav
├── .main
│   └── container-lede-sidebar   CSS Grid: 1fr minmax(240px, 24%)
│       ├── .container-lede      Hero articles
│       ├── .container-sidebar   Latest feed (sticky)
│       └── .container-main      Well + sections
│           ├── nymag-well       flex: featured(3) + secondary(1) + primary(1)
│           ├── container-rail   flex: main(1fr) + secondary(300px)
│           │   └── most-popular
│           └── container-section × 6 (one per vertical)
│               ├── lede (50%)
│               └── main + feature-column
└── .footer`}
      </div>

      {/* ── Shapes ── */}
      <div id="shapes" style={{ marginTop: 48 }} />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        NYMag is deliberately flat and editorial — minimal border-radius use.
        The design relies on borders, dividers, and spacing for structure rather
        than rounded containers.
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        {[
          { radius: 0, label: "0px — Headlines, borders, nav links" },
          { radius: 2, label: "2px — Buttons, dropdown content, subscribe CTA" },
          { radius: 3, label: "3px — Login form inputs" },
          { radius: 6, label: "6px — Article section top borders (solid black)" },
        ].map((r) => (
          <div key={r.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: r.radius,
                border: "2px solid #111",
                background: "#fff",
                margin: "0 auto 8px",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                maxWidth: 120,
              }}
            >
              {r.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Resources ── */}
      <div id="resources" style={{ marginTop: 48 }} />
      <SectionLabel>Resources</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Technical References
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { label: "Homepage", url: "https://nymag.com/", note: "Main entry point" },
          { label: "Intelligencer", url: "https://nymag.com/intelligencer/", note: "Politics, business, tech" },
          { label: "The Cut", url: "https://www.thecut.com/", note: "Style, self, culture, power" },
          { label: "Vulture", url: "https://www.vulture.com/", note: "Entertainment & culture" },
          { label: "The Strategist", url: "https://nymag.com/strategist/", note: "Shopping & product reviews" },
          { label: "Curbed", url: "https://www.curbed.com/", note: "NYC real estate & design" },
          { label: "Grub Street", url: "https://www.grubstreet.com/", note: "NYC food & restaurants" },
          { label: "Font CDN", url: "https://fonts.nymag.com/", note: "Custom webfont hosting" },
          { label: "Image CDN", url: "https://pyxis.nymag.com/", note: "Responsive image service" },
          { label: "Asset CDN", url: "https://assets.nymag.com/", note: "Static assets (icons, favicons)" },
        ].map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                minWidth: 120,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 12,
                color: "var(--dd-brand-accent)",
              }}
            >
              {r.url}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
              }}
            >
              {r.note}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />

      <SectionLabel>Tech Stack</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 48,
        }}
      >
        {[
          { category: "CMS", tools: "Vox Media Clay CMS" },
          { category: "Ads", tools: "Concert Ads (Vox), Amazon A9, DFP" },
          { category: "Analytics", tools: "GTM, Parse.ly, Permutive, comScore" },
          { category: "Auth", tools: "Auth0-based (Zephr paywall)" },
          { category: "Fonts", tools: "Self-hosted (fonts.nymag.com)" },
          { category: "Images", tools: "Pyxis CDN (responsive crops)" },
          { category: "CSS", tools: "All inline <style> blocks (no external)" },
          { category: "Consent", tools: "OneTrust cookie compliance" },
        ].map((t) => (
          <div
            key={t.category}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              {t.category}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-dark)",
              }}
            >
              {t.tools}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
