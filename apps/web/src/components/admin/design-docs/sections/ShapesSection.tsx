"use client";

/* ------------------------------------------------------------------ */
/*  Shapes Section — Border-radius scale, context guide, shadow scale */
/* ------------------------------------------------------------------ */

const RADIUS_SCALE = [
  { token: "None", value: "0px", varName: "--dd-radius-none", use: "Data tables, rules" },
  { token: "XS", value: "2px", varName: "--dd-radius-xs", use: "Chart bars, legend squares" },
  { token: "SM", value: "4px", varName: "--dd-radius-sm", use: "Chart cards, inputs, tags" },
  { token: "MD", value: "6px", varName: "--dd-radius-md", use: "Buttons, badges" },
  { token: "LG", value: "8px", varName: "--dd-radius-lg", use: "Content cards, modals" },
  { token: "XL", value: "12px", varName: "--dd-radius-xl", use: "Newsletter icons, app cards" },
  { token: "2XL", value: "16px", varName: "--dd-radius-2xl", use: "Feature cards, heroes" },
  { token: "3XL", value: "24px", varName: "--dd-radius-3xl", use: "Hero images, splash" },
  { token: "Full", value: "9999px", varName: "--dd-radius-full", use: "Pills, avatars, dots" },
] as const;

const SHADOWS = [
  { name: "Rest", value: "none", border: true, css: "border only" },
  { name: "SM", value: "0 1px 3px rgba(0,0,0,0.06)", border: false, css: "0 1px 3px 0.06" },
  { name: "MD", value: "0 4px 12px rgba(0,0,0,0.08)", border: false, css: "0 4px 12px 0.08" },
  { name: "LG", value: "0 10px 25px rgba(0,0,0,0.12)", border: false, css: "0 10px 25px 0.12" },
  { name: "XL", value: "0 20px 40px rgba(0,0,0,0.15)", border: false, css: "0 20px 40px 0.15" },
] as const;

const DATA_VIZ_SHAPES = [
  { label: "Bar element", radius: "0px", color: "var(--dd-viz-blue)" },
  { label: "Legend square", radius: "2px", color: "var(--dd-viz-red)" },
  { label: "Chart card", radius: "4px", color: "var(--dd-viz-orange)" },
  { label: "Inline tag", radius: "4px", color: "var(--dd-viz-teal)" },
] as const;

const APP_UI_SHAPES = [
  { label: "Button", radius: "6px", color: "var(--dd-viz-blue)" },
  { label: "Content card", radius: "8px", color: "var(--dd-viz-green)" },
  { label: "Feature card", radius: "16px", color: "var(--dd-viz-purple)" },
  { label: "Avatar / pill", radius: "9999px", color: "var(--dd-accent-saffron)" },
] as const;

export default function ShapesSection() {
  return (
    <div>
      <div className="dd-section-label">Shapes</div>
      <h2 className="dd-section-title">Radius &amp; Shadow System</h2>
      <p className="dd-section-desc">
        Border radius tokens control visual formality. Data-dense contexts stay
        sharp while interactive UI elements use progressively rounder corners.
        Shadows create depth hierarchy without color.
      </p>

      {/* ── Radius Scale ────────────────────────────────── */}
      <div className="dd-palette-label">Radius Scale</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {RADIUS_SCALE.map((r) => (
          <div key={r.token} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                margin: "0 auto var(--dd-space-sm)",
                background: "var(--dd-ink-black)",
                borderRadius: `var(${r.varName})`,
                transition: "transform 0.2s",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
              }}
            >
              {r.token}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginBottom: 2,
              }}
            >
              {r.value}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 11,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.35,
              }}
            >
              {r.use}
            </div>
          </div>
        ))}
      </div>

      {/* ── Context Guide ────────────────────────────────── */}
      <div className="dd-palette-label">Context Guide</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* Data Viz / Editorial */}
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-sm)",
            padding: "var(--dd-space-lg)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: "var(--dd-space-xs)",
            }}
          >
            Data Viz / Editorial
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
              marginBottom: "var(--dd-space-md)",
            }}
          >
            Sharp corners: 0 &ndash; 4 px
          </div>
          <div style={{ display: "flex", gap: "var(--dd-space-md)", flexWrap: "wrap" }}>
            {DATA_VIZ_SHAPES.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: s.radius,
                    background: s.color,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--dd-ink-soft)",
                    marginTop: 6,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App UI / Interactive */}
        <div
          style={{
            background: "var(--dd-paper-white)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: "var(--dd-radius-sm)",
            padding: "var(--dd-space-lg)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: "var(--dd-space-xs)",
            }}
          >
            App UI / Interactive
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
              marginBottom: "var(--dd-space-md)",
            }}
          >
            Round corners: 6 px &ndash; full
          </div>
          <div style={{ display: "flex", gap: "var(--dd-space-md)", flexWrap: "wrap" }}>
            {APP_UI_SHAPES.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: s.radius,
                    background: s.color,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--dd-ink-soft)",
                    marginTop: 6,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Shadow Scale ────────────────────────────────── */}
      <div className="dd-palette-label">Shadow Scale</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "var(--dd-space-md)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {SHADOWS.map((s) => (
          <div
            key={s.name}
            style={{
              background: "var(--dd-paper-white)",
              borderRadius: "var(--dd-radius-lg)",
              padding: "var(--dd-space-lg)",
              boxShadow: s.border ? "none" : s.value,
              border: s.border ? "1px solid var(--dd-paper-grey)" : "1px solid transparent",
              textAlign: "center",
              transition: "transform 0.2s",
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
              {s.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {s.css}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
