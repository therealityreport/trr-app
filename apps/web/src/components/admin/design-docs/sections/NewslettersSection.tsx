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

/* ---------- Discovery grid data ---------- */

const NEWSLETTERS = [
  {
    title: "The Daily Brief",
    desc: "Morning headlines and overnight developments.",
    freq: "Daily",
    color: "var(--dd-viz-blue)",
  },
  {
    title: "Data Dispatch",
    desc: "Charts and analysis from the data team.",
    freq: "Weekly",
    color: "var(--dd-viz-teal)",
  },
  {
    title: "Culture Wire",
    desc: "Entertainment, media, and cultural trends.",
    freq: "Weekly",
    color: "var(--dd-viz-purple)",
  },
  {
    title: "Policy Pulse",
    desc: "Legislation tracking and regulatory updates.",
    freq: "Bi-weekly",
    color: "var(--dd-viz-red)",
  },
  {
    title: "Weekend Read",
    desc: "Long-form features and investigative pieces.",
    freq: "Saturday",
    color: "var(--dd-viz-orange)",
  },
];

export default function NewslettersSection() {
  return (
    <div>
      <div className="dd-section-label">Newsletters</div>
      <h2 className="dd-section-title">Newsletter Formats</h2>
      <p className="dd-section-desc">
        Template patterns for recurring newsletter products. Each format owns a
        distinct icon, color accent, and content rhythm while sharing the TRR
        type stack and spacing scale.
      </p>

      {/* The Morning */}
      <SectionLabel>The Morning</SectionLabel>
      <div
        className="mb-10"
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderTop: "4px solid var(--dd-accent-saffron)",
          borderRadius: "0 0 var(--dd-radius-md) var(--dd-radius-md)",
          padding: 24,
          maxWidth: 560,
        }}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-5">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--dd-radius-md)",
              background: "linear-gradient(135deg, var(--dd-accent-saffron), var(--dd-accent-gold))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Clock SVG */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="#FFFFFF" strokeWidth="2" />
              <line x1="14" y1="8" x2="14" y2="14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="14" x2="19" y2="14" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
              }}
            >
              The Morning
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              Daily briefing &middot; 6:00 AM ET
            </div>
          </div>
        </div>

        {/* Hero section */}
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-sm)",
            padding: "16px 18px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "var(--dd-accent-gold)",
              marginBottom: 6,
            }}
          >
            TOP STORY
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              lineHeight: 1.25,
            }}
          >
            Markets Surge on Fed Signal; Nasdaq Hits Record
          </div>
        </div>

        {/* Body text */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.65,
          }}
        >
          Good morning. Wall Street rallied overnight after the Federal Reserve
          signaled a pause in rate adjustments. Here is what you need to know to
          start your day.
        </div>
      </div>

      {/* The Upshot */}
      <SectionLabel>The Upshot</SectionLabel>
      <div
        className="mb-10"
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderTop: "4px solid var(--dd-viz-blue)",
          borderRadius: "0 0 var(--dd-radius-md) var(--dd-radius-md)",
          padding: 24,
          maxWidth: 560,
        }}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-5">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--dd-radius-md)",
              background: "linear-gradient(135deg, var(--dd-viz-blue), var(--dd-viz-blue-dark))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* Chart SVG */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polyline
                points="4,22 10,14 16,17 22,8 26,10"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="4" y1="24" x2="26" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
              }}
            >
              The Upshot
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              Data-driven analysis &middot; Weekly
            </div>
          </div>
        </div>

        {/* Inline sparkline */}
        <div className="flex items-center gap-3 mb-4">
          <svg width="100" height="28" viewBox="0 0 100 28">
            <polyline
              points="0,22 12,18 24,20 36,12 48,14 60,8 72,10 84,4 100,6"
              fill="none"
              stroke="var(--dd-viz-blue)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="100" cy="6" r="2.5" fill="var(--dd-viz-blue)" />
          </svg>
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dd-viz-blue-dark)",
            }}
          >
            +14.2% this quarter
          </span>
        </div>

        {/* Body text */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "var(--dd-ink-medium)",
            lineHeight: 1.65,
          }}
        >
          This week we examined new census microdata revealing shifts in
          migration patterns across Sun Belt metros. The numbers suggest the
          post-pandemic trend is accelerating, not reversing.
        </div>
      </div>

      {/* Newsletter discovery grid */}
      <SectionLabel>Newsletter Discovery Grid</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        {NEWSLETTERS.map((nl) => (
          <div
            key={nl.title}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: "var(--dd-radius-md)",
              padding: "16px 14px",
            }}
          >
            {/* Colored square icon */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--dd-radius-sm)",
                background: nl.color,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {nl.title}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.45,
                marginBottom: 8,
              }}
            >
              {nl.desc}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "var(--dd-ink-faint)",
              }}
            >
              {nl.freq}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
