"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["wirecutter"] as Record<string, IllustrationPrompts>;

/* ================================================================
   BrandWirecutterSection — Wirecutter brand reference
   Product reviews, buying guides, deal alerts.
   Uses dd-* CSS variables throughout.
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

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function Swatch({ name, hex }: SwatchProps) {
  const lum = relativeLuminance(hex);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: hex,
          border: lum > 0.9 ? "1px solid #D9D9D9" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lum > 0.4 ? "#292929" : "#fff",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 9,
        }}
      >
        {hex}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
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

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const WC_COLORS: SwatchProps[] = [
  { name: "Wirecutter Blue", hex: "#3069B3" },
  { name: "Dark Blue", hex: "#1A3A5C" },
  { name: "Pick Green", hex: "#067A6F" },
  { name: "Budget Orange", hex: "#D4760A" },
  { name: "Upgrade Purple", hex: "#7C5CBA" },
  { name: "Alert Red", hex: "#D0021B" },
  { name: "Body Text", hex: "#292929" },
  { name: "Light BG", hex: "#F7F7F5" },
  { name: "Border Gray", hex: "#D9D9D9" },
  { name: "Caption Gray", hex: "#767676" },
];

/* ------------------------------------------------------------------ */
/*  Component specimens                                               */
/* ------------------------------------------------------------------ */

function PickCard({
  badge,
  badgeColor,
  product,
  price,
  verdict,
}: {
  badge: string;
  badgeColor: string;
  product: string;
  price: string;
  verdict: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #D9D9D9",
        borderRadius: 8,
        padding: 20,
        maxWidth: 280,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.06em",
          color: "#fff",
          background: badgeColor,
          borderRadius: 4,
          padding: "3px 8px",
          alignSelf: "flex-start",
        }}
      >
        {badge}
      </span>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontWeight: 700,
          fontSize: 17,
          color: "#292929",
        }}
      >
        {product}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 600,
          color: "#292929",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {price}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "#767676",
          lineHeight: 1.4,
        }}
      >
        {verdict}
      </div>
    </div>
  );
}

function ComparisonTable() {
  const products = ["Sony WF-1000XM5", "AirPods Pro 2", "Jabra Elite 85t"];
  const features = [
    { label: "ANC", values: [true, true, true] },
    { label: "Wireless charging", values: [true, true, false] },
    { label: "Multi-device", values: [false, false, true] },
    { label: "IP rating", values: ["IPX4", "IP54", "IP57"] },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          maxWidth: 560,
          borderCollapse: "collapse",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderBottom: "2px solid #292929",
                fontWeight: 600,
                color: "#767676",
                fontSize: 11,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
              }}
            >
              Feature
            </th>
            {products.map((p, i) => (
              <th
                key={p}
                style={{
                  textAlign: "center",
                  padding: "10px 12px",
                  borderBottom: "2px solid #292929",
                  fontWeight: 700,
                  color: "#292929",
                  fontSize: 13,
                  background: i === 0 ? "rgba(48,105,179,0.06)" : "transparent",
                }}
              >
                {p}
                {i === 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#067A6F",
                      marginTop: 2,
                    }}
                  >
                    OUR PICK
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f, fi) => (
            <tr key={f.label}>
              <td
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #D9D9D9",
                  fontWeight: 500,
                  color: "#292929",
                }}
              >
                {f.label}
              </td>
              {f.values.map((v, vi) => (
                <td
                  key={vi}
                  style={{
                    padding: "8px 12px",
                    textAlign: "center",
                    borderBottom: "1px solid #D9D9D9",
                    background: vi === 0 ? "rgba(48,105,179,0.06)" : fi % 2 === 1 ? "#F7F7F5" : "transparent",
                    color: typeof v === "boolean" ? (v ? "#067A6F" : "#D0021B") : "#292929",
                    fontWeight: typeof v === "boolean" ? 700 : 400,
                  }}
                >
                  {typeof v === "boolean" ? (v ? "\u2713" : "\u2717") : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealAlert() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #FFF8E1, #FFECB3)",
        borderRadius: 8,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        maxWidth: 480,
        border: "1px solid #F5D88E",
      }}
    >
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontWeight: 800,
          fontSize: 22,
          color: "#D0021B",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        32% OFF
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "#292929",
          }}
        >
          Sony WF-1000XM5 &mdash; $178
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "#767676",
          }}
        >
          <span style={{ textDecoration: "line-through" }}>$279.99</span>{" "}
          <span style={{ color: "#D0021B", fontWeight: 700 }}>Save $101.99</span>
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          color: "#D0021B",
          letterSpacing: "0.04em",
        }}
      >
        Ends today
      </div>
    </div>
  );
}

