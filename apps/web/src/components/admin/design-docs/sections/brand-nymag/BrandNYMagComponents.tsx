"use client";

/* ================================================================
   BrandNYMag — Components Tab
   Full catalog of Clay CMS components found on the nymag.com
   homepage, with specimen renderings.
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

/* ── Component data ── */

interface ComponentEntry {
  name: string;
  clayUri: string;
  description: string;
  pattern: string;
}

const COMPONENTS: ComponentEntry[] = [
  {
    name: "Global Nav",
    clayUri: "global-nav",
    description: "Top bar: 7 vertical links, Magazine dropdown, user auth (Subscribe, Sign In, Account), search.",
    pattern: "Responsive: hidden verticals mobile → full bar desktop. Dropdown with search + 8-column nav.",
  },
  {
    name: "Lede Container",
    clayUri: "nymag-lede-container",
    description: "3-article hero: large center image with bordered padding + 2 side stories with rubrics.",
    pattern: "Mobile stacked → Tablet 2-col → Desktop 3-col with center hero at 44% flex.",
  },
  {
    name: "Latest Feed (Tabbed)",
    clayUri: "nymag-latest-feed",
    description: "7-tab feed: Latest News + 6 verticals. Each tab has date, headline, teaser links.",
    pattern: "Sticky sidebar desktop (position: absolute). Mobile: expand button + collapsed items.",
  },
  {
    name: "Well Container",
    clayUri: "nymag-well-container",
    description: "Featured + secondary + primary article grid. Featured has bordered image with padding.",
    pattern: "Mobile stacked → Desktop flex: featured(3) + secondary(1) + primary(1).",
  },
  {
    name: "Coverlines",
    clayUri: "coverlines",
    description: "Magazine cover display: rotated cover image, blurb text, subscribe/read-more CTAs.",
    pattern: "Mobile column-reverse → Desktop flex-row. Image rotated 5deg with box-shadow.",
  },
  {
    name: "Collection Package",
    clayUri: "collection-package",
    description: "Curated article carousel with optional sponsor logo, title bar, teaser, thumbnails.",
    pattern: "6px+1px black double-border top. Mobile horizontal scroll with snap. Desktop 3-col flex.",
  },
  {
    name: "Most Popular",
    clayUri: "most-popular",
    description: "Numbered 1–5 trending article list. Counter pseudo-elements in Egyptienne 26px.",
    pattern: "Desktop: single-line with overflow ellipsis + gradient mask. Mobile: multi-line.",
  },
  {
    name: "Container Section (Brand Block)",
    clayUri: "container-section",
    description: "Per-vertical block: SVG logo, nav links, lede article, feed list, secondary articles.",
    pattern: "6 instances on homepage. Section header with logo + nav pills. Lede 50% + main 50% tablet+.",
  },
  {
    name: "Promotional Spot",
    clayUri: "promotional-spot",
    description: "Inline banner with dotted-border dashed pattern (background-image), italic serif text.",
    pattern: "Opacity transition fade. Background repeating linear-gradient creates dot border.",
  },
  {
    name: "TV Recap Feed",
    clayUri: "tv-recap-feed",
    description: "Vulture-specific: show + season/episode recaps with image thumbnails.",
    pattern: "Mobile: horizontal overflow scroll. Desktop: vertical list with Vulture arrow icons.",
  },
  {
    name: "Customer Alert Banner",
    clayUri: "customer-alert-banner",
    description: "Conditional user alerts: card expiring, past due, marketing promotions.",
    pattern: "3 alert types: error-tout (#ffeeea), warning-tout (#f7f7f7), marketing-tout (italic serif).",
  },
  {
    name: "Nav Dropdown",
    clayUri: "nav-dropdown-button",
    description: "Hamburger menu → full overlay with 8-column primary nav, secondary links, social, search.",
    pattern: "Mobile: 100vw overlay. Tablet: 375px bordered popup. Desktop: 768px bordered, z-index 999.",
  },
];

/* ── Specimen components ── */

function LedeArticle() {
  return (
    <div
      style={{
        maxWidth: 480,
        border: "1px solid #979797",
        padding: 20,
        background: "#fff",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 160,
          background: "linear-gradient(135deg, #e7e7e7 0%, #bdbdbd 100%)",
          marginBottom: 10,
        }}
      />
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontFamily: "EgyptienneRubric, Georgia, serif",
            fontSize: 13,
            letterSpacing: 1.5,
            textTransform: "uppercase" as const,
            boxShadow: "0 2px 0 0 #fff, 0 3px 0 0 #db2800",
            display: "inline-block",
            marginBottom: 10,
          }}
        >
          getting around
        </span>
        <div
          style={{
            fontFamily: "Egyptienne, Georgia, serif",
            fontSize: 40,
            lineHeight: "34px",
            marginBottom: 5,
          }}
        >
          A La Guardia TSA Agent Tells All
        </div>
        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 20,
            lineHeight: 1.1,
            marginBottom: 5,
          }}
        >
          On the shutdown, ICE agents, and making your flight.
        </div>
        <div
          style={{
            fontFamily: "'Miller Text', Georgia, serif",
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
          }}
        >
          By Clio Chang
        </div>
      </div>
    </div>
  );
}

