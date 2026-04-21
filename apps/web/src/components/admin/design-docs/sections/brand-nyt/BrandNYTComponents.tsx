"use client";

import Link from "next/link";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import {
  NYT_HOMEPAGE_COMPONENT_EXAMPLES,
  NYT_HOMEPAGE_PACKAGE_CONTAINERS,
} from "@/lib/admin/nyt-homepage-preview-config";
import {
  HomepageComponentPreview,
  HomepagePackagePreview,
  HomepageSourceSnippet,
} from "@/components/admin/design-docs/sections/brand-nyt/nyt-homepage-specimens";

/* ------------------------------------------------------------------ */
/*  NYT Brand — Components                                              */
/*  Component catalog detected from contentBlocks across all articles   */
/* ------------------------------------------------------------------ */

const nytArticles = ARTICLES.filter((a) => !a.url.includes("/athletic/"));

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

/* ── Inline Data ──────────────────────────────────────────────────── */

function shortTitle(title: string): string {
  if (title.length <= 40) return title;
  return title.slice(0, 37) + "\u2026";
}

interface ComponentEntry {
  name: string;
  description: string;
  articleIds: string[];
  count: number;
}

const COMPONENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  "ai2html":
    "Responsive Illustrator-to-HTML graphic with mobile/desktop artboards and positioned text overlays",
  "birdkit-chart":
    "Custom Svelte chart component built on NYT Birdkit framework with data-birdkit-hydrate",
  "birdkit-table":
    "Svelte CTableDouble component — double-header medal table with sub-categories",
  "birdkit-table-interactive":
    "Svelte CTable component — interactive dropdown for custom medal permutations",
  "datawrapper-table":
    "Datawrapper iframe embed rendering a styled data table (heatmap, sortable, paginated)",
  "datawrapper-chart":
    "Datawrapper iframe embed rendering a chart (line, bar, area, stacked) with postMessage protocol",
  "showcase-link":
    "Inline recommendation card with image, title, excerpt, and border-top/bottom dividers",
  "twitter-embed":
    "Embedded tweet via blockquote.twitter-tweet with async widgets.js loading",
  "storyline":
    "Branded horizontal navigation bar with story links (e.g., Milan 2026, Super Bowl LX)",
  "featured-image":
    "Full-width hero image with srcSet responsive sizes, caption, and credit line",
  "related-link":
    "End-of-article related story card with thumbnail image, title, and summary",
  "puzzle-entry-point":
    "Game promotion card (e.g., Connections: Sports Edition) with title, subtitle, and play CTA",
  "ad-container":
    "Mid-article ad slot with min-height:300px and uppercase ad-slug label",
  "quote":
    "Campaign promise callout box with citation text, quote body, and colored status badge",
  "subhed":
    "Section heading divider — nyt-franklin uppercase with top border",
  "header": "Article headline, byline, and sharetools block",
  "byline": "Author name, timestamp, and social sharing pills",
  "author-bio":
    "End-of-article author biography with headshot and bio text",
  "sharetools-bar":
    "Tier 2 facsimile of NYT action chrome with share, save, gift, and more buttons",
  "body-copy":
    "Inline article paragraph block with Franklin body text and source-preserved anchor links",
  "debate-speaking-time-chart":
    "Legacy D3 timeline chart showing candidate speaking segments across the full debate runtime",
  "debate-topic-bubble-chart":
    "Legacy D3 bubble matrix comparing total speaking time by topic and candidate",
  "tariff-rate-arrow-chart":
    "Custom tariff-rate comparison chart for top import partners with delta bars and source credits",
  "tariff-rate-table":
    "Expandable tariff-rate table covering countries with $1B+ in U.S. imports",
  "reporting-credit":
    "Small Franklin reporting note placed before the author bio",
};

