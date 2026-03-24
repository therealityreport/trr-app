"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["nyt-style"] as Record<string, IllustrationPrompts>;

/* ------------------------------------------------------------------ */
/*  NYT Style Brand Section — Fashion, Trends, Red Carpet, Personal   */
/*  Style                                                              */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "#6B1D3A",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

/* ── Inline Data ──────────────────────────────────────────────────── */

const COLORS = [
  { name: "Pure White", hex: "#FFFFFF", use: "Primary background, clean runway feel" },
  { name: "True Black", hex: "#000000", use: "Headlines, dramatic contrast" },
  { name: "Soft Black", hex: "#1A1A1A", use: "Body text" },
  { name: "Blush Pink", hex: "#F5E0D8", use: "Accent, featured backgrounds" },
  { name: "Nude / Champagne", hex: "#E8D5C4", use: "Secondary accent" },
  { name: "Deep Burgundy", hex: "#6B1D3A", use: "Editorial accent, special features" },
  { name: "Fashion Gold", hex: "#C4A265", use: "Luxury accent, awards season" },
  { name: "Cool Gray", hex: "#B0B0B0", use: "Captions, metadata" },
  { name: "Warm Cream", hex: "#FAF7F2", use: "Alternate section backgrounds" },
  { name: "Border Silver", hex: "#E5E5E5", use: "Subtle dividers" },
] as const;

const TYPE_SCALE = [
  { size: 48, label: "Display" },
  { size: 36, label: "Feature" },
  { size: 28, label: "Trend" },
  { size: 22, label: "Subhead" },
  { size: 17, label: "Body" },
  { size: 14, label: "Caption" },
  { size: 12, label: "Fine" },
  { size: 10, label: "Credit" },
] as const;

const RADIUS_TOKENS = [
  { label: "Photos", value: "0px (full bleed)" },
  { label: "Cards", value: "0px (spacing-defined)" },
  { label: "Buttons", value: "0px, 1px border" },
  { label: "Everything", value: "0px — razor sharp editorial" },
] as const;

const MASONRY_ITEMS = [
  { aspect: "3 / 4", label: "Portrait" },
  { aspect: "4 / 3", label: "Landscape" },
  { aspect: "1 / 1", label: "Square" },
  { aspect: "3 / 4", label: "Portrait" },
  { aspect: "4 / 3", label: "Landscape" },
  { aspect: "1 / 1", label: "Square" },
] as const;

const RED_CARPET_NAMES = [
  "Zendaya",
  "Timothée Chalamet",
  "Rihanna",
  "Florence Pugh",
  "Dev Patel",
  "Anya Taylor-Joy",
] as const;

