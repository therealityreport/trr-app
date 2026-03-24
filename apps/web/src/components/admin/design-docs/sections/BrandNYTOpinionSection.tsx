"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["nyt-opinion"] as Record<string, IllustrationPrompts>;

/* ------------------------------------------------------------------ */
/*  NYT Opinion Brand Reference                                       */
/*  Op-eds, editorial illustrations, columnists                       */
/* ------------------------------------------------------------------ */

/* ---- helpers ---- */

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
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

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

interface SwatchProps {
  name: string;
  hex: string;
}

function Swatch({ name, hex }: SwatchProps) {
  const lum = relativeLuminance(hex);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 4,
          background: hex,
          border: lum > 0.9 ? "1px solid #E2E2E2" : "none",
          flexShrink: 0,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
          }}
        >
          {hex}
        </div>
      </div>
    </div>
  );
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/* ---- data ---- */

const OPINION_COLORS: SwatchProps[] = [
  { name: "Opinion Red", hex: "#D0021B" },
  { name: "Pure Black", hex: "#000000" },
  { name: "Dark Text", hex: "#121212" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Warm Gray", hex: "#F7F5F0" },
  { name: "Illustration Blue", hex: "#4A7FB5" },
  { name: "Illustration Orange", hex: "#E8913A" },
  { name: "Illustration Green", hex: "#5B8C5A" },
  { name: "Soft Gray", hex: "#999999" },
  { name: "Border", hex: "#E2E2E2" },
];

const TYPE_SCALE = [40, 32, 28, 24, 18, 16, 14, 12];

/* ---- component ---- */

export default function BrandNYTOpinionSection() {
  return (
    <div>
      {/* ── Brand Header ─────────────────────────────────── */}
      <div
        style={{
          background: "#FFFFFF",
          borderTop: "4px solid #000000",
          padding: "32px 0 24px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 40,
            color: "#121212",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          Opinion
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "#999999",
            marginTop: 8,
            fontStyle: "italic",
          }}
        >
          Illustrated argument &mdash; where editorial art meets conviction
        </div>
      </div>

      {/* ── 1. Typography ────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Column Headlines */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Column Headlines &mdash; Cheltenham Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            color: "#000000",
          }}
        >
          Democracy&rsquo;s Fragile Promise
        </div>
        <SpecimenMeta text="Cheltenham Bold | 32px | -0.02em tracking" />
      </div>

      {/* Columnist Name */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Columnist Name &mdash; Franklin Gothic Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 16,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: "#000000",
          }}
        >
          By Jamelle Bouie
        </div>
        <SpecimenMeta text="Franklin Gothic Bold | 16px | uppercase | 0.05em tracking" />
      </div>

      {/* Body */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Body &mdash; Gloucester Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.75,
            color: "#121212",
            maxWidth: 620,
          }}
        >
          The question is not whether democracy can survive its current crisis, but
          whether the institutions designed to protect it are still capable of doing
          so. The answer depends less on law than on the willingness of citizens to
          insist on accountability, even when it is inconvenient.
        </div>
        <SpecimenMeta text="Gloucester Regular | 18px | 1.75 line-height | 620px max-width" />
      </div>

      {/* Pull Quotes */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Pull Quotes &mdash; Cheltenham Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.35,
            color: "#121212",
            maxWidth: 560,
          }}
        >
          &ldquo;The arc of history does not bend on its own. It bends because people
          pull it.&rdquo;
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "#999999",
            marginTop: 8,
          }}
        >
          &mdash; Opinion Columnist
        </div>
        <SpecimenMeta text="Cheltenham Italic | 28px | em-dash attribution" />
      </div>

      {/* Section Labels */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Section Labels &mdash; Franklin Gothic
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["Guest Essay", "Editorial Board", "Sunday Review"].map((label) => (
            <span
              key={label}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase" as const,
                letterSpacing: "0.04em",
                color: "#D0021B",
              }}
            >
              {label}
            </span>
          ))}
        </div>
        <SpecimenMeta text='Franklin Gothic | 12px | uppercase | red (#D0021B)' />
      </div>

      {/* Letters Header */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 6,
          }}
        >
          Letters Header &mdash; Cheltenham Bold Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 24,
            color: "#000000",
          }}
        >
          Letters to the Editor
        </div>
        <SpecimenMeta text="Cheltenham Bold Italic | 24px" />
      </div>

      {/* Type Scale */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #E2E2E2" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#999999",
            marginBottom: 12,
          }}
        >
          Type Scale
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
          {TYPE_SCALE.map((size) => (
            <span
              key={size}
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: size,
                color: "#000000",
                lineHeight: 1.1,
              }}
            >
              {size}
            </span>
          ))}
        </div>
        <SpecimenMeta text="40 > 32 > 28 > 24 > 18 > 16 > 14 > 12" />
      </div>

      {/* ── 2. Color Palette ─────────────────────────────── */}
      <div id="colors" />
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
          marginBottom: 32,
        }}
      >
        {OPINION_COLORS.map((c) => (
          <Swatch key={c.name} {...c} />
        ))}
      </div>

      {/* ── 3. Components ────────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* Op-Ed Card */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
        }}
      >
        Op-Ed Card
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {[
          { title: "The Myth of Meritocracy in Higher Education", author: "Tressie McMillan Cottom", label: "Guest Essay" },
          { title: "Why the Economy Feels Broken", author: "Paul Krugman", label: "Editorial Board" },
          { title: "What the Court Got Wrong on Voting Rights", author: "Jamelle Bouie", label: "Sunday Review" },
        ].map((card, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #E2E2E2",
              background: "#FFFFFF",
            }}
          >
            {/* Illustration placeholder */}
            <div
              style={{
                height: 180,
                background: "#F7F5F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Abstract editorial illustration */}
              <div style={{ position: "relative", width: 120, height: 120 }}>
                <div
                  style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: i === 0 ? "50%" : 0,
                    background: i === 0 ? "#4A7FB5" : i === 1 ? "#E8913A" : "#5B8C5A",
                    border: "3px solid #000000",
                    top: 0,
                    left: 0,
                    transform: `rotate(${i * 15}deg)`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 60,
                    height: 60,
                    borderRadius: i === 1 ? "50%" : 0,
                    background: i === 0 ? "#E8913A" : i === 1 ? "#5B8C5A" : "#4A7FB5",
                    border: "3px solid #000000",
                    bottom: 0,
                    right: 0,
                    transform: `rotate(${-i * 10}deg)`,
                  }}
                />
              </div>
            </div>
            <div style={{ padding: "16px 20px 20px" }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.04em",
                  color: "#D0021B",
                  marginBottom: 8,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 22,
                  lineHeight: 1.2,
                  color: "#000000",
                  marginBottom: 8,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.03em",
                  color: "#121212",
                }}
              >
                By {card.author}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Columnist Header */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
        }}
      >
        Columnist Header
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid #E2E2E2",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 9999,
            background: "linear-gradient(135deg, #4A7FB5, #5B8C5A)",
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 18,
              textTransform: "uppercase" as const,
              letterSpacing: "0.03em",
              color: "#000000",
            }}
          >
            Jamelle Bouie
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "#999999",
            }}
          >
            Opinion Columnist, The New York Times
          </div>
        </div>
      </div>

      {/* Pull Quote Block */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
        }}
      >
        Pull Quote Block
      </div>
      <div
        style={{
          borderLeft: "4px solid #D0021B",
          background: "#F7F5F0",
          padding: "24px 28px",
          marginBottom: 32,
          maxWidth: 600,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 24,
            lineHeight: 1.4,
            color: "#121212",
          }}
        >
          &ldquo;The measure of a democracy is not in its quiet days, but in how it
          responds when its foundations are tested.&rdquo;
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "#999999",
            marginTop: 12,
          }}
        >
          &mdash; Guest Essayist
        </div>
      </div>

      {/* Editorial Illustration Placeholder */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
        }}
      >
        Editorial Illustration Style
      </div>
      <div
        style={{
          background: "#F7F5F0",
          padding: 32,
          marginBottom: 32,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Flat Color Blocks */}
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
            <div
              style={{
                position: "absolute",
                width: 80,
                height: 80,
                background: "#4A7FB5",
                border: "3px solid #000000",
                top: 0,
                left: 10,
                transform: "rotate(-8deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "#E8913A",
                border: "3px solid #000000",
                bottom: 0,
                right: 0,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 50,
                height: 90,
                background: "#5B8C5A",
                border: "3px solid #000000",
                bottom: 10,
                left: 0,
                transform: "rotate(5deg)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "#999999",
              marginTop: 12,
            }}
          >
            Flat Color Blocks
          </div>
        </div>

        {/* Layered Composition */}
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
            <div
              style={{
                position: "absolute",
                width: 100,
                height: 60,
                background: "#E8913A",
                border: "3px solid #000000",
                top: 10,
                left: 5,
                transform: "rotate(-12deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 60,
                height: 100,
                background: "#4A7FB5",
                border: "3px solid #000000",
                top: 20,
                right: 10,
                transform: "rotate(8deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "#5B8C5A",
                border: "3px solid #000000",
                bottom: 0,
                left: 20,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "#999999",
              marginTop: 12,
            }}
          >
            Layered Composition
          </div>
        </div>

        {/* Portrait Style */}
        <div style={{ textAlign: "center" }}>
          <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
            {/* Head shape */}
            <div
              style={{
                position: "absolute",
                width: 80,
                height: 100,
                borderRadius: "50% 50% 45% 45%",
                background: "#E8913A",
                border: "3px solid #000000",
                top: 10,
                left: 30,
              }}
            />
            {/* Eye region */}
            <div
              style={{
                position: "absolute",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#000000",
                top: 50,
                left: 50,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#000000",
                top: 50,
                right: 42,
              }}
            />
            {/* Background accent */}
            <div
              style={{
                position: "absolute",
                width: 60,
                height: 60,
                background: "#4A7FB5",
                border: "3px solid #000000",
                bottom: 0,
                left: 0,
                transform: "rotate(15deg)",
                zIndex: -1,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 600,
              color: "#999999",
              marginTop: 12,
            }}
          >
            Portrait Style
          </div>
        </div>
      </div>
      <SpecimenMeta text="Bold, simplified, slightly confrontational illustration -- flat color, heavy outlines, geometric" />

      {/* Letters Section */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
          marginTop: 24,
        }}
      >
        Letters Section
      </div>
      <div style={{ maxWidth: 620, marginBottom: 32 }}>
        {[
          {
            header: "Re: Democracy's Fragile Promise",
            body: "The columnist rightly points out that institutional decay is not a sudden event. What concerns me most is the normalization of rule-bending at every level of governance.",
            author: "David Chen, Portland, Ore.",
          },
          {
            header: "Re: The Economy Feels Broken",
            body: "While I agree that economic indicators fail to capture lived experience, the piece overlooks the role of housing costs in driving the disconnect between GDP growth and individual prosperity.",
            author: "Sarah Linton, Austin, Tex.",
          },
        ].map((letter, i) => (
          <div
            key={i}
            style={{
              paddingBottom: 20,
              marginBottom: 20,
              borderBottom: "1px solid #E2E2E2",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontStyle: "italic",
                fontSize: 18,
                color: "#000000",
                marginBottom: 8,
              }}
            >
              {letter.header}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 16,
                lineHeight: 1.65,
                color: "#121212",
                marginBottom: 8,
              }}
            >
              {letter.body}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                color: "#999999",
              }}
            >
              {letter.author}
            </div>
          </div>
        ))}
      </div>

      {/* Board Editorial Badge */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "#999999",
          marginBottom: 12,
        }}
      >
        Board Editorial Badge
      </div>
      <div
        style={{
          display: "inline-block",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 14,
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: "#000000",
            paddingBottom: 6,
          }}
        >
          The Editorial Board
        </div>
        <div style={{ height: 3, width: 48, background: "#D0021B" }} />
      </div>

      {/* AI-Generated Editorial Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "#D0021B", marginTop: 48 }}>AI-Generated Editorial Art</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Opinion editorial illustration styles — bold, simplified, slightly confrontational. Toggle between AI models.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["op-ed-democracy"]}
          brandAccent="#D0021B"
          height={280}
        />
        <AIIllustration
          prompts={PROMPTS["columnist-portrait"]}
          brandAccent="#4A7FB5"
          height={280}
        />
        <AIIllustration
          prompts={PROMPTS["op-ed-technology"]}
          brandAccent="#E8913A"
          height={240}
        />
      </div>

      {/* ── 4. Layout Patterns ───────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            name: "Op-Ed Page",
            desc: "Single column (620px), large headline, illustration spans full width, prose below",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <div style={{ height: 6, background: "#000000" }} />
                <div style={{ height: 40, background: "#F7F5F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#4A7FB5", border: "2px solid #000" }} />
                </div>
                <div style={{ height: 4, width: "80%", background: "#E2E2E2" }} />
                <div style={{ height: 3, width: "90%", background: "#E2E2E2" }} />
                <div style={{ height: 3, width: "85%", background: "#E2E2E2" }} />
                <div style={{ height: 3, width: "70%", background: "#E2E2E2" }} />
              </div>
            ),
          },
          {
            name: "Opinion Landing",
            desc: "3-column masonry of op-ed cards with illustrations, headlines, bylines",
            layout: (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} style={{ background: "#F7F5F0", border: "1px solid #E2E2E2" }}>
                    <div style={{ height: 16, background: n % 3 === 0 ? "#4A7FB5" : n % 3 === 1 ? "#E8913A" : "#5B8C5A", opacity: 0.6 }} />
                    <div style={{ padding: 2 }}>
                      <div style={{ height: 2, width: "80%", background: "#121212", marginBottom: 1 }} />
                      <div style={{ height: 1, width: "60%", background: "#999" }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            name: "Columnist Page",
            desc: "Author header + chronological feed of their columns",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 9999, background: "#4A7FB5" }} />
                  <div>
                    <div style={{ height: 3, width: 40, background: "#000" }} />
                    <div style={{ height: 2, width: 30, background: "#999", marginTop: 1 }} />
                  </div>
                </div>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ padding: "3px 0", borderBottom: "1px solid #E2E2E2" }}>
                    <div style={{ height: 2, width: "85%", background: "#121212" }} />
                    <div style={{ height: 1, width: "50%", background: "#999", marginTop: 2 }} />
                  </div>
                ))}
              </div>
            ),
          },
          {
            name: "Letters Page",
            desc: "Stacked layout, alternating letter/response pairs",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                {[1, 2, 3].map((n) => (
                  <div key={n} style={{ borderBottom: "1px solid #E2E2E2", paddingBottom: 3 }}>
                    <div style={{ height: 2, width: "70%", background: "#000", fontStyle: "italic" }} />
                    <div style={{ height: 2, width: "90%", background: "#E2E2E2", marginTop: 2 }} />
                    <div style={{ height: 2, width: "80%", background: "#E2E2E2", marginTop: 1 }} />
                    <div style={{ height: 1, width: "40%", background: "#999", marginTop: 2 }} />
                  </div>
                ))}
              </div>
            ),
          },
        ].map((pattern) => (
          <div
            key={pattern.name}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E2E2",
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 13,
                color: "#000000",
                marginBottom: 4,
              }}
            >
              {pattern.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 11,
                color: "#999999",
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              {pattern.desc}
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E2E2",
                padding: 8,
                minHeight: 80,
              }}
            >
              {pattern.layout}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Illustration Style Guide ──────────────────── */}
      <SectionLabel>Illustration Style Guide</SectionLabel>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "#121212",
          maxWidth: 620,
          marginBottom: 16,
        }}
      >
        NYT Opinion art uses bold, simplified, slightly confrontational illustration
        &mdash; not photorealistic. Flat color blocks in blue, orange, and green with
        thick black outlines. Compositions are layered and angular, suggesting
        editorial collage. Portrait illustrations are simplified face outlines with
        bold color fills.
      </div>

      {/* ── 6. Shapes & Radius ───────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Cards", value: "0px", radius: 0 },
          { label: "Author Photos", value: "9999px", radius: 9999 },
          { label: "Pull Quote", value: "0px + 4px left", radius: 0 },
          { label: "Illustration Frames", value: "0px", radius: 0 },
          { label: "Buttons", value: "0px", radius: 0 },
        ].map((shape) => (
          <div key={shape.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 8px",
                background: shape.label === "Author Photos" ? "linear-gradient(135deg, #4A7FB5, #5B8C5A)" : "#000000",
                borderRadius: shape.radius,
                borderLeft: shape.label === "Pull Quote" ? "4px solid #D0021B" : undefined,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
              }}
            >
              {shape.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
              }}
            >
              {shape.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
