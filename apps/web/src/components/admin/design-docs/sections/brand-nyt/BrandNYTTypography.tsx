"use client";

import { useEffect, useState } from "react";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

/* ------------------------------------------------------------------ */
/*  NYT Brand Typography — Aggregated font data from all NYT articles  */
/*  Dynamic font cards, mapping table, usage matrix, live specimens    */
/* ------------------------------------------------------------------ */

/* ── Shared label components (match BrandNYTSection patterns) ─────── */

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

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--dd-ink-black)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

/* ── NYT article filter: exclude Athletic articles ────────────────── */

const NYT_ARTICLES = ARTICLES.filter((a) => !a.url.includes("/athletic/"));

/* ── Aggregate font data across all NYT articles ─────────────────── */

interface MergedUsedIn {
  entry: string;
  articleTitle: string;
}

interface MergedFont {
  name: string;
  cssVar: string | null;
  fullStack: string;
  weights: number[];
  role: string;
  usedIn: MergedUsedIn[];
}

function aggregateFonts(): MergedFont[] {
  const map = new Map<string, MergedFont>();

  for (const article of NYT_ARTICLES) {
    for (const f of article.fonts) {
      const existing = map.get(f.name);
      const shortTitle =
        article.title.length <= 30
          ? article.title
          : article.title.slice(0, 27) + "\u2026";

      if (existing) {
        // Merge weights (union)
        for (const w of f.weights) {
          if (!existing.weights.includes(w)) {
            existing.weights.push(w);
          }
        }
        existing.weights.sort((a, b) => a - b);

        // Merge usedIn entries with article attribution
        for (const entry of f.usedIn) {
          existing.usedIn.push({ entry, articleTitle: shortTitle });
        }
      } else {
        map.set(f.name, {
          name: f.name,
          cssVar: f.cssVar,
          fullStack: f.fullStack,
          weights: [...f.weights].sort((a, b) => a - b),
          role: f.role.split(" \u2014 ")[0],
          usedIn: f.usedIn.map((entry) => ({
            entry,
            articleTitle: shortTitle,
          })),
        });
      }
    }
  }

  return Array.from(map.values());
}

/* ── Font mapping table data ─────────────────────────────────────── */

interface FontMapping {
  nyt: string;
  trr: string;
  cssVar: string;
}

const FONT_MAP: FontMapping[] = [
  {
    nyt: "nyt-cheltenham",
    trr: "Cheltenham",
    cssVar: "var(--dd-font-headline)",
  },
  { nyt: "nyt-franklin", trr: "Hamburg Serial", cssVar: "var(--dd-font-ui)" },
  {
    nyt: "nyt-imperial",
    trr: "Gloucester MT",
    cssVar: "var(--dd-font-serif)",
  },
  { nyt: "nyt-karnak", trr: "Gloucester MT", cssVar: "var(--dd-font-serif)" },
  {
    nyt: "nyt-karnakcondensed",
    trr: "Cheltenham",
    cssVar: "var(--dd-font-headline)",
  },
  { nyt: "nyt-stymie", trr: "Chomsky", cssVar: "var(--dd-font-display)" },
];

/* ── Font usage across articles (same logic as BrandNYTSection) ──── */

interface FontUsageRow {
  font: string;
  role: string;
  articleTitles: string[];
}

function shortTitle(title: string): string {
  if (title.length <= 40) return title;
  return title.slice(0, 37) + "\u2026";
}

function buildFontUsage(): FontUsageRow[] {
  const map = new Map<string, { role: string; titles: string[] }>();
  for (const article of NYT_ARTICLES) {
    for (const f of article.fonts) {
      const existing = map.get(f.name);
      const titleShort = shortTitle(article.title);
      if (existing) {
        if (!existing.titles.includes(titleShort)) {
          existing.titles.push(titleShort);
        }
      } else {
        map.set(f.name, {
          role: f.role.split(" \u2014 ")[0],
          titles: [titleShort],
        });
      }
    }
  }
  return Array.from(map.entries()).map(([font, data]) => ({
    font,
    role: data.role,
    articleTitles: data.titles,
  }));
}

/* ── Font specimen configuration ─────────────────────────────────── */

