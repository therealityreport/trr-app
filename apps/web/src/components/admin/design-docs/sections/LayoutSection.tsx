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

/* ---------- Grid specimens ---------- */

const GRID_CONFIGS = [
  { cols: 12, label: "12-Column" },
  { cols: 6, label: "6-Column" },
  { cols: 4, label: "4-Column" },
  { cols: 3, label: "3-Column" },
  { cols: 2, label: "2-Column" },
];

function GridDemo({ cols, label }: { cols: number; label: string }) {
  return (
    <div className="mb-6">
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--dd-ink-soft)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 4,
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 32,
              border: "1px dashed var(--dd-viz-blue-light)",
              borderRadius: "var(--dd-radius-xs)",
              background: "var(--dd-viz-blue-wash)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              color: "var(--dd-viz-blue-dark)",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Design principles ---------- */

const PRINCIPLES = [
  {
    title: "Typography First",
    desc: "Let the type stack establish hierarchy before adding graphical elements. Headlines, kickers, and data labels carry the visual weight.",
  },
  {
    title: "Earned Color",
    desc: "Every hue justifies its presence with data meaning or brand purpose. Decorative color is removed unless it encodes information.",
  },
  {
    title: "Annotation > Decoration",
    desc: "Context-rich annotations replace ornamental graphics. Every visual mark should explain, label, or highlight data.",
  },
  {
    title: "Direct Labeling",
    desc: "Place labels directly on data points, lines, and areas. Avoid legends that force the reader to look away from the chart.",
  },
];

export default function LayoutSection() {
  return (
    <div>
      <div className="dd-section-label">Layout</div>
      <h2 className="dd-section-title">Layout &amp; Grid</h2>
      <p className="dd-section-desc">
        Column grids, scrollytelling patterns, and design principles that govern
        spatial organization across editorial pages, dashboards, and data
        stories.
      </p>

      {/* Grid demos */}
      <SectionLabel>Grid System</SectionLabel>
      <div className="mb-12">
        {GRID_CONFIGS.map((g) => (
          <GridDemo key={g.cols} cols={g.cols} label={g.label} />
        ))}
      </div>

      {/* Scrollytelling demo */}
      <SectionLabel>Scrollytelling Pattern</SectionLabel>
      <div
        className="mb-12 overflow-hidden"
        style={{
          background: "var(--dd-ink-dark)",
          borderRadius: "var(--dd-radius-lg)",
          padding: 32,
          position: "relative",
          minHeight: 280,
        }}
      >
        {/* SVG chart line */}
        <svg
          viewBox="0 0 400 150"
          style={{ width: "100%", maxWidth: 400, height: 150, opacity: 0.9 }}
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="140"
            x2="400"
            y2="140"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="100"
            x2="400"
            y2="100"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="60"
            x2="400"
            y2="60"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
          <path
            d="M0 130 C40 125, 80 110, 120 100 S200 60, 260 50 S340 30, 400 20"
            fill="none"
            stroke="var(--dd-viz-blue)"
            strokeWidth="2.5"
          />
          <circle cx="260" cy="50" r="5" fill="var(--dd-accent-saffron)">
            <animate
              attributeName="r"
              values="4;7;4"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.6;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        {/* Floating text panel */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            maxWidth: 260,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            borderLeft: "3px solid var(--dd-accent-saffron)",
            borderRadius: "0 var(--dd-radius-sm) var(--dd-radius-sm) 0",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 15,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.25,
              marginBottom: 6,
            }}
          >
            Sticky visual + scrolling text
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.5,
            }}
          >
            The chart stays fixed while narrative panels scroll past, triggering
            state transitions at each step.
          </div>
        </div>
      </div>

      {/* Design principles */}
      <SectionLabel>Design Principles</SectionLabel>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
      >
        {PRINCIPLES.map((p) => (
          <div
            key={p.title}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderTop: "3px solid var(--dd-ink-black)",
              borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.25,
                marginBottom: 6,
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.5,
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
