"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Layout                                            */
/*  Layout tokens, DOM hierarchy, content block inventory              */
/*  from the NFL fourth-down article                                   */
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
        color: "#121212",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid #121212",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

/* ── Layout Token Data ──────────────────────────────────────────────── */

interface LayoutToken {
  token: string;
  value: string;
  description: string;
}

const LAYOUT_TOKENS: LayoutToken[] = [
  { token: "maxContentWidth", value: "1248px", description: "Container_container max-width" },
  { token: "bodyFontSize", value: "16px base", description: "nyt-imperial for body, nyt-franklin for UI" },
  { token: "bodyLineHeight", value: "139% (1.39)", description: "body text; 100% for labels" },
  { token: "headlineFont", value: "nyt-cheltenham 500", description: "Article_Headline.Article_Featured" },
  { token: "uiFont", value: "nyt-franklin 500-700", description: "UI chrome, nav, pills, labels" },
  { token: "showcaseCardBorder", value: "1px solid rgba(150,150,147,0.4)", description: "top + bottom borders" },
  { token: "showcaseImageSize", value: "200x150px desktop, 120x120px mobile", description: "recommendation card images" },
  { token: "showcaseImageRadius", value: "8px", description: "rounded corners on showcase images" },
  { token: "showcaseGap", value: "16px inner / 20px section", description: "spacing inside and between sections" },
  { token: "avatarSize", value: "40px byline, 100px bio", description: "author avatar sizes" },
  { token: "avatarRadius", value: "20px (circular)", description: "border-radius for circular avatars" },
  { token: "pillShape", value: "Pill_Pill", description: "icon + optional label, aria-pressed toggle" },
  { token: "adMargin", value: "48px 0 desktop, 40px 0 mobile", description: "mid-article ad slot spacing" },
  { token: "adMinHeight", value: "300px", description: "minimum height for ad containers" },
  { token: "adSlugStyle", value: "11px/500/uppercase, 0.02em, --Gray60", description: "Advertisement label style" },
  { token: "breakpointMobile", value: "599.95px", description: "mobile breakpoint max-width" },
  { token: "breakpointTablet", value: "1023.95px", description: "tablet breakpoint max-width" },
  { token: "breakpointDesktop", value: "1248px", description: "desktop breakpoint min-width" },
  { token: "gridSystem", value: "Grid_xsNumber12 (12-col)", description: "12-column base with sm/md variants" },
  { token: "articleGridSplit", value: "9/12 content + sidebar", description: "main content column on md+" },
];

/* ── DOM Hierarchy ──────────────────────────────────────────────────── */

