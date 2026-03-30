"use client";

/* ================================================================
   BrandNYMag — Shapes & Radius Tab
   Deliberately flat editorial design. Minimal border-radius.
   ================================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

export default function BrandNYMagShapes() {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-body)",
        color: "var(--dd-ink-black)",
        maxWidth: 960,
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Border Radius &amp; Shape Language
      </h2>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 24,
          maxWidth: 640,
        }}
      >
        NYMag is deliberately flat and editorial — minimal border-radius use.
        The design relies on borders, dividers, and whitespace for visual
        structure rather than rounded containers or card shadows.
      </p>

      {/* ── Radius scale ── */}
      <SectionLabel>Radius Scale</SectionLabel>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 40 }}>
        {[
          { radius: 0, label: "0px", usage: "Headlines, borders, article cards, nav links, images" },
          { radius: 2, label: "2px", usage: "Buttons, dropdown content, subscribe CTA, dropdown links" },
          { radius: 3, label: "3px", usage: "Login form inputs, auth modal" },
          { radius: 50, label: "50px", usage: "Live indicator dot (border-radius: 50px)" },
        ].map((r) => (
          <div key={r.label} style={{ textAlign: "center", maxWidth: 140 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: r.radius,
                border: "2px solid #111",
                background: "#fff",
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--dd-brand-accent)",
                marginBottom: 4,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {r.usage}
            </div>
          </div>
        ))}
      </div>

      {/* ── Border patterns ── */}
      <SectionLabel>Border Patterns</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
        }}
      >
        Borders and dividers carry most of the visual rhythm — they define sections,
        separate content, and create hierarchy.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32, maxWidth: 560 }}>
        {/* Section double-border */}
        <div>
          <div style={{ height: 1, background: "#767676", marginBottom: 6 }} />
          <div style={{ height: 6, background: "#000", marginBottom: 12 }} />
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            Section double-border: 1px #767676 rule + 6px #000 black (12px gap via ::before pseudo)
          </div>
        </div>

        {/* Single-pixel divider */}
        <div>
          <div style={{ height: 1, background: "#bdbdbd", marginBottom: 12 }} />
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            Content divider: 1px #bdbdbd — between feed items, article groups
          </div>
        </div>

        {/* Feed item border */}
        <div>
          <div style={{ height: 1, background: "#e7e7e7", marginBottom: 12 }} />
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            Feed divider: 1px #e7e7e7 — between individual feed items (lighter)
          </div>
        </div>

        {/* Image border */}
        <div
          style={{
            border: "1px solid #979797",
            padding: 20,
            height: 80,
            background:
              "linear-gradient(135deg, #e7e7e7 0%, #bdbdbd 100%)",
          }}
        />
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: -8,
          }}
        >
          Featured image: 1px #979797 border + 20px padding (creates photo mat effect)
        </div>

        {/* Dotted promotional border */}
        <div
          style={{
            backgroundImage:
              "linear-gradient(to left, #000 0, #000 25%, transparent 25%)",
            backgroundRepeat: "repeat-x",
            backgroundSize: "4px 1px",
            height: 1,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: -8,
          }}
        >
          Promotional spot dotted border: background-image linear-gradient dashes (4px repeat)
        </div>
      </div>

      {/* ── Shadow system ── */}
      <SectionLabel>Shadow System</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-dark)",
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Shadows are used sparingly — primarily for magazine cover rotation and
        dropdown menus, not for cards or content containers.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { shadow: "2px 2px 7px 0 rgba(0,0,0,0.15)", usage: "Magazine cover image (rotated 5deg)" },
          { shadow: "0 2px 4px 0 rgba(0,0,0,0.24)", usage: "Subscribe CTA button" },
          { shadow: "-2px 2px 7px 0 rgba(0,0,0,0.2)", usage: "Magazine cover image (fallback)" },
          { shadow: "none", usage: "Article cards, feed items, section containers (no shadow)" },
        ].map((s) => (
          <div
            key={s.usage}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: "#fff",
                border: "1px solid #e7e7e7",
                borderRadius: 4,
                boxShadow: s.shadow !== "none" ? s.shadow : undefined,
                flexShrink: 0,
              }}
            />
            <div>
              <code
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-dark)",
                }}
              >
                {s.shadow}
              </code>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 12,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                {s.usage}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
