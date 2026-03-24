"use client";

import Link from "next/link";
import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  ArticleDetailPage — Individual article design breakdown            */
/*  Route: /admin/design-docs/nyt-articles/[slug]                      */
/* ------------------------------------------------------------------ */

interface ArticleDetailPageProps {
  articleId: string;
}

/** Our R2 font mapping — which TRR font best matches each NYT font */
const FONT_MAPPING: Record<string, { trrFont: string; cssVar: string; notes: string }> = {
  "nyt-cheltenham": { trrFont: "Cheltenham / Gloucester", cssVar: "var(--dd-font-headline)", notes: "Closest match for NYT editorial display serif" },
  "nyt-cheltenham-cond": { trrFont: "Cheltenham Condensed", cssVar: "var(--dd-font-headline)", notes: "Condensed variant — using same headline var" },
  "nyt-franklin": { trrFont: "Hamburg Serial", cssVar: "var(--dd-font-ui)", notes: "Primary sans-serif match for UI/labels" },
  "nyt-imperial": { trrFont: "Gloucester / Georgia fallback", cssVar: "var(--dd-font-serif)", notes: "Body text serif — closest to NYT Imperial" },
  "nyt-karnak": { trrFont: "Gloucester MT Extra Condensed", cssVar: "var(--dd-font-serif)", notes: "Display serif for moments/descriptions" },
  "nyt-karnakcondensed": { trrFont: "Cheltenham", cssVar: "var(--dd-font-headline)", notes: "Game display titles — mapped to headline font" },
  "nyt-stymie": { trrFont: "Stymie / Rockwell", cssVar: "var(--dd-font-slab)", notes: "Slab serif for decorative headers" },
  "nyt-inter": { trrFont: "Inter (system)", cssVar: "var(--dd-font-sans)", notes: "Limited use — specific UI elements only" },
  "nyt-franklin-cw": { trrFont: "Hamburg Serial CW", cssVar: "var(--dd-font-ui)", notes: "Crossword-specific variant" },
};

