# Epic Plan: Design Docs Brand Page Generator Agent

## Epic Overview

**Purpose:** Create an autonomous agent that can generate complete Design Docs brand pages — including typography specimens, color palettes, layout tokens, interactive charts, ai2html replicas, quote components, and article-level design breakdowns — from a set of user-provided inputs (source HTML, CSS URLs, script URLs, Datawrapper embed URLs).

**User Value:** Currently, creating a brand page (like the NYT page we built) requires 10+ hours of manual work: extracting CSS variables, mapping fonts, recreating charts, building ai2html overlays, wiring sidebar navigation, and configuring the data model. The agent reduces this to a single command with source materials.

**Scope:**
- IN: Brand page generation, article page generation, chart recreation, CSS extraction, component scaffolding, sidebar wiring, config updates
- OUT: Scraping live sites (user provides source), image generation (existing API handles this), game-specific subsystems (NYT Games is unique)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to create a brand page | < 15 minutes (from source input to rendered page) |
| Chart accuracy | All charts match Datawrapper originals (data, colors, axes) |
| Component completeness | All content block types rendered (header, byline, subhed, quote, embed, source) |
| Zero manual config edits | Agent handles all config.ts, sidebar, and routing updates |

---

## Agent Architecture

### Input Contract

The user provides:
```
{
  brandName: string,           // e.g. "Washington Post", "The Guardian"
  sourceHtml: string,          // Full page HTML (view-source output)
  cssUrls: string[],           // External stylesheet URLs
  scriptUrls: string[],        // External script URLs
  datawrapperUrls: string[],   // Datawrapper embed URLs (?plain=1)
  ai2htmlImageUrls?: string[], // Background artboard PNGs
  sitemapUrl?: string,         // XML sitemap URL
  articleUrl?: string,         // Original article URL (for metadata)
}
```

### Output Contract

The agent produces:
1. New section in `design-docs-config.ts` (sectionId, label, description, group membership)
2. New brand component `Brand{Name}Section.tsx` with typography, colors, layout, architecture, resources
3. New article entry in `ARTICLES` array (if article provided)
4. New `ArticleDetailPage` data (chart data, quote sections, fonts, public assets)
5. Updated `DesignDocsPageClient.tsx` (dynamic import registration)
6. Updated `DesignDocsSidebar.tsx` (if needed for parent-section mapping)
7. New chart data in `chart-data.ts` (if Datawrapper charts extracted)

---

## Agent Skills (8 Skills)

Each skill is a standalone document with instructions for one step of the workflow.

### Skill 1: `extract-css-tokens`

**Input:** CSS file URLs or inline `<style>` blocks from source HTML
**Output:** Structured token map

**Instructions:**
1. Fetch each CSS URL content
2. Parse `:root` / `html` / `body` variable declarations
3. Extract:
   - Color tokens (hex, rgb, hsl) → group by semantic role (text, background, border, accent, signal)
   - Font-family declarations → map to weight variants and @font-face sources
   - Spacing values (margin, padding patterns)
   - Border-radius patterns
   - Layout widths (max-width, content columns)
4. Parse `@font-face` blocks → extract font-family name, weight, style, src URL, format
5. Identify CSS-in-JS hashed classes (`.css-*`) → extract computed properties
6. Output JSON:
```json
{
  "colors": { "core": [...], "graphics": [...], "semantic": [...] },
  "fonts": [{ "family": "...", "weights": [...], "role": "...", "cssVar": "..." }],
  "spacing": { "body": "...", "wide": "...", "margins": "..." },
  "radius": [...],
  "rawVariables": { "--var-name": "value" }
}
```

### Skill 2: `extract-page-structure`

**Input:** Full page HTML source
**Output:** Content block inventory with metadata

**Instructions:**
1. Parse HTML DOM structure
2. Identify content blocks by class patterns:
   - `.g-wrapper` / `.g-block` / `.g-media` → Birdkit graphics blocks
   - `figure`, `blockquote`, `aside` → semantic content blocks
   - `iframe[src*=datawrapper]` → chart embeds
   - `div[data-ai2html]` or `.ai2html-*` → ai2html artboards
   - `.g-wrapper_meta` → source/credit blocks
3. For each block, extract:
   - Block type (header, graphic, text, subhed, quote, embed, ad)
   - Position in document flow (index)
   - Key CSS classes
   - Computed styles (font-family, font-size, color, margin, padding)
   - Content text (for quotes, headings)
   - Embedded URLs (for images, iframes)
