"use client";

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

export default function TypographySection() {
  return (
    <div>
      <div className="dd-section-label">Typography</div>
      <h2 className="dd-section-title">Type Stack</h2>
      <p className="dd-section-desc">
        Seven typeface families served from R2 CDN form the full TRR type stack.
        Each face owns a specific role &mdash; from blackletter mastheads to
        monospaced data tables &mdash; ensuring clear hierarchy without
        competing voices.
      </p>

      {/* Cheltenham */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Cheltenham &mdash; Headline Serif</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 42,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "var(--dd-ink-black)",
          }}
        >
          The Climate Crisis Is Reshaping Where Americans Can Live
        </div>
        <SpecimenMeta text="Cheltenham Bold | 42px | -0.02em tracking | line-height 1.1" />
      </div>

      {/* Gloucester */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Gloucester &mdash; Display &amp; Body Serif</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-display)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            color: "var(--dd-ink-black)",
            marginBottom: 16,
          }}
        >
          The Reality Report
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontWeight: 400,
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--dd-ink-medium)",
            maxWidth: 640,
          }}
        >
          Body text set in Gloucester at 17px with generous leading creates the
          comfortable reading rhythm essential for long-form editorial. The
          slightly condensed proportions keep line lengths in check even at wider
          column widths, while old-style figures blend naturally into running
          prose. This typeface carries the majority of narrative content across
          articles, analysis pieces, and newsletter editions.
        </div>
        <SpecimenMeta text="Display: Gloucester Bold 28px | Body: Gloucester Regular 17px / 1.7 lh / max-width 640px" />
      </div>

      {/* Franklin Gothic */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Franklin Gothic &mdash; Data &amp; UI Sans</SpecimenLabel>

        <div className="flex flex-wrap gap-6 mb-6">
          {([
            [400, "Book"],
            [500, "Medium"],
            [600, "Demi"],
            [800, "Heavy"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: weight,
                  fontSize: 22,
                  color: "var(--dd-ink-black)",
                  marginBottom: 2,
                }}
              >
                The quick brown fox
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {weight} {label}
              </div>
            </div>
          ))}
        </div>

        {/* Data label specimen */}
        <div
          style={{
            fontFamily: "var(--dd-font-data)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--dd-ink-light)",
            marginBottom: 4,
          }}
        >
          ANALYSIS{" "}
          <span style={{ color: "var(--dd-ink-faint)", margin: "0 4px" }}>|</span>{" "}
          By Thomas Hulihan{" "}
          <span style={{ color: "var(--dd-ink-faint)", margin: "0 4px" }}>|</span>{" "}
          March 21, 2026
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-data)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
          }}
        >
          Source: U.S. Census Bureau, American Community Survey 2025
        </div>
        <SpecimenMeta text="Franklin Gothic Demi 12px / 0.06em tracking / uppercase data labels" />
      </div>

      {/* Hamburg Serial */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Hamburg Serial &mdash; Body Sans</SpecimenLabel>
        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4">
          {([200, 300, 400, 500, 600, 700, 800] as const).map((weight) => (
            <span
              key={weight}
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: weight,
                fontSize: 18,
                color: "var(--dd-ink-black)",
              }}
            >
              Aa &mdash; {weight}
            </span>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 400,
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--dd-ink-medium)",
            maxWidth: 640,
          }}
        >
          Hamburg Serial provides the neutral sans-serif voice for UI chrome,
          navigation elements, and secondary body text where Gloucester would
          feel too editorial. Its wide weight range from Thin to Extra Bold
          allows fine-grained emphasis control.
        </div>
        <SpecimenMeta text="Hamburg Serial 200-800 | UI body at 15px / 1.6 lh" />
      </div>

      {/* Stymie */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Stymie &mdash; Slab Accent</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontWeight: 700,
            fontSize: 26,
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          Breaking: New Data Reveals Shifting Trends
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontWeight: 300,
            fontSize: 20,
            fontStyle: "italic",
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
            maxWidth: 560,
            borderLeft: "3px solid var(--dd-accent-saffron)",
            paddingLeft: 16,
          }}
        >
          &ldquo;The numbers tell a story that words alone cannot capture &mdash;
          and the story is accelerating.&rdquo;
        </div>
        <SpecimenMeta text="Stymie Bold 26px headline | Stymie Light Italic 20px pull-quote" />
      </div>

      {/* Chomsky */}
      <div className="mb-10 pb-10 border-b border-zinc-200">
        <SpecimenLabel>Chomsky &mdash; Blackletter Masthead</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-masthead)",
            fontSize: 48,
            color: "var(--dd-ink-black)",
            lineHeight: 1.1,
          }}
        >
          The Reality Report
        </div>
        <SpecimenMeta text="Chomsky 48px | Blackletter masthead — used sparingly for brand identity" />
      </div>

      {/* Mono */}
      <div>
        <SpecimenLabel>SF Mono / Menlo &mdash; Monospace</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--dd-ink-medium)",
            background: "var(--dd-paper-cool)",
            padding: 16,
            borderRadius: "var(--dd-radius-md)",
            maxWidth: 640,
          }}
        >
          <span style={{ color: "var(--dd-viz-purple)" }}>const</span> palette ={" "}
          <span style={{ color: "var(--dd-viz-blue)" }}>getSequentialScale</span>
          (<span style={{ color: "var(--dd-viz-red)" }}>&quot;blue&quot;</span>, 6);
          <br />
          <span style={{ color: "var(--dd-ink-faint)" }}>
            {"// => [\"#DCE8F0\", \"#B8D4E3\", \"#86C3D6\", \"#4A90D9\", \"#326DA8\", \"#1D4E7A\"]"}
          </span>
        </div>
        <SpecimenMeta text="SF Mono / Menlo 13px | code blocks, data tables, axis tick labels" />
      </div>
    </div>
  );
}
