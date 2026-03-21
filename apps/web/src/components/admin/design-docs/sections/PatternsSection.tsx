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

/* ---------- Design principles ---------- */

const PRINCIPLES = [
  {
    title: "Typography First",
    desc: "Let the type stack establish hierarchy before reaching for graphical elements. Headlines, kickers, and data labels carry the visual weight; color and imagery are secondary reinforcement.",
  },
  {
    title: "Earned Color",
    desc: "Every hue in the palette justifies its presence with data meaning or brand purpose. Decorative color is stripped unless it encodes information the reader needs to decode the story.",
  },
  {
    title: "Annotation > Decoration",
    desc: "Context-rich annotations replace ornamental graphics. Every visual mark should explain, label, or highlight a data point. If a mark does not teach, it does not belong.",
  },
  {
    title: "Direct Labeling",
    desc: "Place labels directly on data points, lines, and areas rather than using legends. Reducing eye travel between the data and its meaning cuts cognitive load and speeds comprehension.",
  },
];

export default function PatternsSection() {
  return (
    <div>
      <div className="dd-section-label">Patterns</div>
      <h2 className="dd-section-title">Scrollytelling &amp; Principles</h2>
      <p className="dd-section-desc">
        Narrative scrollytelling mechanics and the design principles that govern
        every editorial and data visualization decision across TRR products.
      </p>

      {/* Scrollytelling demo */}
      <SectionLabel>Scrollytelling Demo</SectionLabel>
      <div
        className="mb-12 overflow-hidden"
        style={{
          background: "var(--dd-ink-dark)",
          borderRadius: "var(--dd-radius-lg)",
          padding: 32,
          position: "relative",
          minHeight: 300,
        }}
      >
        {/* SVG line chart */}
        <svg
          viewBox="0 0 440 160"
          style={{ width: "100%", maxWidth: 440, height: 160 }}
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {[140, 110, 80, 50, 20].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="440"
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}
          {/* X axis */}
          <line
            x1="0"
            y1="145"
            x2="440"
            y2="145"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />

          {/* Data line */}
          <path
            d="M0 130 C30 128, 60 120, 90 110 S150 85, 190 75 S250 55, 300 42 S370 25, 440 18"
            fill="none"
            stroke="var(--dd-viz-blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Shaded area under line */}
          <path
            d="M0 130 C30 128, 60 120, 90 110 S150 85, 190 75 S250 55, 300 42 S370 25, 440 18 L440 145 L0 145 Z"
            fill="var(--dd-viz-blue)"
            opacity="0.08"
          />

          {/* Pulsing dot at current position */}
          <circle cx="300" cy="42" r="5" fill="var(--dd-accent-saffron)">
            <animate
              attributeName="r"
              values="4;8;4"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Year labels */}
          <text x="0" y="158" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--dd-font-sans)">2015</text>
          <text x="100" y="158" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--dd-font-sans)">2018</text>
          <text x="210" y="158" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--dd-font-sans)">2021</text>
          <text x="320" y="158" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--dd-font-sans)">2024</text>
          <text x="415" y="158" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--dd-font-sans)">2026</text>
        </svg>

        {/* Floating text panel */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            right: 28,
            maxWidth: 280,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            borderLeft: "3px solid var(--dd-accent-saffron)",
            borderRadius: "0 var(--dd-radius-sm) var(--dd-radius-sm) 0",
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 16,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.25,
              marginBottom: 8,
            }}
          >
            The visual stays fixed
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.55,
            }}
          >
            As the reader scrolls, narrative text panels trigger state
            transitions in the sticky chart. Each scroll step can update data,
            annotations, or highlighted regions without breaking the reader&rsquo;s
            spatial context.
          </div>
        </div>
      </div>

      {/* Design principles summary */}
      <SectionLabel>Design Principles Summary</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PRINCIPLES.map((p) => (
          <div
            key={p.title}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderTop: "3px solid var(--dd-ink-black)",
              borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.55,
              }}
            >
              {p.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
