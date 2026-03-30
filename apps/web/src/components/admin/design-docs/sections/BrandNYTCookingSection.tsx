"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["nyt-cooking"] as Record<string, IllustrationPrompts>;

/* ------------------------------------------------------------------ */
/*  NYT Cooking Brand Reference                                       */
/*  Recipes, meal planning, ingredient lists                          */
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
          border: lum > 0.9 ? "1px solid #F5E6C8" : "none",
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

const COOKING_COLORS: SwatchProps[] = [
  { name: "Cream", hex: "#FFF8F0" },
  { name: "Warm White", hex: "#FFFDF8" },
  { name: "Dark Brown", hex: "#3D2B1F" },
  { name: "Warm Text", hex: "#5C4033" },
  { name: "Saffron", hex: "#F6CB2F" },
  { name: "Deep Saffron", hex: "#E5A100" },
  { name: "Herb Green", hex: "#5B7A3A" },
  { name: "Tomato Red", hex: "#C0392B" },
  { name: "Butter Yellow", hex: "#F5E6C8" },
  { name: "Warm Gray", hex: "#A89888" },
];

const TYPE_SCALE = [36, 32, 28, 24, 20, 17, 15, 12, 11];

const SAMPLE_INGREDIENTS = [
  { qty: "2 cups", name: "all-purpose flour" },
  { qty: "1 tsp", name: "baking soda" },
  { qty: "1 tsp", name: "ground cinnamon" },
  { qty: "\u00BD tsp", name: "fine sea salt" },
  { qty: "1 cup", name: "unsalted butter, softened" },
  { qty: "\u00BE cup", name: "packed brown sugar" },
  { qty: "2", name: "large eggs" },
  { qty: "1\u00BD cups", name: "old-fashioned rolled oats" },
  { qty: "1 cup", name: "finely grated carrots" },
];

const SAMPLE_STEPS = [
  "Heat oven to 350 degrees. Line two baking sheets with parchment paper.",
  "Whisk together the flour, baking soda, cinnamon and salt in a medium bowl.",
  "Beat butter and sugars with an electric mixer on medium-high until light and fluffy, about 3 minutes. Add eggs one at a time, beating well after each addition.",
  "Reduce speed to low and gradually add flour mixture, mixing just until combined. Fold in oats, carrots and raisins.",
  "Scoop rounded tablespoons of dough onto prepared sheets, spacing 2 inches apart. Bake until edges are golden, 12 to 14 minutes.",
];

/* ---- component ---- */