function buildComponentCatalog(): ComponentEntry[] {
  const components: ComponentEntry[] = [];
  const countMap = new Map<string, { articles: Set<string>; count: number }>();

  for (const article of nytArticles) {
    if ("contentBlocks" in article && Array.isArray(article.contentBlocks)) {
      for (const block of article.contentBlocks) {
        if ("type" in block) {
          const type = block.type as string;
          if (!countMap.has(type)) {
            countMap.set(type, { articles: new Set(), count: 0 });
          }
          const entry = countMap.get(type)!;
          entry.articles.add(article.id);
          entry.count += 1;
        }
      }
    }

    // Detect quote blocks from quoteSections (Trump article doesn't use contentBlocks for these)
    if (article.quoteSections.length > 0 && !countMap.has("quote")) {
      countMap.set("quote", { articles: new Set(), count: 0 });
    }
    if (article.quoteSections.length > 0) {
      const entry = countMap.get("quote")!;
      entry.articles.add(article.id);
      entry.count += article.quoteSections.length;
    }

    // Detect subhed from quoteSections articles that use section-level headings
    if (
      article.quoteSections.length > 0 &&
      !("contentBlocks" in article && Array.isArray(article.contentBlocks))
    ) {
      if (!countMap.has("subhed")) {
        countMap.set("subhed", { articles: new Set(), count: 0 });
      }
      const entry = countMap.get("subhed")!;
      entry.articles.add(article.id);
      entry.count += article.quoteSections.length;
    }
  }

  for (const [type, data] of countMap.entries()) {
    components.push({
      name: type,
      description:
        COMPONENT_TYPE_DESCRIPTIONS[type] ||
        `Content block of type "${type}"`,
      articleIds: Array.from(data.articles),
      count: data.count,
    });
  }

  // Sort by count descending
  components.sort((a, b) => b.count - a.count);

  return components;
}

interface SpecialComponent {
  name: string;
  description: string;
  articleIds: string[];
}

