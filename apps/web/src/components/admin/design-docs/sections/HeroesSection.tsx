"use client";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function SpecimenLabel({ children }: { children: React.ReactNode }) {
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

function HeroCard({
  label,
  usage,
  borderColor,
  children,
}: {
  label: string;
  usage: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-10"
      style={{
        borderTop: `3px solid ${borderColor}`,
        borderRadius: "var(--dd-radius-md, 6px)",
        background: "var(--dd-paper-white)",
        overflow: "hidden",
      }}
    >
      <div className="p-4 border-b border-zinc-200">
        <SpecimenLabel>{label}</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {usage}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function GrayPlaceholder({
  aspectRatio,
  radius = 0,
  label,
}: {
  aspectRatio: string;
  radius?: number;
  label?: string;
}) {
  return (
    <div
      style={{
        background: "var(--dd-paper-grey, #d4d4d4)",
        aspectRatio,
        borderRadius: radius,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        color: "var(--dd-ink-soft)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
      }}
    >
      {label ?? "Image"}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function HeroesSection() {
  return (
    <div>
      <div className="dd-section-label">Heroes</div>
      <h2 className="dd-section-title">Hero Section Patterns</h2>
      <p className="dd-section-desc">
        Five hero layout patterns scaled for editorial, feature, and immersive
        contexts. Each balances type hierarchy, imagery, and white space in the
        NYT-influenced TRR design language.
      </p>

      {/* ---- Full-Bleed Editorial ---- */}
      <HeroCard
        label="Full-Bleed Editorial"
        usage="Top-of-page feature stories. Dark background with high-contrast white headline for maximum impact."
        borderColor="var(--dd-accent-saffron)"
      >
        <div
          style={{
            background: "#121212",
            padding: "var(--dd-space-xl, 48px) var(--dd-space-lg, 32px)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.14em",
              color: "var(--dd-accent-saffron)",
              marginBottom: 16,
            }}
          >
            Exclusive Investigation
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 900,
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              maxWidth: 720,
              marginBottom: 20,
            }}
          >
            Behind the Scenes of Reality Television&rsquo;s Biggest Shakeup
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontWeight: 400,
              fontSize: 18,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.7)",
              maxWidth: 600,
              marginBottom: 20,
            }}
          >
            An in-depth look at how streaming platforms are reshaping the
            competitive landscape for unscripted programming.
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.15)",
              width: 80,
            }}
          />
        </div>
        <SpecimenMeta text="Cheltenham Ultra 48px | Gloucester 18px deck | Franklin Gothic 11px kicker | bg #121212" />
      </HeroCard>

      {/* ---- Split Hero ---- */}
      <HeroCard
        label="Split Hero"
        usage="Article openings and landing pages. Two-column layout with text and imagery balanced side-by-side."
        borderColor="var(--dd-viz-blue)"
      >
        <div className="grid grid-cols-2" style={{ minHeight: 320 }}>
          <div
            style={{
              padding: "var(--dd-space-lg, 32px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              borderRight: "1px solid var(--dd-paper-grey, #e0e0e0)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: 36,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--dd-ink-black)",
                marginBottom: 16,
              }}
            >
              Cast Rankings Reshuffled After Reunion Special
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontWeight: 400,
                fontSize: 16,
                lineHeight: 1.55,
                color: "var(--dd-ink-medium)",
                marginBottom: 24,
              }}
            >
              Viewer sentiment and social engagement data reveal surprising
              shifts in the aftermath of last week&rsquo;s explosive three-part
              reunion.
            </div>
            <div>
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--dd-paper-white)",
                  background: "var(--dd-ink-black)",
                  padding: "10px 24px",
                  borderRadius: "var(--dd-radius-sm, 3px)",
                }}
              >
                Read Analysis
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <GrayPlaceholder aspectRatio="3/2" radius={0} label="Feature Image" />
          </div>
        </div>
        <SpecimenMeta text="Cheltenham Bold 36px | Gloucester 16px deck | CTA button | Image 3:2 | border divider" />
      </HeroCard>

      {/* ---- Centered Hero ---- */}
      <HeroCard
        label="Centered Hero"
        usage="Section landings and category pages. Minimal, centered type with a saffron accent underline."
        borderColor="var(--dd-accent-saffron)"
      >
        <div
          style={{
            padding: "var(--dd-space-xl, 48px) var(--dd-space-lg, 32px)",
            textAlign: "center",
            background: "var(--dd-paper-white)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 700,
              fontSize: 42,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--dd-ink-black)",
              marginBottom: 16,
            }}
          >
            The Week in Reality
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontWeight: 400,
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--dd-ink-medium)",
              maxWidth: 540,
              margin: "0 auto 24px",
            }}
          >
            A curated roundup of the most talked-about moments across every
            major reality franchise this week.
          </div>
          <div
            style={{
              width: 40,
              height: 3,
              background: "var(--dd-accent-saffron)",
              margin: "0 auto",
              borderRadius: 2,
            }}
          />
        </div>
        <SpecimenMeta text="Cheltenham 42px centered | Gloucester 18px deck | 40px saffron underline accent" />
      </HeroCard>

      {/* ---- Dark Immersive ---- */}
      <HeroCard
        label="Dark Immersive"
        usage="Long-form feature openers and investigative deep-dives. Full dark gradient with annotation panel."
        borderColor="var(--dd-viz-purple)"
      >
        <div
          style={{
            background: "linear-gradient(135deg, #0a1628 0%, #142040 100%)",
            padding: "var(--dd-space-xl, 48px) var(--dd-space-lg, 32px)",
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 900,
              fontSize: 56,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              maxWidth: 700,
              marginBottom: 32,
            }}
          >
            Power, Ratings &amp; the New Rules of Primetime
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderLeft: "3px solid var(--dd-accent-saffron)",
              padding: "16px 20px",
              maxWidth: 420,
              borderRadius: "0 var(--dd-radius-sm, 3px) var(--dd-radius-sm, 3px) 0",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "var(--dd-accent-saffron)",
                marginBottom: 6,
              }}
            >
              Editor&rsquo;s Note
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              This investigation draws on six months of ratings data, social
              analytics, and interviews with over thirty industry insiders.
            </div>
          </div>
        </div>
        <SpecimenMeta text="Cheltenham Ultra 56px wt 900 | gradient #0a1628 → #142040 | annotation panel with saffron border" />
      </HeroCard>

      {/* ---- Magazine Cover ---- */}
      <HeroCard
        label="Magazine Cover"
        usage="Newsletter headers and special edition pages. Blackletter masthead with editorial headline below."
        borderColor="var(--dd-viz-teal)"
      >
        <div
          style={{
            padding: "var(--dd-space-lg, 32px)",
            background: "var(--dd-paper-white)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-masthead)",
              fontSize: 36,
              color: "var(--dd-ink-black)",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            The Reality Report
          </div>
          <div
            style={{
              borderTop: "1px solid var(--dd-ink-black)",
              borderBottom: "1px solid var(--dd-ink-black)",
              padding: "6px 0",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.14em",
                color: "var(--dd-ink-soft)",
                textAlign: "center",
              }}
            >
              Special Edition &bull; March 2026
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              color: "var(--dd-viz-red)",
              marginBottom: 8,
            }}
          >
            Breaking
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1.12,
              letterSpacing: "-0.01em",
              color: "var(--dd-ink-black)",
              maxWidth: 560,
              marginBottom: 20,
            }}
          >
            The Franchise That Changed Everything&mdash;And What Comes Next
          </div>
          <GrayPlaceholder aspectRatio="16/9" radius={0} label="Illustration" />
        </div>
        <SpecimenMeta text="Chomsky masthead 36px | thin rules | bold kicker | Cheltenham 32px headline | illustration" />
      </HeroCard>
    </div>
  );
}
