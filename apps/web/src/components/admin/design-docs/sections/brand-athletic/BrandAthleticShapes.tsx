"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Shapes & Radius                                   */
/*  Border radius system, shadow system, shape specimens               */
/* ------------------------------------------------------------------ */

function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h3
      id={id}
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid var(--dd-brand-accent)",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

/* ── Shape Data ─────────────────────────────────────────────────────── */

interface ShapeEntry {
  label: string;
  radius: number;
  color: string;
  size?: number;
}

const SHAPES: ShapeEntry[] = [
  { label: "Cards", radius: 8, color: "#252542" },
  { label: "Badges", radius: 4, color: "#E74C3C" },
  { label: "Live Dots", radius: 9999, color: "#1DB954", size: 40 },
  { label: "Buttons", radius: 6, color: "#F5A623" },
  { label: "Avatars (20px)", radius: 9999, color: "#888888" },
  { label: "Showcase Images", radius: 8, color: "#2E2E52" },
  { label: "Table Container", radius: 8, color: "#252542" },
  { label: "Table Rows", radius: 0, color: "#3A3A5C" },
  { label: "Player Avatars", radius: 9999, color: "#888888", size: 40 },
];

/* ── Shadow Data ────────────────────────────────────────────────────── */

interface ShadowEntry {
  label: string;
  shadow: string;
  description: string;
}

const SHADOWS: ShadowEntry[] = [
  {
    label: "Card Default",
    shadow: "0 2px 8px rgba(0,0,0,0.15)",
    description: "Subtle card shadow for dark bg contexts",
  },
  {
    label: "Card Hover",
    shadow: "0 4px 16px rgba(0,0,0,0.25)",
    description: "Elevated shadow on hover/focus states",
  },
  {
    label: "Live Dot Glow",
    shadow: "0 0 6px rgba(29,185,84,0.5)",
    description: "Green glow pulse on live indicator dots",
  },
  {
    label: "Nav Dropdown",
    shadow: "0 8px 24px rgba(0,0,0,0.3)",
    description: "Deep shadow for nav dropdown menus",
  },
];

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticShapes() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="dd-brand-card"
        style={{
          padding: "32px 40px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 32,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Shapes &amp; Radius
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Border radius system, shadow system, and shape specimens
        </div>
      </div>

      {/* ── Border Radius Scale ────────────────────────── */}
      <SectionLabel id="border-radius">Border Radius</SectionLabel>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-end",
          marginBottom: 40,
        }}
      >
        {SHAPES.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: s.size ?? 56,
                height: s.size ?? 56,
                background: s.color,
                borderRadius: s.radius,
                margin: "0 auto 8px",
                border: "1px solid #e5e5e5",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--dd-ink-medium)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
              }}
            >
              {s.radius === 9999 ? "9999px" : `${s.radius}px`}
            </div>
          </div>
        ))}
      </div>

      {/* ── Radius Comparison Row ──────────────────────── */}
      <SectionLabel id="radius-comparison">Radius Comparison</SectionLabel>
      <div
        className="dd-brand-card"
        style={{
          padding: "24px 32px",
          marginBottom: 40,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          {[
            { px: 0, label: "0px — Table rows" },
            { px: 4, label: "4px — Badges, tags" },
            { px: 6, label: "6px — Buttons" },
            { px: 8, label: "8px — Cards, images" },
            { px: 20, label: "20px — Avatars (40px)" },
            { px: 9999, label: "9999px — Circular (dots)" },
          ].map((r) => (
            <div key={r.px} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 64,
                  height: 40,
                  background: "#e5e5e5",
                  borderRadius: r.px === 9999 ? 9999 : r.px,
                  border: "1px solid #d4d4d8",
                  margin: "0 auto 6px",
                }}
              />
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  maxWidth: 80,
                  lineHeight: 1.3,
                }}
              >
                {r.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Shadow System ──────────────────────────────── */}
      <SectionLabel id="shadows">Shadow System</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {SHADOWS.map((s) => (
          <div
            key={s.label}
            className="dd-brand-card"
            style={{
              padding: 20,
              boxShadow: s.shadow,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-brand-text-primary)",
                marginBottom: 8,
                wordBreak: "break-all",
              }}
            >
              {s.shadow}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {s.description}
            </div>
          </div>
        ))}
      </div>

      {/* ── Composed Examples ──────────────────────────── */}
      <SectionLabel id="composed">Composed Examples</SectionLabel>
      <div
        className="dd-brand-card"
        style={{
          padding: "28px 32px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen &mdash; Athletic Dark Theme Preview
        </div>
        <div
          style={{
            background: "#1A1A2E",
            borderRadius: 8,
            padding: "24px 28px",
          }}
        >
        {/* Card with inner elements */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Card with Avatar, Badge, and Button
        </div>
        <div
          style={{
            background: "#252542",
            borderRadius: 8,
            padding: 20,
            maxWidth: 360,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {/* Avatar */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "#888888",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#FFFFFF",
                }}
              >
                Austin Mock
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  color: "#888888",
                }}
              >
                Jan. 9, 2026
              </div>
            </div>
            {/* Badge */}
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 10,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
                background: "#E74C3C",
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              NFL
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "#E0E0E0",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Ranking NFL playoff coaches by who gives their team the biggest edge on fourth down.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 600,
                fontSize: 12,
                color: "#1A1A2E",
                background: "#F5A623",
                border: "none",
                borderRadius: 6,
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              Read More
            </button>
            <button
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 600,
                fontSize: 12,
                color: "#FFFFFF",
                background: "transparent",
                border: "1px solid #3A3A5C",
                borderRadius: 6,
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              Share
            </button>
          </div>
        </div>

        {/* Showcase Link Card */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Showcase Link (inline recommendation)
        </div>
        <div
          style={{
            maxWidth: 600,
            borderTop: "1px solid rgba(150,150,147,0.4)",
            borderBottom: "1px solid rgba(150,150,147,0.4)",
            padding: "16px 0",
            display: "flex",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 200,
              height: 150,
              background: "linear-gradient(135deg, #2E2E52, #1A1A2E)",
              borderRadius: 8,
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "1.1px",
                textTransform: "uppercase" as const,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              NFL
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 500,
                fontSize: 24,
                color: "#FFFFFF",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              Why each NFC playoff team will win the Super Bowl
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 16,
                color: "#888888",
                lineHeight: 1.39,
              }}
            >
              The Seahawks are overwhelming favorites to win the NFC, but who are their top challengers?
            </div>
          </div>
        </div>

        {/* Live dot specimen */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginTop: 24,
            marginBottom: 12,
          }}
        >
          Live Indicator Dot (9999px radius + glow shadow)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: "#1DB954",
              boxShadow: "0 0 6px rgba(29,185,84,0.5)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "#1DB954",
            }}
          >
            LIVE
          </span>
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              color: "#888888",
            }}
          >
            4th Quarter &middot; 3:42
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
