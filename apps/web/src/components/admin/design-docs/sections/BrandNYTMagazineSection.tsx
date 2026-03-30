"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["nyt-magazine"] as Record<string, IllustrationPrompts>;

/* ------------------------------------------------------------------ */
/*  NYT Magazine Brand Section — Editorial covers, longform features, */
/*  photo essays                                                      */
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
        color: "var(--dd-brand-accent)",
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
  { name: "Pure Black", hex: "#000000", use: "Headlines, borders" },
  { name: "Rich Black", hex: "#121212", use: "Body text" },
  { name: "Paper White", hex: "#FFFFFF", use: "Primary background" },
  { name: "Warm Cream", hex: "#F7F5F0", use: "Feature backgrounds" },
  { name: "Magazine Red", hex: "#D0021B", use: "Accent, drop caps" },
  { name: "Magazine Blue", hex: "#326DA8", use: "Links, highlights" },
  { name: "Soft Gray", hex: "#999999", use: "Captions, metadata" },
  { name: "Dark Charcoal", hex: "#333333", use: "Secondary text" },
  { name: "Cover Pink", hex: "#F5C6D0", use: "Occasional cover accent" },
  { name: "Cover Yellow", hex: "#F6E27F", use: "Occasional cover accent" },
] as const;

const TYPE_SCALE = [
  { size: 64, label: "Cover" },
  { size: 48, label: "Feature" },
  { size: 36, label: "Headline" },
  { size: 28, label: "Subhead" },
  { size: 20, label: "Deck" },
  { size: 18, label: "Body" },
  { size: 14, label: "Byline" },
  { size: 12, label: "Caption" },
] as const;

