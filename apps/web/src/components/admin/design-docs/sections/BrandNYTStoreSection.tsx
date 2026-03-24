"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["nyt-store"] as Record<string, IllustrationPrompts>;

/* ------------------------------------------------------------------ */
/*  NYT Store Brand Section — Merchandise, Gifts, Branded Products,   */
/*  NYT Print                                                          */
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
        color: "#326DA8",
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
  { name: "Store White", hex: "#FFFFFF", use: "Primary background" },
  { name: "Product BG", hex: "#F8F8F6", use: "Product card background" },
  { name: "Headline Black", hex: "#121212", use: "Product names" },
  { name: "Body Text", hex: "#333333", use: "Descriptions" },
  { name: "Store Blue", hex: "#326DA8", use: "CTAs, links" },
  { name: "Store Blue Hover", hex: "#1D4E7A", use: "Hover state" },
  { name: "Sale Red", hex: "#CC0000", use: "Sale prices, sale badges" },
  { name: "Success Green", hex: "#2E7D32", use: "Added to Cart confirmation" },
  { name: "Border Light", hex: "#E0E0E0", use: "Card borders, dividers" },
  { name: "Badge Gold", hex: "#B8860B", use: "Best Seller badge" },
] as const;

const TYPE_SCALE = [
  { size: 32, label: "Display" },
  { size: 24, label: "Section" },
  { size: 22, label: "Product" },
  { size: 20, label: "Category" },
  { size: 18, label: "Price" },
  { size: 15, label: "Body" },
  { size: 14, label: "CTA" },
  { size: 12, label: "Fine" },
  { size: 10, label: "Badge" },
] as const;

const RADIUS_TOKENS = [
  { label: "Product Cards", value: "4px", radius: 4 },
  { label: "Product Images", value: "0px (flush)", radius: 0 },
  { label: "Buttons", value: "4px", radius: 4 },
  { label: "Category Pills", value: "9999px", radius: 9999 },
  { label: "Badges", value: "2px", radius: 2 },
  { label: "Cart Controls", value: "4px", radius: 4 },
  { label: "Input Fields", value: "4px", radius: 4 },
] as const;

const PRODUCTS = [
  { name: "Front Page Reprint", price: "$45.00", badge: null },
  { name: "NYT Crossword Mug", price: "$24.00", badge: "BEST SELLER" },
  { name: "Truth Tote Bag", price: "$32.00", badge: "NEW" },
  { name: "Historical Birthday Book", price: "$75.00", badge: null },
] as const;

const CATEGORIES = [
  "All",
  "Gifts",
  "Reprints",
  "Books",
  "Apparel",
  "Home",
  "Accessories",
  "Sale",
] as const;