4. Extract article metadata:
   - Title (h1 or meta og:title)
   - Description (meta og:description)
   - Authors (byline elements)
   - Date (time element or meta)
   - Section/type
   - Tags (meta keywords or tag links)
5. Extract public asset URLs:
   - og:image and social images from meta tags
   - Author headshots from byline images
   - ai2html artboard PNGs from data attributes or img[src]
6. Output JSON:
```json
{
  "metadata": { "title": "...", "authors": [...], "date": "...", "section": "...", "tags": [...] },
  "blocks": [{ "type": "header", "index": 0, "classes": [...], "styles": {...}, "content": "..." }],
  "assets": { "ogImage": "...", "socialImages": [...], "artboards": [...], "headshots": [...] },
  "embeds": [{ "type": "datawrapper", "url": "...", "id": "...", "topic": "..." }]
}
```

### Skill 3: `extract-datawrapper-charts`

**Input:** Datawrapper embed URLs (with `?plain=1`)
**Output:** Chart data constants + component type mapping

**Instructions:**
1. For each Datawrapper URL:
   a. Fetch the embed page HTML
   b. Parse the `__dw_data` or inline JSON data from `<script>` tags
   c. Extract:
      - Chart type (line, bar, stacked-area, scatter, etc.)
      - Data series (values array, labels)
      - Axis configuration (ticks, labels, min/max)
      - Color assignments per series
      - Annotations (inline labels, reference lines)
      - Source text, note text
      - Title, subtitle
   d. If data not available in HTML, fall back to:
      - Screenshot the iframe and use Gemini vision API to extract data
      - Or ask user to provide CSV data export
2. Map chart type to component:
   - `d3-lines` → `InteractiveLineChart` (LineChartData)
   - `d3-bars` → `InteractiveBarChart` (BarChartData)
   - `d3-stacked-area` / stacked bars → custom stacked SVG component
3. Generate TypeScript data constants matching the interface:
```typescript
export const CHART_NAME_DATA: LineChartData = {
  values: [...],
  startYear: YYYY,
  lineColor: "#hex",
  yAxisLabel: "...",
  yTicks: [...],
  xLabels: [...],
  annotation: "...",
  source: "...",
  // ... all applicable fields
};
```
4. Output: Array of chart data constants + chart-to-section mapping

### Skill 4: `extract-ai2html-artboards`

**Input:** Page HTML containing ai2html output, artboard image URLs
**Output:** Artboard dimensions, text overlay positions, background image references

**Instructions:**
1. Find ai2html containers in HTML (`.g-artboard` or similar)
2. For each artboard:
   a. Extract dimensions (width × height from style or data attributes)
   b. Extract background image URL (from `<img>` or CSS background)
   c. Extract all absolute-positioned text labels:
      - Position: top%, left%, marginTop
      - Font: family, size, weight, lineHeight, letterSpacing
      - Color, textTransform
      - Content text
   d. Extract badge/status elements with background colors
3. Determine aspect ratio for responsive container (paddingBottom %)
4. Classify artboards by viewport (mobile, tablet, desktop) using width breakpoints
5. Output JSON:
```json
{
  "artboards": [{
    "viewport": "desktop",
    "width": 600,
    "height": 342.833,
    "aspectRatio": "57.14%",
    "backgroundImage": "https://cdn.example.com/artboard.png",
    "textOverlays": [{
      "text": "Lower food prices",
      "position": { "top": "7.23%", "left": "13%", "marginTop": -9.8 },
      "style": { "fontFamily": "...", "fontSize": 16, "fontWeight": 300 }
    }],
    "badges": [{
      "text": "HASN'T HAPPENED",
      "position": { "top": "7.34%", "left": "66.88%" },
      "style": { "background": "#bc261a", "color": "#fff" }
    }]
  }]
}
```

### Skill 5: `extract-quote-components`

**Input:** Page HTML containing quote/callout blocks
**Output:** Quote component data + CSS specifications

