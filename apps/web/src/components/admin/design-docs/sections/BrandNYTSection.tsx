"use client";

import Link from "next/link";
import type { Route } from "next";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

/* ------------------------------------------------------------------ */
/*  NYT Master Brand Landing Page                                      */
/*  Overview + card grid linking to each tab sub-page                   */
/* ------------------------------------------------------------------ */

const nytArticles = ARTICLES.filter((a) => !a.url.includes("/athletic/"));

/** Count unique fonts across NYT articles */
function countFonts(): number {
  const names = new Set<string>();
  for (const article of nytArticles) {
    for (const f of article.fonts) names.add(f.name);
  }
  return names.size;
}

/** Count total chart types across NYT articles */
function countCharts(): number {
  let total = 0;
  for (const article of nytArticles) {
    total += article.chartTypes.length;
  }
  return total;
}

/** Count unique content block types */
function countComponents(): number {
  const types = new Set<string>();
  for (const article of nytArticles) {
    if ("contentBlocks" in article && Array.isArray(article.contentBlocks)) {
      for (const block of article.contentBlocks) {
        if (typeof block === "object" && block !== null && "type" in block) {
          types.add(String((block as { type: string }).type));
        }
      }
    }
    if (article.quoteSections.length > 0) types.add("quote");
  }
  return types.size;
}

const TABS = [
  {
    href: buildDesignDocsPath("brand-nyt/homepage"),
    label: "Homepage",
    description: "Live homepage shell snapshot: edition rail, masthead, nested nav, programming nodes, inline interactives, media rails, site index",
    stat: `${NYT_HOMEPAGE_SNAPSHOT.shellSections.length} shell zones`,
    icon: "HP",
  },
  {
    href: buildDesignDocsPath("brand-nyt/typography"),
    label: "Typography",
    description: "Cheltenham, Franklin, Imperial — all weights, specimens, and usage across articles",
    stat: `${countFonts()} font families`,
    icon: "Aa",
  },
  {
    href: buildDesignDocsPath("brand-nyt/colors"),
    label: "Colors",
    description: "Core tokens, graphics palette, Datawrapper theme, and per-article chart colors",
    stat: "5 palettes",
    icon: "C",
  },
  {
    href: buildDesignDocsPath("brand-nyt/layout"),
    label: "Layout & Tokens",
    description: "600px body column, margin system, responsive breakpoints, content block types",
    stat: "7+ tokens",
    icon: "L",
  },
  {
    href: buildDesignDocsPath("brand-nyt/architecture"),
    label: "Architecture",
    description: "Birdkit/SvelteKit framework, Datawrapper integration, CSS files, project IDs",
    stat: `${nytArticles.length} projects`,
    icon: "A",
  },
  {
    href: buildDesignDocsPath("brand-nyt/charts"),
    label: "Charts & Graphs",
    description: "Line, bar, stacked-area, ai2html, Birdkit tables — full catalog with links",
    stat: `${countCharts()} chart types`,
    icon: "G",
  },
  {
    href: buildDesignDocsPath("brand-nyt/components"),
    label: "Components",
    description: "Quote containers, ai2html artboards, Birdkit tables, storyline bars, and more",
    stat: `${countComponents()} types`,
    icon: "K",
  },
  {
    href: buildDesignDocsPath("brand-nyt/resources"),
    label: "Resources",
    description: "External assets, CSS inventory, Datawrapper URLs, social images, author headshots",
    stat: `${nytArticles.length} articles`,
    icon: "R",
  },
  {
    href: buildDesignDocsPath("nyt-tech-stack"),
    label: "Tech Stack",
    description: "Complete asset inventory — stylesheets, scripts, sitemaps, Birdkit framework",
    stat: "Full inventory",
    icon: "T",
  },
  {
    href: buildDesignDocsPath("nyt-articles"),
    label: "Pages",
    description: "Article-level design breakdowns with interactive charts, typography, and colors",
    stat: `${nytArticles.length} articles`,
    icon: "P",
  },
] as const;