const RADIUS_TOKENS = [
  { label: "Everything", value: "0px" },
  { label: "Dividers", value: "1px solid #000" },
  { label: "Drop Caps", value: "Sharp square" },
  { label: "Cover Text", value: "No background" },
] as const;

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTMagazineSection() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Magazine</h2>
      <p className="dd-section-desc">
        The New York Times Magazine &mdash; editorial covers, longform features,
        photo essays. Dramatic design where photography and typography collide.
      </p>

      {/* ── 1. Brand Header ───────────────────────────────── */}
      <SectionLabel>Brand Header</SectionLabel>
      <div
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #000000",
          padding: "40px 32px 24px",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 36,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          The New York Times Magazine
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-display)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--dd-brand-text-muted)",
            marginTop: 10,
          }}
        >
          Dramatic editorial design &mdash; where photography and typography collide
        </div>
      </div>

      {/* ── 2. Typography ─────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Cover Display — Cheltenham Black Italic */}
      <div
        style={{
          background: "#000000",
          padding: "40px 32px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "#999999",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Cover Display &mdash; Cheltenham Black Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 64,
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
            marginBottom: 8,
          }}
        >
          The Year
          <br />
          in Ideas
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 900,
            fontStyle: "italic",
            fontSize: 48,
            color: "#F5C6D0",
            letterSpacing: "-0.03em",
            lineHeight: 1.0,
            marginTop: 16,
          }}
        >
          What We Lost
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#999999",
            marginTop: 16,
          }}
        >
          Cheltenham Black Italic | 64px / 48px | Massive cover headlines
        </div>
      </div>

      {/* Feature Headlines — Cheltenham Bold */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #000000",
          padding: "28px 32px",
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
          Feature Headlines &mdash; Cheltenham Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 36,
            color: "#000000",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          The Untold Story of How One Decision Changed Everything
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 12,
          }}
        >
          Cheltenham Bold | 36px | -0.02em tracking
        </div>
      </div>

      {/* Deck / Subhead — Gloucester Italic */}
      <div
        style={{
          background: "#F7F5F0",
          border: "1px solid #E8E5E0",
          padding: "28px 32px",
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
          Deck / Subhead &mdash; Gloucester Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-display)",
            fontStyle: "italic",
            fontSize: 20,
            color: "#333333",
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          For decades, the small coastal town had been quietly disappearing.
          Then came the storm that no one predicted, and the reckoning that
          followed.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 12,
          }}
        >
          Gloucester Italic | 20px | 1.5 line-height | Article decks
        </div>
      </div>

      {/* Body — Gloucester Regular */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E5E0",
          padding: "28px 32px",
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
            fontSize: 18,
            color: "#121212",
            lineHeight: 1.75,
            maxWidth: 640,
          }}
        >
          The morning light fell across the kitchen table where three
          generations of women sat in silence. Outside, the oak that had
          survived two hurricanes listed badly toward the neighbor&rsquo;s
          fence. It was the kind of quiet that precedes not peace but
          decision. Nobody spoke first because everyone knew what speaking
          would require.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 12,
          }}
        >
          Gloucester Regular | 18px | 1.75 line-height | 640px max-width
        </div>
      </div>

      {/* Captions & Byline — Franklin Gothic */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8E5E0",
            padding: "24px 28px",
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
            Captions &mdash; Franklin Gothic
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 400,
              color: "#999999",
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              lineHeight: 1.5,
            }}
          >
            A fisherman mends his nets on the shore of Kivalina, Alaska,
            where rising waters threaten the village.
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            Franklin Gothic | 12px | uppercase | 0.08em
          </div>
        </div>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8E5E0",
            padding: "24px 28px",
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
            Byline &mdash; Franklin Gothic Medium
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "#333333",
              lineHeight: 1.4,
            }}
          >
            By Sarah Collins
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "#999999",
              marginTop: 4,
            }}
          >
            March 21, 2026
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            Franklin Gothic Medium | 14px | Author credit
          </div>
        </div>
      </div>

      {/* Type Scale */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #000000",
          padding: "28px 32px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-brand-accent)",
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            marginBottom: 20,
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
              gap: 20,
              marginBottom: 6,
              borderBottom: "1px solid #F0F0F0",
              paddingBottom: 6,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "#999999",
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
                fontWeight: 700,
                fontSize: Math.min(t.size, 48),
                color: "#000000",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
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
                  c.hex === "#FFFFFF" || c.hex === "#F7F5F0"
                    ? "1px solid #E8E5E0"
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

      {/* Magazine Cover */}
      <div className="dd-palette-label">Magazine Cover</div>
      <div
        style={{
          position: "relative",
          aspectRatio: "3 / 4",
          maxWidth: 360,
          background: "linear-gradient(180deg, #333 0%, #121212 100%)",
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%)",
          }}
        />
        {/* Placeholder texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)",
          }}
        />
        {/* Text overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 28,
            right: 28,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "#FFFFFF",
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            The
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: 52,
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 0.9,
            }}
          >
            Reckoning
          </div>
        </div>
        {/* Masthead */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 11,
            color: "#FFFFFF",
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            opacity: 0.6,
          }}
        >
          The New York Times Magazine
        </div>
      </div>

      {/* Feature Opener */}
      <div className="dd-palette-label">Feature Opener</div>
      <div style={{ marginBottom: 24 }}>
        {/* Hero placeholder */}
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background: "linear-gradient(135deg, #333 0%, #666 50%, #333 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 8px, #fff 8px, #fff 10px)",
            }}
          />
        </div>
        <div style={{ padding: "24px 0" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 900,
              fontSize: 36,
              color: "#000000",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              marginBottom: 12,
            }}
          >
            The Quiet Collapse of the American Small Town
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-display)",
              fontStyle: "italic",
              fontSize: 20,
              color: "#333333",
              lineHeight: 1.5,
              maxWidth: 600,
              marginBottom: 12,
            }}
          >
            Across the heartland, communities that once defined the nation are
            disappearing. What happens to the people who remain?
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "#333333",
            }}
          >
            By Sarah Collins
          </div>
        </div>
      </div>

      {/* Pull Quote */}
      <div className="dd-palette-label">Pull Quote</div>
      <div
        style={{
          borderLeft: "4px solid #000000",
          padding: "24px 32px",
          margin: "0 0 24px 0",
          maxWidth: 600,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 28,
            color: "#000000",
            letterSpacing: "-0.01em",
            lineHeight: 1.3,
          }}
        >
          &ldquo;We didn&rsquo;t leave because we had nowhere else to go. We
          stayed because this was the only place that made sense.&rdquo;
        </div>
      </div>

      {/* Photo Caption */}
      <div className="dd-palette-label">Photo Caption</div>
      <div style={{ maxWidth: 480, marginBottom: 24 }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "3 / 2",
            background: "linear-gradient(135deg, #555 0%, #888 50%, #555 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.05,
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 4px, #fff 4px, #fff 6px)",
            }}
          />
        </div>
        <div
          style={{
            borderTop: "1px solid #000000",
            paddingTop: 8,
            marginTop: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 400,
              color: "#999999",
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              lineHeight: 1.5,
            }}
          >
            The last general store in Elmore County closed its doors in
            November after 87 years of continuous operation.
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "#999999",
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Photograph by James Whitfield
          </div>
        </div>
      </div>

      {/* Drop Cap */}
      <div className="dd-palette-label">Drop Cap</div>
      <div
        style={{
          maxWidth: 640,
          marginBottom: 32,
          fontFamily: "var(--dd-font-body)",
          fontSize: 18,
          color: "#121212",
          lineHeight: 1.75,
        }}
      >
        <span
          style={{
            float: "left",
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 900,
            fontSize: 72,
            color: "#D0021B",
            lineHeight: 0.8,
            paddingRight: 8,
            paddingTop: 6,
          }}
        >
          T
        </span>
        he road into town was unmarked. Not because it was hidden but because
        everyone who needed to find it already knew where it was. The pavement
        gave way to gravel at the county line, and the gravel gave way to packed
        earth just past the old mill. Three generations of families had traveled
        this route and each one left something behind.
      </div>

      {/* AI-Generated Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "var(--dd-brand-accent)", marginTop: 48 }}>AI-Generated Illustrations</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Magazine cover and editorial illustration styles. Toggle between AI models.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["cover-art"]}
          brandAccent="#D0021B"
          aspectRatio="3 / 4"
          height={320}
        />
        <AIIllustration
          prompts={PROMPTS["feature-illustration"]}
          brandAccent="#326DA8"
          aspectRatio="3 / 4"
          height={320}
        />
        <AIIllustration
          prompts={PROMPTS["photo-essay"]}
          brandAccent="#000000"
          aspectRatio="16 / 9"
          height={220}
        />
      </div>

      {/* ── 5. Layout Patterns ────────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Cover Layout */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #000000",
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Cover Layout
          </div>
          <div
            style={{
              aspectRatio: "3 / 4",
              background: "#121212",
              position: "relative",
              maxHeight: 180,
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 900,
                fontSize: 20,
                color: "#FFFFFF",
                fontStyle: "italic",
                lineHeight: 0.95,
              }}
            >
              Title
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            Full bleed, text overlay, 3:4 aspect
          </div>
        </div>

        {/* Feature Grid */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #000000",
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Feature Grid
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60% 40%", gap: 8 }}>
            <div>
              <div
                style={{
                  background: "#E8E5E0",
                  aspectRatio: "4 / 3",
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 6,
                  width: "80%",
                  background: "#000000",
                  marginBottom: 4,
                }}
              />
              <div style={{ height: 4, width: "60%", background: "#999" }} />
            </div>
            <div>
              <div
                style={{
                  background: "#E8E5E0",
                  aspectRatio: "1 / 1",
                  marginBottom: 6,
                }}
              />
              <div
                style={{
                  height: 4,
                  width: "70%",
                  background: "#000",
                  marginBottom: 4,
                }}
              />
              <div style={{ height: 3, width: "50%", background: "#999" }} />
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            Asymmetric 2-column (60/40 split)
          </div>
        </div>

        {/* Photo Essay */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #000000",
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Photo Essay
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  background: `linear-gradient(${120 + i * 30}deg, #555, #888)`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            Full-width images, 96px whitespace
          </div>
        </div>

        {/* Department Page */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #000000",
            padding: 20,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              color: "#000000",
              marginBottom: 8,
            }}
          >
            Department Page
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div
                  style={{
                    background: "#E8E5E0",
                    aspectRatio: "3 / 2",
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    height: 5,
                    width: "90%",
                    background: "#000",
                    marginBottom: 3,
                  }}
                />
                <div style={{ height: 3, width: "60%", background: "#999" }} />
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 8,
            }}
          >
            3-column grid, image + headline + byline
          </div>
        </div>
      </div>

      {/* ── 6. Shapes & Radius ────────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {RADIUS_TOKENS.map((r) => (
          <div
            key={r.label}
            style={{
              background: "#FFFFFF",
              border: "1px solid #000000",
              padding: 16,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 8px",
                background: "#000000",
                borderRadius: 0,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "#000000",
              }}
            >
              {r.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {/* Design Principles */}
      <SectionLabel>Design Principles</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            title: "Scale",
            desc: "Headlines dominate. 64px cover type commands the page. Let typography be architecture.",
          },
          {
            title: "Negative Space",
            desc: "Whitespace is a design element. 96px between photo essay images. Let content breathe.",
          },
          {
            title: "Sharp Edges",
            desc: "Zero border-radius everywhere. Dividers are 1px solid black, not gray. Editorial authority.",
          },
          {
            title: "Photo Dominance",
            desc: "Full-bleed imagery. Text floats directly on photographs. No decorative backgrounds.",
          },
        ].map((p) => (
          <div
            key={p.title}
            style={{
              borderTop: "4px solid #000000",
              paddingTop: 16,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: 18,
                color: "#000000",
                marginBottom: 6,
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                color: "#333333",
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