export default function BrandNYTCookingSection() {
  return (
    <div>
      {/* ── Brand Header ─────────────────────────────────── */}
      <div
        style={{
          background: "#FFF8F0",
          padding: "32px 0 24px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 36,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          NYT Cooking
        </div>
        <div
          style={{
            height: 4,
            width: 80,
            background: "#F6CB2F",
            marginTop: 8,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-muted)",
            marginTop: 12,
            fontStyle: "italic",
          }}
        >
          Warm, trustworthy, appetizing &mdash; the kitchen companion
        </div>
      </div>

      {/* ── 1. Typography ────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Recipe Titles */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Recipe Titles &mdash; Cheltenham Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: 1.15,
            color: "#3D2B1F",
          }}
        >
          Carrot Cake Oatmeal Cookies
        </div>
        <SpecimenMeta text="Cheltenham Bold | 32px | dark brown (#3D2B1F)" />
      </div>

      {/* Collection Headlines */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Collection Headlines &mdash; Cheltenham Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.2,
            color: "#3D2B1F",
          }}
        >
          What to Cook This Week
        </div>
        <SpecimenMeta text="Cheltenham Regular | 28px" />
      </div>

      {/* Body/Instructions */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Body / Instructions &mdash; Gloucester Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontWeight: 400,
            fontSize: 17,
            lineHeight: 1.7,
            color: "#5C4033",
            maxWidth: 620,
          }}
        >
          Beat butter and sugars with an electric mixer on medium-high until light
          and fluffy, about 3 minutes. Add eggs one at a time, beating well after
          each addition. Reduce speed to low and gradually add flour mixture, mixing
          just until combined.
        </div>
        <SpecimenMeta text="Gloucester Regular | 17px | 1.7 line-height | warm dark text" />
      </div>

      {/* Ingredient List Font */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Ingredient List &mdash; Franklin Gothic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            color: "#5C4033",
          }}
        >
          <span style={{ fontWeight: 700 }}>2 cups</span> all-purpose flour
          &nbsp;&nbsp;&middot;&nbsp;&nbsp;
          <span style={{ fontWeight: 700 }}>1 tsp</span> baking soda
          &nbsp;&nbsp;&middot;&nbsp;&nbsp;
          <span style={{ fontWeight: 700 }}>1 cup</span> unsalted butter
        </div>
        <SpecimenMeta text="Franklin Gothic | 15px | bold quantities" />
      </div>

      {/* Step Numbers */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Step Numbers &mdash; Cheltenham Bold
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                background: "#F6CB2F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: 20,
                color: "#FFFFFF",
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <SpecimenMeta text="Cheltenham Bold | 24px | saffron bg, white text, circled" />
      </div>

      {/* Notes/Tips */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Notes / Tips &mdash; Gloucester Italic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 15,
            lineHeight: 1.6,
            color: "#A89888",
            maxWidth: 560,
          }}
        >
          Make ahead: Dough can be refrigerated for up to 3 days or frozen for up to
          1 month. If baking from frozen, add 2 to 3 minutes to the baking time.
        </div>
        <SpecimenMeta text="Gloucester Italic | 15px | warm gray" />
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 6,
          }}
        >
          Tags &mdash; Franklin Gothic
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Quick", "Vegetarian", "Make Ahead", "One Pot", "Weeknight"].map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 11,
                textTransform: "uppercase" as const,
                letterSpacing: "0.04em",
                color: "#3D2B1F",
                background: "#F6CB2F",
                padding: "3px 8px",
                borderRadius: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <SpecimenMeta text='Franklin Gothic | 11px | uppercase | saffron bg' />
      </div>

      {/* Type Scale */}
      <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid #F5E6C8" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-brand-section-label)",
            marginBottom: 12,
          }}
        >
          Type Scale
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
          {TYPE_SCALE.map((size) => (
            <span
              key={size}
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: size,
                color: "#3D2B1F",
                lineHeight: 1.1,
              }}
            >
              {size}
            </span>
          ))}
        </div>
        <SpecimenMeta text="36 > 32 > 28 > 24 > 20 > 17 > 15 > 12 > 11" />
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
        {COOKING_COLORS.map((c) => (
          <Swatch key={c.name} {...c} />
        ))}
      </div>

      {/* ── 3. Components ────────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* Recipe Card */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Recipe Card
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {[
          { title: "Carrot Cake Oatmeal Cookies", time: "45 min", difficulty: "Easy", color: "#E8913A" },
          { title: "Crispy Ginger Pork Meatballs", time: "35 min", difficulty: "Medium", color: "#C0392B" },
          { title: "Spring Pea and Ricotta Pasta", time: "25 min", difficulty: "Easy", color: "#5B7A3A" },
        ].map((recipe, i) => (
          <div
            key={i}
            style={{
              background: "#FFFDF8",
              border: "1px solid #F5E6C8",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Image placeholder */}
            <div
              style={{
                height: 180,
                background: `linear-gradient(135deg, ${recipe.color}33, ${recipe.color}66)`,
                borderRadius: "8px 8px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* Decorative food-like circles */}
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 9999,
                    background: recipe.color,
                    opacity: 0.7,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                />
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9999,
                    background: "#F6CB2F",
                    opacity: 0.6,
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                  }}
                />
              </div>
              {/* Save heart */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#A89888",
                }}
              >
                &#9825;
              </div>
            </div>
            <div style={{ padding: "16px 20px 20px" }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: 1.25,
                  color: "#3D2B1F",
                  marginBottom: 10,
                }}
              >
                {recipe.title}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase" as const,
                    color: "#5C4033",
                    background: "#F5E6C8",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {recipe.time}
                </span>
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase" as const,
                    color: recipe.difficulty === "Medium" ? "#C0392B" : "#5B7A3A",
                    background: recipe.difficulty === "Medium" ? "#C0392B18" : "#5B7A3A18",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {recipe.difficulty}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#FFFFFF",
                  background: "#F6CB2F",
                  padding: "8px 20px",
                  borderRadius: 6,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                Cook
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ingredient List */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Ingredient List
      </div>
      <div
        style={{
          background: "#FFFDF8",
          border: "1px solid #F5E6C8",
          borderRadius: 8,
          padding: "20px 24px",
          maxWidth: 400,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "#3D2B1F",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: "1px solid #F5E6C8",
          }}
        >
          For the Cookies
        </div>
        {SAMPLE_INGREDIENTS.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "6px 0",
              borderBottom: i < SAMPLE_INGREDIENTS.length - 1 ? "1px solid #FFF8F0" : "none",
            }}
          >
            {/* Checkbox circle */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 9999,
                border: "2px solid #F5E6C8",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 15,
                color: "#5C4033",
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontWeight: 700 }}>{item.qty}</span>{" "}
              <span style={{ fontFamily: "var(--dd-font-body)" }}>{item.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step-by-Step */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Step-by-Step
      </div>
      <div
        style={{
          maxWidth: 620,
          marginBottom: 32,
        }}
      >
        {SAMPLE_STEPS.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9999,
                background: "#F6CB2F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: 18,
                color: "#FFFFFF",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 17,
                lineHeight: 1.7,
                color: "#5C4033",
                paddingTop: 6,
              }}
            >
              {step}
            </div>
          </div>
        ))}
      </div>

      {/* Collection Grid */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Collection Grid &mdash; What to Cook This Week
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          maxWidth: 560,
          marginBottom: 32,
        }}
      >
        {["Monday", "Tuesday", "Wednesday", "Thursday"].map((day, i) => {
          const colors = ["#E8913A", "#5B7A3A", "#C0392B", "#F6CB2F"];
          return (
            <div
              key={day}
              style={{
                background: "#FFFDF8",
                border: "1px solid #F5E6C8",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 80,
                  background: `linear-gradient(135deg, ${colors[i]}33, ${colors[i]}66)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    background: colors[i],
                    opacity: 0.6,
                  }}
                />
              </div>
              <div style={{ padding: 12 }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.04em",
                    color: "#A89888",
                    marginBottom: 4,
                  }}
                >
                  {day}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline)",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#3D2B1F",
                    lineHeight: 1.25,
                  }}
                >
                  {["Ginger Pork Meatballs", "Spring Pea Pasta", "Crispy Tofu Bowl", "Lemon Herb Chicken"][i]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save/Notes Bar */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Save / Notes Bar
      </div>
      <div
        style={{
          background: "#FFFDF8",
          border: "1px solid #F5E6C8",
          borderRadius: 8,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          maxWidth: 400,
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18, color: "#C0392B" }}>&#9829;</span>
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 600,
              fontSize: 13,
              color: "#5C4033",
            }}
          >
            Saved
          </span>
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "#A89888",
            }}
          >
            2,431
          </span>
        </div>
        <div
          style={{
            width: 1,
            height: 20,
            background: "#F5E6C8",
          }}
        />
        <span style={{ fontSize: 16, color: "#A89888" }}>&#9998;</span>
        <div
          style={{
            width: 1,
            height: 20,
            background: "#F5E6C8",
          }}
        />
        <span style={{ fontSize: 16, color: "#A89888" }}>&#8599;</span>
      </div>

      {/* Cook Mode Toggle */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Cook Mode Toggle
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 52,
            height: 28,
            borderRadius: 9999,
            background: "#F6CB2F",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 9999,
              background: "#FFFFFF",
              position: "absolute",
              top: 3,
              right: 3,
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "#3D2B1F",
          }}
        >
          Cook Mode
        </span>
      </div>

      {/* Rating Stars */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-brand-section-label)",
          marginBottom: 12,
        }}
      >
        Rating Stars
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 32,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: 24,
              color: star <= 4 ? "#F6CB2F" : "#A89888",
              lineHeight: 1,
            }}
          >
            {star <= 4 ? "\u2605" : "\u2606"}
          </span>
        ))}
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            color: "#A89888",
            marginLeft: 8,
          }}
        >
          1,247 ratings
        </span>
      </div>

      {/* AI-Generated Food Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "var(--dd-brand-accent)", marginTop: 48 }}>AI-Generated Food Art</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Recipe and food illustration styles — warm, appetizing, hand-drawn feel.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["recipe-hero"]}
          brandAccent="#F6CB2F"
          height={220}
        />
        <AIIllustration
          prompts={PROMPTS["ingredient-illustration"]}
          brandAccent="#5B7A3A"
          height={220}
        />
        <AIIllustration
          prompts={PROMPTS["cooking-icons"]}
          brandAccent="#E5A100"
          height={220}
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
            name: "Recipe Page",
            desc: "Hero image (16:9), title + metadata, 2-col desktop (ingredients sidebar + steps main)",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <div style={{ height: 30, background: "#E8913A33", borderRadius: 4 }} />
                <div style={{ height: 4, width: "80%", background: "#3D2B1F", borderRadius: 2 }} />
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <div style={{ flex: "0 0 35%", display: "flex", flexDirection: "column" as const, gap: 2 }}>
                    <div style={{ height: 2, width: "80%", background: "#F5E6C8" }} />
                    <div style={{ height: 2, width: "90%", background: "#F5E6C8" }} />
                    <div style={{ height: 2, width: "70%", background: "#F5E6C8" }} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 3 }}>
                    {[1, 2, 3].map((n) => (
                      <div key={n} style={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 9999, background: "#F6CB2F", flexShrink: 0, marginTop: 1 }} />
                        <div style={{ height: 2, width: "85%", background: "#F5E6C8" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            name: "Collection Page",
            desc: "Hero banner with collection title, 3-column recipe card grid below",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                <div style={{ height: 20, background: "#FFF8F0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ height: 3, width: "60%", background: "#3D2B1F" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{ background: "#FFFDF8", border: "1px solid #F5E6C8", borderRadius: 3 }}>
                      <div style={{ height: 14, background: "#F6CB2F22", borderRadius: "3px 3px 0 0" }} />
                      <div style={{ padding: 2 }}>
                        <div style={{ height: 2, width: "80%", background: "#3D2B1F" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            name: "What to Cook",
            desc: "Day-by-day layout, each day has a featured recipe card + brief description",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                {["Mon", "Tue", "Wed"].map((day) => (
                  <div key={day} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <div
                      style={{
                        fontFamily: "var(--dd-font-sans)",
                        fontSize: 6,
                        fontWeight: 700,
                        color: "#A89888",
                        width: 20,
                        flexShrink: 0,
                      }}
                    >
                      {day}
                    </div>
                    <div style={{ flex: 1, height: 16, background: "#FFFDF8", border: "1px solid #F5E6C8", borderRadius: 3, display: "flex", alignItems: "center", paddingLeft: 4 }}>
                      <div style={{ height: 2, width: "60%", background: "#3D2B1F" }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            name: "Search Results",
            desc: "Dense list view with small thumbnails, recipe titles, cook times",
            layout: (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 3 }}>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 3, borderBottom: "1px solid #F5E6C8" }}>
                    <div style={{ width: 20, height: 14, borderRadius: 2, background: "#E8913A33", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 2, width: "70%", background: "#3D2B1F" }} />
                      <div style={{ height: 1, width: "30%", background: "#A89888", marginTop: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ].map((pattern) => (
          <div
            key={pattern.name}
            style={{
              background: "#FFFDF8",
              border: "1px solid #F5E6C8",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 13,
                color: "#3D2B1F",
                marginBottom: 4,
              }}
            >
              {pattern.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 11,
                color: "#A89888",
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              {pattern.desc}
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #F5E6C8",
                borderRadius: 4,
                padding: 8,
                minHeight: 80,
              }}
            >
              {pattern.layout}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. Shapes & Radius ───────────────────────────── */}
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
          { label: "Recipe Cards", value: "8px", radius: 8, color: "#F5E6C8" },
          { label: "Recipe Images", value: "8px top", radius: "8px 8px 0 0", color: "#E8913A" },
          { label: "Buttons", value: "6px", radius: 6, color: "#F6CB2F" },
          { label: "Tags / Badges", value: "4px", radius: 4, color: "#5B7A3A" },
          { label: "Step Circles", value: "9999px", radius: 9999, color: "#F6CB2F" },
          { label: "Toggle Switch", value: "9999px", radius: 9999, color: "#E5A100" },
          { label: "Star Icons", value: "0px", radius: 0, color: "#F6CB2F" },
        ].map((shape) => (
          <div key={shape.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 8px",
                background: shape.color,
                borderRadius: typeof shape.radius === "number" ? shape.radius : shape.radius,
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
