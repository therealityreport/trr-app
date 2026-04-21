"use client";

/* ──────────────────────────────────────────────────────────────
   NYT Tech Stack — asset inventory documenting what each
   stylesheet, script, and sitemap provides for the design docs.
   ────────────────────────────────────────────────────────────── */

import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

/* ── Stylesheet inventory ───────────────────────────────────── */

interface AssetEntry {
  name: string;
  type: "stylesheet" | "script" | "sitemap";
  source: "internal" | "external";
  description: string;
  designInfo: string[];
  /** Optional example tokens or patterns */
  examples?: string[];
}

const STYLESHEETS: AssetEntry[] = [
  {
    name: "global-*.css",
    type: "stylesheet",
    source: "internal",
    description:
      "NYT vi (Visual Identity) platform — CSS-in-JS output with hashed class names (.css-79elbk, .css-d6eweq, etc.)",
    designInfo: [
      "Cheltenham headline sizing scale (26px → 60px across breakpoints)",
      "Franklin body text scale (15px → 20px)",
      "Article grid layout — centered 600px content column + full-bleed breakouts",
      "Byline, timestamp, and metadata typography patterns",
      "Interactive element hover/focus states",
      "Dark mode token overrides (when present)",
      "Responsive breakpoint media queries",
    ],
    examples: [
      '.css-d6eweq { font-family: nyt-cheltenham, georgia, ...; font-size: 2.625rem; line-height: 1.1; }',
      '.css-79elbk { max-width: 600px; margin: 0 auto; padding: 0 20px; }',
    ],
  },
  {
    name: "web-fonts.*.css",
    type: "stylesheet",
    source: "internal",
    description:
      "Complete @font-face declarations for all 7 proprietary NYT font families hosted on static01.nyt.com",
    designInfo: [
      "nyt-cheltenham — 300, 700 weights (Display headlines)",
      "nyt-franklin — 300, 500, 700 weights (Primary sans-serif, UI/labels)",
      "nyt-karnak — 400 weight (Secondary display serif)",
      "nyt-karnakcondensed — 700 weight (Game titles, section headings)",
      "nyt-imperial — 400, 700 weights (Article body reading font)",
      "nyt-stymie — 500 weight (Accent slab-serif)",
      "nyt-inter — 400, 500, 600 weights (Data viz annotations)",
      "WOFF2 format CDN URLs on static01.nyt.com",
    ],
    examples: [
      "@font-face { font-family: 'nyt-cheltenham'; src: url('...cheltenham-300-normal.woff2') format('woff2'); font-weight: 300; }",
    ],
  },
  {
    name: "2.*.css + index.*.css",
    type: "stylesheet",
    source: "internal",
    description:
      "Birdkit/SvelteKit component styles — scoped CSS for interactive graphics framework",
    designInfo: [
      "g-wrapper, g-block, g-media layout primitives with exact max-widths and padding",
      "Quote container styling (.quote, .badge, .byline classes)",
      "Responsive breakpoint values used internally by Birdkit",
      "Svelte component scoped styles (hashed class selectors)",
      "Chart annotation positioning rules",
      "--g-* CSS variable defaults for graphics context",
    ],
    examples: [
      '.g-wrapper { max-width: 1200px; margin: 0 auto; padding: 20px; }',
      '.g-block { margin: 20px 0; }',
      '.quote { border-left: 3px solid #121212; padding-left: 1em; }',
    ],
  },
  {
    name: ":root CSS Variables",
    type: "stylesheet",
    source: "internal",
    description:
      "Global design token system defined at document root — 153+ color tokens across 17 color ramps",
    designInfo: [
      "--color-content-primary: #121212 (text)",
      "--color-background-default: #fff (page)",
      "--color-signal-editorial: #326891 (NYT blue links)",
      "--g-* graphics tokens (chart colors, annotation colors, grid lines)",
      "--games-* game-specific tokens per game brand",
      "17 color ramps × 9 stops = 153 base color tokens",
      "Semantic aliases for background, border, text, signal, surface",
    ],
    examples: [
      ":root { --color-content-primary: #121212; --color-signal-editorial: #326891; }",
      ":root { --g-red: #e15759; --g-blue: #4e79a7; --g-green: #59a14f; }",
    ],
  },
];

