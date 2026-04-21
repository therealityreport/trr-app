"use client";

import Link from "next/link";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

/* ------------------------------------------------------------------ */
/*  NYT Brand — Charts & Graphs                                        */
/*  Chart catalog, type breakdown, Datawrapper embeds                   */
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

/* ── Inline Data ──────────────────────────────────────────────────── */

function shortTitle(title: string): string {
  if (title.length <= 40) return title;
  return title.slice(0, 37) + "\u2026";
}

function buildChartCatalog() {
  const map = new Map<
    string,
    {
      type: string;
      tool: string;
      count: number;
      topics: string[];
      articleIds: string[];
    }
  >();
  for (const article of nytArticles) {
    for (const ct of article.chartTypes) {
      const key = `${ct.type}|${ct.tool}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.topics.push(ct.topic);
        if (!existing.articleIds.includes(article.id)) {
          existing.articleIds.push(article.id);
        }
      } else {
        map.set(key, {
          type: ct.type,
          tool: ct.tool,
          count: 1,
          topics: [ct.topic],
          articleIds: [article.id],
        });
      }
    }
  }
  return Array.from(map.values());
}

function buildChartBreakdown() {
  let datawrapperCount = 0;
  let ai2htmlCount = 0;
  let birdkitCount = 0;

  for (const article of nytArticles) {
    for (const ct of article.chartTypes) {
      if (ct.tool.toLowerCase().includes("datawrapper")) {
        datawrapperCount += 1;
      } else if (
        ct.tool.toLowerCase().includes("ai2html") ||
        ct.type === "ai2html"
      ) {
        ai2htmlCount += 1;
      } else if (ct.tool.toLowerCase().includes("birdkit") || ct.tool.toLowerCase().includes("svelte")) {
        birdkitCount += 1;
      }
    }
  }

  return { datawrapperCount, ai2htmlCount, birdkitCount };
}

function buildDatawrapperEmbeds() {
  const embeds: { id: string; topic: string; url: string; articleTitle: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        datawrapperCharts?: readonly { id: string; topic: string; url: string }[];
      };
    } | undefined;
    if (!arch?.publicAssets?.datawrapperCharts) continue;
    const title = shortTitle(article.title);
    for (const chart of arch.publicAssets.datawrapperCharts) {
      embeds.push({
        id: chart.id,
        topic: chart.topic,
        url: chart.url,
        articleTitle: title,
      });
    }
  }
  return embeds;
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTCharts() {
  const chartCatalog = buildChartCatalog();
  const { datawrapperCount, ai2htmlCount, birdkitCount } =
    buildChartBreakdown();
  const datawrapperEmbeds = buildDatawrapperEmbeds();

  function articleTitle(id: string): string {
    const a = nytArticles.find((x) => x.id === id);
    return a ? shortTitle(a.title) : id;
  }

  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Charts &amp; Graphs</h2>
      <p className="dd-section-desc">
        Catalog of chart types found across {nytArticles.length} NYT articles.
      </p>

      {/* ── 1. Chart Type Breakdown ───────────────────────────── */}
      <SectionLabel id="chart-type-breakdown">
        Chart Type Breakdown
      </SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="dd-brand-card p-4 text-center">
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--dd-brand-accent)",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {datawrapperCount}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dd-ink-black)",
              marginBottom: 2,
            }}
          >
            Datawrapper Charts
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            iframe embeds with postMessage protocol
          </div>
        </div>

        <div className="dd-brand-card p-4 text-center">
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--dd-brand-accent)",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {ai2htmlCount}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dd-ink-black)",
              marginBottom: 2,
            }}
          >
            ai2html Graphics
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            Responsive artboards with text overlays
          </div>
        </div>

        <div className="dd-brand-card p-4 text-center">
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 32,
              fontWeight: 700,
              color: "var(--dd-brand-accent)",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {birdkitCount}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dd-ink-black)",
              marginBottom: 2,
            }}
          >
            Birdkit Components
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            Custom Svelte charts and tables
          </div>
        </div>
      </div>

      {/* ── 2. Chart Catalog ──────────────────────────────────── */}
      <SectionLabel id="chart-catalog">Chart Catalog</SectionLabel>

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
                Chart Type
              </th>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Tool
              </th>
              <th
                className="py-1 pr-4 font-semibold text-center"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Count
              </th>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Topics
              </th>
              <th
                className="py-1 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Article
              </th>
            </tr>
          </thead>
          <tbody>
            {chartCatalog.map((row) => (
              <tr
                key={`${row.type}-${row.tool}`}
                style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
              >
                <td
                  className="py-1.5 pr-4 font-semibold"
                  style={{ color: "var(--dd-ink-black)" }}
                >
                  {row.type
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </td>
                <td
                  className="py-1.5 pr-4 font-mono"
                  style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}
                >
                  {row.tool}
                </td>
                <td
                  className="py-1.5 pr-4 text-center"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {row.count}
                </td>
                <td
                  className="py-1.5 pr-4"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {row.topics.join(", ")}
                </td>
                <td className="py-1.5">
                  {row.articleIds.map((aid, i) => (
                    <span key={aid}>
                      {i > 0 && ", "}
                      <Link
                        href={buildDesignDocsPath(`nyt-articles/${aid}`)}
                        style={{
                          color: "var(--dd-brand-accent)",
                          textDecoration: "underline",
                        }}
                      >
                        {articleTitle(aid)}
                      </Link>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 3. Datawrapper Embeds ─────────────────────────────── */}
      <SectionLabel id="datawrapper-embeds">Datawrapper Embeds</SectionLabel>

      <SubSectionLabel>
        All Datawrapper Chart URLs from NYT Articles
      </SubSectionLabel>

      {datawrapperEmbeds.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "var(--dd-ink-faint)",
            marginBottom: 12,
          }}
        >
          No Datawrapper embeds found.
        </p>
      ) : (
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
                  ID
                </th>
                <th
                  className="py-1 pr-4 font-semibold"
                  style={{ color: "var(--dd-ink-black)" }}
                >
                  Topic
                </th>
                <th
                  className="py-1 pr-4 font-semibold"
                  style={{ color: "var(--dd-ink-black)" }}
                >
                  Article
                </th>
                <th
                  className="py-1 font-semibold"
                  style={{ color: "var(--dd-ink-black)" }}
                >
                  URL
                </th>
              </tr>
            </thead>
            <tbody>
              {datawrapperEmbeds.map((embed) => (
                <tr
                  key={`${embed.id}-${embed.topic}`}
                  style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
                >
                  <td
                    className="py-1.5 pr-4 font-mono"
                    style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}
                  >
                    {embed.id}
                  </td>
                  <td
                    className="py-1.5 pr-4"
                    style={{ color: "var(--dd-ink-faint)" }}
                  >
                    {embed.topic}
                  </td>
                  <td
                    className="py-1.5 pr-4"
                    style={{ color: "var(--dd-ink-faint)" }}
                  >
                    {embed.articleTitle}
                  </td>
                  <td className="py-1.5">
                    <a
                      href={embed.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--dd-brand-accent)",
                        textDecoration: "underline",
                        wordBreak: "break-all",
                      }}
                    >
                      {embed.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionLabel id="homepage-interactives">Homepage Interactives</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        The homepage mixes charts, utilities, and media entrypoints through
        inline-interactive and video-feed modules rather than Birdkit article
        embeds alone.
      </p>

      <div className="dd-brand-card p-4 mb-8 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
              <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                Homepage Zone
              </th>
              <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                DOM Evidence
              </th>
              <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>
                Current Labels
              </th>
            </tr>
          </thead>
          <tbody>
            {NYT_HOMEPAGE_SNAPSHOT.shellSections
              .filter((section) =>
                ["inline-interactives", "video-feed", "product-rails"].includes(section.id),
              )
              .map((section) => (
                <tr
                  key={section.id}
                  style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
                >
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-black)", fontWeight: 600 }}>
                    {section.label}
                  </td>
                  <td className="py-1.5 pr-4">
                    {section.domEvidence.map((evidence) => (
                      <div
                        key={evidence}
                        className="font-mono"
                        style={{ fontSize: 10, color: "var(--dd-brand-accent)" }}
                      >
                        {evidence}
                      </div>
                    ))}
                  </td>
                  <td className="py-1.5" style={{ color: "var(--dd-ink-faint)" }}>
                    {section.visibleLabels.join(", ")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
