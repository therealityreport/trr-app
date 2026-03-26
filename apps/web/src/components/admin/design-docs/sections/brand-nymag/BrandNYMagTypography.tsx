"use client";

/* ================================================================
   BrandNYMag — Typography Tab
   Egyptienne (headline), EgyptienneRubric (labels), Miller Display
   (feature teasers), Miller Text (body/nav), LibreFranklin (UI),
   NY Slab (display), egyptienneComBold (condensed section headers).
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

/* ── Font data ── */

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

export default function BrandNYMagTypography() {
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
        provides elegant feature teasers, and Miller Text serves as the workhorse
        body and navigation face. LibreFranklin appears only in UI chrome (alerts,
        live badges). All fonts are self-hosted on <code>fonts.nymag.com</code>.
      </p>

      {/* ── Font catalog ── */}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
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
                  color: "#db2800",
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

      {/* ── Type scale specimens ── */}
      <SectionLabel>Type Scale Specimens</SectionLabel>
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--dd-ink-rule)",
          borderRadius: 8,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "Egyptienne, Georgia, serif",
            fontSize: 50,
            lineHeight: 0.84,
            marginBottom: 20,
          }}
        >
          The Stories That Define New York
        </div>
        <SpecimenMeta text="Egyptienne — 50px / .84 line-height — Homepage lede headline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "Egyptienne, Georgia, serif",
            fontSize: 40,
            lineHeight: 0.84,
            marginBottom: 8,
          }}
        >
          A La Guardia TSA Agent Tells All
        </div>
        <SpecimenMeta text="Egyptienne — 40px / .84 — Lede headline (long-headline variant)" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "Egyptienne, Georgia, serif",
            fontSize: 32,
            lineHeight: "28px",
            marginBottom: 8,
          }}
        >
          Brooklyn&apos;s Watchtower Buildings Might Become Housing
        </div>
        <SpecimenMeta text="Egyptienne — 32px / 28px — Section lede headline (tablet+)" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Display', Georgia, serif",
            fontSize: 30,
            lineHeight: "32px",
            fontWeight: 300,
            marginBottom: 8,
          }}
        >
          A deep dive into the economics of city living
        </div>
        <SpecimenMeta text="Miller Display Light — 30px / 32px — Feature teaser" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Display', Georgia, serif",
            fontSize: 26,
            lineHeight: "28px",
            fontWeight: 300,
            letterSpacing: -0.25,
            marginBottom: 8,
          }}
        >
          Who Are the Pierogi Boys?
        </div>
        <SpecimenMeta text="Miller Display — 26px / 28px — Secondary display headline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 20,
            lineHeight: "22px",
            marginBottom: 8,
          }}
        >
          The New MTA App Maps Your Commute Down to the Train Car
        </div>
        <SpecimenMeta text="Miller Text — 20px / 22px — Feed headline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 17,
            lineHeight: "20px",
            marginBottom: 8,
          }}
        >
          <span style={{ fontWeight: 700 }}>
            Does Either Party Really Want to End the DHS Shutdown?
          </span>{" "}
          <span style={{ color: "#767676" }}>
            In the past 40 days, the two parties have switched sides.
          </span>
        </div>
        <SpecimenMeta text="Miller Text — 17px / 20px — Latest feed: bold headline + gray teaser inline" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            marginBottom: 8,
          }}
        >
          By Christopher Bonanos
        </div>
        <SpecimenMeta text="Miller Text — 11px / 1.45 — Byline: uppercase, 2px letter-spacing" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "EgyptienneRubric, Georgia, serif",
            fontSize: 14,
            letterSpacing: 1.4,
            textTransform: "uppercase" as const,
            marginBottom: 8,
          }}
        >
          <span style={{ boxShadow: "0 2px 0 0 #fff, 0 3px 0 0 #db2800" }}>
            early and often
          </span>
        </div>
        <SpecimenMeta text="EgyptienneRubric — 14px / 1 — Rubric with colored underline accent" />

        <div style={{ height: 1, background: "#e7e7e7", margin: "20px 0" }} />

        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 1.8,
            textTransform: "uppercase" as const,
          }}
        >
          Intelligencer &middot; The Cut &middot; Vulture &middot; Strategist
        </div>
        <SpecimenMeta text="Miller Text — 11px / 500wt — Global nav vertical links, 1.8px spacing" />
      </div>

      {/* ── Rubric underlines ── */}
      <SectionLabel>Rubric Underlines by Vertical</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
        }}
      >
        Each vertical uses its accent color as a <code>box-shadow</code> underline
        on rubric labels. The pattern is{" "}
        <code>box-shadow: 0 2px 0 0 #fff, 0 3px 0 0 $color</code>.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300 }}>
        {[
          { text: "early and often", color: "#db2800", vertical: "Intelligencer" },
          { text: "style", color: "#949494", vertical: "The Cut" },
          { text: "tv review", color: "#00bcf1", vertical: "Vulture" },
          { text: "don't dillydally", color: "#f55d1f", vertical: "Strategist" },
          { text: "getting around", color: "#0147a5", vertical: "Curbed" },
          { text: "underground gourmet", color: "#acca5b", vertical: "Grub Street" },
        ].map((r) => (
          <div key={r.text} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "EgyptienneRubric, Georgia, serif",
                fontSize: 13,
                letterSpacing: 1.5,
                textTransform: "uppercase" as const,
                boxShadow: `0 2px 0 0 #fff, 0 3px 0 0 ${r.color}`,
                display: "inline-block",
              }}
            >
              {r.text}
            </span>
            <span
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
              }}
            >
              {r.vertical}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