function RatingBadge({ score, label }: { score: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 9999,
          background: "#3069B3",
          color: "#fff",
          fontFamily: "var(--dd-font-sans)",
          fontWeight: 700,
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontWeight: 600,
          fontSize: 13,
          color: "#292929",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ProsConsList() {
  const pros = ["Excellent ANC performance", "Comfortable fit for long sessions", "Great call quality"];
  const cons = ["No multi-device pairing", "Ear tips collect dust easily"];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        maxWidth: 480,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "#067A6F",
            marginBottom: 8,
          }}
        >
          Pros
        </div>
        {pros.map((p) => (
          <div
            key={p}
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "#292929",
              lineHeight: 1.5,
              marginBottom: 4,
              paddingLeft: 18,
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", left: 0, color: "#067A6F", fontWeight: 700 }}>
              {"\u2713"}
            </span>
            {p}
          </div>
        ))}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "#D0021B",
            marginBottom: 8,
          }}
        >
          Cons
        </div>
        {cons.map((c) => (
          <div
            key={c}
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "#292929",
              lineHeight: 1.5,
              marginBottom: 4,
              paddingLeft: 18,
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", left: 0, color: "#D0021B", fontWeight: 700 }}>
              {"\u2717"}
            </span>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function BrandWirecutterSection() {
  return (
    <div>
      {/* ── 1. Brand Header ─────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid #D9D9D9",
          marginBottom: 40,
        }}
      >
        <div style={{ height: 4, background: "#3069B3" }} />
        <div style={{ padding: "32px 40px" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 32,
              color: "var(--dd-ink-black)",
              letterSpacing: "-0.01em",
              marginBottom: 8,
            }}
          >
            Wirecutter
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 16,
              color: "var(--dd-ink-soft)",
              lineHeight: 1.5,
            }}
          >
            Trust-first product journalism &mdash; clarity, comparison, confidence
          </div>
        </div>
      </div>

      {/* ── 2. Typography ───────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Headlines */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "-0.01em",
            color: "#292929",
            lineHeight: 1.2,
          }}
        >
          The Best Wireless Earbuds
        </div>
        <SpecimenMeta text="Headlines: Franklin Gothic Bold | 28px | -0.01em tracking" />
      </div>

      {/* Sub-headlines */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 500,
            fontSize: 20,
            color: "#292929",
          }}
        >
          Over-Ear Headphones
        </div>
        <SpecimenMeta text="Sub-headlines: Franklin Gothic Medium | 20px" />
      </div>

      {/* Body */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 17,
            lineHeight: 1.65,
            color: "#292929",
            maxWidth: 680,
          }}
        >
          After spending 40 hours testing 26 pairs of wireless earbuds, we found that
          the best option for most people balances excellent noise cancellation with
          comfortable fit and reliable connectivity. Our top pick excels in all three
          areas while staying competitive on price.
        </div>
        <SpecimenMeta text="Body: Gloucester Regular | 17px | 1.65 line-height | 680px max-width" />
      </div>

      {/* Verdict / Callout */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Our Pick", color: "#067A6F" },
            { label: "Also Great", color: "#3069B3" },
            { label: "Budget Pick", color: "#D4760A" },
            { label: "Upgrade Pick", color: "#7C5CBA" },
          ].map((v) => (
            <span
              key={v.label}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 14,
                textTransform: "uppercase" as const,
                letterSpacing: "0.04em",
                color: v.color,
              }}
            >
              {v.label}
            </span>
          ))}
        </div>
        <SpecimenMeta text="Verdict/Callout: Franklin Gothic Bold | 14px uppercase" />
      </div>

      {/* Price/Spec */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "#292929",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          $249.99 &middot; 7.3 oz &middot; Bluetooth 5.3 &middot; 30-hr battery
        </div>
        <SpecimenMeta text="Price/Spec: Franklin Gothic | 14px | tabular-nums" />
      </div>

      {/* Fine Print */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #D9D9D9" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "#767676",
          }}
        >
          Prices were accurate at the time of publishing. We may earn a commission from links on this page.
        </div>
        <SpecimenMeta text="Fine Print: Franklin Gothic | 12px | Caption Gray" />
      </div>

      {/* Type Scale */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginBottom: 12,
          }}
        >
          Type Scale
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline" }}>
          {[28, 24, 20, 17, 14, 12, 11].map((s) => (
            <span
              key={s}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 600,
                fontSize: s,
                color: "#292929",
              }}
            >
              {s}px
            </span>
          ))}
        </div>
      </div>

      {/* ── 3. Color Palette ────────────────────────────── */}
      <div id="colors" />
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {WC_COLORS.map((c) => (
          <Swatch key={c.name} {...c} />
        ))}
      </div>

      {/* ── 4. Components ───────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* Pick Cards */}
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Pick Cards
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <PickCard
          badge="Our Pick"
          badgeColor="#067A6F"
          product="Sony WF-1000XM5"
          price="$249.99"
          verdict="Best ANC earbuds for most people."
        />
        <PickCard
          badge="Budget Pick"
          badgeColor="#D4760A"
          product="Samsung Galaxy Buds FE"
          price="$69.99"
          verdict="Surprisingly capable at a fraction of the cost."
        />
        <PickCard
          badge="Upgrade Pick"
          badgeColor="#7C5CBA"
          product="Bose QC Ultra Earbuds"
          price="$299.99"
          verdict="Best spatial audio and premium build quality."
        />
      </div>

      {/* Comparison Table */}
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Comparison Table
      </div>
      <div style={{ marginBottom: 32 }}>
        <ComparisonTable />
      </div>

      {/* Deal Alert */}
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Deal Alert
      </div>
      <div style={{ marginBottom: 32 }}>
        <DealAlert />
      </div>

      {/* Rating Badges */}
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Rating Badges
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 32 }}>
        <RatingBadge score="9.2" label="Best Overall" />
        <RatingBadge score="8.7" label="Best Value" />
        <RatingBadge score="9.0" label="Runner-Up" />
      </div>

      {/* Pros/Cons */}
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Pros / Cons List
      </div>
      <div style={{ marginBottom: 40 }}>
        <ProsConsList />
      </div>

      {/* AI-Generated Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "var(--dd-brand-accent)", marginTop: 48 }}>AI-Generated Illustrations</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Product review and buying guide illustration styles.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["product-hero"]}
          brandAccent="#3069B3"
          height={200}
        />
        <AIIllustration
          prompts={PROMPTS["comparison-icon"]}
          brandAccent="#067A6F"
          height={200}
        />
        <AIIllustration
          prompts={PROMPTS["deal-alert-icon"]}
          brandAccent="#D4760A"
          height={200}
        />
      </div>

      {/* ── 5. Layout Patterns ──────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          {
            label: "Review Page",
            desc: "Narrow body (700px), product hero image, verdict card, prose",
            widths: ["700px centered"],
          },
          {
            label: "Category Grid",
            desc: "3-column grid of pick cards with image, badge, name, price",
            widths: ["3-col auto-fill"],
          },
          {
            label: "Comparison View",
            desc: "Full-width table with sticky header, alternating row shading",
            widths: ["100% width"],
          },
          {
            label: "Deal Feed",
            desc: "Vertical stack of deal alert cards with timestamps",
            widths: ["Single column"],
          },
        ].map((p) => (
          <div
            key={p.label}
            style={{
              background: "#F7F7F5",
              borderRadius: 8,
              padding: 20,
              border: "1px solid #D9D9D9",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 14,
                color: "#292929",
                marginBottom: 4,
              }}
            >
              {p.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "#767676",
                lineHeight: 1.4,
              }}
            >
              {p.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Shapes & Radius ──────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-end",
          marginBottom: 16,
        }}
      >
        {[
          { label: "Cards", radius: 8 },
          { label: "Badges", radius: 4 },
          { label: "Pill Ratings", radius: 9999 },
          { label: "Buttons", radius: 6 },
          { label: "Product Images", radius: 4 },
          { label: "Tables", radius: 0 },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: "#3069B3",
                borderRadius: s.radius,
                margin: "0 auto 8px",
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
              {s.radius}px
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