**Instructions:**
1. Find quote containers (`.quote`, `blockquote`, `.callout`, `.pullquote`)
2. For each quote:
   a. Extract structural elements:
      - Citation/source text (h4, .citation, .source)
      - Quote text (h2, .quote-text, blockquote p)
      - Status badge (if present) — text, background color
   b. Extract computed CSS:
      - Container: border, border-radius, padding, max-width
      - Citation: font-family, font-size, font-weight, color
      - Quote text: font-family, font-size, font-weight, font-style, color
      - Badge: font-size, font-weight, letter-spacing, border-radius, padding, colors
3. Map to article section (which section heading does this quote belong to?)
4. Output JSON:
```json
{
  "quoteComponents": [{
    "section": "Food Prices",
    "citation": "TRUMP CAMPAIGN PROMISE",
    "quoteText": "I will lower food prices on day one...",
    "badge": { "text": "HASN'T HAPPENED", "color": "#bc261a" },
    "css": {
      "container": { "border": "1px solid #363636", "borderRadius": 5, "padding": 15 },
      "citation": { "fontFamily": "nyt-franklin", "fontSize": 14, "fontWeight": 400 },
      "quoteText": { "fontFamily": "nyt-cheltenham", "fontSize": 25, "fontWeight": 300 },
      "badge": { "fontSize": 12, "fontWeight": 600, "borderRadius": 3 }
    }
  }]
}
```

### Skill 6: `generate-brand-section`

**Input:** Extracted tokens (from Skills 1-5), brand name, brand config
**Output:** Complete `Brand{Name}Section.tsx` component file

**Instructions:**
1. Create component file following the pattern:
   ```
   "use client";
   import Link from "next/link";
   import type { Route } from "next";

   function SectionLabel({ children, id }) { ... }

   // Typography data from extracted fonts
   // Color data from extracted tokens
   // Layout data from extracted spacing

   export default function Brand{Name}Section() {
     return (
       <div>
         <SectionLabel id="typography">Typography</SectionLabel>
         {/* Font cards */}

         <SectionLabel id="colors">Colors</SectionLabel>
         {/* Color swatches */}

         <SectionLabel id="layout">Layout & Tokens</SectionLabel>
         {/* Layout specs table */}

         <SectionLabel id="architecture">Architecture</SectionLabel>
         {/* Framework/build system info */}

         <SectionLabel id="resources">Resources</SectionLabel>
         {/* Links to Tech Stack and Pages */}
       </div>
     );
   }
   ```
2. Populate with extracted data:
   - Typography: font family cards with weights, roles, CSS variables
   - Colors: core tokens as swatches, graphics palette, theme colors
   - Layout: content width, margins, DOM hierarchy
   - Architecture: framework, build tools, hosting
3. Include font mapping table (source font → TRR equivalent)
4. Ensure all section `id` attributes match `BrandSubSection.anchor` values

### Skill 7: `generate-article-page`

**Input:** Extracted page structure, chart data, quote data, ai2html data, metadata
**Output:** Article config entry + chart data constants

**Instructions:**
1. Generate ARTICLES entry for `design-docs-config.ts`:
   ```typescript
   {
     id: slugify(title),
     title, url, authors, date, section, type, description, ogImage, tags,
     graphicsCount, figuresCount,
     tools: { topper, charts, framework, hosting },
     chartTypes: [...],
     quoteSections: [...],
     fonts: [...],
     brandFonts: { editorial: [...], graphics: [...] },
     architecture: { ... }
   }
   ```
2. Generate chart data constants for `chart-data.ts`
3. Map each quote section to its corresponding chart
4. Generate the SECTION_CHARTS mapping array
5. Include public asset URLs (artboards, social images, headshots)

### Skill 8: `wire-config-and-routing`

**Input:** Brand name, section ID, component file path
**Output:** Updated config, routing, and sidebar files

**Instructions:**
1. **design-docs-config.ts:**
   - Add new section ID to `DesignDocSectionId` union type
   - Add section entry to `DESIGN_DOC_SECTIONS` array
   - Add to `BRAND_SECTION_IDS` Set
   - Add to "Brands" group in `DESIGN_DOC_GROUPS`
   - Add brand-specific sub-sections to `getBrandSubSections()`
   - If article pages: add to `SECTION_PARENT_MAP`
   - If article: add entry to `ARTICLES` array

2. **DesignDocsPageClient.tsx:**
   - Add dynamic import: `"brand-{id}": load("Brand{Name}Section")`

3. **DesignDocsSidebar.tsx:**
   - No changes needed if using existing brand sub-section pattern
   - If article pages: ensure `getParentSection()` returns correct parent