function FeedItem() {
  return (
    <div
      style={{
        borderBottom: "1px solid #bdbdbd",
        padding: "15px 0",
        maxWidth: 300,
      }}
    >
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: "uppercase" as const,
          color: "#db2800",
          display: "block",
          marginBottom: 3,
        }}
      >
        Mar. 25, 2026
      </span>
      <div
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 17,
          lineHeight: "20px",
          fontWeight: 700,
          display: "inline",
        }}
      >
        Does Either Party Really Want to End the DHS Shutdown?
      </div>{" "}
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 17,
          lineHeight: "20px",
          color: "#767676",
        }}
      >
        In the past 40 days, the two parties have switched sides.
      </span>
    </div>
  );
}

function MostPopularItem({ rank, title }: { rank: number; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "16px 0",
        borderBottom: "1px solid #e7e7e7",
      }}
    >
      <span
        style={{
          fontFamily: "Egyptienne, Georgia, serif",
          fontSize: 26,
          lineHeight: 0.91,
          letterSpacing: 2.3,
          marginRight: 20,
          color: "#000",
          minWidth: 36,
        }}
      >
        {rank}.
      </span>
      <span
        style={{
          fontFamily: "'Miller Text', Georgia, serif",
          fontSize: 18,
          lineHeight: 1.2,
          color: "#000",
        }}
      >
        {title}
      </span>
    </div>
  );
}

export default function BrandNYMagComponents() {
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
      <SectionLabel>Components</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Component Catalog
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
        NYMag&apos;s homepage uses Vox Media&apos;s Clay CMS component system.
        Each component is identified by <code>data-uri</code> attributes with the
        pattern <code>nymag.com/_components/&#123;name&#125;/instances/&#123;id&#125;</code>.
        The homepage assembles {COMPONENTS.length} distinct component patterns:
      </p>

      {/* ── Component list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
        {COMPONENTS.map((c) => (
          <div
            key={c.name}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                }}
              >
                {c.name}
              </div>
              <code
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {c.clayUri}
              </code>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-dark)",
                marginBottom: 6,
              }}
            >
              {c.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              {c.pattern}
            </div>
          </div>
        ))}
      </div>

      {/* ── Specimens ── */}
      <SectionLabel>Component Specimens</SectionLabel>

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Lede Article Card
      </h3>
      <LedeArticle />
      <SpecimenMeta text="Bordered image pad 20px, centered rubric w/ colored underline, Egyptienne headline, Miller teasers, uppercase byline" />

      <div style={{ height: 32 }} />

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Latest Feed Item
      </h3>
      <FeedItem />
      <SpecimenMeta text="Date rubric (brand color), bold headline inline with gray teaser, Miller Text 17px" />

      <div style={{ height: 32 }} />

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Most Popular Item
      </h3>
      <div style={{ maxWidth: 400 }}>
        <MostPopularItem rank={1} title="Could the Girls of Camp Mystic Have Been Saved?" />
        <MostPopularItem rank={2} title="Cinematrix No. 729: March 25, 2026" />
        <MostPopularItem rank={3} title="Your Daily Horoscope by Madame Clairevoyant" />
      </div>
      <SpecimenMeta text="Counter-reset: Egyptienne 26px/.91 numbered list, Miller Text 18px/1.2 headlines, #e7e7e7 dividers" />

      <div style={{ height: 32 }} />

      <h3
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        Vertical Badges
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          { name: "Intelligencer", color: "#db2800" },
          { name: "The Cut", color: "#949494" },
          { name: "Vulture", color: "#00bcf1" },
          { name: "Strategist", color: "#f55d1f" },
          { name: "Curbed", color: "#0147a5" },
          { name: "Grub Street", color: "#acca5b" },
        ].map((v) => (
          <div
            key={v.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 4,
              border: `1px solid ${v.color}`,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: v.color,
              }}
            />
            <span
              style={{
                fontFamily: "'Miller Text', Georgia, serif",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 1.8,
                textTransform: "uppercase" as const,
                color: "#111",
              }}
            >
              {v.name}
            </span>
          </div>
        ))}
      </div>
      <SpecimenMeta text="Tab trigger icons: circle dot + uppercase Miller Text label, per-vertical border + fill color" />
    </div>
  );
}