export default function BrandNYTSection() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">The New York Times</h2>
      <p className="dd-section-desc">
        The master design system powering nytimes.com &mdash; homepage shell,
        typography-first hierarchy, restrained color, and article templates that
        sit underneath a much larger main-page programming system.
      </p>

      {/* Summary stats */}
      <div
        className="mb-8 flex flex-wrap gap-6"
        style={{ fontFamily: "var(--dd-font-sans)" }}
      >
        {[
          { label: "Articles", value: nytArticles.length },
          { label: "Homepage Zones", value: NYT_HOMEPAGE_SNAPSHOT.shellSections.length },
          { label: "Font Families", value: countFonts() },
          { label: "Component Types", value: countComponents() + NYT_HOMEPAGE_SNAPSHOT.componentPatterns.length },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--dd-brand-stat-number)",
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--dd-ink-faint)",
                marginTop: 4,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tab cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href as Route}
            className="dd-brand-card group p-5"
            style={{ display: "block", textDecoration: "none" }}
          >
            {/* Icon + label */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="dd-brand-pill"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--dd-font-headline, Georgia, serif)",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {tab.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {tab.label}
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: 10, color: "var(--dd-brand-link)" }}
                >
                  {tab.stat}
                </div>
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.5,
              }}
            >
              {tab.description}
            </div>

            {/* Arrow */}
            <div
              className="mt-3 text-right"
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--dd-brand-link)",
                opacity: 0.6,
                transition: "opacity 150ms",
              }}
            >
              <span className="group-hover:opacity-100">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      <div
        className="dd-brand-card"
        style={{
          marginTop: 24,
          marginBottom: 28,
          padding: "18px 20px 20px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "var(--dd-brand-accent)",
            marginBottom: 10,
          }}
        >
          Homepage Snapshot
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-headline, Georgia, serif)",
            fontSize: 26,
            lineHeight: 1.12,
            color: "var(--dd-ink-black)",
            marginBottom: 10,
            maxWidth: 760,
          }}
        >
          The NYT homepage is its own product surface, not just a collection of article promos.
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--dd-ink-faint)",
            marginBottom: 12,
            maxWidth: 760,
          }}
        >
          This pass adds the live main-page shell as a first-class source alongside
          the existing article breakdowns. Use the Homepage tab for source-order
          structure, then use Typography, Layout, Components, Resources, and Tech
          Stack for the detailed breakdowns.
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}
        >
          Snapshot date: {NYT_HOMEPAGE_SNAPSHOT.capturedAt} · Product rails:{" "}
          {NYT_HOMEPAGE_SNAPSHOT.productRails.length}
        </div>
      </div>

      {/* Article listing */}
      <div className="mt-10">
        <h3
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.12em",
            color: "var(--dd-brand-accent)",
            marginBottom: 12,
            borderLeft: "3px solid var(--dd-brand-accent)",
            paddingLeft: 10,
          }}
        >
          Articles
        </h3>
        <div className="dd-brand-card overflow-x-auto p-4">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Title</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Date</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Section</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Type</th>
                <th className="py-1 font-semibold text-center" style={{ color: "var(--dd-ink-black)" }}>Charts</th>
              </tr>
            </thead>
            <tbody>
              {nytArticles.map((article) => (
                <tr key={article.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td className="py-1.5 pr-4">
                    <Link
                      href={buildDesignDocsPath(`nyt-articles/${article.id}`)}
                      style={{ color: "var(--dd-brand-link)", textDecoration: "underline", fontWeight: 500 }}
                    >
                      {article.title.length > 50 ? `${article.title.slice(0, 47)}…` : article.title}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-ink-faint)" }}>
                    {article.date}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>
                    {article.section}
                  </td>
                  <td className="py-1.5 pr-4">
                    <span
                      className="dd-brand-pill rounded-full px-2 py-0.5"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase" as const,
                        background:
                          article.type === "interactive"
                            ? "var(--dd-brand-accent-bg)"
                            : "var(--dd-brand-surface-alt)",
                        color:
                          article.type === "interactive"
                            ? "var(--dd-brand-accent)"
                            : "var(--dd-brand-text-secondary)",
                        borderColor:
                          article.type === "interactive"
                            ? "color-mix(in srgb, var(--dd-brand-accent) 18%, transparent)"
                            : "var(--dd-brand-border-subtle)",
                      }}
                    >
                      {article.type}
                    </span>
                  </td>
                  <td className="py-1.5 text-center" style={{ color: "var(--dd-ink-faint)" }}>
                    {article.chartTypes.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