const DOM_HIERARCHY: string[] = [
  "div#__next (Next.js app root)",
  "  div (position:relative, min-height:100vh, flex column)",
  "    header > nav.HeaderNav_HeaderNav",
  "      div.DesktopNav_Wrapper (StorylineHeight variant)",
  "        div.DesktopNav_PrimaryNav",
  "          button.DesktopNav_HamburgerMenuContainer (hamburger: 3 rects 17x2.5px each)",
  "          div#subnav-hamburger.HeaderSubNav_Wrapper (aria-hidden=true)",
  "            div.HamburgerNav_Wrapper (league list + edition toggle + search)",
  "          a.athletic-slab-logo (SVG wordmark 1449x200 viewBox, white fill on dark bg)",
  "          div.PrimaryNav_Wrapper (league icons 24x24 + team dropdown subnavs)",
  "    div.root.legacy > main",
  "      div#body-container.Container_default-padding (Container_container max-width:none)",
  "        div.Article_ArticleWrapper",
  "          div#storyline-root.Storyline_Root (Storyline_notEmbed Storyline_isLegacy)",
  "            div.Storyline_NavContainer > div.Storyline_TitleWrapper",
  '              p.Storyline_StorylineTitle (headlineSansBoldExtraSmall: \'Super Bowl LX\')',
  "            div.Storyline_ItemContainer (horizontal scroll links)",
  "          div.Article_FeaturedImageContainer (full-width)",
  "            div.Image_Root--centered (span > img srcSet 600-1920w, fetchpriority=high)",
  "            p.Article_ImageCaptionCredit > span.Article_ImageCredit (body1 typography)",
  "          div.Article_Wrapper.the-lead-article",
  "            div.Article_ArticleHeader.Article_FeaturedArticleHeader",
  "              div.Article_HeadlineContainer.Article_FeaturedHeadlineContainer",
  "                h1.Article_Headline.Article_Featured (nyt-cheltenham 500)",
  "              div.Article_BylineGrid (Grid 12-col)",
  "                div.Article_BylineAuthorWrapper",
  "                  div.Article_AuthorAvatarImage (40x40, border-radius:20px)",
  "                  span.Article_BylineString ('By <u>Austin Mock</u>')",
  "                div.Article_BylineTimestamp.Article_Featured (<time>Jan. 9, 2026</time>)",
  "                div.Article_ArticleBylineSocialContainer",
  "                  button.Pill (share: SVG 28x28 + 'Share full article')",
  "                  button.Pill (share-only icon: SVG 24x24)",
  "                  button.Pill (comments: SVG 14x15 + '46')",
  "            div#article-container-grid.Article_ContainerGrid",
  "              div.Article_ContentContainer.article-content-container.bodytext1",
  "                p (body text -- nyt-imperial)",
  "                div.ad-container > div.ad-wrapper (min-height:300px, margin:48px 0)",
  "                div#inline-graphic > a.showcase-link-container (recommendation card)",
  "                div > iframe#datawrapper-chart-UYsk6 (dark/light mode pair)",
  "                h2 / h3 (section subheadings)",
  "                blockquote.twitter-tweet (embedded tweet)",
  "              div.PuzzleEntryPoint_PuzzleContainer (Connections: Sports Edition)",
  "              div.Article_WriterBioContainer (Grid 9-col, headshot + bio)",
  "    footer.Footer_footer",
  "      nav (Grid: National | US | Canada+Partners | Subscribe+Support)",
  "      div (Logo SVG + social icons + app store badges)",
];

/* ── Content Block Descriptions ────────────────────────────────────── */