const CART_ITEMS = [
  { name: "Front Page Reprint — Nov 4, 2008", qty: 1, price: "$45.00" },
  { name: "NYT Crossword Mug — Black", qty: 2, price: "$48.00" },
] as const;

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTStoreSection() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">The New York Times Store</h2>
      <p className="dd-section-desc">
        Editorial commerce &mdash; where news becomes collectible. Merchandise,
        gifts, reprints, branded products.
      </p>

      {/* ── 1. Brand Header ───────────────────────────────── */}
      <SectionLabel>Brand Header</SectionLabel>
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 4,
          padding: "40px 32px",
          textAlign: "center",
          marginBottom: 32,
          border: "1px solid #E0E0E0",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 32,
            color: "#121212",
            marginBottom: 8,
          }}
        >
          The New York Times Store
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            color: "#333333",
            fontStyle: "italic",
          }}
        >
          Editorial commerce &mdash; where news becomes collectible
        </div>
      </div>

      {/* ── 2. Typography ─────────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* Product Names — Cheltenham Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Product Names &mdash; Cheltenham Bold
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 22,
            color: "#121212",
            lineHeight: 1.25,
          }}
        >
          Front Page Reprint
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Cheltenham Bold | 22px | Product titles
        </div>
      </div>

      {/* Category Titles — Franklin Gothic Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Category Titles &mdash; Franklin Gothic Bold
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {["Gifts", "Reprints", "Books"].map((cat) => (
            <div
              key={cat}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 20,
                color: "#121212",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
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
          Franklin Gothic Bold | 20px | Uppercase | 0.05em tracking
        </div>
      </div>

      {/* Prices — Franklin Gothic Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Prices &mdash; Franklin Gothic Bold
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 18,
              color: "#121212",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            $45.00
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 18,
                color: "#999",
                textDecoration: "line-through",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              $60.00
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 18,
                color: "#CC0000",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              $45.00
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Franklin Gothic Bold | 18px | tabular-nums | Sale in red with strikethrough original
        </div>
      </div>

      {/* Descriptions — Gloucester Regular */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Descriptions &mdash; Gloucester Regular
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 15,
            color: "#333333",
            lineHeight: 1.6,
            maxWidth: 480,
          }}
        >
          A beautifully reproduced front page from the archives of The New York
          Times, printed on premium archival paper. Choose any date from 1851 to
          today.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Gloucester Regular | 15px | 1.6 line-height | Product descriptions
        </div>
      </div>

      {/* Badge Text — Franklin Gothic */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Badge Text &mdash; Franklin Gothic
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { text: "NEW", bg: "#326DA8", color: "#FFFFFF" },
            { text: "SALE", bg: "#CC0000", color: "#FFFFFF" },
            { text: "BEST SELLER", bg: "#B8860B", color: "#FFFFFF" },
          ].map((badge) => (
            <div
              key={badge.text}
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                color: badge.color,
                background: badge.bg,
                padding: "3px 8px",
                borderRadius: 2,
                letterSpacing: "0.04em",
              }}
            >
              {badge.text}
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
          Franklin Gothic | 10px | Uppercase | Bold
        </div>
      </div>

      {/* Cart/CTA — Franklin Gothic Bold */}
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
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
          Cart / CTA &mdash; Franklin Gothic Bold
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              color: "#FFFFFF",
              background: "#326DA8",
              padding: "10px 24px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Add to Cart
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              color: "#326DA8",
              background: "transparent",
              padding: "10px 24px",
              borderRadius: 4,
              border: "1px solid #326DA8",
              cursor: "pointer",
            }}
          >
            View Details
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Franklin Gothic Bold | 14px | Uppercase
        </div>
      </div>

      {/* Type Scale */}
      <div
        style={{
          background: "#121212",
          borderRadius: 4,
          padding: "24px 28px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "#326DA8",
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
                color: "#666",
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
                borderRadius: 4,
                border:
                  c.hex === "#FFFFFF" || c.hex === "#F8F8F6"
                    ? "1px solid #E0E0E0"
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

      {/* Product Card */}
      <div className="dd-palette-label">Product Card</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {PRODUCTS.map((product) => (
          <div
            key={product.name}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E0E0E0",
              borderRadius: 4,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {product.badge && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  color: "#FFFFFF",
                  background:
                    product.badge === "BEST SELLER"
                      ? "#B8860B"
                      : product.badge === "NEW"
                        ? "#326DA8"
                        : "#CC0000",
                  padding: "3px 8px",
                  borderRadius: 2,
                  zIndex: 1,
                  letterSpacing: "0.04em",
                }}
              >
                {product.badge}
              </div>
            )}
            <div
              style={{
                aspectRatio: "1 / 1",
                background: "#F8F8F6",
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
              1 : 1 Product
            </div>
            <div style={{ padding: "12px 14px 16px" }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#121212",
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}
              >
                {product.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#121212",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 12,
                }}
              >
                {product.price}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  color: "#FFFFFF",
                  background: "#326DA8",
                  padding: "8px 0",
                  borderRadius: 4,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                Add to Cart
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Navigation */}
      <div className="dd-palette-label">Category Navigation</div>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 24,
        }}
      >
        {CATEGORIES.map((cat, i) => (
          <div
            key={cat}
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: i === 0 ? 700 : 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.04em",
              color: i === 0 ? "#FFFFFF" : "#121212",
              background: i === 0 ? "#121212" : "transparent",
              border: `1px solid ${i === 0 ? "#121212" : "#E0E0E0"}`,
              borderRadius: 9999,
              padding: "6px 16px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Price Display */}
      <div className="dd-palette-label">Price Display</div>
      <div
        style={{
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 4,
          padding: "20px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 18,
            color: "#999",
            textDecoration: "line-through",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          $60.00
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 18,
            color: "#CC0000",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          $48.00
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            color: "#FFFFFF",
            background: "#CC0000",
            padding: "3px 8px",
            borderRadius: 2,
          }}
        >
          Save 20%
        </div>
      </div>

      {/* Cart Item Row */}
      <div className="dd-palette-label">Cart Item Row</div>
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E0E0E0",
          borderRadius: 4,
          marginBottom: 24,
        }}
      >
        {CART_ITEMS.map((item, i) => (
          <div
            key={item.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 20px",
              borderBottom:
                i < CART_ITEMS.length - 1 ? "1px solid #E0E0E0" : undefined,
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                width: 80,
                height: 80,
                background: "#F8F8F6",
                borderRadius: 4,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 9,
                color: "#B0B0B0",
                textTransform: "uppercase" as const,
              }}
            >
              80px
            </div>
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#121212",
                  lineHeight: 1.3,
                }}
              >
                {item.name}
              </div>
            </div>
            {/* Quantity */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #E0E0E0",
                  borderRadius: "4px 0 0 4px",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  color: "#333",
                  cursor: "pointer",
                }}
              >
                &minus;
              </div>
              <div
                style={{
                  width: 32,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderTop: "1px solid #E0E0E0",
                  borderBottom: "1px solid #E0E0E0",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#121212",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.qty}
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #E0E0E0",
                  borderRadius: "0 4px 4px 0",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  color: "#333",
                  cursor: "pointer",
                }}
              >
                +
              </div>
            </div>
            {/* Price */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 15,
                color: "#121212",
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
                width: 64,
                textAlign: "right",
              }}
            >
              {item.price}
            </div>
            {/* Remove */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 18,
                color: "#B0B0B0",
                cursor: "pointer",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter Banner */}
      <div className="dd-palette-label">Newsletter Banner</div>
      <div
        style={{
          background: "#F8F8F6",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 32,
          borderRadius: 4,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 18,
            color: "#121212",
          }}
        >
          Get store updates
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              width: 240,
              height: 36,
              border: "1px solid #E0E0E0",
              borderRadius: 4,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              color: "#B0B0B0",
            }}
          >
            your@email.com
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              color: "#FFFFFF",
              background: "#326DA8",
              padding: "0 20px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              height: 36,
            }}
          >
            Subscribe
          </div>
        </div>
      </div>

      {/* AI-Generated Product Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "#326DA8", marginTop: 48 }}>AI-Generated Product Art</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        E-commerce product and merchandising illustration styles.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["front-page-reprint"]}
          brandAccent="#326DA8"
          height={220}
        />
        <AIIllustration
          prompts={PROMPTS["gift-bundle"]}
          brandAccent="#1D4E7A"
          height={220}
        />
        <AIIllustration
          prompts={PROMPTS["store-icons"]}
          brandAccent="#326DA8"
          height={220}
        />
      </div>

      {/* ── 5. Layout Patterns ────────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>

      {/* Store Home */}
      <div className="dd-palette-label">Store Home</div>
      <div
        style={{
          border: "1px solid #E0E0E0",
          borderRadius: 4,
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ background: "#326DA8", height: 60, marginBottom: 8, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
          Hero Banner — Featured Product
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "hidden" }}>
          {["All", "Gifts", "Reprints", "Books", "Apparel"].map((c) => (
            <div key={c} style={{ padding: "4px 10px", border: "1px solid #E0E0E0", borderRadius: 9999, fontSize: 9, whiteSpace: "nowrap" }}>
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ background: "#F8F8F6", height: 48, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
              Product {n}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Hero banner &rarr; Category nav &rarr; Product grids by category
        </div>
      </div>

      {/* Product Page */}
      <div className="dd-palette-label">Product Page</div>
      <div
        style={{
          border: "1px solid #E0E0E0",
          borderRadius: 4,
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#F8F8F6", height: 120, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#B0B0B0" }}>
            Image Gallery (zoom on hover)
          </div>
          <div>
            <div style={{ height: 10, background: "#E0E0E0", width: "60%", marginBottom: 6, borderRadius: 2 }} />
            <div style={{ height: 8, background: "#E0E0E0", width: "30%", marginBottom: 12, borderRadius: 2 }} />
            <div style={{ height: 8, background: "#E0E0E0", width: "90%", marginBottom: 4, borderRadius: 2 }} />
            <div style={{ height: 8, background: "#E0E0E0", width: "85%", marginBottom: 12, borderRadius: 2 }} />
            <div style={{ height: 28, background: "#326DA8", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.5)", fontSize: 9 }}>
              Add to Cart
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          2-column: image gallery left, details right
        </div>
      </div>

      {/* Cart Page */}
      <div className="dd-palette-label">Cart Page</div>
      <div
        style={{
          border: "1px solid #E0E0E0",
          borderRadius: 4,
          padding: 16,
          marginBottom: 16,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <div>
            {[1, 2].map((n) => (
              <div key={n} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, background: "#F8F8F6", borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 8, background: "#E0E0E0", borderRadius: 2 }} />
                <div style={{ width: 40, height: 8, background: "#E0E0E0", borderRadius: 2, flexShrink: 0 }} />
              </div>
            ))}
          </div>
          <div style={{ background: "#F8F8F6", borderRadius: 4, padding: 12 }}>
            <div style={{ height: 8, background: "#E0E0E0", width: "70%", marginBottom: 8, borderRadius: 2 }} />
            <div style={{ height: 8, background: "#E0E0E0", width: "50%", marginBottom: 8, borderRadius: 2 }} />
            <div style={{ height: 24, background: "#326DA8", borderRadius: 4, marginTop: 8 }} />
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Cart item rows + order summary sidebar
        </div>
      </div>

      {/* Category Page */}
      <div className="dd-palette-label">Category Page</div>
      <div
        style={{
          border: "1px solid #E0E0E0",
          borderRadius: 4,
          padding: 16,
          marginBottom: 32,
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
          color: "var(--dd-ink-faint)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16 }}>
          <div style={{ background: "#F8F8F6", borderRadius: 4, padding: 8 }}>
            <div style={{ fontSize: 9, marginBottom: 4 }}>Filters</div>
            {["Price", "Type", "Color"].map((f) => (
              <div key={f} style={{ height: 6, background: "#E0E0E0", marginBottom: 4, borderRadius: 2, width: "80%" }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} style={{ background: "#F8F8F6", height: 48, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#B0B0B0" }}>
                {n}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10 }}>
          Filter sidebar (desktop) + product grid main area
        </div>
      </div>

      {/* ── 6. Shapes & Radius ────────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {RADIUS_TOKENS.map((r) => (
          <div
            key={r.label}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderRadius: 4,
              padding: "16px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: r.radius,
                background: "#326DA8",
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
    </div>
  );
}
