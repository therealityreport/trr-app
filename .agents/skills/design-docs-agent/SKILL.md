---
name: design-docs-agent
description: Canonical cross-host Design Docs agent for article ingestion, extraction, generation, wiring, and brand-sync from source HTML.
---

# Design Docs Agent

Canonical cross-host orchestrator for generating or updating TRR design-docs
pages from article source HTML. This package is the single source of truth for
both Codex and Claude wrappers.

## Input Contract

The caller provides:

```text
articleUrl: string
sourceHtml: string
```

CSS URLs, Datawrapper embeds, ai2html assets, script URLs, and Birdkit tables
are auto-detected from `sourceHtml`.

## Host Compatibility

The canonical skill text uses capability names rather than raw host tool ids.
Actual tool mappings live in:

- `adapters/claude.md`
- `adapters/codex.md`

Use these capability names throughout the workflow:

- `browser.navigate`
- `browser.snapshot`
- `browser.evaluate`
- `browser.network.list`
- `browser.network.get`
- `browser.screenshot`
- `delegate.parallel`
- `fs.edit`
- `check.typecheck`

Canonical machine-readable metadata lives in `agents/openai.yaml`. Shared
pipeline contracts live in:

- `apps/web/src/lib/admin/design-docs-pipeline-types.ts`
- `apps/web/src/lib/admin/design-docs-pipeline.ts`
- `apps/web/src/lib/admin/design-docs-pipeline-validators.ts`

Executable validator entrypoints live in:

- `apps/web/scripts/design-docs/classify-publisher-patterns.mjs`
- `apps/web/scripts/design-docs/extract-navigation.mjs`
- `apps/web/scripts/design-docs/validate-config-integrity.mjs`
- `apps/web/scripts/design-docs/run-accessibility-audit.mjs`
- `apps/web/scripts/design-docs/run-integration-checks.mjs`

When the host supports delegation, run extraction and generation waves in
parallel. When it does not, run the same waves sequentially and preserve the
same output contracts.

## Workflow

### Step 0 -- Auto-detect Mode

1. Parse `articleUrl` into a brand/domain decision.
2. Read `apps/web/src/lib/admin/design-docs-config.ts` to detect whether the
   article is new, the brand already exists, or this is an update.
3. Resolve one of:
   - `add-article`
   - `add-first-article`
   - `create-brand`
   - `update-article`

### Step 1 -- Validate and Discover

1. Require both `articleUrl` and `sourceHtml`.
2. Auto-detect from HTML:
   - stylesheet URLs
   - Datawrapper embeds
   - ai2html assets
   - Birdkit containers
   - scripts and media assets

### Step 1.5 -- Classify Publisher (skill #9)

Run `classify-publisher-patterns` on the source HTML:

1. **Tech detection** — scan `<script>`, `<link>`, `__NEXT_DATA__`, `data-birdkit-hydrate`,
   CDN URLs, analytics pixels → structured technology inventory for Section 11 (Dev Stack).
2. **Layout-family classification** — determine publisher type (NYT Interactive,
   NYT Article, Athletic Article, Generic Publisher) from detected tech + DOM structure.
3. **Taxonomy routing** — auto-classify source elements into the 15-section taxonomy,
   producing a section-to-components mapping that drives which sub-pages get created.

This step emits a typed `PublisherClassification` object from
`apps/web/src/lib/admin/design-docs-pipeline-types.ts`.

This step informs which extraction skills to invoke and which classification rules to apply.

### Step 2 -- Extraction Wave

Run these sub-skills in parallel against the discovered inputs:

1. `extract-css-tokens` (#6)
2. `extract-page-structure` (#5) — includes blockCompleteness metric
3. `extract-datawrapper-charts` (#11) when Datawrapper embeds exist
4. `extract-ai2html-artboards` (#15) when ai2html assets exist
5. `extract-quote-components` (#16) when quote/status sections exist
6. `extract-birdkit-tables` (#12) when Birdkit markup exists
7. `extract-icons-and-media` (#7)
8. `extract-navigation` (#8) — header/footer/sidebar/breadcrumb/tab patterns

Every interactive artifact must produce both:

- metadata for `chartTypes`
- concrete data/constants that can power a working React renderer

### Step 3 -- Merge Extraction Outputs

Merge all extraction outputs into one normalized blob. This merged blob is the
only input to generation and wiring. Use the typed merged contract from
`apps/web/src/lib/admin/design-docs-pipeline-types.ts`. Include:
- `blockCompleteness` metric from extract-page-structure
- `NavigationData` from extract-navigation
- `PublisherClassification` from classify-publisher-patterns
- `TechInventory` from classify-publisher-patterns

### Step 4 -- Generation Wave

- Always run `generate-article-page` (#13).
- In `create-brand` mode, also run `generate-brand-section` (#18).

### Step 5 -- Wiring

Run `wire-config-and-routing` (#17) to register the new brand/article in config,
imports, and sidebar/routing surfaces.

### Step 5.5 -- Config Integrity Audit (skill #10)

Run `audit-generated-config-integrity` before syncing brand pages:

1. `check.typecheck` via the repo validation command
2. contentBlocks document-order validation
3. Font/color per-article uniqueness check
4. ContentBlock union coverage (every block type has a renderer)
5. brand-aware page background contract, View Page button URL check

Default executable entrypoint:

- `node apps/web/scripts/design-docs/validate-config-integrity.mjs --article-id <articleId>`

If the audit fails, fix issues before proceeding to Step 6.

### Step 6 -- Sync All 15 Brand Tabs

Run `sync-brand-page` (#14) in every mode. The agent must:

1. Check which of the 15 sections have new data from this article's extraction.
2. For sections that already have tab page files: verify data aggregates correctly.
3. For sections that NOW qualify for sub-pages (lazy creation): create the sub-page.
4. In `create-brand` mode: scaffold all 15 tab page files (most will be empty placeholders).
5. Report delta: what changed vs pre-sync state.

New article data must be visible in the parent brand tabs through dynamic
aggregation from the `ARTICLES` array, not hardcoded per-article edits.

### Step 7 -- Verify

1. Run `audit-responsive-accessibility` (#19):
   - Heading hierarchy (h1→h2→h3, no skipped levels)
   - WCAG 2.1 AA color contrast ratios
   - Responsive overflow at mobile breakpoints
   - Missing alt text and aria-labels

   Default executable entrypoint:
   `node apps/web/scripts/design-docs/run-accessibility-audit.mjs --article-id <articleId> --brand-slug <brandSlug> --files <comma-separated-file-paths>`

2. Run `integration-test-runner` (#20):
   - Validate all articles in ARTICLES array
   - Cross-article uniqueness checks
   - ContentBlock completeness assertions

   Default executable entrypoint:
   `node apps/web/scripts/design-docs/run-integration-checks.mjs`

3. Run `check.typecheck` and fix issues caused by this workflow.

4. Verify:
   - `contentBlocks` preserves document order
   - h2 and h3 styles are extracted independently
   - every chart/table has both metadata and a renderer/data source
   - brand tabs reflect the new article data
4. Report:
   - article URL
   - brand URL
   - files changed
   - warnings or partial-extraction gaps

## Source HTML Requirement

The workflow is intentionally source-HTML first. Many publisher sites block
automated browsing. The user must provide `view-source:` HTML manually. Live
browser access is optional and should be used only for:

- Datawrapper embeds
- CSS/network discovery from non-gated assets
- computed-style verification when the page is already open in a trusted host

Do not rely on live browsing for gated publication pages.

## Brand Page Taxonomy -- 15 Standard Sections

Every brand gets 15 top-level tab pages. Sub-pages within each tab are created
**only when** the agent encounters that component type in source HTML. Empty tabs
display a "No components discovered yet" placeholder. When a new article is added,
the agent re-scans and populates any newly discovered sub-pages.

### 1. Design Tokens (Foundations)
Atomic values everything else is built from.
Sub-pages (create on discovery):
- **Color** — palette, semantic aliases, light/dark mode tokens
- **Typography** — font families, size scale, weight scale, line heights, letter spacing
- **Spacing** — consistent scale (4px, 8px, 12px, 16px, 24px, 32px…)
- **Border Radius** — small, medium, large, pill, circle
- **Shadows / Elevation** — layered depth levels
- **Motion / Animation** — easing curves, duration scale, transition defaults
- **Breakpoints** — responsive thresholds (sm, md, lg, xl)
- **Z-index** — layering scale for overlays, modals, tooltips

### 2. Primitives (Atoms)
Smallest reusable building blocks.
Sub-pages (create on discovery):
- **Buttons** — primary, secondary, ghost, destructive, icon-only, loading, hover
- **Inputs** — text, textarea, select, checkbox, radio, switch, slider, date picker
- **Labels & Text** — headings h1–h6, body, caption, code, badge, tag, quotes
- **Icons** — icon set, sizing conventions, color inheritance
- **Brand Logos** — wordmarks, lettermarks, brandmarks, combination marks, emblems, favicon
- **Avatar** — image, initials fallback, status indicator
- **Separator / Divider** — horizontal, vertical

### 3. Feedback & Overlays
Components that communicate state to the user.
Sub-pages (create on discovery):
- **Toast / Notification** — ephemeral success/error/info messages
- **Alert / Banner** — persistent in-page notices
- **Dialog / Modal** — blocking overlays for confirmation or forms
- **Sheet / Drawer** — slide-in panels (mobile nav, detail views)
- **Tooltip / Popover** — contextual info on hover or click
- **Skeleton / Loader** — loading placeholders
- **Progress** — bars, spinners, step indicators

### 4. Navigation
How users move through the product.
Sub-pages (create on discovery):
- **Navbar / Header** — top-level navigation chrome
- **Footer** — site footer with link columns, social, legal
- **Sidebar** — collapsible, nested menu trees
- **Tabs** — content switching within a view
- **Breadcrumbs** — hierarchical position indicator
- **Pagination** — page-based navigation
- **Search Bars, Filters, Sorting** — discovery/filtering patterns
- **Dropdown Menu / Context Menu** — action menus

### 5. Data Display
Presenting structured information.
Sub-pages (create on discovery):
- **Table** — sortable, filterable, selectable rows
- **Card** — container for grouped content (article cards, showcase links, etc.)
- **List** — simple or interactive item lists
- **Accordion / Collapsible** — expandable sections
- **Calendar** — date display / selection grid
- **Stat / KPI** — single-value highlights with labels

### 6. Chart Types
Data visualization components. Sub-pages (create on discovery):
- **Line Chart** — trends, multi-series, area fill
- **Bar Chart** — categorical comparison, horizontal/vertical, stacked, grouped
- **Area Chart** — volume over time, stacked area
- **Pie / Donut** — proportion of whole, ≤6 segments
- **Scatter Plot** — correlation, bubble variant
- **Histogram** — frequency distribution
- **Heatmap** — density/intensity across two axes
- **Radar / Spider** — multi-axis comparison
- **Candlestick / OHLC** — financial data
- **Treemap** — hierarchical part-to-whole
- **Sankey / Alluvial** — flow volume between categories
- **Waterfall** — cumulative sequential values
- **Funnel** — stage-by-stage dropoff
- **Gauge / Radial** — single KPI against range
- **Sparkline** — inline micro-chart
- **Chart Anatomy** — axes, grid, legend, title, annotations, data labels, animations, fonts
- **Dashboard Patterns** — KPI + sparkline, comparison layout, drill-down, filter integration

### 7. Layout
Structural containers and composition tools.
Sub-pages (create on discovery):
- **Grid / Flex** — responsive column systems
- **Container** — max-width wrapper
- **Stack** — vertical/horizontal spacing primitives
- **Aspect Ratio** — constrained media containers
- **Scroll Area** — custom scrollbars
- **Resizable Panels** — split-view layouts
- **Galleries / Masonry** — image grids, masonry layouts
- **Carousels** — horizontal scroll, sliders
- **Image Viewers / Lightbox** — zoom, pan, slideshow
- **Media Players** — video, audio embedded players

### 8. Forms & Composition
Patterns for collecting user input.
Sub-pages (create on discovery):
- **Form** — validation, error states, field grouping
- **Form Field** — label + input + helper text + error message
- **Combobox / Autocomplete** — search + select
- **Multi-step / Wizard** — sequential form flows, game flows

### 9. Other Components
Miscellaneous patterns that don't fit other categories.
Sub-pages (create on discovery):
- **Link / Text Link** — inline navigation
- **Chip / Filter Chip** — togglable filter tokens
- **Pills / Category Tabs / Tags** — content categorization
- **Inline Editable Text** — click-to-edit
- **Stepper** — numbered step indicators
- **Timeline / Activity Feed** — chronological event display
- **Empty State** — zero-data placeholders
- **Error State** — error recovery UI
- **Result State** — search/action results
- **Tree View** — nested hierarchical display
- **Virtualized List / Table** — large dataset rendering
- **Rating** — star/score systems
- **Mention / People Picker** — user tagging
- **Social Media Posts** — embedded post cards (tweets, etc.)

### 10. A/B Testing
Experimentation patterns (e.g., NYT Games variant testing).
Populate when testing infrastructure is discovered in source.

### 11. Dev Stack
Technology inventory from source HTML, Wappalyzer-style detection.
Auto-populated from: `<script>` tags, `<link>` stylesheets, framework markers,
CDN URLs, `__NEXT_DATA__`, `data-birdkit-hydrate`, analytics tags, etc.

### 12. Social Media
Leave blank initially. Populate when social integrations are discovered.

### 13. Emails
Leave blank initially. Populate when email templates are discovered.

### 14. Pages
Article-level design breakdowns. Auto-populated from `ARTICLES` array.

### 15. Other Resources
Leave blank initially. External documentation, CDN assets, API references.

---

## 20-Skill Structured Skillset

All 20 skills are listed in `agents/openai.yaml` (machine-readable) and below
(behavioral). Both sources must stay in sync, and required pipeline steps must
remain `active` in YAML.

### Supporting Skills (referenced, not duplicated)

| # | Skill | Source | Role | Wave |
|---|-------|--------|------|------|
| 1 | `senior-frontend` | `TRR-APP/.agents/skills/senior-frontend` | App Router, server/client boundaries, rendering | 1 |
| 2 | `senior-qa` | `TRR/.agents/skills/senior-qa` | Risk-ranked validation, verification reports | 1 |
| 3 | `code-reviewer` | `TRR/.agents/skills/code-reviewer` | Pre-closeout correctness gate | 1 |
| 4 | `font-sync` | `TRR/.agents/skills/font-sync` | Font specimen generation, R2 upload | 1 |

### Owned Skills — Wave 1 (Foundation + Extraction)

| # | Skill | Action | Phase |
|---|-------|--------|-------|
| 5 | `extract-page-structure` | upgrade | extraction — add blockCompleteness metric, structured bylines, breadcrumbs, storyline |
| 6 | `extract-css-tokens` | upgrade | extraction — stricter typography, computed-style validation, dark mode colors |
| 7 | `extract-icons-and-media` | upgrade | extraction — asset classification, brand/logo normalization, favicon, SVG dedup |
| 8 | `extract-navigation` | **create** | extraction — header/footer/sidebar/breadcrumb/tab patterns → Section 4 |
| 9 | `classify-publisher-patterns` | **create** | pre-extraction — Wappalyzer-style tech detection + layout-family classification + 15-section taxonomy routing → Section 11 |
| 10 | `audit-generated-config-integrity` | **create** | verification — post-generation gate: tsc, block order, uniqueness, union coverage |

### Owned Skills — Wave 2 (Generation + Quality Gates)

| # | Skill | Action | Phase |
|---|-------|--------|-------|
| 11 | `extract-datawrapper-charts` | upgrade | extraction — chart/table reconciliation, dataset verification, theme fonts |
| 12 | `extract-birdkit-tables` | upgrade | extraction — column semantics, a11y metadata, renderer parity |
| 13 | `generate-article-page` | upgrade | generation — typed renderer mapping, block type validation, cross-population candidates |
| 14 | `sync-brand-page` | upgrade | post-generation — brand aggregation delta, safe merge, lazy sub-page tracking |
| 15 | `extract-ai2html-artboards` | retain | extraction — already mature |
| 16 | `extract-quote-components` | retain | extraction — already mature |
| 17 | `wire-config-and-routing` | retain | wiring — incidental edits only |
| 18 | `generate-brand-section` | retain | generation — incidental edits only |
| 19 | `audit-responsive-accessibility` | **create** | verification — heading hierarchy, WCAG contrast, keyboard a11y, responsive overflow |
| 20 | `integration-test-runner` | **create** | verification — converts test/integration-test.md into executable assertions |

## Completion Contract

Return:

1. resolved mode
2. extracted asset summary
3. generated or updated file list
4. verification results
5. warnings or follow-up fixes needed

## Data-Driven Rendering -- ArticleDetailPage

`ArticleDetailPage` is fully data-driven. It renders all sections automatically
based on the ARTICLES config entry -- there is no per-article hardcoding. This
means the config the agent generates is the single source of truth for what
renders on the page.

### Not All Articles Have the Same Content

Different articles will have different combinations of content. The agent must
handle all of these variations:

- **No Datawrapper charts**: Some articles use only static images, ai2html
  artboards, or no charts at all. The `chartTypes` array should still be
  populated for metadata display (describing what visualization types the
  article uses), but no chart data constants are needed in `chart-data.ts`
  when there are no live Datawrapper embeds. Set
  `architecture.publicAssets.datawrapperCharts: []` in this case.

- **No quote sections**: Articles that do not follow a campaign-promise or
  policy-tracking pattern should have `quoteSections: []`. The agent must
  set this to an empty array -- do NOT omit the field, and do NOT fabricate
  quote sections for articles that do not have them. Only populate
  `quoteSections` when the source article contains clearly labeled
  promise/commitment sections with colored status badges.

- **No report card**: If the article does not have ai2html artboards that
  function as a report card / scorecard, omit `reportCard` from
  `publicAssets`. ArticleDetailPage will skip the report card section.

- **ai2html artboards as flowcharts**: When ai2html artboards represent a
  flowchart or process diagram (not a report card), they are stored in
  `publicAssets.ai2htmlArtboards` and ArticleDetailPage renders them as
  responsive graphics that swap between mobile and desktop variants.

## contentBlocks -- Ordered Content Block System

`ArticleDetailPage` uses a `contentBlocks` array to define what renders and in
what order. Each entry is an object with a `type` field. The full list of
supported types (matching the `ContentBlock` union in `design-docs-config.ts`):

| Type | Renders | Notes |
|------|---------|-------|
| `header` | Article headline + description | Styled by extracted h1 computed styles (always extract, never assume) |
| `byline` | Author names + date | Below headline |
| `ai2html` | Report card or flowchart image | Uses `<img>` only -- see ai2html baked-text warning |
| `subhed` | Section subheading | h2 and h3 MUST have different extracted styles — always verify they differ |
| `birdkit-chart` | Interactive chart component | References chart data constant by topic |
| `birdkit-table` | Static medal/data table | Birdkit CTableDouble — uses MedalTable |
| `birdkit-table-interactive` | Dropdown-filterable table | Birdkit CTable — uses MedalTableInteractive |
| `datawrapper-table` | Sortable heatmap table | DatawrapperTableData — click-to-sort columns |
| `showcase-link` | Inline recommendation card | Title, excerpt, image, href |
| `twitter-embed` | Embedded tweet | Author, handle, text, date, URL |
| `ad-container` | Mid-article ad slot | Position: mid1, mid2, mid3 |
| `puzzle-entry-point` | Puzzle promo card | Game, title, subtitle |
| `featured-image` | Hero image with credit | Credit text from ImageCredit span |
| `storyline` | Horizontal nav bar | Title + item links array |
| `author-bio` | Author headshot + bio text | At article bottom |
| `related-link` | Related article cards | Title, url, imageUrl, summary |

The `contentBlocks` array in the ARTICLES config is the single source of truth
for what renders. If a block type is not in the array, that section does not
appear. The generate-article-page skill must build this array from the
extraction data, preserving exact document order.

---

## Cross-Population -- Article Data Flows to All 15 Brand Tabs

When a new article is added, the agent must scan the extraction results and
update the appropriate brand tab pages. The 15-section taxonomy determines
where each piece of data goes:

1. **Section 1 (Design Tokens)**: New fonts → Typography sub-page. New colors →
   Color sub-page. New spacing/radius values → respective sub-pages.
2. **Section 2 (Primitives)**: New button styles, input patterns, heading
   hierarchies, icons, logos → create or update matching sub-pages.
3. **Section 3 (Feedback)**: Toast/alert/modal/tooltip patterns → sub-pages.
4. **Section 4 (Navigation)**: Header/footer specimens, sidebar, tabs,
   breadcrumbs, pagination, search/filter patterns → sub-pages.
5. **Section 5 (Data Display)**: Tables, cards, lists, accordions → sub-pages.
6. **Section 6 (Charts)**: New chart types → create sub-pages for each type.
   Update Chart Anatomy with new annotation/interactivity patterns.
7. **Section 7 (Layout)**: Grid systems, containers, galleries, carousels →
   sub-pages.
8. **Section 8 (Forms)**: Form fields, comboboxes, multi-step flows → sub-pages.
9. **Section 9 (Other)**: Links, chips, pills, timeline, social posts → sub-pages.
10. **Section 11 (Dev Stack)**: Framework detection, CDN URLs, analytics.
14. **Section 14 (Pages)**: Auto-populated from `ARTICLES` array.

**Lazy creation rule**: Only create a sub-page when the agent discovers at least
one instance of that component type. Empty sections show a "No components
discovered yet" placeholder. On each new article addition, re-scan and create
any newly qualifying sub-pages.

The generate-brand-section skill should check for existing brand section files
and merge new data rather than overwriting. The generate-article-page skill
should emit a list of "cross-population candidates" -- data that the caller
should propagate to the brand section.

## Reference Implementations

- **NYT Interactive**: `/admin/design-docs/nyt-articles/trump-economy-year-1`
- **NYT Article**: `/admin/design-docs/nyt-articles/online-casinos-sweepstakes-gambling`
- **NYT Upshot**: `/admin/design-docs/nyt-articles/winter-olympics-leaders-nations`
- **Athletic Article**: `/admin/design-docs/athletic-articles/nfl-playoff-coaches-fourth-down`

---

## Lessons Learned

Accumulated from building article pages across different article types.

### Table Components Need Full Data Extraction

Birdkit tables (`CTableDouble`, `CTable`) render ALL data server-side in the
SSR HTML. The hydration script only wires up interactivity (dropdowns, sorting)
-- it does not fetch data from an API. This means:

1. ALL table data visible in the SSR HTML must be extracted during the
   `extract-page-structure` phase.
2. The `generate-article-page` skill must recreate these tables as interactive
   React components with the full dataset embedded as constants (similar to
   chart data constants).
3. Do NOT assume table data will be loaded client-side. If it is in the HTML,
   extract it. If it is not in the HTML, it will not appear.

### Per-Article Colors

Each article's color palette must be extracted independently. Do NOT carry
forward colors from other articles, even within the same brand. Examples of
article-specific palettes:

- **Winter Olympics**: Gold `#C9B037`, Silver `#A8A8A8`, Bronze `#AD8A56`
- **Economy tracker**: Red line `#bf1d02`, blue reference `#326891`
- **Election results**: Party colors specific to the election context

The `extract-css-tokens` skill must extract colors from the actual CSS rules
and inline styles of the article being processed. The `generate-article-page`
skill should add a `colors.chartPalette` to the `architecture` config when the
article uses non-default colors.

### Consistent Interactive UI

Dropdown/filter components (e.g., interactive medal tables with sport category
selectors) must maintain a consistent layout regardless of the selected option.
Specifically:

- The table must always show the **same number of rows** no matter which
  dropdown option is selected.
- When a selected category has fewer data entries than the maximum, pad with
  **placeholder rows** displaying em-dashes (`---`) in every cell.
- This prevents layout shift (content jumping) when the user changes the
  dropdown selection, which is jarring and makes the UI feel broken.

### ai2html Overlay Accuracy

- Badge/status text overlays are **plain white text** on top of colored bars baked into the background PNG — NEVER use the `badge` rendering component (colored background div). The colors are in the image.
- Convert all pixel widths from source HTML to **percentage widths** for responsive scaling (`px / artboard_width * 100`).
- Mobile artboards need **scaled-down font sizes** (typically 70% of desktop sizes) — source CSS may show 14px but fallback fonts are wider than nyt-franklin, causing overflow.
- Always extract **`marginTop`** (negative) from source HTML's `g-aiPointText` elements for baseline alignment.
- Both **mobile AND desktop** artboard overlays are required — they have different positions.
- Include `whiteSpace: "nowrap"` on all point text overlays.
- The `Ai2htmlArtboard` component supports `marginTop` on overlays and renders text via `dangerouslySetInnerHTML` for HTML spans (colored text like "legal"/"illegal").

### Athletic Article Lessons (Non-NYT Brand)

The Athletic article (`nfl-playoff-coaches-fourth-down`) was the first non-NYT
brand processed. Key lessons:

1. **7 new block types** were needed beyond the original 6: `showcase-link`,
   `twitter-embed`, `ad-container`, `puzzle-entry-point`, `featured-image`,
   `storyline`, `datawrapper-table`.

2. **Datawrapper `tables` type** renders as a sortable heatmap table, NOT a
   chart. Requires `DatawrapperTableData` interface, `dataset.csv` fetch for
   real data, per-row heatmap color extraction.

3. **Typography precision** is critical: h1 (40px/400), h2 (30px/700), and h3
   (24px/500) all use different sizes and weights in nyt-cheltenham. The
   `usedIn` format must be `"className: size/weight/lineHeight color"`.

4. **Icon/media extraction** (team logos, SVG icons, base64 images) was
   entirely missing and required a new `extract-icons-and-media` skill.

5. **Athletic featured headlines** are centered (`textAlign: center`), unlike
   standard NYT articles (left-aligned).

---

## Step 7: Pre-flight Checklist

Before reporting success, validate the generated output against these checks.
If any check fails, fix the issue before proceeding.

### 7a. Data-Driven Rendering Check

- [ ] ArticleDetailPage renders from `contentBlocks` array, not hardcoded logic
- [ ] Every interactive element (chart, table, dropdown) has BOTH a metadata
      entry in `chartTypes` AND a working React component with data constant
- [ ] Every Birdkit/Datawrapper/ai2html block in the HTML has BOTH a
      `chartTypes` metadata entry AND a working React component or
      `contentBlocks` entry
- [ ] `contentBlocks` array contains ALL content-bearing blocks from source HTML
      in correct document order

### 7b. Block Count Comparison

Count content-bearing elements in source HTML (excluding `<nav>`, `<footer>`,
`<script>`, `<style>`). Compare to `contentBlocks.length`. If source has >20%
more matchable elements than the generated `contentBlocks`, warn the user that
blocks may be missing.

### 7c. Typography Spot-Check

If Chrome DevTools or WebFetch is available, verify 3-5 key elements:
- h1 headline: extract actual fontSize, fontWeight, fontStyle, textAlign, lineHeight
  from the rendered page — do NOT assume values from a lookup table
- h2 vs h3: MUST have different values (common failure: both rendered identically
  because styles were assumed rather than extracted)
- Chart/table title: extract actual font family and weight
- Body text: extract actual font family, size, line-height
Compare ALL extracted values against the `fonts` array in the generated config.
Report any mismatches. If h2 === h3, STOP and re-extract.

### 7d. Color Completeness

Count unique color values in the generated `colors` config. Compare against
unique colors found in source CSS variables, inline styles, and Datawrapper
theme. If source has >30% more colors, warn about potential missing colors.

Verify that `colors.chartPalette` was extracted from THIS article's CSS --
not copied from another article or brand. Each article has its own palette
(e.g., medal colors for Olympics, party colors for elections).

### 7d-bis. Mandatory Sections Populated

Verify these three sections will render with real data:

- [ ] **Typography section**: `fonts` array has >= 1 entry with extracted
      computed styles (fontSize, fontWeight, lineHeight)
- [ ] **Colors section**: `colors.chartPalette` or extractable chart colors
      are present
- [ ] **Chart Types section**: `chartTypes` array is non-empty if the article
      has any embeds, charts, tables, or interactive elements

If any section is empty, STOP and extract the missing data before proceeding.

### 7e. Per-Article Uniqueness

Compare the generated `fonts` and `colors` arrays against ALL existing ARTICLES
entries. If byte-identical to another article, STOP — the data was copied, not
extracted. Each article MUST have independently extracted font/color data.

### 7f. View Page Button

Verify `url` field is set in the ARTICLES entry. This populates the "View Page"
button in ArticleDetailPage. If empty, the user cannot navigate to the source.

### 7g. Background Color

Verify the article page uses `bg-white`, NOT `bg-zinc-50` or other gray
backgrounds. `DesignDocsPageClient.tsx` must use `bg-white`. The design docs
article pages should have white backgrounds.

---

## Common Issues

### Background color

ArticleDetailPage and `DesignDocsPageClient.tsx` must use `bg-white`. If you
see `bg-zinc-50` or similar gray backgrounds, the CSS class was incorrectly
applied. Always verify `DesignDocsPageClient.tsx` uses `bg-white` not
`bg-zinc-50`.

### Data-driven rendering

`ArticleDetailPage` is fully data-driven — rendering is driven by the
`contentBlocks` array, NOT hardcoded per-article logic. It reads the ARTICLES
config and renders dynamically. Do NOT add per-article conditional logic to the
component. If a new block type is needed, add it to the `ContentBlock` union
type and add a generic renderer, not an article-specific hack.