const CONTENT_BLOCK_DESCRIPTIONS: string[] = [
  "header (headline h1 -- nyt-cheltenham 500, Article_Featured variant)",
  "storyline (horizontal nav bar -- 'Super Bowl LX' with 5 story links, headlineSansBoldExtraSmall)",
  "featured-image (full-width hero img, srcSet 600-1920w, fetchpriority=high, object-fit:cover)",
  "image-credit (span.Article_ImageCredit -- 'Illustration: Will Tullos / The Athletic; ...')",
  "byline (author avatar 40x40 r:20px + 'By Austin Mock' underlined + <time>Jan. 9, 2026</time>)",
  "social-bar (3 Pill buttons: share-full 28x28 + share-icon 24x24 + comments 14x15 + '46')",
  "body-text (nyt-imperial 16px/400, line-height 139%, paragraphs)",
  "ad-container (mid-article: .ad-wrapper min-h:300px, margin:48px/40px, .ad-slug 11px/500 uppercase)",
  "showcase-link (inline recommendation card: image 200x150 r:8px + title cheltenham 24px + excerpt imperial 16px)",
  "datawrapper-table (iframe#datawrapper-chart-UYsk6, The Athletic theme, heatmap on xGC+ column)",
  "twitter-embed (blockquote.twitter-tweet data-width=550 data-dnt=true, async widgets.js)",
  "subhed (h2/h3 -- section headings: Takeaways, Let's go LaFleur it, etc.)",
  "author-bio (Grid 9-col: headshot 100px + bio text utilitySansRegularLarge + Twitter link)",
  "puzzle-entry-point (Connections: Sports Edition promo with date, title, subtitle, play CTA)",
];

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticLayout() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
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
            color: "var(--dd-ink-black)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Layout
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.5,
          }}
        >
          Layout tokens, DOM hierarchy, and content block inventory from the NFL fourth-down article
        </div>
      </div>

      {/* ── Layout Tokens ──────────────────────────────── */}
      <SectionLabel id="layout-tokens">Layout Tokens</SectionLabel>
      <div style={{ overflowX: "auto", marginBottom: 40 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              {["Token", "Value", "Description"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-faint)",
                    borderBottom: "2px solid #e5e5e5",
                    background: "#fafafa",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LAYOUT_TOKENS.map((t, i) => (
              <tr key={t.token}>
                <td
                  style={{
                    padding: "6px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    background: i % 2 === 0 ? "#f9f9f9" : "white",
                    color: "#121212",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.token}
                </td>
                <td
                  style={{
                    padding: "6px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    background: i % 2 === 0 ? "#f9f9f9" : "white",
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {t.value}
                </td>
                <td
                  style={{
                    padding: "6px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    background: i % 2 === 0 ? "#f9f9f9" : "white",
                    color: "var(--dd-ink-faint)",
                  }}
                >
                  {t.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Breakpoint Visualization ───────────────────── */}
      <SectionLabel id="breakpoints">Breakpoints</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
        style={{
          padding: "20px 24px",
          marginBottom: 40,
        }}
      >
        {[
          { label: "Mobile", max: "599.95px", pct: 48, color: "#E74C3C" },
          { label: "Tablet", max: "1023.95px", pct: 82, color: "#F5A623" },
          { label: "Desktop", min: "1248px", pct: 100, color: "#1DB954" },
        ].map((bp) => (
          <div key={bp.label} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                }}
              >
                {bp.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {bp.max ? `max: ${bp.max}` : `min: ${bp.min}`}
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: "#e5e5e5",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${bp.pct}%`,
                  height: "100%",
                  background: bp.color,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        ))}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            marginTop: 8,
          }}
        >
          Grid: 12-col base (Grid_xsNumber12) with sm/md responsive variants
        </div>
      </div>

      {/* ── DOM Hierarchy ──────────────────────────────── */}
      <SectionLabel id="dom-hierarchy">DOM Hierarchy</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
        style={{
          padding: "20px 24px",
          marginBottom: 40,
          overflowX: "auto",
        }}
      >
        <pre
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            lineHeight: 1.6,
            color: "var(--dd-ink-faint)",
            margin: 0,
            whiteSpace: "pre",
          }}
        >
          {DOM_HIERARCHY.join("\n")}
        </pre>
      </div>

      {/* ── Content Block Inventory ────────────────────── */}
      <SectionLabel id="content-blocks">Content Block Inventory</SectionLabel>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 40,
        }}
      >
        {CONTENT_BLOCK_DESCRIPTIONS.map((desc, i) => {
          const typePart = desc.split(" (")[0];
          const detailPart = desc.includes("(") ? desc.slice(desc.indexOf("(")) : "";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "6px 12px",
                background: i % 2 === 0 ? "#f9f9f9" : "transparent",
                borderRadius: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#121212",
                  whiteSpace: "nowrap",
                  minWidth: 120,
                }}
              >
                {typePart}
              </span>
              <span
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "#888888",
                  lineHeight: 1.4,
                }}
              >
                {detailPart}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── CSS Files ──────────────────────────────────── */}
      <SectionLabel id="css-files">CSS Files (Next.js Bundles)</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
        style={{
          padding: "16px 20px",
          marginBottom: 40,
        }}
      >
        {[
          "/athletic/_next/static/css/17f00444ca25c61f.css (global reset)",
          "/athletic/_next/static/css/90f4e6b42067e4fb.css",
          "/athletic/_next/static/css/e245a4adee347a47.css",
          "/athletic/_next/static/css/97d13b5c057c71f5.css",
          "/athletic/_next/static/css/3d4d90231fd6ed69.css",
          "/athletic/_next/static/css/6148836b558a1c06.css",
          "/athletic/_next/static/css/90f652a6dd291d17.css",
          "/athletic/_next/static/css/6b0e63f354e11a15.css",
        ].map((file) => (
          <div
            key={file}
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
              padding: "3px 0",
            }}
          >
            {file}
          </div>
        ))}
      </div>
    </div>
  );
}
