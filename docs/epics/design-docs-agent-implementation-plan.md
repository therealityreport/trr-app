# Implementation Plan: Design Docs Brand Page Generator Agent

**Epic Plan:** `docs/epics/design-docs-agent-epic-plan.md`
**Created:** 2026-03-24
**Status:** Ready for execution

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 10 |
| **Total Effort** | ~63 story points |
| **Execution Waves** | 4 (parallel where possible) |
| **Key Dependencies** | Extraction skills → Generation skills → Wiring skill |
| **Skill Files Location** | `TRR-APP/.claude/skills/design-docs-agent/` |
| **Reference Implementation** | `/admin/design-docs/nyt-articles/trump-economy-year-1` |

---

## Architecture Overview

The agent is a **Claude Code skill chain** — 8 standalone skill documents + 1 orchestrator + 1 integration test. No external services (no Jira, no Confluence). Everything lives in the repo.

```
User provides: { brandName, sourceHtml, cssUrls, datawrapperUrls, ... }
    │
    ├─► Skill 1: extract-css-tokens        ─┐
    ├─► Skill 2: extract-page-structure     ─┤ Wave 1 (parallel)
    ├─► Skill 3: extract-datawrapper-charts ─┤
    ├─► Skill 4: extract-ai2html-artboards  ─┤
    └─► Skill 5: extract-quote-components   ─┘
         │
         ▼ (all complete — merge extracted JSON)
    ├─► Skill 6: generate-brand-section     ─┐ Wave 2 (parallel)
    └─► Skill 7: generate-article-page      ─┘
         │
         ▼
    └─► Skill 8: wire-config-and-routing      Wave 3 (sequential)
         │
         ▼
    Type-check → Browser verify → Done        Wave 4 (verification)
```

---

## Completion Status

| # | Task | Status | Skill File |
|---|------|--------|------------|
| 1 | `extract-css-tokens` | Pending | `skills/extract-css-tokens/SKILL.md` |
| 2 | `extract-page-structure` | Pending | `skills/extract-page-structure/SKILL.md` |
| 3 | `extract-datawrapper-charts` | Pending | `skills/extract-datawrapper-charts/SKILL.md` |
| 4 | `extract-ai2html-artboards` | Pending | `skills/extract-ai2html-artboards/SKILL.md` |
| 5 | `extract-quote-components` | Pending | `skills/extract-quote-components/SKILL.md` |
| 6 | `generate-brand-section` | Pending | `skills/generate-brand-section/SKILL.md` |
| 7 | `generate-article-page` | Pending | `skills/generate-article-page/SKILL.md` |
| 8 | `wire-config-and-routing` | Pending | `skills/wire-config-and-routing/SKILL.md` |
| 9 | Orchestrator agent | Pending | `agents/design-docs-generator.md` |
| 10 | Integration test | Pending | `tests/design-docs-agent.test.md` |

---

## Execution Order

### Wave 1: Extraction Skills (5 tasks, parallel) — 29 pts

All 5 extraction skills can be built in parallel — they have no dependencies on each other. Each takes raw HTML/CSS input and produces structured JSON.

| # | Task | Points | Input | Output |
|---|------|--------|-------|--------|
| 1 | `extract-css-tokens` | 5 | CSS URLs, `<style>` blocks | Token map JSON (colors, fonts, spacing, radius, variables) |
| 2 | `extract-page-structure` | 8 | Full page HTML | Block inventory JSON (metadata, blocks[], assets, embeds) |
| 3 | `extract-datawrapper-charts` | 8 | Datawrapper URLs | TypeScript chart data constants + component type mapping |
| 4 | `extract-ai2html-artboards` | 5 | Page HTML, artboard URLs | Artboard JSON (dimensions, overlays, badges, aspect ratios) |
| 5 | `extract-quote-components` | 3 | Page HTML | Quote JSON (sections, citations, badges, CSS specs) |

### Wave 2: Generation Skills (2 tasks, parallel) — 16 pts

