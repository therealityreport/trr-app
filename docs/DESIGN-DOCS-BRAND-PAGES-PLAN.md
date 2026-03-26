# Design Docs Brand Pages — Implementation Plan

## Goal
Convert NYT and Athletic brand sections from monolithic anchor-based components into **page-based sub-routes** that dynamically aggregate data from their respective article configs. Update agent skills to always sync article data back to parent brand pages.

---

## Phase 1: Routing Architecture (new routes + sidebar updates)

### 1a. Create brand sub-page routes

**New files:**
```
apps/web/src/app/admin/design-docs/brand-nyt/[tab]/page.tsx
apps/web/src/app/admin/design-docs/brand-the-athletic/[tab]/page.tsx
```

Each `[tab]/page.tsx`:
- Validates tab param against allowed tab IDs
- Renders `DesignDocsPageClient` with `sectionId="brand-nyt"` + `tab={tab}`
- Invalid tabs redirect to first tab (typography)

**NYT tab IDs:** `typography`, `colors`, `layout`, `architecture`, `charts`, `components`, `resources`
**Athletic tab IDs:** `typography`, `colors`, `components`, `layout`, `shapes`, `resources`

"Tech Stack" and "Pages" remain as existing separate routes (`nyt-tech-stack`, `nyt-articles`, `athletic-articles`).

### 1b. Update sidebar navigation

**File:** `DesignDocsSidebar.tsx`

Change brand sub-section links from `<a href="#typography">` to `<Link href="/admin/design-docs/brand-nyt/typography">`. The `getBrandSubSections()` function already supports `href` — just need to populate it for all sub-sections.

### 1c. Update config sub-sections

**File:** `design-docs-config.ts`

Update `NYT_BRAND_SUB_SECTIONS` and `ATHLETIC_BRAND_SUB_SECTIONS` to use `href` for all entries:
```ts
{ anchor: "typography", label: "Typography", href: "/admin/design-docs/brand-nyt/typography" },
{ anchor: "colors", label: "Colors", href: "/admin/design-docs/brand-nyt/colors" },
// ... etc
```

### 1d. Update DesignDocsPageClient

**File:** `DesignDocsPageClient.tsx`

Add `tab` prop support. When `sectionId="brand-nyt"` and `tab` is set, render the specific tab component instead of the full BrandNYTSection.

### 1e. Brand landing pages

When visiting `/admin/design-docs/brand-nyt` (no tab), the existing `[section]/page.tsx` still handles it. The landing page component will show a brief overview + card grid linking to each tab.

---

## Phase 2: NYT Brand Tab Components (dynamic from 3 articles)

Split `BrandNYTSection.tsx` (975 lines) into 7 focused tab components + 1 landing page. Each dynamically aggregates from `ARTICLES.filter(a => !a.url.includes("/athletic/"))`.

### 2a. `BrandNYTLanding.tsx` — Overview card grid
- Brief brand description
- Card grid linking to each tab (Typography, Colors, Layout, etc.)
- Summary stats: X articles, Y fonts, Z chart types

### 2b. `BrandNYTTypography.tsx`
- **Dynamic aggregation**: Merge all `fonts[]` from 3 NYT articles
  - Union of all weights per font family
  - Union of all `usedIn` entries with article attribution
  - Full font stack from first occurrence
- **Live font specimens**: Render actual styled text using NYT web fonts (existing `useEffect` font loader)
- **Font mapping table**: NYT → TRR equivalents (keep existing)
- **Usage matrix**: Which fonts appear in which articles (existing `buildFontUsage()`)

### 2c. `BrandNYTColors.tsx`
- **Dynamic aggregation**: Walk `article.colors` objects from all 3 articles
  - Trump: extract from `architecture.datawrapperTheme` + `quoteSections` badge colors
  - Sweepstakes: `colors.chartPalette` (5 colors)
  - Olympics: `colors.chartPalette` (9 colors including medal gold/silver/bronze)