const OUTFIT_CREDITS = [
  { designer: "Valentino", item: "Silk evening gown, floor-length", price: "$12,500" },
  { designer: "Jimmy Choo", item: "Crystal-embellished sandals", price: "$1,295" },
  { designer: "Cartier", item: "Diamond tennis bracelet", price: "$28,000" },
  { designer: "Bottega Veneta", item: "Intrecciato clutch, gold", price: "$3,200" },
] as const;

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTStyleSection() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Style</h2>
      <p className="dd-section-desc">
        Fashion-forward editorial &mdash; photography-first, refined restraint.
        Red carpet, trends, personal style.
      </p>

      {/* ── 1. Brand Header ───────────────────────────────── */}
      <SectionLabel>Brand Header</SectionLabel>
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 0,
          padding: "56px 32px",
          textAlign: "center",
          marginBottom: 32,
          border: "1px solid #E5E5E5",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 300,
            fontSize: 38,
            color: "#000000",
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            marginBottom: 12,
          }}
        >
          NYT Style
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            color: "#B0B0B0",
            fontStyle: "italic",
          }}
        >
          Fashion-forward editorial &mdash; photography-first, refined restraint
        </div>
      </div>

      {/* ── 2. Typography ─────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Feature Headlines — Cheltenham Regular */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Feature Headlines &mdash; Cheltenham Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 400,
            fontSize: 36,
            color: "#000000",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            textTransform: "uppercase" as const,
          }}
        >
          The New Rules of Dressing
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Cheltenham Regular | 36px | -0.01em | Uppercase optional | Elegant restraint, not bold
        </div>
      </div>

      {/* Trend Headlines — Cheltenham Bold Italic */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Trend Headlines &mdash; Cheltenham Bold Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 28,
            color: "#000000",
            lineHeight: 1.2,
            fontStyle: "italic",
          }}
        >
          What We&rsquo;re Wearing Now
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Cheltenham Bold Italic | 28px | Trend features, seasonal stories
        </div>
      </div>

      {/* Body — Gloucester Regular */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Body &mdash; Gloucester Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 17,
            color: "#1A1A1A",
            lineHeight: 1.7,
            maxWidth: 520,
          }}
        >
          The silhouette has shifted dramatically this season, with designers
          embracing a return to structured tailoring while maintaining the
          ease that defined recent collections. It is a balance of precision
          and nonchalance.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Gloucester Regular | 17px | 1.7 line-height | Style journalism
        </div>
      </div>

      {/* Photo Credits — Franklin Gothic */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Photo Credits &mdash; Franklin Gothic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            color: "#B0B0B0",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
          }}
        >
          Photograph by Jamie Hawkesworth for The New York Times
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Franklin Gothic | 10px | Uppercase | 0.1em tracking
        </div>
      </div>

      {/* Category Labels — Franklin Gothic Medium */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Category Labels &mdash; Franklin Gothic Medium
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["Fashion", "Beauty", "Weddings", "Red Carpet", "Personal Style"].map((cat) => (
            <div
              key={cat}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 500,
                color: "#000000",
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
              }}
            >
              {cat}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Franklin Gothic Medium | 11px | Uppercase | 0.12em tracking
        </div>
      </div>

      {/* Captions — Gloucester Italic */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 12,
          }}
        >
          Captions &mdash; Gloucester Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontStyle: "italic",
            fontSize: 14,
            color: "#1A1A1A",
            lineHeight: 1.5,
            maxWidth: 400,
          }}
        >
          A model backstage at the Dior haute couture show in Paris, wearing an
          embroidered tulle gown from the spring collection.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Gloucester Italic | 14px | Descriptive photo captions
        </div>
      </div>

      {/* Type Scale */}
      <div
        style={{
          background: "#000000",
          borderRadius: 0,
          padding: "24px 28px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "#C4A265",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Type Scale
        </div>
        {TYPE_SCALE.map((t) => (
          <div
            key={t.size}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "#B0B0B0",
                width: 40,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {t.size}px
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 400,
                fontSize: t.size,
                color: "#FFFFFF",
                lineHeight: 1.2,
              }}
            >
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Color Palette ──────────────────────────────── */}
      <div id="colors" />
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {COLORS.map((c) => (
          <div key={c.name} className="dd-swatch">
            <div
              className="dd-swatch-color"
              style={{
                background: c.hex,
                borderRadius: 0,
                border:
                  c.hex === "#FFFFFF"
                    ? "1px solid #E5E5E5"
                    : c.hex === "#000000"
                      ? "1px solid #333"
                      : undefined,
              }}
            />
            <div className="dd-swatch-info">
              <div className="dd-swatch-name">{c.name}</div>
              <div className="dd-swatch-hex">{c.hex}</div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                {c.use}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. Components ─────────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* Full-Bleed Photo Hero */}
      <div className="dd-palette-label">Full-Bleed Photo Hero</div>
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: "linear-gradient(135deg, #1A1A1A 0%, #000000 100%)",
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#333",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
          }}
        >
          16 : 9 Full-Bleed Photo
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 32px 24px",
            background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 400,
              fontSize: 32,
              color: "#FFFFFF",
              lineHeight: 1.15,
              marginBottom: 8,
              textTransform: "uppercase" as const,
              letterSpacing: "0.02em",
            }}
          >
            The Season&rsquo;s Defining Silhouette
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.1em",
            }}
          >
            Photograph by Tyler Mitchell for The New York Times
          </div>
        </div>
      </div>

      {/* Photo Grid (Masonry) */}
      <div className="dd-palette-label">Photo Grid (Masonry)</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 4,
          marginBottom: 24,
        }}
      >
        {MASONRY_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              aspectRatio: item.aspect,
              background: `linear-gradient(${120 + i * 30}deg, #2A2A2A, #1A1A1A)`,
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.4s ease",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#444",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
            >
              {item.label}
            </div>
            {/* Hover caption overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "24px 12px 8px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                opacity: 0,
                transition: "opacity 0.4s ease",
              }}
              className="masonry-caption"
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: "#FFFFFF",
                }}
              >
                Caption overlay on hover
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend Card */}
      <div className="dd-palette-label">Trend Card</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {["Oversized Tailoring", "Sheer Everything", "Quiet Luxury"].map((trend, i) => (
          <div key={trend}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "#6B1D3A",
                marginBottom: 8,
              }}
            >
              Fashion
            </div>
            <div
              style={{
                aspectRatio: "4 / 5",
                background: `linear-gradient(${150 + i * 20}deg, #E8D5C4, #F5E0D8)`,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#B0B0B0",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
            >
              4 : 5 Image
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 400,
                fontSize: 20,
                color: "#000000",
                lineHeight: 1.25,
              }}
            >
              {trend}
            </div>
          </div>
        ))}
      </div>

      {/* Red Carpet Gallery */}
      <div className="dd-palette-label">Red Carpet Gallery</div>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 12,
          marginBottom: 24,
        }}
      >
        {RED_CARPET_NAMES.map((name, i) => (
          <div
            key={name}
            style={{
              flexShrink: 0,
              width: 200,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                aspectRatio: "3 / 4",
                background: `linear-gradient(${180 + i * 15}deg, #1A1A1A, #2A2A2A)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#444",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
            >
              3 : 4 Portrait
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "32px 12px 10px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 400,
                  fontSize: 16,
                  color: "#FFFFFF",
                  lineHeight: 1.2,
                }}
              >
                {name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Before/After Slider Frame */}
      <div className="dd-palette-label">Before / After Slider</div>
      <div
        style={{
          display: "flex",
          aspectRatio: "16 / 9",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#E8D5C4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "#B0B0B0",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          Before
        </div>
        <div
          style={{
            width: 3,
            background: "#FFFFFF",
            position: "relative",
            zIndex: 1,
            cursor: "col-resize",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#FFFFFF",
              border: "2px solid #E5E5E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "#B0B0B0",
            }}
          >
            &harr;
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "#F5E0D8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "#B0B0B0",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          After
        </div>
      </div>

      {/* Outfit Credits */}
      <div className="dd-palette-label">Outfit Credits</div>
      <div
        style={{
          background: "#FAF7F2",
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        {OUTFIT_CREDITS.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              padding: "10px 0",
              borderBottom: i < OUTFIT_CREDITS.length - 1 ? "1px solid #E5E5E5" : undefined,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#000000",
                }}
              >
                {item.designer}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 13,
                  color: "#B0B0B0",
                  marginTop: 2,
                }}
              >
                {item.item}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                color: "#1A1A1A",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
                marginLeft: 16,
              }}
            >
              {item.price}
            </div>
          </div>
        ))}
      </div>

      {/* AI-Generated Fashion Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "#6B1D3A", marginTop: 48 }}>AI-Generated Fashion Art</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Fashion editorial and style illustration concepts.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["runway-illustration"]}
          brandAccent="#6B1D3A"
          aspectRatio="3 / 4"
          height={320}
        />
        <AIIllustration
          prompts={PROMPTS["accessories-flat-lay"]}
          brandAccent="#C4A265"
          aspectRatio="3 / 4"
          height={320}
        />
        <AIIllustration
          prompts={PROMPTS["trend-report"]}
          brandAccent="#F5E0D8"
          aspectRatio="16 / 9"
          height={200}
        />
      </div>

      {/* ── 5. Layout Patterns ────────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>

      {/* Style Landing */}
      <div className="dd-palette-label">Style Landing</div>
      <div
        style={{
          border: "1px solid #E5E5E5",
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ background: "#1A1A1A", height: 80, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 10 }}>
          Full-Bleed Hero
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
          <div style={{ background: "#E8D5C4", height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>Masonry</div>
          <div style={{ background: "#F5E0D8", height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>Masonry</div>
          <div style={{ background: "#E8D5C4", height: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>Masonry</div>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "hidden", marginBottom: 8 }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ flex: "0 0 80px", height: 40, background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
              Trend {n}
            </div>
          ))}
        </div>
        <div style={{ background: "#FAF7F2", height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
          Single-Column Feature
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Full-bleed hero &rarr; 3-col masonry &rarr; horizontal trend carousel &rarr; single-column feature
        </div>
      </div>

      {/* Fashion Feature */}
      <div className="dd-palette-label">Fashion Feature</div>
      <div
        style={{
          border: "1px solid #E5E5E5",
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#1A1A1A", height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 9 }}>Image Left</div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>Text block — 96px between sections</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>Text block</div>
          <div style={{ flex: 1, background: "#1A1A1A", height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 9 }}>Image Right</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Full-bleed images alternating left/right with text, 96px spacing
        </div>
      </div>

      {/* Gallery Page */}
      <div className="dd-palette-label">Gallery Page</div>
      <div
        style={{
          border: "1px solid #E5E5E5",
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: i % 2 === 0 ? "#2A2A2A" : "#1A1A1A", height: 48, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 9 }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Full-width image grid, click-to-expand lightbox feel
        </div>
      </div>

      {/* Trend Report */}
      <div className="dd-palette-label">Trend Report</div>
      <div
        style={{
          border: "1px solid #E5E5E5",
          padding: 16,
          marginBottom: 32,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ height: 8, background: "#E5E5E5", marginBottom: 4, width: "90%" }} />
            <div style={{ height: 8, background: "#E5E5E5", marginBottom: 4, width: "80%" }} />
            <div style={{ height: 8, background: "#E5E5E5", marginBottom: 12, width: "85%" }} />
            <div style={{ background: "#F5E0D8", height: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
              Pull Image
            </div>
          </div>
          <div>
            <div style={{ background: "#E8D5C4", height: 60, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
              Pull Image
            </div>
            <div style={{ height: 8, background: "#E5E5E5", marginBottom: 4, width: "85%" }} />
            <div style={{ height: 8, background: "#E5E5E5", marginBottom: 4, width: "90%" }} />
            <div style={{ height: 8, background: "#E5E5E5", width: "70%" }} />
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Magazine-style 2-column layout, large pull images, inline captions
        </div>
      </div>

      {/* ── 6. Shapes & Radius ────────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {RADIUS_TOKENS.map((r) => (
          <div
            key={r.label}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: 0,
              padding: "16px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 0,
                background: "#000000",
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 2,
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {/* Hover behavior note */}
      <div
        style={{
          background: "#FAF7F2",
          padding: "16px 20px",
          marginBottom: 32,
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          color: "#1A1A1A",
          lineHeight: 1.6,
        }}
      >
        <strong>Hover:</strong> subtle scale(1.02) on images, 0.4s transition.
        Everything razor-sharp &mdash; 0px radius across the board. Cards defined
        by spacing, not borders.
      </div>
    </div>
  );
}
