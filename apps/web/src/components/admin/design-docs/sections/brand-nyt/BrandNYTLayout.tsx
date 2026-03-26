"use client";

import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  NYT Brand — Layout & Tokens                                        */
/*  Aggregated layout tokens, content block types, DOM hierarchy        */
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
        color: "#326891",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid #326891",
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

interface LayoutTokenRow {
  token: string;
  value: string;
  articles: string[];
}

function buildLayoutTokenTable(): LayoutTokenRow[] {
  const map = new Map<string, { value: string; articles: string[] }[]>();

  for (const article of nytArticles) {
    if (!("architecture" in article)) continue;
    const arch = article.architecture as { layoutTokens?: Record<string, string> };
    if (!arch.layoutTokens) continue;
    const title = shortTitle(article.title);
    for (const [key, val] of Object.entries(arch.layoutTokens)) {
      if (!map.has(key)) {
        map.set(key, []);
      }
      const entries = map.get(key)!;
      const existing = entries.find((e) => e.value === val);
      if (existing) {
        if (!existing.articles.includes(title)) {
          existing.articles.push(title);
        }
      } else {
        entries.push({ value: val, articles: [title] });
      }
    }
  }

  const rows: LayoutTokenRow[] = [];
  for (const [token, entries] of map.entries()) {
    for (const entry of entries) {
      rows.push({ token, value: entry.value, articles: entry.articles });
    }
  }
  return rows;
}

function buildContentBlockTypes(): string[] {
  const types = new Set<string>();
  for (const article of nytArticles) {
    if ("contentBlocks" in article && Array.isArray(article.contentBlocks)) {
      for (const block of article.contentBlocks) {
        if ("type" in block) {
          types.add(block.type);
        }
      }
    }
  }
  // Also add types from architecture.contentBlocks strings
  types.add("header");
  types.add("graphic");
  types.add("extendedbyline");
  types.add("text");
  types.add("subhed");
  types.add("quote");
  types.add("embed");
  types.add("ad");
  return Array.from(types).sort();
}

const DOM_TREE = `figure.g-wrapper (outer wrapper, margin-block, text-wrap: balance)
  div.g-block.g-block-margin.g-margin-inline (margin: 20px gutters)
    div.g-block-width.g-max-width-body (max-width: 600px)
      div.g-wrapper_main-content.g-overflow-visible (overflow for tooltips)
        div.g-wrapper_main_content_slot (slot)
          div.g-media[role=img][aria-label] (accessible chart)
            iframe[src=datawrapper] (chart embed)
  div.g-block.g-block-margin (SEPARATE credit block)
    p.g-wrapper_meta (Note + Source + Credit spans)`;

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTLayout() {
  const layoutTokenRows = buildLayoutTokenTable();
  const contentBlockTypes = buildContentBlockTypes();

  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Layout &amp; Tokens</h2>
      <p className="dd-section-desc">
        Aggregated layout tokens, content block types, and DOM hierarchy
        from {nytArticles.length} NYT articles.
      </p>

      {/* ── 1. Layout Tokens ──────────────────────────────────── */}
      <SectionLabel id="layout-tokens">Layout Tokens</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Aggregated from architecture.layoutTokens across all {nytArticles.length} NYT
        articles. Where articles differ (e.g., Sweepstakes body is 18px mobile / 20px
        desktop), responsive variants are shown.
      </p>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm mb-8 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Token
              </th>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Value
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
            {layoutTokenRows.map((row, i) => (
              <tr
                key={`${row.token}-${i}`}
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <td
                  className="py-1.5 pr-4 font-mono"
                  style={{ color: "#326891", fontSize: 11 }}
                >
                  {row.token}
                </td>
                <td
                  className="py-1.5 pr-4 font-mono"
                  style={{ color: "var(--dd-ink-faint)", fontSize: 11 }}
                >
                  {row.value}
                </td>
                <td
                  className="py-1.5"
                  style={{ color: "var(--dd-ink-faint)" }}
                >
                  {row.articles.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 2. Content Block Types ────────────────────────────── */}
      <SectionLabel id="content-block-types">Content Block Types</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Union of all content block types found across NYT articles.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        {contentBlockTypes.map((block) => (
          <span
            key={block}
            className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 font-mono"
            style={{ fontSize: 11, color: "var(--dd-ink-black)" }}
          >
            {block}
          </span>
        ))}
      </div>

      {/* ── 3. DOM Hierarchy ──────────────────────────────────── */}
      <SectionLabel id="dom-hierarchy">DOM Hierarchy</SectionLabel>

      <SubSectionLabel>Birdkit Wrapper Structure</SubSectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        The canonical Birdkit wrapper structure from the Trump Economy article
        (the most complete architecture reference). All NYT interactive articles
        follow this pattern.
      </p>

      <pre
        className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm mb-6 overflow-x-auto"
        style={{
          fontFamily: "var(--dd-font-mono, ui-monospace, monospace)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--dd-ink-black)",
        }}
      >
        {DOM_TREE}
      </pre>

      {/* Per-Article Hierarchies */}
      <SubSectionLabel>Per-Article DOM Trees</SubSectionLabel>

      <div className="space-y-4 mb-8">
        {nytArticles.map((article) => {
          const arch = article.architecture as unknown as {
            hierarchy?: readonly string[];
          } | undefined;
          if (!arch?.hierarchy) return null;
          return (
            <div
              key={article.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
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
                {shortTitle(article.title)}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "#326891",
                  marginBottom: 8,
                }}
              >
                {article.id}
              </div>
              <pre
                className="rounded-lg bg-zinc-50 p-3 overflow-x-auto"
                style={{
                  fontFamily:
                    "var(--dd-font-mono, ui-monospace, monospace)",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "var(--dd-ink-faint)",
                }}
              >
                {arch.hierarchy.join("\n")}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