- **Core tokens**: Keep existing `CORE_COLORS` (editorial system colors)
- **Graphics palette**: Keep existing `GRAPHICS_COLORS` (g-* tokens)
- **Datawrapper theme**: Keep existing `DATAWRAPPER_COLORS`
- **Per-article palettes**: New section showing each article's unique colors with source attribution
- **Add missing colors**:
  - Trump status badges: `#bc261a` (red), `#c49012` (amber), `#53a451` (green)
  - Olympics medals: `#C9B037` (gold), `#A8A8A8` (silver), `#AD8A56` (bronze)
  - Sweepstakes flowchart: `#3E914D` (legal green), `#DD5041` (illegal red)

### 2d. `BrandNYTLayout.tsx`
- **Dynamic aggregation**: Merge `architecture.layoutTokens` from all articles
- Show which tokens are shared vs article-specific
- DOM hierarchy (existing `DOM_TREE` + per-article hierarchy variants)
- Content block types inventory (union of all contentBlock types across articles)

### 2e. `BrandNYTArchitecture.tsx`
- **Dynamic aggregation**: Merge `architecture` objects from all articles
- Framework inventory: Birdkit/SvelteKit (Trump, Sweepstakes, Olympics), vi platform (Sweepstakes)
- CSS file inventory from all articles
- Datawrapper theme details (NYT theme + config)
- Project IDs and hydration IDs per article
- Hosting patterns

### 2f. `BrandNYTCharts.tsx`
- Already mostly dynamic via `buildChartCatalog()`
- Add: Datawrapper embed previews (iframe or screenshot)
- Add: Chart type breakdown by tool (Datawrapper vs ai2html vs Birdkit)
- Add: Per-article chart count summary

### 2g. `BrandNYTComponents.tsx`
- Expand `buildComponentCatalog()` to detect ALL contentBlock types:
  - `birdkit-table` → Birdkit Medal Table
  - `birdkit-table-interactive` → Birdkit Interactive Table (dropdown)
  - `featured-image` → Featured Image with Caption
  - `storyline` → Storyline Navigation Bar
  - `related-link` → Related Article Card
  - `showcase-link` → Showcase Article Card (Athletic)
  - `twitter-embed` → Twitter Embed
  - `ad-container` → Ad Container
  - `puzzle-entry-point` → Puzzle Entry Point
- Show component previews where possible

### 2h. `BrandNYTResources.tsx`
- Keep existing links (Tech Stack, Pages)
- Add: Links to each article's external assets (Datawrapper URLs, ai2html artboard URLs)
- Add: CSS file inventory aggregated from all articles
- Add: Social image inventory

---

## Phase 3: Athletic Brand Tab Components (dynamic from NFL article)

Split `BrandTheAthleticSection.tsx` (~1050 lines) into tab components. Aggregate from `ARTICLES.filter(a => a.url.includes("/athletic/"))`.

### 3a. `BrandAthleticLanding.tsx` — Overview card grid

### 3b. `BrandAthleticTypography.tsx`
- **Dynamic**: Merge fonts from NFL article (nyt-cheltenham, nyt-franklin, nyt-imperial, RegularSlab)
- Show all weights and usedIn entries
- Live font specimens

### 3c. `BrandAthleticColors.tsx`
- **Dynamic**: Extract from NFL article's extensive `colors` object
  - `page` colors (primaryText through background)
  - `header` colors (dark nav)
  - `footer` colors
  - `darkMode` colors
  - `borders` colors
  - `datawrapperTheme` (heatmap gradient, exact per-row colors)
  - `chartPalette` (gold, gray, teal, etc.)
  - `cssVariables` (full 18-step gray system + semantic + brand)
- Show heatmap gradient visualization

### 3d. `BrandAthleticComponents.tsx`
- **Dynamic**: Detect from NFL article's contentBlocks + architecture
  - Storyline navigation bar
  - Featured image with credit
  - Showcase link cards (3 instances)
  - Datawrapper heatmap table
  - Twitter embed
  - Ad containers
  - Puzzle entry point
  - Author bio
