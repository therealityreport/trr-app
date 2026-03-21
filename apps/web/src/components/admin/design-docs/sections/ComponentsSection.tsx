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

/* ---------- Divider specimens ---------- */

const DIVIDERS: { label: string; style: React.CSSProperties }[] = [
  {
    label: "Thin",
    style: { borderBottom: "1px solid var(--dd-paper-grey)" },
  },
  {
    label: "Medium",
    style: { borderBottom: "2px solid var(--dd-ink-black)" },
  },
  {
    label: "Thick",
    style: { borderBottom: "3px solid var(--dd-ink-black)" },
  },
  {
    label: "Double",
    style: { borderBottom: "3px double var(--dd-ink-black)" },
  },
];

/* ---------- Spacing scale ---------- */

const SPACING_STEPS = [
  { token: "xs", px: 4 },
  { token: "sm", px: 8 },
  { token: "md", px: 16 },
  { token: "lg", px: 24 },
  { token: "xl", px: 32 },
  { token: "2xl", px: 48 },
  { token: "3xl", px: 64 },
  { token: "4xl", px: 96 },
];

/* ---------- Width tiers ---------- */

const WIDTH_TIERS = [
  { label: "Article", px: 600, purpose: "Long-form text, body copy" },
  { label: "Wide", px: 900, purpose: "Charts, data tables, media" },
  { label: "Full", px: 1200, purpose: "Full-bleed layouts, grids" },
];

export default function ComponentsSection() {
  return (
    <div>
      <div className="dd-section-label">Components</div>
      <h2 className="dd-section-title">UI Components</h2>
      <p className="dd-section-desc">
        Building blocks shared across editorial pages, data dashboards, and
        newsletter templates. Each element maps to a design token for consistent
        rendering at every breakpoint.
      </p>

      {/* Divider rules */}
      <SectionLabel>Divider Rules</SectionLabel>
      <div className="mb-12 space-y-6">
        {DIVIDERS.map((d) => (
          <div key={d.label}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--dd-ink-soft)",
                marginBottom: 8,
              }}
            >
              {d.label}
            </div>
            <div style={d.style} />
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 6,
              }}
            >
              {d.style.borderBottom as string}
            </div>
          </div>
        ))}
      </div>

      {/* Spacing scale */}
      <SectionLabel>Spacing Scale</SectionLabel>
      <div className="mb-12 flex flex-wrap items-end gap-4">
        {SPACING_STEPS.map((s) => (
          <div key={s.token} className="flex flex-col items-center">
            <div
              style={{
                width: s.px,
                height: s.px,
                background: "var(--dd-viz-blue-pale)",
                border: "1px solid var(--dd-viz-blue-light)",
                borderRadius: "var(--dd-radius-xs)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 24,
                minHeight: 24,
              }}
            >
              {s.px >= 24 && (
                <span
                  style={{
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 10,
                    color: "var(--dd-viz-blue-dark)",
                    fontWeight: 600,
                  }}
                >
                  {s.px}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {s.token}
              {s.px < 24 && (
                <>
                  <br />
                  {s.px}px
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Content width tiers */}
      <SectionLabel>Content Width Tiers</SectionLabel>
      <div className="mb-8 space-y-4" style={{ maxWidth: 800 }}>
        {WIDTH_TIERS.map((w) => (
          <div key={w.label}>
            <div
              style={{
                width: `min(${w.px}px, 100%)`,
                background: "var(--dd-viz-blue-pale)",
                border: "1px dashed var(--dd-viz-blue-light)",
                borderRadius: "var(--dd-radius-sm)",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--dd-viz-blue-dark)",
                  }}
                >
                  {w.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 11,
                    color: "var(--dd-viz-blue)",
                  }}
                >
                  {w.px}px
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {w.purpose}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        Width tiers set max-width on content containers; actual width is always
        fluid within the tier cap.
      </div>
    </div>
  );
}
