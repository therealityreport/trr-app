"use client";

import Link from "next/link";
import type { Route } from "next";
import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ================================================================
   BrandTheAthleticSection — Landing Page
   Overview + card grid linking to each tab sub-page
   ================================================================ */

const athleticArticles = ARTICLES.filter((a) => a.url.includes("/athletic/"));

/** Count unique fonts across Athletic articles */
function countFonts(): number {
  const names = new Set<string>();
  for (const article of athleticArticles) {
    for (const f of article.fonts) names.add(f.name);
  }
  return names.size;
}

/** Count total chart types */
function countCharts(): number {
  let total = 0;
  for (const article of athleticArticles) {
    total += article.chartTypes.length;
  }
  return total;
}

/** Count unique content block types */
function countComponents(): number {
  const types = new Set<string>();
  for (const article of athleticArticles) {
    if ("contentBlocks" in article && Array.isArray(article.contentBlocks)) {
      for (const block of article.contentBlocks) {
        if (typeof block === "object" && block !== null && "type" in block) {
          types.add(String((block as { type: string }).type));
        }
      }
    }
  }
  return types.size;
}

/** Count icons from architecture */
function countIcons(): number {
  let total = 0;
  for (const article of athleticArticles) {
    if ("architecture" in article) {
      const arch = article.architecture as Record<string, unknown>;
      const assets = arch.publicAssets as Record<string, unknown> | undefined;
      if (assets && Array.isArray(assets.icons)) {
        total += assets.icons.length;
      }
    }
  }
  return total;
}

const TABS = [
  {
    href: "/admin/design-docs/brand-the-athletic/typography",
    label: "Typography",
    description: "Cheltenham, Franklin, Imperial, RegularSlab — all weights, specimens, and usage",
    stat: `${countFonts()} font families`,
    accent: "#1DB954",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/colors",
    label: "Colors",
    description: "18-step gray system, heatmap gradient, page/header/footer/dark mode palettes, CSS variables",
    stat: "50+ colors",
    accent: "#F5A623",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/components",
    label: "Components",
    description: "Article + homepage components: header, hamburger menu, content cards, Connections module, buttons, tables",
    stat: `${countComponents()} types`,
    accent: "#E74C3C",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/icons",
    label: "Icons",
    description: "All SVGs, team logos, league logos, social icons, wordmark, Connections assets",
    stat: "17 assets",
    accent: "#3C5634",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/layouts",
    label: "Layouts",
    description: "Homepage layout patterns: Three-Topper, Curation modules, Most Popular, Four-Column Grid",
    stat: "9 patterns",
    accent: "#225FA7",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/layout",
    label: "Layout",
    description: "1248px max-width, 12-col grid, responsive breakpoints, DOM hierarchy",
    stat: "15+ tokens",
    accent: "#497AB8",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/shapes",
    label: "Shapes & Radius",
    description: "Border radius scale, card shadows, avatar shapes, button radius",
    stat: "6 scale steps",
    accent: "#943848",
  },
  {
    href: "/admin/design-docs/brand-the-athletic/resources",
    label: "Resources",
    description: `Icons, team logos, Datawrapper theme, CSS files, social images`,
    stat: `${countIcons()} icons`,
    accent: "#105E5E",
  },
  {
    href: "/admin/design-docs/athletic-articles",
    label: "Pages",
    description: "Article-level design breakdowns with heatmap tables, typography, and team logos",
    stat: `${athleticArticles.length} article${athleticArticles.length !== 1 ? "s" : ""}`,
    accent: "#52524F",
  },
] as const;

export default function BrandTheAthleticSection() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">The Athletic</h2>
      <p className="dd-section-desc">
        Premium sports journalism with a dark, data-dense UI &mdash; dark nav
        headers, 18-step gray system, heatmap visualizations, and dense stat
        tables optimized for live game coverage.
      </p>

      {/* Summary stats */}
      <div
        className="mb-8 flex flex-wrap gap-6"
        style={{ fontFamily: "var(--dd-font-sans)" }}
      >
        {[
          { label: "Articles", value: athleticArticles.length },
          { label: "Font Families", value: countFonts() },
          { label: "Chart Types", value: countCharts() },
          { label: "Icons & Logos", value: countIcons() },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#121212",
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
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-zinc-300"
            style={{ display: "block", textDecoration: "none" }}
          >
            {/* Accent bar */}
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: tab.accent,
                marginBottom: 12,
              }}
            />

            {/* Label + stat */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 2,
              }}
            >
              {tab.label}
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 10, color: "#52524F", marginBottom: 8 }}
            >
              {tab.stat}
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
                color: "#121212",
                opacity: 0.4,
                transition: "opacity 150ms",
              }}
            >
              <span className="group-hover:opacity-100">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Article listing */}
      {athleticArticles.length > 0 && (
        <div className="mt-10">
          <h3
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.12em",
              color: "#121212",
              marginBottom: 12,
              borderLeft: "3px solid #121212",
              paddingLeft: 10,
            }}
          >
            Articles
          </h3>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm overflow-x-auto">
            <table
              className="w-full text-left"
              style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Title</th>
                  <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Date</th>
                  <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Section</th>
                  <th className="py-1 font-semibold text-center" style={{ color: "var(--dd-ink-black)" }}>Charts</th>
                </tr>
              </thead>
              <tbody>
                {athleticArticles.map((article) => (
                  <tr key={article.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td className="py-1.5 pr-4">
                      <Link
                        href={`/admin/design-docs/athletic-articles/${article.id}` as Route}
                        style={{ color: "#386C92", textDecoration: "underline", fontWeight: 500 }}
                      >
                        {article.title.length > 55 ? `${article.title.slice(0, 52)}…` : article.title}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-ink-faint)" }}>
                      {article.date}
                    </td>
                    <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>
                      {article.section}
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
      )}
    </div>
  );
}