function buildSpecialComponents(): SpecialComponent[] {
  const specials: SpecialComponent[] = [];

  // Upshot Brand Bar — sweepstakes has section="The Upshot"
  const sweeps = nytArticles.find(
    (a) => a.id === "online-casinos-sweepstakes-gambling",
  );
  const olympics = nytArticles.find(
    (a) => a.id === "winter-olympics-leaders-nations",
  );
  const upshotArticles: string[] = [];
  if (sweeps) upshotArticles.push(sweeps.id);
  if (olympics) upshotArticles.push(olympics.id);
  if (upshotArticles.length > 0) {
    specials.push({
      name: "Upshot Brand Bar",
      description:
        'SVG section identifier with green accent for "The Upshot" brand. Appears on articles with section="The Upshot".',
      articleIds: upshotArticles,
    });
  }

  // Extended Byline — all articles have this
  specials.push({
    name: "Extended Byline",
    description:
      "Author headshot, name, date, production credits, and social sharing. Present on all NYT articles.",
    articleIds: nytArticles.map((a) => a.id),
  });

  // Promise Tracker — trump has quoteSections + report-card
  const trump = nytArticles.find((a) => a.id === "trump-economy-year-1");
  if (
    trump &&
    trump.quoteSections.length > 0 &&
    trump.chartTypes.some((ct) => ct.type === "report-card")
  ) {
    specials.push({
      name: "Promise Tracker",
      description:
        'ai2html report card with background image + HTML text overlay grid. Uses quoteSections data with colored status badges (red "HASN\'T HAPPENED", amber "SOME PROGRESS", green "SO FAR, SO GOOD").',
      articleIds: [trump.id],
    });
  }

  return specials;
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTComponents() {
  const componentCatalog = buildComponentCatalog();
  const specialComponents = buildSpecialComponents();

  function articleTitleById(id: string): string {
    const a = nytArticles.find((x) => x.id === id);
    return a ? shortTitle(a.title) : id;
  }

  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Components</h2>
      <p className="dd-section-desc">
        Component types detected from contentBlocks across{" "}
        {nytArticles.length} NYT articles.
      </p>

      {/* ── 1. Component Catalog ──────────────────────────────── */}
      <SectionLabel id="component-catalog">Component Catalog</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        All component types detected from articles&apos; contentBlocks arrays, plus
        inferred types from quoteSections and architecture data.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {componentCatalog.map((comp) => (
          <div
            key={comp.name}
            className="dd-brand-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                }}
              >
                {comp.name}
              </div>
              <span
                className="rounded-full px-2 py-0.5 font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  background: "#e8f0fe",
                  color: "var(--dd-brand-accent)",
                }}
              >
                {comp.count}x
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {comp.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "var(--dd-brand-accent)",
              }}
            >
              {comp.articleIds.map((aid, i) => (
                <span key={aid}>
                  {i > 0 && ", "}
                  <Link
                    href={buildDesignDocsPath(`nyt-articles/${aid}`)}
                    style={{ textDecoration: "underline" }}
                  >
                    {articleTitleById(aid)}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. Special Components ─────────────────────────────── */}
      <SectionLabel id="special-components">Special Components</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Components inferred from article metadata beyond contentBlocks arrays.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {specialComponents.map((comp) => (
          <div
            key={comp.name}
            className="dd-brand-card p-4"
            style={{ borderLeft: "3px solid var(--dd-brand-accent)" }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              {comp.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {comp.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "var(--dd-brand-accent)",
              }}
            >
              {comp.articleIds.map((aid, i) => (
                <span key={aid}>
                  {i > 0 && ", "}
                  <Link
                    href={buildDesignDocsPath(`nyt-articles/${aid}`)}
                    style={{ textDecoration: "underline" }}
                  >
                    {articleTitleById(aid)}
                  </Link>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Site Header Specimen ────────────────────────────── */}
      <SectionLabel id="site-header">Site Header</SectionLabel>

      <div
        className="dd-brand-card"
        style={{ padding: "28px 32px", marginBottom: 40 }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen
        </div>

        {/* Header recreation */}
        <div
          style={{
            background: "#FFFFFF",
            borderBottom: "1px solid #e2e2e2",
            fontFamily: "var(--dd-font-sans)",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px",
            }}
          >
            {/* Left: hamburger + search */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 120 }}>
              {/* Hamburger icon */}
              <svg
                width="17"
                height="14"
                viewBox="0 0 17 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Menu"
              >
                <rect x="0" y="0" width="17" height="2" rx="0.5" fill="#121212" />
                <rect x="0" y="6" width="17" height="2" rx="0.5" fill="#121212" />
                <rect x="0" y="12" width="17" height="2" rx="0.5" fill="#121212" />
              </svg>
              {/* Search icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Search"
              >
                <circle cx="6.5" cy="6.5" r="5.5" stroke="#121212" strokeWidth="1.5" fill="none" />
                <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="#121212" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Center: NYT logo / wordmark */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <svg
                width="184"
                height="26"
                viewBox="0 0 184 26"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="The New York Times"
              >
                <text
                  x="92"
                  y="20"
                  textAnchor="middle"
                  fontFamily="var(--dd-font-headline), 'Georgia', 'Times New Roman', serif"
                  fontSize="20"
                  fontWeight="700"
                  fill="#121212"
                  letterSpacing="-0.02em"
                >
                  The New York Times
                </text>
              </svg>
            </div>

            {/* Right: Subscribe + Log in */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 120, justifyContent: "flex-end" }}>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "#326891",
                  color: "#FFFFFF",
                  borderRadius: 3,
                  padding: "8px 12px",
                  cursor: "pointer",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Subscribe
              </span>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#121212",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Log in
              </span>
            </div>
          </div>

          {/* Section nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
              padding: "8px 16px 10px",
              borderTop: "1px solid #e2e2e2",
              overflowX: "auto",
            }}
          >
            {[
              "U.S.",
              "World",
              "Business",
              "Arts",
              "Lifestyle",
              "Opinion",
              "Audio",
              "Games",
              "Cooking",
              "Wirecutter",
              "The Athletic",
            ].map((section) => (
              <span
                key={section}
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.05rem",
                  color: "#121212",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {section}
              </span>
            ))}
          </div>
        </div>

        {/* Annotation: font specs */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Header specs:</strong>
          <br />
          Background: #FFFFFF &middot; Border-bottom: 1px solid #e2e2e2
          <br />
          Logo: nyt-cheltenham / serif, 20px, 700, #121212
          <br />
          Section nav: nyt-franklin, 12px, 700, uppercase, letter-spacing 0.05rem, #121212
          <br />
          Hamburger: 3 rects 17&times;2px, 5px gap, #121212 &middot; Search: 16&times;16 circle+line, #121212
          <br />
          Subscribe: nyt-franklin 11px/700, bg #326891, #FFFFFF, border-radius 3px, padding 8px 12px
          <br />
          Log in: nyt-franklin 11px/500, #121212
        </div>
      </div>

      {/* ── 4. Site Footer Specimen ────────────────────────────── */}
      <SectionLabel id="site-footer">Site Footer</SectionLabel>

      <div
        className="dd-brand-card"
        style={{ padding: "28px 32px", marginBottom: 40 }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen
        </div>

        {/* Footer recreation */}
        <div
          style={{
            background: "#FFFFFF",
            borderTop: "2px solid #121212",
            fontFamily: "var(--dd-font-sans)",
          }}
        >
          {/* Logo row */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e2e2" }}>
            <svg
              width="130"
              height="18"
              viewBox="0 0 130 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="The New York Times"
            >
              <text
                x="0"
                y="14"
                fontFamily="var(--dd-font-headline), 'Georgia', 'Times New Roman', serif"
                fontSize="14"
                fontWeight="700"
                fill="#121212"
                letterSpacing="-0.02em"
              >
                The New York Times
              </text>
            </svg>
          </div>

          {/* Section columns */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 0,
              padding: "16px 0",
              borderBottom: "1px solid #e2e2e2",
            }}
          >
            {(
              [
                {
                  header: "News",
                  links: ["Home Page", "World", "U.S.", "Politics", "New York", "Education", "Sports", "Business", "Tech", "Science"],
                },
                {
                  header: "Opinion",
                  links: ["Today\u2019s Opinion", "Columnists", "Editorials", "Guest Essays", "Letters", "Sunday Review", "Video: Opinion"],
                },
                {
                  header: "Arts",
                  links: ["Today\u2019s Arts", "Art & Design", "Books", "Dance", "Movies", "Music", "Pop Culture", "Television", "Theater"],
                },
                {
                  header: "Living",
                  links: ["Automotive", "Games", "Education", "Food", "Health", "Jobs", "Love", "Magazine", "Parenting", "Real Estate", "Style", "T Magazine", "Travel"],
                },
                {
                  header: "More",
                  links: ["Reader Center", "Wirecutter", "Cooking", "Live Events", "The Learning Network", "Tools & Services", "Podcasts", "Video", "Graphics", "TimesMachine", "NYT Store"],
                },
                {
                  header: "Subscribe",
                  links: ["Home Delivery", "Digital Subscriptions", "Games", "Cooking", "Email Newsletters", "Corporate Subscriptions", "Education Rate"],
                },
              ] as { header: string; links: string[] }[]
            ).map((col) => (
              <div key={col.header} style={{ padding: "0 16px", borderRight: "1px solid #e2e2e2" }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.04em",
                    color: "#121212",
                    marginBottom: 8,
                    paddingBottom: 4,
                  }}
                >
                  {col.header}
                </div>
                {col.links.map((link) => (
                  <div
                    key={link}
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#121212",
                      lineHeight: 1.8,
                      cursor: "pointer",
                    }}
                  >
                    {link}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Social icons row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom: "1px solid #e2e2e2",
            }}
          >
            {/* Social icon placeholders */}
            {["Facebook", "Twitter", "Instagram", "YouTube"].map((platform) => (
              <svg
                key={platform}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label={platform}
              >
                <circle cx="8" cy="8" r="7" stroke="#121212" strokeWidth="1.2" fill="none" />
                <text
                  x="8"
                  y="11"
                  textAnchor="middle"
                  fontFamily="var(--dd-font-sans)"
                  fontSize="7"
                  fontWeight="700"
                  fill="#121212"
                >
                  {platform[0]}
                </text>
              </svg>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 400,
                color: "#727272",
              }}
            >
              &copy; 2026 The New York Times Company
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {[
                "NYTCo",
                "Contact Us",
                "Accessibility",
                "Work with us",
                "Advertise",
                "T Brand Studio",
                "Your Ad Choices",
                "Privacy Policy",
                "Terms of Service",
                "Terms of Sale",
                "Site Map",
                "Help",
                "Subscriptions",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 400,
                    color: "#727272",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Annotation: footer specs */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Footer specs:</strong>
          <br />
          Background: #FFFFFF &middot; Top border: 2px solid #121212
          <br />
          Column headers: nyt-franklin 11px/700, uppercase, letter-spacing 0.04em, #121212
          <br />
          Column links: nyt-franklin 12px/500, #121212, line-height 1.8
          <br />
          Social icons: 16&times;16, circle stroke #121212
          <br />
          Bottom bar: nyt-franklin 11px/400, #727272
          <br />
          Logo: nyt-cheltenham / serif, 14px, 700, #121212
        </div>
      </div>

      {/* ── 5. Feed & Layout Patterns ────────────────────── */}
      <SectionLabel id="feed-layouts">Feed &amp; Layout Patterns</SectionLabel>
      <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-faint)", marginBottom: 16 }}>
        Homepage content organization patterns &mdash; how stories are curated and displayed in editorial sections.
      </p>

      {/* ── Pattern 1: Lead Package (Top Story) ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Lead Package &mdash; Full-width hero with secondary story grid
        </div>
        <div style={{ background: "#FFFFFF", fontFamily: "Georgia, 'Times New Roman', serif" }}>
          {/* Hero image placeholder */}
          <div
            style={{
              width: "100%",
              paddingTop: "50%",
              background: "linear-gradient(135deg, #d5d5d5 0%, #e8e8e8 50%, #d0d0d0 100%)",
              position: "relative" as const,
              marginBottom: 16,
            }}
          >
            <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="6" fill="#c0c0c0" />
                <path d="M14 34L22 24L28 31L32 26L34 29" stroke="#999" strokeWidth="2" fill="none" />
                <circle cx="20" cy="18" r="4" fill="#999" />
              </svg>
            </div>
          </div>

          {/* Lead headline */}
          <div
            style={{
              fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
              fontSize: 32,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#121212",
              lineHeight: 1.15,
              marginBottom: 10,
            }}
          >
            A Sweeping Overhaul of Federal Transit Policy Leaves Cities Scrambling for Alternatives
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
              fontSize: 18,
              fontWeight: 300,
              color: "#363636",
              lineHeight: 1.4,
              marginBottom: 8,
            }}
          >
            Local officials say years of careful planning have been upended in a matter of weeks, with billions in promised funding suddenly in doubt.
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "#727272",
              marginBottom: 20,
            }}
          >
            By Rebecca Halloran
          </div>

          {/* 3-column secondary story grid */}
          <div style={{ borderTop: "1px solid #e2e2e2", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {[
                {
                  headline: "The Quiet Collapse of Rural Hospital Networks Across Three States",
                  summary: "Administrators blame a combination of staff shortages and shifting reimbursement models.",
                  byline: "Catherine R. Briggs",
                },
                {
                  headline: "How a Retired Cryptographer Solved a Decades-Old Maritime Puzzle",
                  summary: "The coded ledger had stumped researchers since 1974. Then Dr. Kowalski tried a different approach.",
                  byline: "James F. Whitfield",
                },
                {
                  headline: "Inside the Unlikely Alliance Between Labor Unions and A.I. Startups",
                  summary: "Both sides see an opportunity where others see a contradiction.",
                  byline: "Dana Morales",
                },
              ].map((story) => (
                <div key={story.headline}>
                  {/* Thumbnail placeholder */}
                  <div
                    style={{
                      width: "100%",
                      paddingTop: "56.25%",
                      background: "linear-gradient(135deg, #ddd 0%, #eee 100%)",
                      marginBottom: 10,
                      position: "relative" as const,
                    }}
                  >
                    <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect width="28" height="28" rx="3" fill="#c0c0c0" />
                        <path d="M8 20L12 14L15 18L18 15L20 17" stroke="#999" strokeWidth="1.5" fill="none" />
                        <circle cx="11" cy="11" r="2.5" fill="#999" />
                      </svg>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "#121212",
                      lineHeight: 1.25,
                      marginBottom: 6,
                    }}
                  >
                    {story.headline}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-body), Georgia, 'Times New Roman', serif",
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#363636",
                      lineHeight: 1.4,
                      marginBottom: 6,
                    }}
                  >
                    {story.summary}
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 400, color: "#727272" }}>
                    {story.byline}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Lead Package specs:</strong>
          <br />
          Hero image: 16:9 or wider, full-width
          <br />
          Headline: nyt-cheltenham 32px/700 italic #121212
          <br />
          Summary: nyt-cheltenham 18px/300 #363636
          <br />
          Byline: nyt-franklin 12px/500 #727272
          <br />
          Secondary grid: 3 equal columns, 20px gap, border-top 1px #e2e2e2
          <br />
          Secondary headline: nyt-cheltenham 17px/500 #121212
        </div>
      </div>

      {/* ── Pattern 2: Section River ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Section River &mdash; Vertical story list with optional thumbnails and numbered variant
        </div>
        <div style={{ background: "#FFFFFF" }}>
          {/* Section label bar */}
          <div
            style={{
              borderTop: "2px solid #121212",
              paddingTop: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "#121212",
              }}
            >
              Editors&rsquo; Picks
            </span>
          </div>

          {/* Story cards */}
          {[
            {
              headline: "The Forgotten Gardens of Eastern Kentucky Are Blooming Again",
              summary: "Volunteers have replanted heirloom seeds in a region where coal once dominated every hillside.",
              byline: "Maria Chen",
            },
            {
              headline: "Why More Families Are Choosing to Homeschool Through High School",
              summary: "A shift that began during the pandemic has become a lasting transformation in American education.",
              byline: "David Korenstein",
            },
            {
              headline: "A Ceramicist\u2019s Studio in the Ozarks Draws Pilgrims from Three Continents",
              byline: "Yuki Tanaka",
            },
          ].map((story, idx) => (
            <div
              key={story.headline}
              style={{
                display: "flex",
                gap: 16,
                padding: "14px 0",
                borderBottom: idx < 2 ? "1px solid #e2e2e2" : "none",
              }}
            >
              {/* Thumbnail placeholder */}
              <div
                style={{
                  width: 120,
                  height: 80,
                  background: "linear-gradient(135deg, #ddd, #eee)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="2" fill="#c0c0c0" />
                  <path d="M6 18L10 12L13 16L16 13L18 15" stroke="#999" strokeWidth="1.5" fill="none" />
                  <circle cx="9" cy="9" r="2" fill="#999" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                    fontSize: 17,
                    fontWeight: 500,
                    color: "#121212",
                    lineHeight: 1.25,
                    marginBottom: 4,
                  }}
                >
                  {story.headline}
                </div>
                {story.summary && (
                  <div
                    style={{
                      fontFamily: "var(--dd-font-body), Georgia, 'Times New Roman', serif",
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#363636",
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {story.summary}
                  </div>
                )}
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 400, color: "#727272" }}>
                  {story.byline}
                </div>
              </div>
            </div>
          ))}

          {/* ── Numbered variant ── */}
          <div
            style={{
              borderTop: "2px solid #121212",
              paddingTop: 8,
              marginTop: 28,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "#121212",
              }}
            >
              Most Popular
            </span>
          </div>

          {[
            "The Startling Rise of Underground Supper Clubs in Midwestern College Towns",
            "An Engineer\u2019s Quest to Rebuild Every Covered Bridge in Vermont",
            "What a 200-Year-Old Diary Reveals About Daily Life in Pre-Industrial Baltimore",
            "Mapping the Hidden River Beneath Manhattan\u2019s Financial District",
            "Why One Librarian\u2019s Fight Over a Banned Cookbook Became a National Cause",
          ].map((headline, idx) => (
            <div
              key={headline}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "10px 0",
                borderBottom: idx < 4 ? "1px solid #e2e2e2" : "none",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "#c4c4c4",
                  minWidth: 28,
                  textAlign: "center" as const,
                  lineHeight: 1,
                }}
              >
                {idx + 1}
              </span>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                  fontSize: 17,
                  fontWeight: 500,
                  color: "#121212",
                  lineHeight: 1.25,
                }}
              >
                {headline}
              </div>
            </div>
          ))}
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Section River specs:</strong>
          <br />
          Section label: nyt-franklin 11px/700, uppercase, letter-spacing 0.05em, #121212, border-top 2px solid #121212
          <br />
          Thumbnail: 120&times;80, border-radius 0
          <br />
          Headline: nyt-cheltenham 17px/500 #121212
          <br />
          Summary: nyt-imperial 14px/400 #363636
          <br />
          Byline: nyt-franklin 12px/400 #727272
          <br />
          Divider: 1px solid #e2e2e2
          <br />
          Numbered variant: nyt-cheltenham 28px/400 #c4c4c4 numerals
        </div>
      </div>

      {/* ── Pattern 3: Story Grid (3-column) ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Story Grid &mdash; 3-column equal card layout
        </div>
        <div style={{ background: "#FFFFFF" }}>
          {/* Section label bar */}
          <div
            style={{
              borderTop: "2px solid #121212",
              paddingTop: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "#121212",
              }}
            >
              Science
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {[
              {
                headline: "Deep-Sea Microbes Survive on Volcanic Glass, Upending Origin Theories",
                summary: "The organisms thrive at crushing depths where no sunlight reaches.",
                byline: "Priya Chandrasekaran",
              },
              {
                headline: "A New Kind of Solar Panel Generates Electricity After Sunset",
                summary: "Researchers say the radiative cooling design could power sensors in remote locations.",
                byline: "Thomas Wendt",
              },
              {
                headline: "The Salmon That Swam 900 Miles to a Place They Had Never Been",
                summary: "Biologists tracked the fish using tiny acoustic tags and satellite relays.",
                byline: "Ellen R. Masuda",
              },
            ].map((story) => (
              <div key={story.headline}>
                {/* Image placeholder */}
                <div
                  style={{
                    width: "100%",
                    paddingTop: "56.25%",
                    background: "linear-gradient(135deg, #d8d8d8 0%, #ececec 100%)",
                    marginBottom: 10,
                    position: "relative" as const,
                  }}
                >
                  <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect width="28" height="28" rx="3" fill="#c0c0c0" />
                      <path d="M8 20L12 14L15 18L18 15L20 17" stroke="#999" strokeWidth="1.5" fill="none" />
                      <circle cx="11" cy="11" r="2.5" fill="#999" />
                    </svg>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                    fontSize: 17,
                    fontWeight: 500,
                    color: "#121212",
                    lineHeight: 1.25,
                    marginBottom: 6,
                  }}
                >
                  {story.headline}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-body), Georgia, 'Times New Roman', serif",
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#363636",
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {story.summary}
                </div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 400, color: "#727272" }}>
                  {story.byline}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Story Grid specs:</strong>
          <br />
          Section label: same as river pattern
          <br />
          Layout: 3 equal columns, 20px gap
          <br />
          Card image: 16:9 ratio
          <br />
          Headline: nyt-cheltenham 17px/500 #121212
          <br />
          Summary: 1&ndash;2 lines, nyt-imperial 14px/400 #363636
          <br />
          Byline: nyt-franklin 12px/400 #727272
        </div>
      </div>

      {/* ── Pattern 4: Opinion Section ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Opinion Section &mdash; Gold accent with columnist headshots and pull quotes
        </div>
        <div style={{ background: "#FFFFFF" }}>
          {/* Opinion label bar */}
          <div
            style={{
              borderTop: "3px solid #B47F4D",
              paddingTop: 8,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                color: "#B47F4D",
              }}
            >
              Opinion
            </span>
          </div>

          {/* Columnist cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              {
                name: "Margaret Sullivan",
                headline: "The Real Reason Local News Is Vanishing Isn\u2019t What You Think",
                quote: "\u201CWe keep blaming the internet, but the rot started long before the first website launched.\u201D",
              },
              {
                name: "Ezra Kaplan",
                headline: "On Immigration, Both Parties Are Lying to You",
                quote: "\u201CThe dishonesty is bipartisan and almost perfectly symmetrical.\u201D",
              },
              {
                name: "Liora Chen-Marcus",
                headline: "When the Supreme Court Stops Pretending",
                quote: "\u201CThe fiction of neutrality has become unsustainable.\u201D",
              },
            ].map((col) => (
              <div key={col.name}>
                {/* Headshot placeholder */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 9999,
                    background: "linear-gradient(135deg, #d5d5d5, #c0c0c0)",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="8" r="4" fill="#999" />
                    <path d="M3 18c0-3.86 3.14-7 7-7s7 3.14 7 7" stroke="#999" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                    fontSize: 17,
                    fontWeight: 500,
                    color: "#121212",
                    lineHeight: 1.25,
                    marginBottom: 8,
                  }}
                >
                  {col.headline}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-body), Georgia, 'Times New Roman', serif",
                    fontSize: 15,
                    fontWeight: 400,
                    fontStyle: "italic",
                    color: "#363636",
                    lineHeight: 1.4,
                    marginBottom: 8,
                    borderLeft: "2px solid #B47F4D",
                    paddingLeft: 12,
                  }}
                >
                  {col.quote}
                </div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 500, color: "#727272" }}>
                  {col.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Opinion Section specs:</strong>
          <br />
          Accent: border-top 3px solid #B47F4D (opinion gold)
          <br />
          Label: nyt-franklin 11px/700 uppercase #B47F4D
          <br />
          Columnist headshots: round, 48px diameter
          <br />
          Headline: nyt-cheltenham 17px/500 #121212
          <br />
          Pull quote: nyt-imperial 15px/400 italic #363636, border-left 2px solid #B47F4D
          <br />
          Byline: nyt-franklin 12px/500 #727272
        </div>
      </div>

      <SectionLabel id="homepage-components">Homepage Components</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Homepage-only patterns that sit outside the article content-block model.
      </p>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {NYT_HOMEPAGE_COMPONENT_EXAMPLES.map((pattern) => (
          <div
            key={pattern.previewId}
            className="dd-brand-card"
            style={{ padding: "18px 18px 20px" }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-brand-accent)",
                marginBottom: 8,
              }}
            >
              {pattern.category}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 6,
              }}
            >
              {pattern.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              {pattern.note}
            </div>
            <HomepageComponentPreview previewId={pattern.previewId} />
            <HomepageSourceSnippet snippet={pattern.htmlSnippet} />
          </div>
        ))}
      </div>

      <SectionLabel id="homepage-package-containers">Homepage Package Containers</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Actual homepage package containers, kept separate so carousel packages, cross-property shelves, and
        list-plus-lead modules are documented as different layouts instead of one merged rail abstraction.
      </p>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {NYT_HOMEPAGE_PACKAGE_CONTAINERS.map((container) => (
          <div
            key={container.previewId}
            className="dd-brand-card"
            style={{ padding: "18px 18px 20px" }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-brand-accent)",
                marginBottom: 8,
              }}
            >
              live container
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 6,
              }}
            >
              {container.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              {container.description}
            </div>
            <HomepagePackagePreview previewId={container.previewId} />
            <HomepageSourceSnippet snippet={container.htmlSnippet} />
          </div>
        ))}
      </div>
    </div>
  );
}