4. **Verify:**
   - Run `npx tsc --noEmit` — zero errors
   - Navigate to `/admin/design-docs/brand-{id}` — renders correctly
   - Sidebar shows brand with sub-links expanded

---

## Workflow Sequence

```
User provides: { brandName, sourceHtml, cssUrls, datawrapperUrls, ... }
    │
    ├─► Skill 1: extract-css-tokens (parallel)
    ├─► Skill 2: extract-page-structure (parallel)
    ├─► Skill 3: extract-datawrapper-charts (parallel)
    ├─► Skill 4: extract-ai2html-artboards (parallel)
    └─► Skill 5: extract-quote-components (parallel)
         │
         ▼ (all complete)
    ├─► Skill 6: generate-brand-section
    ├─► Skill 7: generate-article-page
         │
         ▼
    └─► Skill 8: wire-config-and-routing
         │
         ▼
    Type-check → Browser verify → Done
```

---

## Implementation Tickets

### Ticket 1: Create `extract-css-tokens` skill
**Type:** Task | **Points:** 5
**Description:** Build the CSS token extraction skill that parses stylesheets and :root variables into a structured token map.
**Acceptance Criteria:**
- Extracts color tokens grouped by semantic role
- Extracts @font-face declarations with weights/sources
- Extracts spacing, radius, and layout width values
- Handles CSS-in-JS hashed class extraction
- Returns structured JSON matching the defined schema

### Ticket 2: Create `extract-page-structure` skill
**Type:** Task | **Points:** 8
**Description:** Build the HTML structure extraction skill that identifies content blocks, metadata, and public assets.
**Acceptance Criteria:**
- Identifies Birdkit blocks (.g-wrapper, .g-block, .g-media)
- Extracts article metadata (title, authors, date, tags)
- Catalogs all embedded URLs (images, iframes, artboards)
- Classifies blocks by type (header, graphic, text, subhed, quote, embed)
- Returns structured JSON matching the defined schema

### Ticket 3: Create `extract-datawrapper-charts` skill
**Type:** Task | **Points:** 8
**Description:** Build the Datawrapper chart extraction skill that converts embed URLs into TypeScript chart data constants.
**Acceptance Criteria:**
- Fetches and parses Datawrapper embed HTML
- Extracts data series, axes, colors, annotations
- Maps chart types to InteractiveBarChart/InteractiveLineChart
- Generates TypeScript constants matching BarChartData/LineChartData interfaces
- Falls back to Gemini vision API for unscrapeable charts

### Ticket 4: Create `extract-ai2html-artboards` skill
**Type:** Task | **Points:** 5
**Description:** Build the ai2html extraction skill that captures artboard dimensions, text overlay positions, and background images.
**Acceptance Criteria:**
- Extracts artboard dimensions and aspect ratios
- Captures absolute-positioned text labels with exact positions
- Identifies badge elements with colors
- Maps artboards to viewports (mobile/desktop)
- Returns structured JSON for component generation

### Ticket 5: Create `extract-quote-components` skill
**Type:** Task | **Points:** 3
**Description:** Build the quote component extraction skill that captures quote styling and maps quotes to article sections.
**Acceptance Criteria:**
- Identifies quote containers by class patterns
- Extracts citation, quote text, and badge elements
- Captures computed CSS for each element
- Maps quotes to article sections
- Returns structured JSON matching the defined schema

### Ticket 6: Create `generate-brand-section` skill
**Type:** Task | **Points:** 8
**Description:** Build the brand section generator that creates a complete Brand{Name}Section.tsx from extracted data.
**Acceptance Criteria:**
- Generates valid "use client" TSX component
- Includes Typography, Colors, Layout, Architecture, Resources sections
- Section IDs match BrandSubSection anchors
- Font mapping table included (source → TRR equivalent)
- Component follows existing brand section patterns

### Ticket 7: Create `generate-article-page` skill
**Type:** Task | **Points:** 8
**Description:** Build the article page generator that creates ARTICLES config entries and chart data constants.
**Acceptance Criteria:**
- Generates complete ARTICLES entry with all fields
- Generates chart data constants for chart-data.ts
- Maps quotes to chart sections correctly
- Includes public asset URLs
- SECTION_CHARTS mapping generated correctly