/* ── Script inventory ───────────────────────────────────────── */

const SCRIPTS: AssetEntry[] = [
  {
    name: "vi-shared.js / vi-article.js",
    type: "script",
    source: "internal",
    description:
      "NYT React rendering pipeline — component hydration, lazy-loading, and image optimization",
    designInfo: [
      "React hydration patterns — which elements are React vs static HTML",
      "Lazy-loading strategies (intersection observer thresholds)",
      "Image sizing / srcset generation logic (responsive images)",
      "Share button, header collapse, sticky nav behavior",
    ],
  },
  {
    name: "Birdkit bundles (bk-2025-*)",
    type: "script",
    source: "internal",
    description:
      "Svelte/SvelteKit runtime for interactive graphics — includes D3 and SSR hydration",
    designInfo: [
      "D3 v3.4.11 — pinned old version (affects chart API, no ES module imports)",
      "SvelteKit SSR hydration for interactive graphics components",
      "Datawrapper iframe messaging protocol (postMessage API for resize/theme sync)",
      "ai2html responsive artboard switching logic",
      "Scroll-driven animation triggers (IntersectionObserver)",
      "Project IDs prefixed with 'bk-' (e.g. bk-2025-03-15-econ-year)",
    ],
  },
  {
    name: "Datawrapper embed.js",
    type: "script",
    source: "external",
    description:
      "Chart embedding runtime — responsive iframes with ?plain=1 parameter for clean embeds",
    designInfo: [
      "Canvas-based chart rendering (not SVG)",
      "Responsive sizing via postMessage iframe resize",
      "Tooltip hover behavior (dark bg, white text, value + date)",
      "Chart title, subtitle, source, and notes positioning",
      "Export controls (PNG, SVG)",
      "Accessibility: ARIA labels for chart data",
    ],
  },
  {
    name: "Analytics & Telemetry",
    type: "script",
    source: "external",
    description:
      "Performance monitoring and event tracking scripts",
    designInfo: [
      "Chartbeat — real-time reader engagement analytics",
      "Datadog RUM — performance monitoring (LCP, FID, CLS metrics)",
      "Google Tag Manager — event tracking (scroll depth, chart interactions)",
      "NYT Abra — A/B testing framework for layout/design experiments",
      "sourcepoint — privacy/consent management (GDPR/CCPA banners)",
    ],
  },
  {
    name: "ai2html (v0.121.1)",
    type: "script",
    source: "internal",
    description:
      "Illustrator → HTML export tool for static data visualizations with responsive artboards",
    designInfo: [
      "Exports multi-artboard responsive layouts (mobile / tablet / desktop)",
      "Absolute-positioned text labels over raster/SVG backgrounds",
      "Font size and position recalculated per breakpoint artboard",
      "Used for report card toppers, complex annotated charts",
      "Outputs inline styles — not CSS classes — for precise positioning",
    ],
  },
];

/* ── Sitemap inventory ──────────────────────────────────────── */

