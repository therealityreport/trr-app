"use client";

import Link from "next/link";
import type { Route } from "next";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ATHLETIC_ARTICLES } from "@/lib/admin/design-docs-config";
import { ArticleListFeaturedImage } from "./ArticleListFeaturedImage";

export default function AthleticArticlesSection() {
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
        The Athletic — Pages
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
        layout patterns, and interactive elements used in The Athletic articles.
      </p>

      {/* Article cards */}
      {ATHLETIC_ARTICLES.map((article) => (
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
              href={buildDesignDocsPath(`athletic-articles/${article.id}`) as Route}
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
                  color: "#1DB954",
                  marginLeft: 8,
                }}>
                  View Design Breakdown →
                </span>
              </h3>
            </Link>
            <p style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 15,
              color: "var(--dd-ink-soft)",
              lineHeight: 1.5,
              marginBottom: 8,
              maxWidth: 600,
            }}>
              {article.description}
            </p>
            <div style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
            }}>
              By {article.authors.join(", ")} · {article.tags.length} tags · {article.graphicsCount} graphics
            </div>
          </div>

          <ArticleListFeaturedImage article={article} />

          {/* Quick stats */}
          <div style={{
            padding: "16px 28px",
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            borderTop: "1px solid var(--dd-paper-grey)",
          }}>
            <StatPill label="Framework" value={article.tools.framework} />
            <StatPill label="Charts" value={article.tools.charts} />
            <StatPill label="Fonts" value={`${article.fonts.length} families`} />
            <StatPill label="Chart Types" value={`${article.chartTypes.length}`} />
          </div>
        </div>
      ))}

      {ATHLETIC_ARTICLES.length === 0 && (
        <div style={{
          padding: "48px 28px",
          textAlign: "center",
          color: "var(--dd-ink-faint)",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
        }}>
          No Athletic articles documented yet.
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "var(--dd-ink-faint)",
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 12,
        color: "var(--dd-ink-black)",
      }}>
        {value}
      </div>
    </div>
  );
}
