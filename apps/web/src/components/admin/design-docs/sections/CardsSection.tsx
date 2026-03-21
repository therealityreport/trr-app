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

/* ---------- Card specimens ---------- */

function DataDarkCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "linear-gradient(160deg, #0a1628 0%, #142040 100%)",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* mini SVG island with saffron dots */}
      <svg
        viewBox="0 0 120 80"
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 120,
          height: 80,
          opacity: 0.7,
        }}
      >
        <path
          d="M10 70 Q30 20 60 45 T110 15"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <circle cx="25" cy="52" r="3" fill="var(--dd-accent-saffron)" />
        <circle cx="55" cy="38" r="3" fill="var(--dd-accent-saffron)" />
        <circle cx="80" cy="28" r="3" fill="var(--dd-accent-saffron)" />
        <circle cx="105" cy="18" r="3" fill="var(--dd-accent-saffron)" />
      </svg>

      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-accent-saffron)",
          marginBottom: 8,
        }}
      >
        DATA VISUALIZATION
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}
      >
        Cuba Is Going Dark
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 13,
          color: "rgba(255,255,255,0.65)",
          lineHeight: 1.5,
        }}
      >
        Satellite imagery reveals a nation losing power, one province at a time.
      </div>
    </div>
  );
}

function OpinionCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "var(--dd-paper-white)",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        border: "1px solid var(--dd-paper-grey)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-viz-blue)",
          marginBottom: 12,
        }}
      >
        OPINION
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          marginBottom: 20,
          maxWidth: 220,
        }}
      >
        &lsquo;It Feels Like There&rsquo;s No Jobs&rsquo;
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--dd-paper-grey)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BreakingNewsCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "var(--dd-ink-dark)",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "#FFFFFF",
          background: "var(--dd-viz-red)",
          border: "1.5px solid var(--dd-viz-red-dark)",
          borderRadius: "var(--dd-radius-xs)",
          padding: "3px 8px",
          marginBottom: 12,
        }}
      >
        BREAKING
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 20,
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
        }}
      >
        Judge Rules Pentagon Restrictions Unconstitutional
      </div>
    </div>
  );
}

function AnalysisCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "var(--dd-paper-white)",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        border: "1px solid var(--dd-paper-grey)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "var(--dd-ink-soft)",
          border: "1.5px solid var(--dd-paper-mid)",
          borderRadius: "var(--dd-radius-xs)",
          padding: "3px 8px",
          marginBottom: 12,
        }}
      >
        ANALYSIS
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 20,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          marginBottom: 8,
        }}
      >
        Why Trump Keeps Saying &lsquo;Nuclear&rsquo;
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 13,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.5,
        }}
      >
        A linguistic analysis of recurring rhetorical patterns in presidential
        addresses and press briefings.
      </div>
    </div>
  );
}

/* ---------- Badge specimens ---------- */

const BADGES: {
  label: string;
  color: string;
  borderColor: string;
  bg?: string;
}[] = [
  { label: "Analysis", color: "var(--dd-ink-soft)", borderColor: "var(--dd-paper-mid)" },
  { label: "Opinion", color: "var(--dd-viz-blue)", borderColor: "var(--dd-viz-blue)" },
  {
    label: "Live",
    color: "#FFFFFF",
    borderColor: "var(--dd-viz-red)",
    bg: "var(--dd-viz-red)",
  },
  { label: "Data", color: "var(--dd-viz-teal)", borderColor: "var(--dd-viz-teal)" },
  { label: "Interview", color: "var(--dd-viz-purple)", borderColor: "var(--dd-viz-purple)" },
  { label: "Cooking", color: "var(--dd-viz-orange)", borderColor: "var(--dd-viz-orange)" },
  { label: "Travel", color: "var(--dd-viz-green)", borderColor: "var(--dd-viz-green)" },
  { label: "Culture", color: "var(--dd-ink-medium)", borderColor: "var(--dd-ink-medium)" },
];

export default function CardsSection() {
  return (
    <div>
      <div className="dd-section-label">Cards &amp; Social</div>
      <h2 className="dd-section-title">Card &amp; Social Formats</h2>
      <p className="dd-section-desc">
        Instagram-style editorial cards designed for social sharing and content
        discovery. Each format carries a distinct visual voice while sharing
        common proportions and typographic hierarchy.
      </p>

      {/* Card grid */}
      <SectionLabel>Card Specimens</SectionLabel>
      <div
        className="mb-12"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <DataDarkCard />
        <OpinionCard />
        <BreakingNewsCard />
        <AnalysisCard />
      </div>

      {/* Badge system */}
      <SectionLabel>Badge System</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.55,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Category badges use 10px uppercase Franklin Gothic with 1.5px borders
        and 0.08em letter-spacing. Color encodes content type; only &ldquo;Live&rdquo;
        fills its background.
      </p>
      <div className="flex flex-wrap gap-3 mb-8">
        {BADGES.map((b) => (
          <span
            key={b.label}
            style={{
              display: "inline-block",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: b.color,
              border: `1.5px solid ${b.borderColor}`,
              borderRadius: "var(--dd-radius-xs)",
              padding: "3px 10px",
              background: b.bg ?? "transparent",
            }}
          >
            {b.label}
          </span>
        ))}
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        All cards: aspect-ratio 4/5 &bull; rounded-md &bull; overflow-hidden &bull;
        relative positioning
      </div>
    </div>
  );
}