const SITEMAPS: AssetEntry[] = [
  {
    name: "sitemap.xml / sitemapnews.xml",
    type: "sitemap",
    source: "internal",
    description:
      "Complete URL taxonomy across all NYT properties — reveals content architecture",
    designInfo: [
      "Section hierarchy: news, opinion, business, technology, arts, science, sports, etc.",
      "Publication frequency per section (daily, weekly, breaking)",
      "Cross-linking patterns between properties",
      "Article slug conventions and date-based URL structure (/YYYY/MM/DD/section/slug.html)",
      "Interactive content in /interactive/ path prefix",
      "Newsletter landing pages in /newsletters/ path",
    ],
  },
  {
    name: "/games/sitemap.xml",
    type: "sitemap",
    source: "internal",
    description:
      "Games-specific URL inventory — complete game catalog with archive structure",
    designInfo: [
      "Complete game inventory with implied launch dates",
      "URL patterns for daily puzzle instances (/games/wordle/YYYY-MM-DD)",
      "Archive structure (past puzzles browsable by date)",
      "Leaderboard and stats pages",
    ],
  },
  {
    name: "Cross-property sitemaps",
    type: "sitemap",
    source: "internal",
    description:
      "Sitemaps for sub-brands reveal independent design systems and URL structures",
    designInfo: [
      "cooking.nytimes.com — recipe/collection/article URL types",
      "theathletic.com — sport/team/game URL hierarchy",
      "wirecutter.com — product-review/category/deal structure",
      "nytimes.com/athletic — merged Athletic content on main domain",
      "Each sub-brand has independent CSS, fonts, and layout patterns",
    ],
  },
];

/* ── Birdkit framework overview ─────────────────────────────── */

const BIRDKIT_FEATURES = [
  {
    feature: "Framework",
    value: "Svelte / SvelteKit with SSR hydration",
  },
  {
    feature: "Data viz library",
    value: "D3 v3.4.11 (pinned legacy version — Mike Bostock era API)",
  },
  {
    feature: "Chart embeds",
    value: "Datawrapper iframes with postMessage resize protocol",
  },
  {
    feature: "Static graphics",
    value: "ai2html v0.121.1 (Illustrator → responsive HTML export)",
  },
  {
    feature: "Project ID format",
    value: "bk-YYYY-MM-DD-slug (e.g. bk-2025-03-15-econ-year)",
  },
  {
    feature: "Hosting",
    value: "static01.nytimes.com/newsgraphics/",
  },
  {
    feature: "Build output",
    value: "Hashed CSS/JS bundles (2.DkPSoQwJ.css, index.CyB6tk6K.css)",
  },
  {
    feature: "Layout primitives",
    value: "g-wrapper → g-block → g-media (nested container system)",
  },
  {
    feature: "Responsive strategy",
    value: "CSS custom properties + media queries + ai2html artboard switching",
  },
  {
    feature: "Scroll triggers",
    value: "IntersectionObserver-based lazy render + animation triggers",
  },
];

/* ── Component ──────────────────────────────────────────────── */