### Ticket 8: Create `wire-config-and-routing` skill
**Type:** Task | **Points:** 5
**Description:** Build the config wiring skill that registers new brands in the design docs system.
**Acceptance Criteria:**
- Updates DesignDocSectionId union type
- Adds section to DESIGN_DOC_SECTIONS and BRAND_SECTION_IDS
- Updates DESIGN_DOC_GROUPS
- Registers dynamic import in DesignDocsPageClient
- Type-checks cleanly after changes

### Ticket 9: Create orchestrator agent
**Type:** Task | **Points:** 8
**Description:** Build the top-level agent that coordinates all skills in the correct sequence with parallel execution.
**Acceptance Criteria:**
- Accepts user input (brandName, sourceHtml, cssUrls, etc.)
- Dispatches Skills 1-5 in parallel
- Waits for all extractions, then runs Skills 6-7
- Runs Skill 8 last (config wiring)
- Runs type-check and browser verification
- Reports success with navigation URL

### Ticket 10: Create integration test
**Type:** Task | **Points:** 5
**Description:** Test the full agent workflow using the existing NYT article as a reference case.
**Acceptance Criteria:**
- Provide NYT article source HTML as test input
- Agent generates matching config, components, and charts
- Output matches existing ArticleDetailPage quality
- All charts render with correct data
- Sidebar navigation works correctly

---

## Risk Assessment

| Component | Risk | Mitigation |
|-----------|------|------------|
| Datawrapper data extraction | HIGH — chart data may not be in HTML | Gemini vision fallback + manual CSV input option |
| CSS token parsing | MEDIUM — CSS-in-JS classes are opaque | Focus on :root variables + computed style extraction |
| Font mapping | LOW — finite set of TRR fonts | Maintain a lookup table of common fonts → TRR equivalents |
| ai2html positioning | MEDIUM — percentage positions need exact match | Use the production HTML positions directly |
| Config file editing | LOW — well-defined insertion points | Use AST-aware editing or regex-based insertion |

---

## Open Questions

1. **Multi-brand support:** Should the agent handle brands from different publishers (WaPo, Guardian) or only NYT sub-brands?
2. **Chart data validation:** How do we verify extracted chart data is accurate?
3. **Font licensing:** Can we reference @font-face URLs from other publishers?
4. **Image hosting:** Should extracted artboard PNGs be re-hosted on R2?
5. **Incremental updates:** How should the agent handle updating an existing brand page?

---

## Reference Implementation

The NYT article page at `/admin/design-docs/nyt-articles/trump-economy-year-1` serves as the reference implementation. All 8 skills were manually executed during this conversation:

| Skill | What We Did Manually |
|-------|---------------------|
| extract-css-tokens | Extracted :root CSS variables, @font-face declarations, layout tokens from user-provided stylesheets |
| extract-page-structure | Analyzed article HTML to identify Birdkit blocks, content types, metadata |
| extract-datawrapper-charts | Browsed Datawrapper iframes, extracted chart data, recreated as SVG |
| extract-ai2html-artboards | Identified artboard PNG URLs, extracted text overlay positions |
| extract-quote-components | Captured .quote CSS, badge colors, font specs from computed styles |
| generate-brand-section | Created BrandNYTSection.tsx with typography, colors, layout, architecture |
| generate-article-page | Rewrote ArticleDetailPage.tsx with interactive charts, quotes, ai2html |
| wire-config-and-routing | Updated config.ts, sidebar, page client, route files |

---

## File Inventory (Current System)

| Category | Count | Key Files |
|----------|-------|-----------|
| Config | 1 | `design-docs-config.ts` (580+ lines) |
| Core Components | 7 | PageClient, Sidebar, ArticleDetail, BarChart, LineChart, chart-data, AIIllustration |
| Section Components | 40 | Overview, Typography, Colors, Shapes, Charts, Cards, Forms, ... |
| Brand Sections | 9 | NYT, Games, Magazine, Wirecutter, Athletic, Opinion, Cooking, Style, Store |
| Game Components | 15 | Wordle, SpellingBee, Connections, Tiles, ... + palettes + hub |
| Routes | 3 | [section], nyt-articles/[slug], index redirect |
| API Routes | 2 | analyze-image, generate-image |
| Styles | 2 | design-docs.css, illustration-prompts.json |
| **Total** | **79** | |

---

## Next Step

```
/create-implementation-plan docs/epics/design-docs-agent-epic-plan.md
```
