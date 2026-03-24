"use client";

/* ------------------------------------------------------------------ */
/*  App Styles Section — 5 design contexts for TRR apps               */
/* ------------------------------------------------------------------ */

interface StyleVariant {
  id: string;
  title: string;
  subtitle: string;
  accentColor: string;
  accentVar: string;
  trrUse: string;
  personality: string;
  typography: string[];
  colors: string[];
  radius: string;
  spacing: string;
  interaction: string;
  grid: string;
}

const STYLE_VARIANTS: StyleVariant[] = [
  {
    id: "editorial",
    title: "Editorial & News",
    subtitle: "Articles, news feeds, story pages, longform content",
    accentColor: "var(--dd-ink-black)",
    accentVar: "#121212",
    trrUse: "Articles, news feeds, story pages, longform content",
    personality: "Authoritative, restrained, typography-driven",
    typography: [
      "Cheltenham Bold headlines: 28\u201342px, -0.02em",
      "Gloucester body: 17px, 1.7 line-height, 640px max",
      "Franklin Gothic data labels",
    ],
    colors: [
      "BG: #FFFFFF | Text: #121212",
      "Borders: 1px #E8E5E0",
      "Color: minimal \u2014 data highlights only",
    ],
    radius: "0\u20134px \u2014 sharp, editorial",
    spacing: "Generous: 64\u201396px sections, 24\u201332px gaps",
    interaction: "Slow: 0.6s color transitions, subtle hover underlines",
    grid: "Single column: 600 body / 900 wide / 1200 full-bleed",
  },
  {
    id: "data",
    title: "Data & Analytics",
    subtitle: "Screenalytics dashboards, admin data views, survey analytics",
    accentColor: "var(--dd-viz-blue)",
    accentVar: "#4A90D9",
    trrUse: "Screenalytics dashboards, admin data views, survey analytics",
    personality: "Dense, functional, information-first",
    typography: [
      "Franklin Gothic everything: 600wt 20px headlines",
      "Labels: 11px uppercase, 0.12em tracking",
      "Values: tabular-nums, Cheltenham page titles only",
    ],
    colors: [
      "BG: #FAFAFA (Zinc-50)",
      "Dense viz palette: blue, red, green, orange, teal",
      "Stat cards: 3px black top border",
    ],
    radius: "2\u20136px \u2014 slightly soft, still sharp",
    spacing: "Tight: 16\u201324px gaps, 8\u201312px within cards",
    interaction: "Snappy: 0.1\u20130.2s ease-in-out, hover tooltips",
    grid: "Multi-column: 2\u20134 cols, auto-fit minmax, stat grids 4-up",
  },
  {
    id: "games",
    title: "Games & Interactive",
    subtitle: "Realitease, Bravodle, Flashback, RealTime",
    accentColor: "var(--dd-viz-purple)",
    accentVar: "#7B5EA7",
    trrUse: "Realitease, Bravodle, Flashback, RealTime",
    personality: "Playful, responsive, tactile",
    typography: [
      "Hamburg Serial UI: 500wt body, 700 bold actions",
      "Stymie Bold game titles: 28px",
      "Franklin Gothic scores/stats",
    ],
    colors: [
      "BG: warm (#E8E0D0 Flashback, white Realitease)",
      "Purple #6B6BA0, green #4A9E6F, red #D4564A",
      "Gold confirms: #D4A843",
    ],
    radius: "8\u201316px \u2014 soft, friendly, pills for buttons",
    spacing: "Moderate: 16\u201324px gaps, 4\u20136px tile grids",
    interaction: "Bouncy: cubic-bezier(0.34,1.56,0.64,1), 620ms flips",
    grid: "Square grids: 5\u00d76, 4\u00d74. Centered. Modal results.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle & Content",
    subtitle: "Show profiles, cast pages, recipes, lifestyle content",
    accentColor: "var(--dd-accent-saffron)",
    accentVar: "#F6CB2F",
    trrUse: "Show profiles, cast pages, recipes, lifestyle content",
    personality: "Warm, inviting, image-forward",
    typography: [
      "Cheltenham section headers: 28px, 700",
      "Gloucester descriptions: 16px, 1.55 line-height",
      "Hamburg Serial meta/tags: 12px, 500",
    ],
    colors: [
      "BG: warm white #F8F8F5 or pure white",
      "Saffron #F6CB2F accents, deep red #B81D22",
      "Warm grays over cool grays",
    ],
    radius: "4\u20138px \u2014 comfortable, pills for badges",
    spacing: "Generous: 32\u201348px sections, 24px card padding",
    interaction: "Smooth: 0.2\u20130.3s ease, hover scale 1.02 + shadow",
    grid: "Image grids: 3\u20134 cols, hero + grid, card layouts",
  },
  {
    id: "immersive",
    title: "Interactive & Immersive",
    subtitle: "Data stories, scrollytelling, year-in-review, investigations",
    accentColor: "var(--dd-viz-red)",
    accentVar: "#D04040",
    trrUse: "Data stories, scrollytelling, year-in-review, investigations",
    personality: "Cinematic, full-bleed, narrative-driven",
    typography: [
      "Cheltenham Ultra 900wt hero: 48\u201372px, -0.025em",
      "Gloucester narrative: 18px, 1.6 line-height",
      "Franklin Gothic annotations: 12\u201313px italic",
    ],
    colors: [
      "BG: dark #121212, #0a1628 immersive",
      "White text, saffron #F6CB2F highlights",
      "Strategic single-color accent per story",
    ],
    radius: "0px \u2014 razor sharp, no rounding on full-bleed",
    spacing: "Dramatic: 96px+ sections, 340px floating text",
    interaction: "Scroll-driven: IntersectionObserver, sticky, 0.6s ease",
    grid: "Full-width: sticky graphic + scrolling text, small multiples",
  },
];