- Keep existing generic specimens (LiveScoreCard, StatTable, etc.) as "Brand Patterns"

### 3e. `BrandAthleticLayout.tsx`
- **Dynamic**: From NFL article's `architecture.layoutTokens`
  - maxContentWidth, bodyFontSize, breakpoints, grid system, etc.
- DOM hierarchy from `architecture.hierarchy`

### 3f. `BrandAthleticShapes.tsx`
- Border radius scale, shadow system (keep existing)

### 3g. `BrandAthleticResources.tsx`
- Link to Athletic articles page
- CSS file inventory from NFL article
- Datawrapper theme CSS URLs
- Icon inventory summary

### 3h. Icons, SVGs, Logos — ensure completeness
- Verify ALL icons from NFL article config (`architecture.publicAssets.icons`) are rendered
- Currently 10 UI/feature icons + 14 team logos + 1 Connections logo
- Verify R2 URLs are valid and images render

---

## Phase 4: Config & Data Completeness

### 4a. Trump article gaps
- Add `colors` object at article root (extracted from datawrapperTheme + badge colors)
- Verify contentBlocks rendering (currently special-cased in section 4a)

### 4b. Sweepstakes article gaps
- Fill `architecture.hierarchy` (Birdkit DOM tree for flowchart + stacked bar)
- Fill `architecture.layoutTokens` (body width, font sizes, responsive breakpoints)

### 4c. Olympics article gaps
- Add `architecture.hydrationId` (extract from source HTML)
- Fill `architecture.layoutTokens` (body width, table sizing, medal circle dimensions)
- Expand `architecture.hierarchy` (full DOM tree for CTableDouble/CTable)

---

## Phase 5: Agent Skills Update

### 5a. Update orchestrator SKILL.md
Add **Step 8: Sync Brand Page** after wire-config-and-routing:
```
### Step 8: Sync Brand Page
After wiring the article, update the parent brand section:
1. Identify parent brand (NYT or Athletic based on article URL)
2. Verify brand tab components dynamically aggregate from ARTICLES
3. Check that new fonts/colors/components from this article appear in brand tabs
4. If brand components use hardcoded data, add dynamic aggregation
```

### 5b. Update generate-article-page/SKILL.md
Add rule: "After generating article config, verify brand page cross-population"

### 5c. Update wire-config-and-routing/SKILL.md
Add verification step: "Confirm brand landing page shows new article in Pages tab"

### 5d. Create new skill: `sync-brand-page/SKILL.md`
Purpose: Audit and sync article data to parent brand tab components
- Check fonts are aggregated
- Check colors are aggregated
- Check components are detected
- Check architecture is aggregated

---

## Phase 6: Verification

1. TypeScript type-check (`npx tsc --noEmit`)
2. Visit each brand tab page in browser
3. Verify all 3 NYT articles' data appears in NYT brand tabs
4. Verify NFL article data appears in Athletic brand tabs
5. Verify sidebar navigation works (page links, not anchors)
6. Verify article detail pages still render correctly

---

## File Impact Summary

**New files (10):**
- `apps/web/src/app/admin/design-docs/brand-nyt/[tab]/page.tsx`
- `apps/web/src/app/admin/design-docs/brand-the-athletic/[tab]/page.tsx`
- `apps/web/src/components/admin/design-docs/sections/brand-nyt/` (7 tab components)
- `.claude/skills/design-docs-agent/sync-brand-page/SKILL.md`

**Modified files (8):**
- `design-docs-config.ts` — sub-section hrefs, article gaps
- `DesignDocsSidebar.tsx` — page links instead of anchors
- `DesignDocsPageClient.tsx` — tab prop + tab component routing
- `BrandNYTSection.tsx` — becomes landing page (delegates to tabs)
- `BrandTheAthleticSection.tsx` — becomes landing page (delegates to tabs)
- `SKILL.md` (orchestrator) — add Step 8
- `generate-article-page/SKILL.md` — add brand sync rule
- `wire-config-and-routing/SKILL.md` — add verification step

**Deleted files (0):** None — existing components become landing pages