Depend on Wave 1 outputs. Can run in parallel with each other.

| # | Task | Points | Input | Output |
|---|------|--------|-------|--------|
| 6 | `generate-brand-section` | 8 | Merged extraction JSON | `Brand{Name}Section.tsx` component file |
| 7 | `generate-article-page` | 8 | Merged extraction JSON | ARTICLES config entry + `chart-data.ts` constants |

### Wave 3: Wiring (1 task, sequential) — 5 pts

Depends on Wave 2 outputs. Must run after component files exist.

| # | Task | Points | Input | Output |
|---|------|--------|-------|--------|
| 8 | `wire-config-and-routing` | 5 | Brand name, section ID, file paths | Updated config.ts, PageClient.tsx, sidebar mapping |

### Wave 4: Orchestration + Verification (2 tasks) — 13 pts

| # | Task | Points | Input | Output |
|---|------|--------|-------|--------|
| 9 | Orchestrator agent | 8 | User input contract | Coordinates all skills, runs verification |
| 10 | Integration test | 5 | NYT reference data | Pass/fail against known-good output |

---

## Task Implementation Details

### Task 1: `extract-css-tokens`

**Skill file:** `.claude/skills/design-docs-agent/extract-css-tokens/SKILL.md`

**What it does:** Parses CSS stylesheets and extracts a structured token map — color variables, @font-face declarations, spacing values, border-radius patterns, and layout widths.

**Affected files:** None (pure extraction — produces JSON output)

**Algorithm:**
1. For each CSS URL, fetch content (or extract inline `<style>` blocks from HTML)
2. Regex parse `:root` / `html` / `body` variable declarations → capture `--var-name: value` pairs
3. Parse `@font-face` blocks → extract `font-family`, `font-weight`, `font-style`, `src` URL, `format`
4. Group colors by semantic role using heuristics:
   - Variable names containing `background`/`bg` → background
   - Variable names containing `border`/`stroke` → border
   - Variable names containing `text`/`copy`/`body` → text
   - Variable names containing `accent`/`primary`/`signal` → accent
   - All others → unclassified
5. Extract spacing patterns: scan for repeated `margin`/`padding` values in class definitions
6. Extract `border-radius` patterns: collect all unique radius values
7. Extract layout widths: scan for `max-width` values in content containers

**Output schema:**
```typescript
interface CSSTokenMap {
  colors: {
    core: Array<{ name: string; value: string; role: string }>;
    graphics: Array<{ name: string; value: string }>;
    semantic: Array<{ name: string; value: string; role: string }>;
  };
  fonts: Array<{
    family: string;
    weights: number[];
    style?: string;
    srcUrl?: string;
    format?: string;
    role?: string;
    cssVar?: string;
  }>;
  spacing: Record<string, string>;
  radius: string[];
  layoutWidths: Record<string, string>;
  rawVariables: Record<string, string>;
}
```

**Acceptance criteria:**
- [ ] Extracts `:root` CSS variables into `rawVariables` map
- [ ] Parses `@font-face` blocks with weight/style/src
- [ ] Groups colors by semantic role
- [ ] Handles CSS-in-JS hashed classes (`.css-*`) — extracts inline `style` attributes
- [ ] Returns valid JSON matching the schema above

---

### Task 2: `extract-page-structure`

**Skill file:** `.claude/skills/design-docs-agent/extract-page-structure/SKILL.md`

**What it does:** Parses full-page HTML to identify content block types, extract metadata, and catalog all public asset URLs.

**Algorithm:**
1. Parse `<meta>` tags → extract `og:title`, `og:description`, `og:image`, `article:author`, `article:published_time`, `keywords`
2. Parse `<h1>` for headline, `<time>` for date
3. Walk DOM top-to-bottom, classify each content container:
   - `.g-wrapper` / `.g-block` → Birdkit graphics block
   - `figure` → figure/image
   - `blockquote` / `.quote` → quote
   - `iframe[src*=datawrapper]` → chart embed (capture src URL)
   - `.ai2html-*` / `[data-ai2html]` → ai2html artboard
   - `h2` / `h3` with specific classes → subhed
   - `p` with body text → text block
   - `aside` / `.ad-*` → ad slot
