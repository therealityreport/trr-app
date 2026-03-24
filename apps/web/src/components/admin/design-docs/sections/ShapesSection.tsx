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

const NYT_SECTION_RADIUS = [
  { section: "Editorial / News", range: "0\u20132px", maxRadius: 2, personality: "Sharp, authoritative", color: "#1a1a1b" },
  { section: "Data Visualization", range: "0\u20134px", maxRadius: 4, personality: "Clean, precise", color: "#326DA8" },
  { section: "Games", range: "8\u201316px", maxRadius: 16, personality: "Playful, tactile", color: "#6aaa64" },
  { section: "Lifestyle / Cooking", range: "4\u20138px", maxRadius: 8, personality: "Warm, approachable", color: "#D4A76A" },
  { section: "Interactive / Immersive", range: "0px", maxRadius: 0, personality: "Dramatic, edge-to-edge", color: "#8B5CF6" },
  { section: "Magazine", range: "0\u20134px", maxRadius: 4, personality: "Editorial, refined", color: "#565758" },
];

const SOCIAL_SHAPES = [
  { name: "IG Feed Square", width: 1080, height: 1080, ratio: "1:1", radius: "0\u20138px", color: "#E1306C" },
  { name: "IG Feed Portrait", width: 1080, height: 1350, ratio: "4:5", radius: "0\u20138px", color: "#E1306C" },
  { name: "IG Story", width: 1080, height: 1920, ratio: "9:16", radius: "0px", color: "#833AB4" },
  { name: "Twitter / X", width: 1024, height: 512, ratio: "2:1", radius: "16px", color: "#1DA1F2" },
  { name: "Newsletter", width: 600, height: 300, ratio: "2:1", radius: "0px", color: "#1a1a1b" },
  { name: "OG Image", width: 1200, height: 630, ratio: "~1.9:1", radius: "0px", color: "#326DA8" },
];

const CARD_RADIUS_COMPARISON = [
  { label: "News Articles", radius: 0, color: "#1a1a1b" },
  { label: "Wordle Tiles", radius: 8, color: "#6aaa64" },
  { label: "Cooking Cards", radius: 4, color: "#D4A76A" },
  { label: "Wirecutter", radius: 8, color: "#E63946" },
  { label: "Athletic Cards", radius: 4, color: "#1A1A2E" },
  { label: "Game Hub Cards", radius: 8, color: "#4f85e5" },
  { label: "Style Cards", radius: 6, color: "#B8860B" },
  { label: "Store Products", radius: 8, color: "#2E8B57" },
];

const SHAPE_SPECIMENS = [
  { name: "Hexagon", clip: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)", borderRadius: undefined as string | undefined, width: 56, color: "#f7da21", note: "Spelling Bee" },
  { name: "Diamond", clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", borderRadius: undefined as string | undefined, width: 56, color: "#ba81c5", note: "Connections" },
  { name: "Circle", clip: undefined as string | undefined, borderRadius: "50%", width: 56, color: "#326DA8", note: "Avatars" },
  { name: "Pill", clip: undefined as string | undefined, borderRadius: "9999px", width: 96, color: "#6aaa64", note: "Buttons" },
  { name: "Notched Square", clip: "polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)", borderRadius: undefined as string | undefined, width: 56, color: "#1a1a1b", note: "Crossword" },
];

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

      {/* ── NYT Section-Specific Radius Map ─────────────── */}
      <div id="nyt-radius-map" />
      <div className="dd-palette-label">NYT Section-Specific Radius Map</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {NYT_SECTION_RADIUS.map((item) => (
          <div
            key={item.section}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: "var(--dd-radius-sm)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: 4, background: item.color }} />
            <div style={{ padding: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: item.maxRadius,
                  background: `${item.color}26`,
                  border: `2px solid ${item.color}`,
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                  marginBottom: 2,
                }}
              >
                {item.section}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-medium)",
                  marginBottom: 2,
                }}
              >
                {item.range}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "var(--dd-ink-light)",
                }}
              >
                {item.personality}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Social Media Post Shape Specs ──────────────── */}
      <div id="social-shapes" />
      <div className="dd-palette-label">Social Media Post Shape Specs</div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {SOCIAL_SHAPES.map((item) => {
          const maxW = 100;
          const scaledH = Math.round(maxW * (item.height / item.width));
          return (
            <div key={item.name} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: maxW,
                  height: scaledH,
                  border: `2px solid ${item.color}4D`,
                  borderRadius: 4,
                  background: `${item.color}14`,
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--dd-ink-medium)",
                  marginBottom: 2,
                }}
              >
                {item.width}&times;{item.height}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  color: "var(--dd-ink-black)",
                  marginBottom: 3,
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 9,
                  background: `${item.color}1F`,
                  borderRadius: 3,
                  padding: "1px 5px",
                  color: "var(--dd-ink-medium)",
                  marginBottom: 2,
                }}
              >
                {item.ratio}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 9,
                  fontStyle: "italic",
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                r: {item.radius}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Card Corner Radius Comparison ─────────────── */}
      <div id="card-radius" />
      <div className="dd-palette-label">Card Corner Radius Comparison</div>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {CARD_RADIUS_COMPARISON.map((item) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: item.color,
                borderRadius: item.radius,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-soft)",
                marginBottom: 2,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
              }}
            >
              {item.radius}px
            </div>
          </div>
        ))}
      </div>

      {/* ── Shape Specimens ───────────────────────────── */}
      <div id="shape-specimens" />
      <div className="dd-palette-label">Shape Specimens</div>
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {SHAPE_SPECIMENS.map((item) => (
          <div key={item.name} style={{ textAlign: "center" }}>
            <div
              style={{
                width: item.width,
                height: 56,
                background: item.color,
                clipPath: item.clip || undefined,
                borderRadius: item.borderRadius || undefined,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                marginBottom: 2,
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                fontStyle: "italic",
                color: "var(--dd-ink-faint)",
              }}
            >
              {item.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
