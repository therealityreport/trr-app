"use client";

import Link from "next/link";
import { ARTICLES } from "@/lib/admin/design-docs-config";

export default function NYTArticlesSection() {
  return (
    <div>
      {/* Section header */}
      <div className="dd-palette-label">Reference</div>
      <h2 style={{
        fontFamily: "var(--dd-font-headline)",
        fontSize: 36,
        fontWeight: 700,
        color: "var(--dd-ink-black)",
        lineHeight: 1.1,
        marginBottom: 8,
      }}>
        Pages
      </h2>
      <p style={{
        fontFamily: "var(--dd-font-body)",
        fontSize: 17,
        color: "var(--dd-ink-soft)",
        lineHeight: 1.6,
        marginBottom: 32,
        maxWidth: 640,
      }}>
        Article-level design breakdowns — documenting chart types, typography,
        layout patterns, and interactive elements used in each NYT page.
      </p>

      {/* Article cards */}
      {ARTICLES.map((article) => (
        <div key={article.id} style={{
          marginBottom: 32,
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: 8,
          overflow: "hidden",
          background: "white",
        }}>
          {/* Article header with OG image */}
          <div style={{
            padding: "24px 28px",
            borderBottom: "1px solid var(--dd-paper-grey)",
            background: "var(--dd-paper-warm)",
          }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "var(--dd-ink-faint)",
              marginBottom: 8,
            }}>
              {article.section} · {article.type} · {article.date}
            </div>
            <Link
              href={`/admin/design-docs/nyt-articles/${article.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <h3 style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 24,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
                marginBottom: 8,
                cursor: "pointer",
              }}>
                {article.title}
                <span style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#326891",
                  marginLeft: 8,
                }}>
                  View Design Breakdown →
                </span>
              </h3>
            </Link>
            <div style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "var(--dd-ink-soft)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}>
              {article.description}
            </div>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-light)",
            }}>
              By {article.authors.join(", ")}
            </div>
          </div>

          {/* Tools & Tech Stack */}
          <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--dd-paper-grey)" }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-faint)",
              marginBottom: 10,
            }}>
              Production Stack
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
              {Object.entries(article.tools).map(([key, value]) => (
                <span key={key} style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-medium)",
                  background: "var(--dd-paper-cool)",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "1px solid var(--dd-paper-grey)",
                }}>
                  <span style={{ fontWeight: 600, color: "var(--dd-ink-light)" }}>{key}:</span> {value}
                </span>
              ))}
              <span style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-medium)",
                background: "var(--dd-paper-cool)",
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid var(--dd-paper-grey)",
              }}>
                <span style={{ fontWeight: 600, color: "var(--dd-ink-light)" }}>graphics:</span> {article.graphicsCount} · <span style={{ fontWeight: 600, color: "var(--dd-ink-light)" }}>figures:</span> {article.figuresCount}
              </span>
            </div>
          </div>

          {/* Chart Types Grid */}
          <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--dd-paper-grey)" }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-faint)",
              marginBottom: 10,
            }}>
              Chart Types ({article.chartTypes.length})
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}>
              {article.chartTypes.map((chart, i) => {
                const typeColors: Record<string, string> = {
                  "report-card": "#121212",
                  "line-chart": "#fdba58",
                  "bar-chart": "#c44127",
                  "stacked-area": "#569adc",
                };
                const color = typeColors[chart.type] || "#727272";
                return (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "var(--dd-paper-warm)",
                    borderRadius: 4,
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div>
                      <div style={{
                        fontFamily: "var(--dd-font-sans)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--dd-ink-black)",
                      }}>
                        {chart.topic}
                      </div>
                      <div style={{
                        fontFamily: "var(--dd-font-mono)",
                        fontSize: 9,
                        color: "var(--dd-ink-faint)",
                      }}>
                        {chart.type} · {chart.tool}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quote Sections / Status Badges */}
          <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--dd-paper-grey)" }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-faint)",
              marginBottom: 10,
            }}>
              Promise Tracker Sections
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {article.quoteSections.map((qs, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i < article.quoteSections.length - 1 ? "1px solid var(--dd-paper-grey)" : "none",
                }}>
                  <span style={{
                    fontFamily: '"nyt-franklin", var(--dd-font-ui), arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 300,
                    color: "var(--dd-ink-black)",
                  }}>
                    {qs.section}
                  </span>
                  <span style={{
                    fontFamily: '"nyt-franklin", var(--dd-font-ui), arial, sans-serif',
                    fontWeight: 600,
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    color: "#fff",
                    background: qs.badgeColor,
                    padding: "3px 8px",
                    borderRadius: 2,
                    textTransform: "uppercase" as const,
                  }}>
                    {qs.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts Used */}
          <div style={{ padding: "16px 28px", borderBottom: "1px solid var(--dd-paper-grey)" }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-faint)",
              marginBottom: 8,
            }}>
              Fonts ({article.fonts.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {article.fonts.map((font) => (
                <span key={font.name} style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#121212",
                  background: "#fef9ee",
                  padding: "4px 10px",
                  borderRadius: 3,
                  border: "1px solid #f5e6c4",
                }}>
                  {font.name}
                  <span style={{ fontWeight: 400, color: "#727272", marginLeft: 4, fontSize: 9 }}>
                    [{font.weights.join(", ")}]
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div style={{ padding: "16px 28px" }}>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-faint)",
              marginBottom: 8,
            }}>
              Topics
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {article.tags.map((tag) => (
                <span key={tag} style={{
                  fontFamily: '"nyt-franklin", var(--dd-font-ui), arial, sans-serif',
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
      ))}
    </div>
  );
}