4. For each block, record: `{ type, index, classes, content, embeddedUrls }`
5. Collect all asset URLs:
   - `<img src>` values (headshots, artboard PNGs, social images)
   - `<link rel="stylesheet">` href values
   - `<script src>` values
   - Datawrapper iframe src values
6. Parse `<a>` tags in tag/topic sections for topic keywords

**Output schema:**
```typescript
interface PageStructure {
  metadata: {
    title: string;
    description: string;
    authors: string[];
    date: string;
    section: string;
    type: string;
    tags: string[];
    ogImage: string;
  };
  blocks: Array<{
    type: "header" | "graphic" | "text" | "subhed" | "quote" | "embed" | "extendedbyline" | "source" | "ad";
    index: number;
    classes: string[];
    content?: string;
    embeddedUrls?: string[];
  }>;
  assets: {
    stylesheets: string[];
    scripts: string[];
    images: string[];
    socialImages: Array<{ name: string; url: string; ratio?: string }>;
    artboards: Array<{ url: string; width: number; viewport: string }>;
    headshots: Array<{ url: string; name: string }>;
  };
  embeds: Array<{
    type: "datawrapper" | "youtube" | "other";
    url: string;
    id?: string;
    topic?: string;
  }>;
}
```

**Acceptance criteria:**
- [ ] Identifies Birdkit blocks (`.g-wrapper`, `.g-block`, `.g-media`)
- [ ] Extracts article metadata from `<meta>` tags
- [ ] Catalogs ALL embedded URLs (images, iframes, stylesheets, scripts)
- [ ] Classifies blocks by type with correct ordering
- [ ] Handles paywalled articles (works from view-source HTML, no JS execution needed)

---

### Task 3: `extract-datawrapper-charts`

**Skill file:** `.claude/skills/design-docs-agent/extract-datawrapper-charts/SKILL.md`

**What it does:** Fetches Datawrapper embed pages, extracts chart data/config, and generates TypeScript constants matching the `BarChartData` / `LineChartData` interfaces.

**Algorithm:**
1. For each Datawrapper URL (append `?plain=1` if not present):
   a. Fetch the embed HTML
   b. Look for inline `<script>` containing `__dw_data` or `window.__DW_DATA__` JSON
   c. Also check for CSV data in `<script type="text/csv">` or embedded `noscript` tables
   d. Extract from the JSON/CSV:
      - `data.chartData` → raw values
      - `visualization.type` → chart type (`d3-lines`, `d3-bars`, `d3-stacked-area`)
      - `visualization.axes` → axis config (ticks, labels, format)
      - `visualization.colors` → color assignments per series
      - `title`, `describe`, `annotate.notes`, `source.name`
   e. **Fallback:** If data isn't in HTML (canvas-only rendering):
      - Use Gemini vision API (`/api/design-docs/analyze-image`) to extract data points from a screenshot
      - Or prompt user: "Chart data for [topic] wasn't available in HTML. Please provide CSV or data points."

2. Map chart type → component:
   - `d3-lines` → `InteractiveLineChart` (uses `LineChartData`)
   - `d3-bars` → `InteractiveBarChart` (uses `BarChartData`)
   - `d3-stacked-area` → needs `InteractiveStackedAreaChart` (create if missing)

3. Generate TypeScript constant:
```typescript
export const CHART_NAME_DATA: LineChartData = {
  values: [/* extracted monthly/yearly values */],
  startYear: YYYY,
  lineColor: "#hex",     // from visualization.colors
  yAxisLabel: "...",      // from axes config
  yTicks: [...],          // from axes config
  xLabels: [...],         // from axes config
  annotation: "...",      // series label
  source: "...",          // from source.name
  note: "...",            // from annotate.notes
  // For dual-line charts:
  values2?: number[],
  label2?: string,
  color2?: string,
};
```