export default function ArticleDetailPage({ articleId }: ArticleDetailPageProps) {
  const article = ARTICLES.find((a) => a.id === articleId);
  if (!article) return <div>Article not found</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <Link
          href="/admin/design-docs/nyt-articles"
          style={{
            fontFamily: "var(--dd-font-sans, 'Hamburg Serial', sans-serif)",
            fontSize: 12,
            fontWeight: 600,
            color: "#326891",
            textDecoration: "none",
          }}
        >
          ← NYT Articles
        </Link>
        <span style={{ color: "var(--dd-ink-faint, #999)", fontSize: 12 }}>/</span>
        <span style={{ fontFamily: "var(--dd-font-sans, sans-serif)", fontSize: 12, color: "var(--dd-ink-light, #666)" }}>
          {article.id}
        </span>
      </div>

      {/* Article Header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: "3px solid #121212" }}>
        <div style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 8,
        }}>
          {article.section} · {article.type} · {article.date}
        </div>
        <h1 style={{
          fontFamily: 'var(--dd-font-headline, "Cheltenham", georgia, serif)',
          fontSize: 36,
          fontWeight: 700,
          color: "#121212",
          lineHeight: 1.1,
          marginBottom: 12,
        }}>
          {article.title}
        </h1>
        <p style={{
          fontFamily: 'var(--dd-font-serif, "nyt-imperial", georgia, serif)',
          fontSize: 18,
          fontWeight: 500,
          color: "#363636",
          lineHeight: 1.5,
          marginBottom: 12,
        }}>
          {article.description}
        </p>
        <div style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 13,
          color: "#727272",
        }}>
          By {article.authors.join(", ")}
        </div>
      </div>

      {/* ── TYPOGRAPHY SECTION ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Typography Used on This Page
        </h2>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
          {article.fonts.map((font) => {
            const mapping = FONT_MAPPING[font.name];
            return (
              <div
                key={font.name}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {/* Font header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#fafafa",
                  borderBottom: "1px solid #ededed",
                }}>
                  <div>
                    <span style={{
                      fontFamily: "var(--dd-font-mono, monospace)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#121212",
                    }}>
                      {font.name}
                    </span>
                    {font.cssVar && (
                      <span style={{
                        fontFamily: "var(--dd-font-mono, monospace)",
                        fontSize: 11,
                        color: "#569adc",
                        marginLeft: 8,
                      }}>
                        {font.cssVar}
                      </span>
                    )}
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 4,
                  }}>
                    {font.weights.map((w) => (
                      <span
                        key={w}
                        style={{
                          fontFamily: "var(--dd-font-mono, monospace)",
                          fontSize: 9,
                          fontWeight: 600,
                          color: "#fff",
                          background: "#121212",
                          padding: "2px 6px",
                          borderRadius: 3,
                        }}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Font specimen + details */}
                <div style={{ padding: "14px 16px" }}>
                  {/* Font stack */}
                  <div style={{
                    fontFamily: "var(--dd-font-mono, monospace)",
                    fontSize: 10,
                    color: "#727272",
                    marginBottom: 10,
                    wordBreak: "break-all" as const,
                    lineHeight: 1.5,
                  }}>
                    {font.fullStack}
                  </div>

                  {/* Role */}
                  <div style={{
                    fontFamily: "var(--dd-font-sans, sans-serif)",
                    fontSize: 13,
                    color: "#363636",
                    lineHeight: 1.5,
                    marginBottom: 10,
                  }}>
                    <strong>Role:</strong> {font.role}
                  </div>

                  {/* Where it's used */}
                  <div style={{
                    fontFamily: "var(--dd-font-sans, sans-serif)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-faint, #999)",
                    marginBottom: 6,
                  }}>
                    Used In
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 12 }}>
                    {font.usedIn.map((usage) => (
                      <span
                        key={usage}
                        style={{
                          fontFamily: "var(--dd-font-mono, monospace)",
                          fontSize: 10,
                          color: "#363636",
                          background: "#f0f5fa",
                          padding: "3px 8px",
                          borderRadius: 3,
                          border: "1px solid #d5dee3",
                          lineHeight: 1.4,
                        }}
                      >
                        {usage}
                      </span>
                    ))}
                  </div>

                  {/* TRR Mapping */}
                  {mapping && (
                    <div style={{
                      padding: "8px 12px",
                      background: "#fef9ee",
                      borderRadius: 4,
                      border: "1px solid #f5e6c4",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <span style={{
                        fontFamily: "var(--dd-font-sans, sans-serif)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#c49012",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                        flexShrink: 0,
                      }}>
                        TRR →
                      </span>
                      <span style={{
                        fontFamily: "var(--dd-font-mono, monospace)",
                        fontSize: 11,
                        color: "#363636",
                      }}>
                        {mapping.trrFont} ({mapping.cssVar})
                      </span>
                      <span style={{
                        fontFamily: "var(--dd-font-sans, sans-serif)",
                        fontSize: 10,
                        color: "#727272",
                        marginLeft: "auto",
                      }}>
                        {mapping.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BRAND FONT CONTEXT ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Brand Font Context
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {Object.entries(article.brandFonts).map(([brand, fonts]) => (
            <div
              key={brand}
              style={{
                padding: "12px 16px",
                background: "#fafafa",
                borderRadius: 6,
                border: "1px solid #ededed",
              }}
            >
              <div style={{
                fontFamily: "var(--dd-font-sans, sans-serif)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "var(--dd-ink-faint, #999)",
                marginBottom: 8,
              }}>
                {brand}
              </div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 4 }}>
                {fonts.map((f) => (
                  <span
                    key={f}
                    style={{
                      fontFamily: "var(--dd-font-mono, monospace)",
                      fontSize: 11,
                      color: "#121212",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRODUCTION STACK ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Production Stack
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
          {Object.entries(article.tools).map(([key, value]) => (
            <span key={key} style={{
              fontFamily: "var(--dd-font-mono, monospace)",
              fontSize: 11,
              color: "#363636",
              background: "#f0f5fa",
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #d5dee3",
            }}>
              <span style={{ fontWeight: 700, color: "#727272" }}>{key}:</span> {value}
            </span>
          ))}
        </div>
      </div>

      {/* ── CHART TYPES ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Chart Types ({article.chartTypes.length})
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {article.chartTypes.map((chart, i) => {
            const colors: Record<string, string> = {
              "report-card": "#121212",
              "line-chart": "#fdba58",
              "bar-chart": "#c44127",
              "stacked-area": "#569adc",
            };
            return (
              <div key={i} style={{
                padding: "10px 14px",
                background: "#fafafa",
                borderRadius: 4,
                borderLeft: `3px solid ${colors[chart.type] || "#727272"}`,
              }}>
                <div style={{ fontFamily: "var(--dd-font-sans, sans-serif)", fontSize: 12, fontWeight: 600, color: "#121212" }}>
                  {chart.topic}
                </div>
                <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "#727272", marginTop: 2 }}>
                  {chart.type} · {chart.tool}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE CHART PREVIEWS ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Interactive Chart Previews
        </h2>
        <p style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 13,
          color: "#727272",
          lineHeight: 1.5,
          marginBottom: 16,
        }}>
          Mini-preview thumbnails of each Datawrapper chart from this article. Full interactive
          versions with hover tooltips are available on the Charts &amp; Graphs page.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {article.chartTypes
            .filter((chart) => chart.type !== "report-card")
            .map((chart, i) => {
              const typeColors: Record<string, string> = {
                "line-chart": "#fdba58",
                "bar-chart": "#c44127",
                "stacked-area": "#569adc",
              };
              const color = typeColors[chart.type] || "#727272";
              // Mini sparkline SVG for each chart type
              const sparkline = chart.type === "line-chart" ? (
                <svg viewBox="0 0 120 40" width="100%" height={40} style={{ display: "block" }}>
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    points={
                      chart.topic.includes("Food")
                        ? "5,30 15,30 25,32 35,28 45,20 55,10 65,5 75,8 85,25 95,28 105,27 115,26"
                        : chart.topic.includes("S&P")
                        ? "5,35 15,33 25,30 35,28 45,25 55,22 65,30 75,18 85,15 95,10 105,8 115,5"
                        : chart.topic.includes("Electricity")
                        ? "5,30 15,32 25,30 35,28 45,30 55,32 65,20 75,8 85,15 95,22 105,18 115,15"
                        : "5,25 15,26 25,24 35,22 45,20 55,18 65,25 75,22 85,20 95,18 105,16 115,14"
                    }
                  />
                </svg>
              ) : chart.type === "bar-chart" ? (
                <svg viewBox="0 0 120 40" width="100%" height={40} style={{ display: "block" }}>
                  {Array.from({ length: 12 }).map((_, j) => {
                    const h = chart.topic.includes("Tariff")
                      ? [8, 8, 10, 12, 10, 12, 14, 12, 14, 20, 30, 35][j]
                      : [25, 25, 26, 24, 22, 10, 18, 24, 26, 26, 25, 24][j];
                    return (
                      <rect key={j} x={5 + j * 10} y={40 - h} width={7} height={h} fill={color} rx={0} />
                    );
                  })}
                </svg>
              ) : (
                <svg viewBox="0 0 120 40" width="100%" height={40} style={{ display: "block" }}>
                  <path d="M5,35 L20,32 35,30 50,28 65,25 80,20 95,18 110,22 115,20 115,40 5,40Z" fill={color} opacity={0.6} />
                  <path d="M5,35 L20,33 35,32 50,30 65,28 80,24 95,22 110,26 115,24 115,40 5,40Z" fill={color} opacity={0.3} />
                </svg>
              );

              return (
                <Link
                  key={i}
                  href="/admin/design-docs?section=charts"
                  style={{
                    display: "block",
                    padding: "12px 14px",
                    background: "#fff",
                    borderRadius: 6,
                    border: "1px solid #e0e0e0",
                    textDecoration: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = color;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${color}22`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e0";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  {/* Mini chart preview */}
                  <div style={{ marginBottom: 8, borderRadius: 3, overflow: "hidden", background: "#fafafa", padding: "8px 4px 0" }}>
                    {sparkline}
                  </div>
                  {/* Chart info */}
                  <div style={{
                    fontFamily: '"nyt-franklin", var(--dd-font-ui, sans-serif)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#121212",
                    marginBottom: 2,
                  }}>
                    {chart.topic}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: color,
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: "var(--dd-font-mono, monospace)",
                      fontSize: 10,
                      color: "#727272",
                    }}>
                      {chart.type} &middot; {chart.tool}
                    </span>
                  </div>
                  {/* Interactive badge */}
                  <div style={{
                    marginTop: 8,
                    fontFamily: '"nyt-franklin", var(--dd-font-ui, sans-serif)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#326891",
                    letterSpacing: "0.04em",
                  }}>
                    View interactive version &rarr;
                  </div>
                </Link>
              );
            })}
        </div>
      </div>

      {/* ── PROMISE TRACKER ── */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Promise Tracker Sections
        </h2>
        <div style={{ border: "1px solid #e0e0e0", borderRadius: 4, overflow: "hidden" }}>
          {article.quoteSections.map((qs, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: i < article.quoteSections.length - 1 ? "1px solid #ededed" : "none",
              background: "#fff",
            }}>
              <span style={{
                fontFamily: '"nyt-franklin", var(--dd-font-ui, sans-serif)',
                fontSize: 15,
                fontWeight: 300,
                color: "#121212",
              }}>
                {qs.section}
              </span>
              <span style={{
                fontFamily: '"nyt-franklin", var(--dd-font-ui, sans-serif)',
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: "0.05em",
                color: "#fff",
                background: qs.badgeColor,
                padding: "4px 10px",
                borderRadius: 2,
                textTransform: "uppercase" as const,
              }}>
                {qs.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── TAGS ── */}
      <div>
        <h2 style={{
          fontFamily: "var(--dd-font-sans, sans-serif)",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-ink-faint, #999)",
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #ededed",
        }}>
          Topics
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          {article.tags.map((tag) => (
            <span key={tag} style={{
              fontFamily: '"nyt-franklin", var(--dd-font-ui, sans-serif)',
              fontSize: 12,
              fontWeight: 500,
              color: "#326891",
              background: "#f0f5fa",
              padding: "4px 10px",
              borderRadius: 3,
              border: "1px solid #d5dee3",
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