function AssetCard({ entry }: { entry: AssetEntry }) {
  const borderColor =
    entry.type === "stylesheet"
      ? "border-blue-500/40"
      : entry.type === "script"
        ? "border-amber-500/40"
        : "border-emerald-500/40";

  const labelColor =
    entry.type === "stylesheet"
      ? "bg-blue-100 text-blue-800"
      : entry.type === "script"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";

  const sourceBadge =
    entry.source === "internal"
      ? "bg-zinc-100 text-zinc-600"
      : "bg-purple-100 text-purple-700";

  return (
    <div className={`rounded-lg border-l-4 ${borderColor} bg-white p-4 shadow-sm`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="font-mono text-sm font-semibold text-zinc-900">
          {entry.name}
        </h4>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${labelColor}`}>
          {entry.type}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${sourceBadge}`}>
          {entry.source}
        </span>
      </div>
      <p className="mb-3 text-xs text-zinc-600">{entry.description}</p>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Design Information Extracted
        </p>
        <ul className="space-y-0.5">
          {entry.designInfo.map((info, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-700">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-400" />
              {info}
            </li>
          ))}
        </ul>
      </div>
      {entry.examples && entry.examples.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Example Tokens
          </p>
          <div className="space-y-1">
            {entry.examples.map((ex, i) => (
              <code
                key={i}
                className="block rounded bg-zinc-100 px-2 py-1 font-mono text-[10px] leading-relaxed text-zinc-700"
              >
                {ex}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NytTechStackSection() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">
          NYT Tech Stack &amp; Asset Inventory
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Complete inventory of stylesheets, scripts, and sitemaps extracted from NYT
          article pages and the live homepage shell.
        </p>
      </div>

      <section id="homepage-shell-assets">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">
          Homepage Shell Assets
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          The live homepage uses the vi shell directly, then layers in nested-nav,
          Betamax, weather-strip, and analytics assets that do not belong to
          Birdkit article pages.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Stylesheet
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Area
                  </th>
                </tr>
              </thead>
              <tbody>
                {NYT_HOMEPAGE_SNAPSHOT.stylesheets.map((asset, index) => (
                  <tr
                    key={asset.href}
                    className={index % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-800">{asset.label}</div>
                      <div className="font-mono text-[11px] text-zinc-500 break-all">
                        {asset.href}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{asset.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Script
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Area
                  </th>
                </tr>
              </thead>
              <tbody>
                {NYT_HOMEPAGE_SNAPSHOT.scripts.map((asset, index) => (
                  <tr
                    key={asset.href}
                    className={index % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-800">{asset.label}</div>
                      <div className="font-mono text-[11px] text-zinc-500 break-all">
                        {asset.href}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{asset.area}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Birdkit Framework Overview */}
      <section id="birdkit">
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">
          Birdkit Framework
        </h3>
        <p className="mb-4 text-sm text-zinc-600">
          NYT&apos;s internal Svelte/SvelteKit framework for interactive graphics.
          Project IDs are prefixed with &quot;bk-&quot; and bundles are hosted on
          static01.nytimes.com/newsgraphics/.
        </p>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Feature
                </th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {BIRDKIT_FEATURES.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                >
                  <td className="px-4 py-2 font-medium text-zinc-800">
                    {row.feature}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stylesheets */}
      <section id="stylesheets">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">
          Stylesheets
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          CSS files reveal the complete design token system, responsive breakpoints,
          typography scales, and layout primitives.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {STYLESHEETS.map((entry, i) => (
            <AssetCard key={i} entry={entry} />
          ))}
        </div>
      </section>

      {/* Scripts */}
      <section id="scripts">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">
          Scripts &amp; Frameworks
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          JavaScript bundles expose the rendering pipeline, chart libraries,
          analytics stack, and interactive behavior patterns.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {SCRIPTS.map((entry, i) => (
            <AssetCard key={i} entry={entry} />
          ))}
        </div>
      </section>

      {/* Sitemaps */}
      <section id="sitemaps">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900">
          Sitemaps &amp; Content Architecture
        </h3>
        <p className="mb-4 text-sm text-zinc-500">
          XML sitemaps reveal the full URL taxonomy, section hierarchy, and
          cross-property linking patterns across the NYT ecosystem.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SITEMAPS.map((entry, i) => (
            <AssetCard key={i} entry={entry} />
          ))}
        </div>
      </section>

      {/* Tech Stack Summary */}
      <section id="tech-summary">
        <h3 className="mb-3 text-lg font-semibold text-zinc-900">
          Full Production Stack
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Rendering",
              items: ["React (vi platform)", "Svelte/SvelteKit (Birdkit)", "ai2html (static graphics)"],
              color: "border-blue-400",
            },
            {
              label: "Data Viz",
              items: ["D3 v3.4.11", "Datawrapper (canvas)", "ai2html (Illustrator → HTML)"],
              color: "border-emerald-400",
            },
            {
              label: "Analytics",
              items: ["Chartbeat (engagement)", "Datadog RUM (perf)", "GTM (events)", "NYT Abra (A/B)"],
              color: "border-amber-400",
            },
            {
              label: "Typography",
              items: ["7 proprietary font families", "WOFF2 on static01.nyt.com", "CSS variable aliases (--g-*)"],
              color: "border-purple-400",
            },
          ].map((col) => (
            <div
              key={col.label}
              className={`rounded-lg border-t-4 ${col.color} bg-white p-4 shadow-sm`}
            >
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {col.label}
              </h4>
              <ul className="space-y-1">
                {col.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-zinc-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