**Key interfaces (from existing code):**
```typescript
// InteractiveBarChart.tsx
export interface BarChartData {
  values: number[];
  startYear: number;
  barColor: string;
  yAxisLabel: string;
  yTicks: number[];
  xLabels: string[];
  annotation: string;
  source: string;
  note?: string;
}

// InteractiveLineChart.tsx
export interface LineChartData {
  values: number[];
  values2?: number[];    // secondary line
  label2?: string;
  color2?: string;
  startYear: number;
  lineColor: string;
  yAxisLabel: string;
  yTicks: number[];
  xLabels: string[];
  annotation: string;
  annotationX?: number;
  annotationY?: number;
  source: string;
  note?: string;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  decimals?: number;
}
```

**Acceptance criteria:**
- [ ] Fetches and parses Datawrapper embed HTML
- [ ] Extracts data series, axes, colors, annotations
- [ ] Maps chart types to correct component (`InteractiveBarChart` or `InteractiveLineChart`)
- [ ] Generates TypeScript constants matching the interfaces exactly
- [ ] Falls back to Gemini vision API when chart data isn't in HTML
- [ ] Handles dual-line charts (`values2`, `label2`, `color2`)

---

### Task 4: `extract-ai2html-artboards`

**Skill file:** `.claude/skills/design-docs-agent/extract-ai2html-artboards/SKILL.md`

**What it does:** Extracts ai2html artboard dimensions, background image URLs, and absolute-positioned text overlay data from the article HTML.

**Algorithm:**
1. Find ai2html containers: `.g-artboard` or elements with `[data-min-width]` / `[data-max-width]` attributes
2. For each artboard container:
   a. Read `data-min-width` / `data-max-width` → classify as mobile/tablet/desktop
   b. Read inline `style` → extract `width`, `height` or `padding-bottom` (aspect ratio)
   c. Find `<img>` child → extract `src` for background PNG URL
   d. Find all absolutely-positioned children (divs/spans with `position: absolute`):
      - Read `style` → `top`, `left`, `width`, `font-family`, `font-size`, `font-weight`, `color`, `line-height`, `letter-spacing`
      - Read inner text content
      - If element has background color → classify as "badge" (status label)
3. Calculate aspect ratio: `(height / width * 100)%` for responsive container
4. Group artboards by viewport breakpoint

**Output schema:**
```typescript
interface Ai2htmlData {
  artboards: Array<{
    viewport: "mobile" | "tablet" | "desktop";
    width: number;
    height: number;
    aspectRatio: string;       // e.g. "57.14%"
    backgroundImage: string;   // CDN URL to artboard PNG
    textOverlays: Array<{
      text: string;
      position: { top: string; left: string; marginTop?: number };
      style: { fontFamily: string; fontSize: number; fontWeight: number; color?: string };
    }>;
    badges: Array<{
      text: string;
      position: { top: string; left: string };
      style: { background: string; color: string; fontSize: number; fontWeight: number; letterSpacing?: string };
    }>;
  }>;
}
```