/* ------------------------------------------------------------------ */
/*  Mini-Mockup components for each variant                           */
/* ------------------------------------------------------------------ */

function EditorialMockup() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        padding: 16,
        borderRadius: 2,
        border: "1px solid #E8E5E0",
        height: 140,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Headline */}
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "#121212",
          lineHeight: 1.2,
        }}
      >
        Breaking: Major Development in
        <br />
        Reality Television Landscape
      </div>
      {/* Byline */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#999999",
        }}
      >
        By TRR Staff &middot; 12 min read
      </div>
      {/* Body lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        <div style={{ height: 3, background: "#E8E5E0", width: "100%", borderRadius: 1 }} />
        <div style={{ height: 3, background: "#E8E5E0", width: "92%", borderRadius: 1 }} />
        <div style={{ height: 3, background: "#E8E5E0", width: "96%", borderRadius: 1 }} />
        <div style={{ height: 3, background: "#E8E5E0", width: "88%", borderRadius: 1 }} />
        <div style={{ height: 3, background: "#E8E5E0", width: "70%", borderRadius: 1 }} />
      </div>
      {/* Rule */}
      <div style={{ height: 1, background: "#E8E5E0", width: "100%" }} />
    </div>
  );
}

function DataMockup() {
  return (
    <div
      style={{
        background: "#FAFAFA",
        padding: 12,
        borderRadius: 4,
        height: 140,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Stat row */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { label: "VIEWERS", value: "2.4M", color: "#4A90D9" },
          { label: "RATING", value: "1.82", color: "#D04040" },
          { label: "SHARE", value: "8.2%", color: "#5B9E5B" },
          { label: "DVR+7", value: "+42%", color: "#E8913A" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: "#FFFFFF",
              borderTop: `3px solid ${s.color}`,
              borderRadius: 2,
              padding: "6px 4px 4px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 7,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#999999",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "#121212",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
      {/* Mini chart bars */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 3, padding: "0 4px" }}>
        {[65, 42, 78, 55, 90, 48, 72, 60, 85, 38, 68, 52].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: i === 4 ? "#4A90D9" : "#DCE8F0",
              borderRadius: "1px 1px 0 0",
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function GamesMockup() {
  return (
    <div
      style={{
        background: "#F7F5F0",
        padding: 12,
        borderRadius: 12,
        height: 140,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Game title */}
      <div
        style={{
          fontFamily: "var(--dd-font-slab)",
          fontSize: 13,
          fontWeight: 700,
          color: "#121212",
          letterSpacing: "0.02em",
        }}
      >
        REALITEASE
      </div>
      {/* Tile grid 5x2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 3,
          width: "100%",
          maxWidth: 160,
        }}
      >
        {[
          { bg: "#4A9E6F", letter: "B" },
          { bg: "#4A9E6F", letter: "R" },
          { bg: "#F6CB2F", letter: "A" },
          { bg: "#4A9E6F", letter: "V" },
          { bg: "#4A9E6F", letter: "O" },
          { bg: "#D4564A", letter: "H" },
          { bg: "#6B6BA0", letter: "E" },
          { bg: "#4A9E6F", letter: "A" },
          { bg: "#D4564A", letter: "R" },
          { bg: "#F6CB2F", letter: "T" },
        ].map((t, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              background: t.bg,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-ui)",
              fontSize: 11,
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            {t.letter}
          </div>
        ))}
      </div>
      {/* Action button */}
      <div
        style={{
          background: "#6B6BA0",
          color: "#FFFFFF",
          fontFamily: "var(--dd-font-ui)",
          fontSize: 9,
          fontWeight: 700,
          padding: "4px 20px",
          borderRadius: 9999,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Submit Guess
      </div>
    </div>
  );
}

function LifestyleMockup() {
  return (
    <div
      style={{
        background: "#F8F8F5",
        padding: 12,
        borderRadius: 8,
        height: 140,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Hero image placeholder */}
      <div
        style={{
          height: 48,
          background: "linear-gradient(135deg, #E8E0D0 0%, #D5D2CC 100%)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 11,
            fontWeight: 700,
            color: "#121212",
            opacity: 0.6,
          }}
        >
          SHOW PROFILE
        </div>
        {/* Saffron accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 12,
            width: 40,
            height: 3,
            background: "#F6CB2F",
            borderRadius: "2px 2px 0 0",
          }}
        />
      </div>
      {/* Card row */}
      <div style={{ display: "flex", gap: 6, flex: 1 }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              flex: 1,
              background: "#FFFFFF",
              borderRadius: 6,
              border: "1px solid #E8E5E0",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div
              style={{
                height: 24,
                background: n === 1 ? "#E8D8C8" : n === 2 ? "#D8C8B8" : "#C8B8A8",
                borderRadius: 4,
              }}
            />
            <div style={{ height: 2, background: "#E8E5E0", width: "80%", borderRadius: 1 }} />
            <div style={{ height: 2, background: "#E8E5E0", width: "60%", borderRadius: 1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ImmersiveMockup() {
  return (
    <div
      style={{
        background: "#121212",
        padding: 12,
        borderRadius: 0,
        height: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Full-bleed background shape */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(180deg, #0a1628 0%, #121212 100%)",
        }}
      />
      {/* Annotation line */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 16,
          width: 60,
          height: 1,
          borderTop: "1px dashed #F6CB2F",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          fontFamily: "var(--dd-font-sans)",
          fontSize: 7,
          fontStyle: "italic",
          color: "#F6CB2F",
        }}
      >
        annotation
      </div>
      {/* Hero text */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 18,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            marginBottom: 8,
          }}
        >
          The Year Reality
          <br />
          TV Changed
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 9,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.5,
            maxWidth: 180,
          }}
        >
          A scrollytelling investigation into how one season transformed an industry.
        </div>
        {/* Saffron highlight bar */}
        <div
          style={{
            width: 40,
            height: 2,
            background: "#F6CB2F",
            marginTop: 8,
          }}
        />
      </div>
      {/* Floating data bar */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 12,
          display: "flex",
          gap: 8,
          zIndex: 1,
        }}
      >
        {["52%", "3.1M", "+18"].map((v, i) => (
          <div
            key={i}
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 9,
              fontWeight: 700,
              color: i === 0 ? "#F6CB2F" : "rgba(255,255,255,0.5)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

const MOCKUP_MAP: Record<string, () => React.JSX.Element> = {
  editorial: EditorialMockup,
  data: DataMockup,
  games: GamesMockup,
  lifestyle: LifestyleMockup,
  immersive: ImmersiveMockup,
};

/* ------------------------------------------------------------------ */
/*  Spec Row helper                                                   */
/* ------------------------------------------------------------------ */

function SpecRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.5,
          }}
        >
          {v}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single variant card                                               */
/* ------------------------------------------------------------------ */

function VariantCard({ variant }: { variant: StyleVariant }) {
  const Mockup = MOCKUP_MAP[variant.id];
  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        border: "1px solid var(--dd-paper-grey)",
        borderRadius: "var(--dd-radius-sm)",
        overflow: "hidden",
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 3, background: variant.accentColor }} />

      <div style={{ padding: "var(--dd-space-lg)" }}>
        {/* Header */}
        <div style={{ marginBottom: "var(--dd-space-md)" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              lineHeight: 1.2,
              marginBottom: 4,
            }}
          >
            {variant.title}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              color: "var(--dd-ink-soft)",
            }}
          >
            {variant.subtitle}
          </div>
        </div>

        {/* Personality tag */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: variant.accentVar,
            background:
              variant.id === "immersive"
                ? "rgba(208,64,64,0.08)"
                : variant.id === "editorial"
                  ? "rgba(18,18,18,0.06)"
                  : variant.id === "data"
                    ? "rgba(74,144,217,0.08)"
                    : variant.id === "games"
                      ? "rgba(123,94,167,0.08)"
                      : "rgba(246,203,47,0.15)",
            padding: "3px 10px",
            borderRadius: 9999,
            display: "inline-block",
            marginBottom: "var(--dd-space-md)",
          }}
        >
          {variant.personality}
        </div>

        {/* Mini mockup */}
        <div style={{ marginBottom: "var(--dd-space-lg)" }}>
          {Mockup && <Mockup />}
        </div>

        {/* Specs grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 var(--dd-space-lg)",
          }}
        >
          <SpecRow label="Typography" values={variant.typography} />
          <SpecRow label="Colors" values={variant.colors} />
          <SpecRow label="Radius" values={[variant.radius]} />
          <SpecRow label="Spacing" values={[variant.spacing]} />
          <SpecRow label="Interaction" values={[variant.interaction]} />
          <SpecRow label="Grid" values={[variant.grid]} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function AppStylesSection() {
  return (
    <div>
      <div className="dd-section-label">App Design Contexts</div>
      <h2 className="dd-section-title">App Styles</h2>
      <p className="dd-section-desc">
        Five abstracted design contexts define how TRR products look and feel.
        Each context prescribes typography, color, radius, spacing, interaction,
        and grid rules &mdash; ensuring visual consistency across the platform
        while allowing each product area its own voice.
      </p>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        style={{ marginBottom: "var(--dd-space-2xl)" }}
      >
        {STYLE_VARIANTS.map((v) => (
          <VariantCard key={v.id} variant={v} />
        ))}
      </div>

      {/* Quick reference table */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--dd-viz-blue)",
          marginBottom: 8,
        }}
      >
        Quick Reference
      </div>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: "var(--dd-radius-sm)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--dd-paper-cool)",
                borderBottom: "1px solid var(--dd-paper-grey)",
              }}
            >
              {["Context", "Primary Font", "Radius", "Density", "Speed", "Layout"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--dd-ink-faint)",
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[
              {
                ctx: "Editorial",
                font: "Cheltenham + Gloucester",
                radius: "0\u20134px",
                density: "Generous",
                speed: "0.6s",
                layout: "Single col",
                accent: "var(--dd-ink-black)",
              },
              {
                ctx: "Data",
                font: "Franklin Gothic",
                radius: "2\u20136px",
                density: "Tight",
                speed: "0.1\u20130.2s",
                layout: "2\u20134 col grid",
                accent: "var(--dd-viz-blue)",
              },
              {
                ctx: "Games",
                font: "Hamburg Serial + Stymie",
                radius: "8\u201316px",
                density: "Moderate",
                speed: "0.6s bounce",
                layout: "Square grids",
                accent: "var(--dd-viz-purple)",
              },
              {
                ctx: "Lifestyle",
                font: "Cheltenham + Hamburg",
                radius: "4\u20138px",
                density: "Generous",
                speed: "0.2\u20130.3s",
                layout: "Image grids",
                accent: "var(--dd-accent-saffron)",
              },
              {
                ctx: "Immersive",
                font: "Cheltenham Ultra",
                radius: "0px",
                density: "Dramatic",
                speed: "0.6s scroll",
                layout: "Full-width sticky",
                accent: "var(--dd-viz-red)",
              },
            ].map((row) => (
              <tr
                key={row.ctx}
                style={{
                  borderBottom: "1px solid var(--dd-paper-grey)",
                }}
              >
                <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: row.accent,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontWeight: 600, color: "var(--dd-ink-black)" }}>
                    {row.ctx}
                  </span>
                </td>
                <td style={{ padding: "8px 12px", color: "var(--dd-ink-medium)" }}>
                  {row.font}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--dd-ink-medium)" }}>
                  {row.radius}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--dd-ink-medium)" }}>
                  {row.density}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--dd-ink-medium)" }}>
                  {row.speed}
                </td>
                <td style={{ padding: "8px 12px", color: "var(--dd-ink-medium)" }}>
                  {row.layout}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