interface FontSpecimen {
  name: string;
  family: string;
  urls: { weight: number; style: string; url: string }[];
  sampleHeading: string;
  sampleBody: string;
  weights: number[];
}

const FONT_SPECIMENS: FontSpecimen[] = [
  {
    name: "nyt-cheltenham",
    family: "nyt-cheltenham-specimen",
    urls: [
      {
        weight: 300,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/cheltenham/cheltenham-normal-300.woff2",
      },
      {
        weight: 300,
        style: "italic",
        url: "https://g1.nyt.com/fonts/family/cheltenham/cheltenham-normal-300-o.woff2",
      },
      {
        weight: 500,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/cheltenham/cheltenham-normal-500.woff2",
      },
      {
        weight: 700,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/cheltenham/cheltenham-normal-700.woff2",
      },
    ],
    sampleHeading:
      "Trump Said He'd Unleash the Economy in Year 1. Here's How He Did.",
    sampleBody:
      "The New York Times uses Cheltenham as its primary display serif for headlines, summaries, and section headings across editorial content.",
    weights: [300, 500, 700],
  },
  {
    name: "nyt-franklin",
    family: "nyt-franklin-specimen",
    urls: [
      {
        weight: 300,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/franklin/franklin-normal-300.woff2",
      },
      {
        weight: 500,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/franklin/franklin-normal-500.woff2",
      },
      {
        weight: 700,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/franklin/franklin-normal-700.woff2",
      },
    ],
    sampleHeading: "SECTION LABEL / NAVIGATION / BADGES",
    sampleBody:
      "Franklin is the workhorse sans-serif powering all UI chrome, navigation, bylines, badges, chart annotations, and captions across every NYT page.",
    weights: [300, 500, 700],
  },
  {
    name: "nyt-imperial",
    family: "nyt-imperial-specimen",
    urls: [
      {
        weight: 400,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/imperial/imperial-normal-400.woff2",
      },
      {
        weight: 500,
        style: "normal",
        url: "https://g1.nyt.com/fonts/family/imperial/imperial-normal-500.woff2",
      },
    ],
    sampleHeading: "Long-Form Article Body Text",
    sampleBody:
      "Imperial is the primary reading font for NYT long-form journalism. Set at 20px with 1.5 line-height and weight 500, it provides comfortable sustained reading across thousands of words of article text.",
    weights: [400, 500],
  },
];

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTTypography() {
  const mergedFonts = aggregateFonts();
  const fontUsage = buildFontUsage();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(
    new Set(),
  );

  /* Load NYT web fonts for live specimens */
  useEffect(() => {
    let cancelled = false;
    const loadFonts = async () => {
      const faces: FontFace[] = [];
      for (const specimen of FONT_SPECIMENS) {
        for (const entry of specimen.urls) {
          const face = new FontFace(specimen.family, `url(${entry.url})`, {
            weight: String(entry.weight),
            style: entry.style,
          });
          faces.push(face);
        }
      }

      try {
        const loaded = await Promise.allSettled(
          faces.map((f) => f.load()),
        );
        if (!cancelled) {
          for (const result of loaded) {
            if (result.status === "fulfilled") {
              document.fonts.add(result.value);
            }
          }
          setFontsLoaded(true);
        }
      } catch {
        // Fonts may fail to load cross-origin; specimens degrade gracefully
        if (!cancelled) setFontsLoaded(true);
      }
    };

    loadFonts();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleArticle(articleId: string) {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  }

  return (
    <div>
      {/* ── 1. Header ─────────────────────────────────────────── */}
      <SectionLabel id="typography">Typography</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 16,
        }}
      >
        Aggregated typography data from {NYT_ARTICLES.length} NYT articles
        &mdash; {mergedFonts.length} unique font families across trump-economy,
        sweepstakes, and olympics.
      </p>

      {/* ── 2. Dynamic Font Cards ─────────────────────────────── */}
      <SubSectionLabel>Font Families</SubSectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {mergedFonts.map((f) => (
          <div
            key={f.name}
            className="dd-brand-card p-4"
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 2,
              }}
            >
              {f.name}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 11, color: "var(--dd-brand-accent)", marginBottom: 6 }}
            >
              {f.cssVar ?? "\u2014"}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              <span style={{ fontWeight: 600 }}>Weights:</span>{" "}
              {f.weights.join(", ")}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              {f.role}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {f.usedIn.length} usage entries
              </span>{" "}
              across{" "}
              {
                new Set(f.usedIn.map((u) => u.articleTitle)).size
              }{" "}
              articles
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.5,
                wordBreak: "break-all",
              }}
            >
              {f.fullStack}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Font Mapping Table ─────────────────────────────── */}
      <SubSectionLabel>NYT &rarr; TRR Font Mapping</SubSectionLabel>
      <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                NYT Font
              </th>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                TRR Equivalent
              </th>
              <th
                className="py-1 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                CSS Variable
              </th>
            </tr>
          </thead>
          <tbody>
            {FONT_MAP.map((m) => (
              <tr key={m.nyt} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                <td
                  className="py-1 pr-4 font-mono"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {m.nyt}
                </td>
                <td
                  className="py-1 pr-4"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {m.trr}
                </td>
                <td className="py-1 font-mono" style={{ color: "var(--dd-brand-accent)" }}>
                  {m.cssVar}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 4. Usage Across Articles ──────────────────────────── */}
      <SubSectionLabel>Usage Across Articles</SubSectionLabel>
      <div className="dd-brand-card p-4 mb-8 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Font
              </th>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Role
              </th>
              <th
                className="py-1 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Articles
              </th>
            </tr>
          </thead>
          <tbody>
            {fontUsage.map((row) => (
              <tr key={row.font} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                <td
                  className="py-1 pr-4 font-mono"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {row.font}
                </td>
                <td
                  className="py-1 pr-4"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {row.role}
                </td>
                <td className="py-1" style={{ color: "var(--dd-ink-faint)" }}>
                  {row.articleTitles.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 5. Live Font Specimens ────────────────────────────── */}
      <SectionLabel id="specimens">Live Font Specimens</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 16,
        }}
      >
        Rendered using actual NYT web fonts loaded from g1.nyt.com/fonts/ CDN.
        {!fontsLoaded && " Loading fonts\u2026"}
      </p>

      <div className="space-y-4 mb-8">
        {FONT_SPECIMENS.map((specimen) => (
          <div
            key={specimen.name}
            className="dd-brand-card p-5"
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-brand-accent)",
                marginBottom: 12,
              }}
            >
              {specimen.name}
            </div>

            {/* Heading sample */}
            <div
              style={{
                fontFamily: `"${specimen.family}", georgia, serif`,
                fontSize: specimen.name === "nyt-franklin" ? 14 : 32,
                fontWeight: specimen.name === "nyt-franklin" ? 700 : 700,
                lineHeight: 1.15,
                color: "#121212",
                marginBottom: 12,
                fontStyle:
                  specimen.name === "nyt-cheltenham" ? "italic" : "normal",
                letterSpacing:
                  specimen.name === "nyt-franklin" ? "0.08em" : "normal",
                textTransform:
                  specimen.name === "nyt-franklin"
                    ? ("uppercase" as const)
                    : ("none" as const),
              }}
            >
              {specimen.sampleHeading}
            </div>

            {/* Body sample */}
            <div
              style={{
                fontFamily: `"${specimen.family}", georgia, serif`,
                fontSize: specimen.name === "nyt-imperial" ? 20 : 16,
                fontWeight: specimen.name === "nyt-imperial" ? 500 : 400,
                lineHeight: 1.5,
                color: "#363636",
                marginBottom: 16,
              }}
            >
              {specimen.sampleBody}
            </div>

            {/* Weight samples */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              {specimen.weights.map((weight) => (
                <div key={weight} style={{ minWidth: 120 }}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--dd-ink-faint)",
                      marginBottom: 4,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    Weight {weight}
                  </div>
                  <div
                    style={{
                      fontFamily: `"${specimen.family}", georgia, serif`,
                      fontSize: 24,
                      fontWeight: weight,
                      lineHeight: 1.2,
                      color: "#121212",
                    }}
                  >
                    Aa Bb Cc
                  </div>
                  <div
                    style={{
                      fontFamily: `"${specimen.family}", georgia, serif`,
                      fontSize: 14,
                      fontWeight: weight,
                      lineHeight: 1.4,
                      color: "#363636",
                    }}
                  >
                    The quick brown fox jumps over the lazy dog. 0123456789
                  </div>
                </div>
              ))}
            </div>

            {/* Font stack reference */}
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 12,
                paddingTop: 8,
                borderTop: "1px solid var(--dd-brand-border-subtle)",
                wordBreak: "break-all",
              }}
            >
              {
                mergedFonts.find((f) => f.name === specimen.name)?.fullStack ??
                specimen.family
              }
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Per-Article Font Details ────────────────────────── */}
      <SectionLabel id="per-article">Per-Article Font Details</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Expand each article to see exact CSS specifications for every font usage
        entry.
      </p>

      <div className="space-y-3 mb-8">
        {NYT_ARTICLES.map((article) => {
          const isExpanded = expandedArticles.has(article.id);
          const articleShort =
            article.title.length <= 50
              ? article.title
              : article.title.slice(0, 47) + "\u2026";

          return (
            <div
              key={article.id}
              className="dd-brand-card overflow-hidden"
            >
              {/* Expandable header */}
              <button
                type="button"
                onClick={() => toggleArticle(article.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--dd-ink-black)",
                      marginBottom: 2,
                    }}
                  >
                    {articleShort}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 11,
                      color: "var(--dd-ink-faint)",
                    }}
                  >
                    {article.fonts.length} font families &middot;{" "}
                    {article.section} &middot; {article.date}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 18,
                    color: "var(--dd-brand-accent)",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  &#9660;
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: "1px solid var(--dd-brand-border-subtle)",
                  }}
                >
                  {article.fonts.map((font) => (
                    <div
                      key={font.name}
                      style={{ marginTop: 12 }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--dd-font-sans)",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--dd-ink-black)",
                          marginBottom: 2,
                        }}
                      >
                        {font.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--dd-font-sans)",
                          fontSize: 11,
                          color: "var(--dd-ink-faint)",
                          marginBottom: 2,
                        }}
                      >
                        {font.role}
                      </div>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--dd-brand-accent)",
                          marginBottom: 6,
                        }}
                      >
                        Weights: {font.weights.join(", ")} &middot; Var:{" "}
                        {font.cssVar ?? "\u2014"}
                      </div>

                      {/* usedIn entries */}
                      <div
                        style={{
                          background: "#fafafa",
                          borderRadius: 8,
                          padding: "8px 10px",
                          marginBottom: 4,
                        }}
                      >
                        {font.usedIn.map((entry, i) => (
                          <div
                            key={i}
                            className="font-mono"
                            style={{
                              fontSize: 11,
                              lineHeight: 1.6,
                              color: "var(--dd-ink-faint)",
                              paddingLeft: 8,
                              borderLeft: "2px solid var(--dd-brand-border)",
                              marginBottom:
                                i < font.usedIn.length - 1 ? 4 : 0,
                            }}
                          >
                            {entry}
                          </div>
                        ))}
                      </div>

                      {/* Full font stack */}
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--dd-ink-faint)",
                          wordBreak: "break-all",
                        }}
                      >
                        Stack: {font.fullStack}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SectionLabel id="homepage-roles">Homepage Typography Roles</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        The live homepage adds shell-specific text roles for masthead, nested
        navigation, live labels, and product rails that do not appear clearly in
        article-only font inventories.
      </p>
      <div className="dd-brand-card p-4 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
              <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                Role
              </th>
              <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                Family
              </th>
              <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                Usage
              </th>
            </tr>
          </thead>
          <tbody>
            {NYT_HOMEPAGE_SNAPSHOT.typographyRoles.map((role) => (
              <tr
                key={role.label}
                style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
              >
                <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-black)", fontWeight: 600 }}>
                  {role.label}
                </td>
                <td
                  className="py-1.5 pr-4 font-mono"
                  style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}
                >
                  {role.family}
                </td>
                <td className="py-1.5" style={{ color: "var(--dd-ink-faint)" }}>
                  {role.usage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