**Important lesson from our experience:**
- The background PNG already contains baked-in text and icons
- When the image is used as `background-image`, the absolute-positioned HTML text overlays sit ON TOP of the image's text
- **Correct approach:** Use the artboard as a plain `<img>` with NO text overlays (the image IS the complete component), OR carefully align overlays to match exactly
- The agent should detect whether artboard images already contain text (check if they're raster PNGs with visible text) and skip overlay generation in that case

**Acceptance criteria:**
- [ ] Extracts artboard dimensions and aspect ratios
- [ ] Captures background image URLs from CDN
- [ ] Identifies mobile vs desktop artboards by width breakpoints
- [ ] Extracts absolute-positioned text labels with exact positions
- [ ] Detects badge/status elements with background colors
- [ ] Handles the "image already has text" case (skip overlays, use plain `<img>`)

---

### Task 5: `extract-quote-components`

**Skill file:** `.claude/skills/design-docs-agent/extract-quote-components/SKILL.md`

**What it does:** Extracts styled quote/callout blocks from the article HTML and maps them to article sections.

**Algorithm:**
1. Find quote containers: `.quote`, `blockquote`, `.callout`, `.pullquote`, `.g-block` containing quote-like structure
2. For each quote block:
   a. Extract citation/source: look for `h4`, `.citation`, `.source`, small-caps text
   b. Extract quote text: look for `h2`, `.quote-text`, `blockquote p`, large italic text
   c. Extract status badge: look for colored `span`/`div` with short uppercase text (e.g. "HASN'T HAPPENED")
   d. Record computed CSS for each sub-element
3. Determine section mapping: walk backwards in DOM to find preceding `h2` (subhed) — that's the section this quote belongs to
4. Extract badge colors (map to article status system)

**Output schema:**
```typescript
interface QuoteData {
  quoteComponents: Array<{
    section: string;         // e.g. "Food Prices"
    citation: string;        // e.g. "TRUMP CAMPAIGN PROMISE"
    quoteText: string;       // actual quote
    badge?: {
      text: string;          // e.g. "HASN'T HAPPENED"
      color: string;         // e.g. "#bc261a"
    };
    css: {
      container: Record<string, string | number>;
      citation: Record<string, string | number>;
      quoteText: Record<string, string | number>;
      badge?: Record<string, string | number>;
    };
  }>;
}
```

**Acceptance criteria:**
- [ ] Identifies quote containers by class patterns
- [ ] Extracts citation, quote text, and badge elements
- [ ] Maps quotes to article sections (preceding h2)
- [ ] Captures all relevant CSS properties
- [ ] Handles articles with no quotes (returns empty array)

---

### Task 6: `generate-brand-section`

**Skill file:** `.claude/skills/design-docs-agent/generate-brand-section/SKILL.md`

**What it does:** Takes the merged extraction JSON (from Tasks 1-5) and generates a complete `Brand{Name}Section.tsx` component.

**Template pattern (from existing `BrandNYTSection.tsx`):**
```tsx
"use client";
import Link from "next/link";
import type { Route } from "next";

function SectionLabel({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h3 id={id} className="...">
      <span className="..." style={{ borderColor: "{brandAccentColor}" }} />
      {children}
    </h3>
  );
}

// Data constants populated from extraction JSON
const FONTS = [/* from CSSTokenMap.fonts */];
const COLORS = [/* from CSSTokenMap.colors */];
const LAYOUT_TOKENS = [/* from CSSTokenMap.layoutWidths + spacing */];

export default function Brand{Name}Section() {
  return (
    <div className="space-y-12">
      <SectionLabel id="typography">Typography</SectionLabel>
      {/* Font cards grid */}
      {/* Font mapping table: source font → TRR equivalent */}

      <SectionLabel id="colors">Colors</SectionLabel>
      {/* Color swatch grid */}
      {/* Graphics palette */}

      <SectionLabel id="layout">Layout & Tokens</SectionLabel>
      {/* Layout specs table */}
      {/* DOM hierarchy code block */}

      <SectionLabel id="architecture">Architecture</SectionLabel>
      {/* Framework info table */}

      <SectionLabel id="resources">Resources</SectionLabel>
      {/* Link cards to Tech Stack and Pages */}
    </div>
  );
}
```

**Files created:**
- `apps/web/src/components/admin/design-docs/sections/Brand{Name}Section.tsx`

**Font mapping lookup table (TRR equivalents):**
| Source Font | TRR Equivalent | Notes |
|-------------|---------------|-------|
| nyt-franklin | Hamburg Serial | Sans-serif, UI text |
| nyt-cheltenham | Cheltenham | Display serif |
| nyt-karnakcondensed | Cheltenham Bold | Condensed display |
| nyt-imperial | Georgia | Body serif fallback |
| Arial/Helvetica | Hamburg Serial | Generic sans |
| Georgia/Times | Cheltenham | Generic serif |
| Roboto | Hamburg Serial | Google sans |

**Acceptance criteria:**
- [ ] Generates valid `"use client"` TSX component
- [ ] Includes all 5 section anchors (typography, colors, layout, architecture, resources)
- [ ] Section IDs match `BrandSubSection.anchor` values in config
- [ ] Font mapping table included (source → TRR equivalent)
- [ ] Follows existing brand section patterns (see `BrandNYTSection.tsx` for reference)
- [ ] Uses Tailwind CSS classes consistent with existing design docs aesthetic

---

### Task 7: `generate-article-page`

**Skill file:** `.claude/skills/design-docs-agent/generate-article-page/SKILL.md`

**What it does:** Generates the ARTICLES config entry and chart data constants from merged extraction JSON.

**Files modified:**
- `apps/web/src/lib/admin/design-docs-config.ts` → new entry in `ARTICLES` array
- `apps/web/src/components/admin/design-docs/chart-data.ts` → new chart data constants

**Config entry template (from existing NYT article):**
```typescript
{
  id: slugify(metadata.title),  // e.g. "trump-economy-year-1"
  title: metadata.title,
  url: metadata.articleUrl,
  authors: metadata.authors,
  date: metadata.date,
  section: metadata.section,
  type: metadata.type,
  description: metadata.description,
  ogImage: metadata.ogImage,
  tags: metadata.tags,
  graphicsCount: blocks.filter(b => b.type === "graphic").length,
  figuresCount: blocks.filter(b => b.type !== "text" && b.type !== "ad").length,
  tools: {
    topper: /* detected from ai2html presence */,
    charts: /* "Datawrapper (N embeds)" or "D3" or "SVG" */,
    framework: /* detected from scripts */,
    hosting: /* detected from asset URLs */,
  },
  chartTypes: embeds.map(e => ({ type: e.chartType, tool: e.tool, topic: e.topic, url: e.url })),
  quoteSections: quoteComponents.map(q => ({ section: q.section, badge: q.badge.text, badgeColor: q.badge.color })),
  fonts: cssTokenMap.fonts.map(f => ({
    name: f.family, cssVar: f.cssVar, fullStack: "...",
    weights: f.weights, role: f.role, usedIn: []
  })),
  brandFonts: { editorial: [...], graphics: [...] },
  architecture: { /* from script analysis */ },
}
```

**Chart data generation:** For each Datawrapper chart extracted in Task 3, emit a TypeScript constant in `chart-data.ts`:
```typescript
export const BRAND_SLUG_CHART_TOPIC_DATA: LineChartData | BarChartData = { ... };
```

**Acceptance criteria:**
- [ ] Generates complete ARTICLES entry with all required fields
- [ ] Generates chart data constants matching `BarChartData` / `LineChartData` interfaces
- [ ] Maps quotes to chart sections correctly via `quoteSections`
- [ ] Includes public asset URLs (artboards, social images, headshots)
- [ ] Slug is URL-safe and unique

---

### Task 8: `wire-config-and-routing`

**Skill file:** `.claude/skills/design-docs-agent/wire-config-and-routing/SKILL.md`

**What it does:** Registers the new brand and its pages in the design docs config system so they render in the sidebar and route correctly.

**Files modified:**

1. **`design-docs-config.ts`** (5 insertion points):
   - `DesignDocSectionId` union type → add `"brand-{slug}"`
   - `DESIGN_DOC_SECTIONS` array → add `{ id: "brand-{slug}", label: "{Name}", description: "..." }`
   - `BRAND_SECTION_IDS` Set → add `"brand-{slug}"`
   - `DESIGN_DOC_GROUPS` "Brands" group → add `"brand-{slug}"` to `sectionIds`
   - `getBrandSubSections()` → add case for `"brand-{slug}"` returning brand-specific sub-sections
   - If article pages exist: add `SECTION_PARENT_MAP` entry

2. **`DesignDocsPageClient.tsx`** (1 insertion point):
   - `sectionComponents` map → add `"brand-{slug}": load("Brand{Name}Section")`

3. **Verification steps:**
   - Run `npx tsc --noEmit` from `apps/web/` → zero errors
   - Navigate to `/admin/design-docs/brand-{slug}` → renders correctly
   - Sidebar shows brand with sub-links expanded under "Brands" group

**Insertion patterns (regex-safe):**
```
// DesignDocSectionId — insert before closing semicolon
| "brand-nyt-store"
| "brand-{slug}"     ← INSERT HERE

// BRAND_SECTION_IDS — insert before closing ])
"brand-nyt-store",
"brand-{slug}",      ← INSERT HERE

// DESIGN_DOC_GROUPS Brands sectionIds — insert before closing ]
"brand-nyt-store",
"brand-{slug}",      ← INSERT HERE

// sectionComponents map — insert before nyt-articles
"brand-nyt-store": load("BrandNYTStoreSection"),
"brand-{slug}": load("Brand{Name}Section"),  ← INSERT HERE
```

**Acceptance criteria:**
- [ ] All 5 config insertion points updated correctly
- [ ] Dynamic import registered in PageClient
- [ ] Type-checks cleanly (`npx tsc --noEmit` = 0 errors)
- [ ] New brand appears in sidebar under "Brands" group
- [ ] Sub-section links work (anchor scrolling + page navigation)

---

### Task 9: Orchestrator Agent

**Agent file:** `.claude/skills/design-docs-agent/SKILL.md` (top-level orchestrator)

**What it does:** Accepts user input, dispatches extraction skills in parallel, merges results, runs generation skills, then wires config.

**Trigger:** User runs `/design-docs-agent` with brand name and source materials

**Input contract:**
```
brandName: string           // e.g. "Washington Post"
sourceHtml: string          // Full page HTML (view-source)
cssUrls: string[]           // External stylesheet URLs
scriptUrls?: string[]       // External script URLs
datawrapperUrls?: string[]  // Datawrapper embed URLs
ai2htmlImageUrls?: string[] // Background artboard PNGs
articleUrl?: string          // Original article URL
```

**Execution flow:**
1. **Validate inputs** — ensure brandName and sourceHtml are provided
2. **Wave 1 — Extract (parallel):**
   - Launch 5 Agent subagents, one per extraction skill
   - Pass relevant input to each (CSS URLs to Task 1, HTML to Task 2, etc.)
   - Wait for all 5 to complete
3. **Merge extraction outputs** into a single JSON blob
4. **Wave 2 — Generate (parallel):**
   - Launch brand section generator (Task 6) with merged JSON
   - Launch article page generator (Task 7) with merged JSON
   - Wait for both to complete
5. **Wave 3 — Wire (sequential):**
   - Run config wiring (Task 8)
6. **Wave 4 — Verify:**
   - Run `npx tsc --noEmit` — must be 0 errors
   - Report success with URL: `/admin/design-docs/brand-{slug}`

**Error handling:**
- If any extraction skill fails, report which one and continue with partial data
- If Datawrapper extraction fails, prompt user for CSV data
- If type-check fails, attempt auto-fix (common issues: missing imports, type mismatches)

**Acceptance criteria:**
- [ ] Accepts user input matching the contract
- [ ] Dispatches extraction skills in parallel (5 concurrent agents)
- [ ] Merges extraction JSON correctly
- [ ] Runs generation skills after extraction completes
- [ ] Runs wiring after generation completes
- [ ] Runs type-check verification
- [ ] Reports success with navigation URL
- [ ] Handles partial failures gracefully

---

### Task 10: Integration Test

**Test file:** `.claude/skills/design-docs-agent/test/integration-test.md`

**What it does:** Validates the agent against the existing NYT article as a known-good reference.

**Test approach:**
1. Provide the NYT Trump Economy article source HTML as input
2. Provide the 4 CSS URLs and 8 Datawrapper URLs
3. Run the orchestrator
4. Compare generated output against existing:
   - `ARTICLES[0]` config entry should match
   - Chart data constants should have same values
   - Component should have 5 section anchors
   - Sidebar should show brand with sub-links

**Acceptance criteria:**
- [ ] Agent produces output matching existing NYT reference quality
- [ ] All 8 charts render with correct data
- [ ] Quote sections map correctly
- [ ] Config updates are valid TypeScript
- [ ] Sidebar navigation works

---

## Risk Assessment

| Component | Risk | Score | Mitigation |
|-----------|------|-------|------------|
| Datawrapper data extraction | HIGH | 19/21 | Gemini vision fallback + manual CSV input option |
| CSS-in-JS hashed classes | MEDIUM | 14/21 | Focus on `:root` variables; computed styles as supplement |
| ai2html text overlay alignment | MEDIUM | 13/21 | Detect raster images with baked text → use plain `<img>` |
| Font mapping accuracy | LOW | 8/21 | Maintain static lookup table; ask user to confirm unknowns |
| Config file editing | LOW | 9/21 | Well-defined insertion points with regex patterns |
| Cross-publisher support | MEDIUM | 15/21 | Start with NYT; generalize patterns after validation |

---

## Codebase Reference

### Files the agent reads (inputs):
| File | Purpose |
|------|---------|
| User-provided HTML | Source of truth for page structure |
| User-provided CSS URLs | Design tokens, fonts, variables |
| Datawrapper embed pages | Chart data and configuration |

### Files the agent creates/modifies (outputs):
| File | Action | Purpose |
|------|--------|---------|
| `sections/Brand{Name}Section.tsx` | CREATE | Brand page component |
| `chart-data.ts` | MODIFY | Add chart data constants |
| `design-docs-config.ts` | MODIFY | Register brand, articles, sub-sections |
| `DesignDocsPageClient.tsx` | MODIFY | Register dynamic import |

### Reference files (patterns to follow):
| File | Lines | Pattern |
|------|-------|---------|
| `BrandNYTSection.tsx` | ~577 | Brand section component structure |
| `ArticleDetailPage.tsx` | ~614 | Article page with interactive charts |
| `InteractiveBarChart.tsx` | ~200 | Bar chart SVG component |
| `InteractiveLineChart.tsx` | ~250 | Line chart SVG component |
| `chart-data.ts` | ~200 | Chart data constant format |
| `design-docs-config.ts` | ~582 | Config structure, types, groups |
| `DesignDocsPageClient.tsx` | ~161 | Dynamic import registration |

---

## Open Questions

1. **Multi-publisher scope:** Should the agent handle brands beyond NYT (WaPo, Guardian, etc.)? → Start with NYT-like publishers, generalize later.
2. **Chart data validation:** How to verify extracted data is accurate? → Side-by-side screenshot comparison.
3. **Font licensing:** Can we reference @font-face URLs from publishers? → Use for design docs only (internal tool), not production.
4. **Image hosting:** Should artboard PNGs be re-hosted on R2? → Yes, for reliability. Add R2 upload step.
5. **Incremental updates:** How to update an existing brand page? → Re-run agent with `--update` flag, diff and merge.

---

## Next Steps

Execute tasks in wave order:
```
Wave 1 → Create all 5 extraction skill files (parallel)
Wave 2 → Create both generation skill files (parallel)
Wave 3 → Create wiring skill file
Wave 4 → Create orchestrator + integration test
```

To begin execution:
```
# Start with Wave 1 — create extraction skill files
mkdir -p .claude/skills/design-docs-agent/{extract-css-tokens,extract-page-structure,extract-datawrapper-charts,extract-ai2html-artboards,extract-quote-components,generate-brand-section,generate-article-page,wire-config-and-routing,test}
```
