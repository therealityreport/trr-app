---
name: generate-article-page
description: Generate ARTICLES config entry and chart data constants from extraction data.
---

# Generate Article Page Config and Chart Data

You are a code-generation agent. Given merged extraction JSON (the combined
output of `extract-page-structure`, `extract-datawrapper-charts`,
`extract-quote-components`, `extract-css-tokens`, and `extract-ai2html-artboards`),
you produce two TypeScript code blocks that are inserted into the TRR codebase.

## Files Modified

1. **`apps/web/src/lib/admin/design-docs-config.ts`** -- append a new entry to
   the `ARTICLES` array.
2. **`apps/web/src/components/admin/design-docs/chart-data.ts`** -- append new
   chart data constants.

Do NOT create new files. You are editing existing files only.

---

## Inputs

The caller provides a single JSON object (or multiple JSON fragments) containing
the merged extraction results. The shape roughly corresponds to:

```typescript
interface MergedExtraction {
  metadata: {
    title: string;
    description: string | null;
    authors: string[];
    date: string | null;
    section: string | null;
    type: string;
    tags: string[];
    ogImage: string | null;
    url: string;
  };
  blocks: Array<{ type: string; index: number; content?: string }>;
  assets: {
    stylesheets: string[];
    scripts: string[];
    images: string[];
    socialImages: string[];
    artboards: string[];
    headshots: string[];
  };
  embeds: Array<{ type: string; url: string; id?: string; topic?: string }>;
  charts: Array<{
    chartId: string;
    version: number;
    type: string;          // "d3-lines", "d3-bars", etc.
    topic: string;
    url: string;
    data: any;             // extracted values
    metadata: any;         // Datawrapper metadata
  }>;
  quotes: Array<{
    section: string;
    badge: string;
    badgeColor: string;
  }>;
  fonts: Array<{
    name: string;
    cssVar: string | null;
    fullStack: string;
    weights: number[];
    role: string;
    usedIn: string[];
  }>;
  architecture?: {
    framework: string;
    projectId?: string;
    hydrationId?: string;
    hosting: string;
    hierarchy: string[];
    layoutTokens: Record<string, string>;
    cssFiles: string[];
    datawrapperTheme?: Record<string, string>;
    contentBlocks: string[];
    publicAssets?: any;
  };
}
```

Fields may be missing or `null`. Apply the defaults and fallbacks described in
each section below.

---

## Step 1 -- Generate the article slug

Create a URL-safe, kebab-case `id` from the article title:

1. Lowercase the title.
2. Remove all characters except alphanumeric, spaces, and hyphens.
3. Replace one or more spaces with a single hyphen.
4. Trim leading and trailing hyphens.
5. Truncate to 60 characters maximum (break at a word boundary).

Examples:
- `"Trump Said He'd Unleash the Economy in Year 1. Here's How He Did."` -->
  `"trump-economy-year-1"` (editorially shortened for readability)
- `"The Hidden Cost of Fast Fashion"` --> `"hidden-cost-of-fast-fashion"`

If the resulting slug would collide with an existing ARTICLES entry `id`, append
a numeric suffix (e.g. `-2`).

---

## Step 2 -- Detect tools from scripts and markup

Scan `assets.scripts` and `assets.stylesheets` to identify the page's tech
stack. Use this mapping:

| Pattern in script/stylesheet URL or content | Tool detected               |
|---------------------------------------------|-----------------------------|
| `svelte`, `sveltekit`, `_app/immutable`     | `"Svelte (SvelteKit)"`      |
| `react`, `next`, `_next/`                   | `"React (Next.js)"`         |
| `vue`, `nuxt`                               | `"Vue (Nuxt)"`              |
| `angular`                                   | `"Angular"`                 |
| `birdkit`, `bk-`, `newsgraphics`            | `"Birdkit (Svelte/SvelteKit)"` |
| `gatsby`                                    | `"Gatsby"`                  |
| `astro`                                     | `"Astro"`                   |

For `tools.topper`:
- If `blocks` contains a block with `type === "ai2html-artboard"`, set topper
  to `"ai2html"`. Append the version if found in script comments
  (e.g. `"ai2html v0.121.1"`).
- Otherwise set to `"none"`.

For `tools.charts`:
- Count Datawrapper embeds from `embeds` where `type === "datawrapper"`.
- Format as `"Datawrapper (N embeds)"` where N is the count.
- If no Datawrapper embeds, check for other chart libraries (D3, Highcharts,
  Chart.js) and name them instead.
- If no charts at all, set to `"none"`.

For `tools.hosting`:
- Extract the hostname from `metadata.url` or the first script URL that
  contains `static01`, `newsgraphics`, `nyt.com`, or the publication domain.
- Format as the path prefix, e.g. `"static01.nytimes.com/newsgraphics/"`.

---

## Step 3 -- Build the ARTICLES entry

Construct the full object literal. Every field must be present. Use extraction
data as the primary source and apply these rules for fields that need special
handling:

### Top-level fields

| Field            | Source                                               | Fallback                          |
|------------------|------------------------------------------------------|-----------------------------------|
| `id`             | Step 1 slug                                          | --                                |
| `title`          | `metadata.title`                                     | first `<h1>` block content        |
| `url`            | `metadata.url`                                       | ask the user                      |
| `authors`        | `metadata.authors`                                   | `["Unknown"]`                     |
| `date`           | `metadata.date` formatted as `"YYYY-MM-DD"`          | today's date                      |
| `section`        | `metadata.section`                                   | `"Unknown"`                       |
| `type`           | `"interactive"` if page has embeds or ai2html; `"standard"` otherwise | `"standard"`   |
| `description`    | `metadata.description`                               | first 200 chars of first text block |
| `ogImage`        | `metadata.ogImage`                                   | first `socialImages` entry        |
| `tags`           | `metadata.tags`                                      | `[]`                              |
| `graphicsCount`  | count of blocks with type `birdkit-graphic`, `ai2html-artboard`, or `chart-embed` | `0` |
| `figuresCount`   | count of blocks with type `figure`                   | `0`                               |

### `tools` object

See Step 2 for detection logic. Structure:

```typescript
tools: {
  topper: string,
  charts: string,
  framework: string,
  hosting: string,
}
```

### `chartTypes` array

For each chart embed, create an entry:

```typescript
{ type: string, tool: string, topic: string, url?: string }
```

- `type`: map Datawrapper type string to a display name:
  - `d3-lines` --> `"line-chart"`
  - `d3-bars` / `d3-bars-split` --> `"bar-chart"`
  - `d3-stacked-area` --> `"stacked-area"`
  - `tables` --> `"table"`
  - Unknown --> use the raw Datawrapper type string
- `tool`: `"datawrapper"` for Datawrapper embeds, `"ai2html"` for ai2html
  artboards, `"d3"` for raw D3, etc.
- `topic`: from the chart's `topic` field or the nearest preceding `subhed`
  block content.
- `url`: the full embed URL if available.

Include ai2html artboards in this list as well with `tool: "ai2html"`.

### `quoteSections` array

Map directly from the `quotes` array in the extraction:

```typescript
{ section: string, badge: string, badgeColor: string }
```

Ensure `badgeColor` is a valid hex string. If the extraction provides a named
color, map it:
- red / negative --> `"#bc261a"`
- yellow / mixed / some progress --> `"#c49012"`
- green / positive / good --> `"#53a451"`
- gray / neutral --> `"#888888"`

### `fonts` array

Map directly from the `fonts` extraction. Each entry:

```typescript
{
  name: string,
  cssVar: string | null,
  fullStack: string,
  weights: number[],
  role: string,
  usedIn: string[],
}
```

Sort `weights` ascending. Ensure `usedIn` entries are descriptive strings
(e.g. `"Article headline"`, `"Chart axis labels"`).

### `brandFonts` object

Group fonts by role:

```typescript
{
  editorial: string[],   // serif display and body fonts
  graphics: string[],    // sans-serif fonts used in charts/labels
  games?: string[],      // only include if game fonts are present
}
```

Classification rules:
- Fonts with `role` containing "display", "headline", "body", "serif" -->
  `editorial`
- Fonts with `role` containing "sans", "label", "UI", "chart", "caption" -->
  `graphics`
- Fonts with `role` containing "game" --> `games`

### `architecture` object

Build from the `architecture` extraction data if present. Structure:

```typescript
architecture: {
  framework: string,
  projectId?: string,
  hydrationId?: string,
  hosting: string,
  hierarchy: string[],
  layoutTokens: Record<string, string>,
  cssFiles: string[],
  datawrapperTheme?: Record<string, string>,
  contentBlocks: string[],
  publicAssets: {
    reportCard?: {
      mobile: { url: string, width: number, desc: string },
      desktop: { url: string, width: number, desc: string },
    },
    socialImages: Array<{
      name: string, url: string, ratio: string, width?: number, desc: string,
    }>,
    authorHeadshot?: { url: string, desc: string },
    datawrapperCharts: Array<{
      id: string, version: number, topic: string, url: string, height: number,
    }>,
    datawrapperCss?: Record<string, string>,
  },
}
```

#### `publicAssets.socialImages`

Build from `assets.socialImages`. For each URL, derive:
- `name`: from the filename pattern (e.g. `facebookJumbo`, `videoSixteenByNine3000`)
- `ratio`: infer from the name (`facebookJumbo` --> `"1.91:1"`,
  `SixteenByNine` --> `"16:9"`, `FourByThree` --> `"4:3"`,
  `Square` / `mediumSquare` --> `"1:1"`)
- `width`: extract from the name if it contains a number after the ratio
  indicator (e.g. `3000` from `videoSixteenByNine3000`)
- `desc`: human-readable description derived from the name

#### `publicAssets.datawrapperCharts`

Build from the `embeds` array where `type === "datawrapper"`. For each:
- `id`: the chart id from the URL path
- `version`: extract from URL (the number after the id, e.g. `/6/` --> `6`)
- `topic`: from the embed's `topic` field
- `url`: the full URL with `?plain=1` appended if not present
- `height`: default to `400` unless extracted from the iframe `height` attribute

#### `publicAssets.authorHeadshot`

Use the first entry from `assets.headshots` if available.

#### `publicAssets.reportCard`

If the extraction includes ai2html artboard images, identify the mobile and
desktop variants:
- Mobile: artboard URL containing `mobile`, `small`, `onecolumn` with width
  hint, or the narrower artboard (width <= 400)
- Desktop: artboard URL containing `desktop`, `large`, or the wider artboard
  (width > 400)

#### `publicAssets.datawrapperCss`

Collect any Datawrapper CSS URLs from `assets.stylesheets` that contain
`datawrapper.dwcdn.net`. Also look for global Datawrapper scripts. Map to
descriptive keys (e.g. `linesTheme`, `linesDark`, `globalScript`).

### `contentBlocks` array -- Ordered Rendering Sequence

The `contentBlocks` array defines what renders on `ArticleDetailPage` and in
what order. Build it by walking the extraction's `blocks` array in document
order and mapping each block to a content block entry:

| Block type in extraction | `contentBlocks` entry type | Notes |
|--------------------------|---------------------------|-------|
| Storyline nav bar | `"storyline"` | Title + item links array |
| Featured hero image | `"featured-image"` | Credit text |
| First header area | `"header"` | Always present -- renders headline + description |
| Author/byline block | `"byline"` | Author names + date |
| `ai2html-artboard` (report card) | `"ai2html"` | Uses `<img>` only |
| `ad-container` elements | `"ad-container"` | Position: mid1, mid2, mid3 |
| `showcase-link` elements | `"showcase-link"` | Title, excerpt, href, imageUrl |
| `chart-embed` (type=tables) | `"datawrapper-table"` | Sortable heatmap table |
| `chart-embed` (other types) | `"birdkit-chart"` | Interactive chart |
| Birdkit table (static) | `"birdkit-table"` | Medal/data tables |
| Birdkit table (interactive) | `"birdkit-table-interactive"` | Dropdown-filterable |
| `subhed` blocks | `"subhed"` | h2 (30px/700) vs h3 (24px/500) |
| `twitter-embed` elements | `"twitter-embed"` | Author, handle, text, date, URL |
| `puzzle-entry-point` | `"puzzle-entry-point"` | Game, title, subtitle |
| Author bio at end | `"author-bio"` | Author headshot + bio text |
| Related article cards | `"related-link"` | Title, url, imageUrl, summary |

**Critical rule**: The `contentBlocks` array is the **single source of truth**
for what renders. If a content type is not in this array, it will not appear on
the page. Build the array to match the source article's content order exactly.

### Document-Order Block Assembly Rule

Walk the extraction `blocks` array in index order. For each block, emit the
corresponding `contentBlocks` entry at its correct position. Do NOT group blocks
by category. Do NOT omit blocks because they seem decorative. If a block exists
in the source HTML and maps to a `ContentBlock` union type, it MUST appear in
the `contentBlocks` array at its correct document-order position.

### RULE: Every Interactive Element Gets a Component

> For every Birdkit/Datawrapper/ai2html block in the HTML, you MUST create a
> corresponding interactive React component -- not just a metadata entry in
> chartTypes. A chartTypes entry alone is insufficient -- the user will see an
> empty page.

The `chartTypes` metadata array alone is INSUFFICIENT. If an article has a
Datawrapper table, the agent must ALSO:
1. Generate a `DatawrapperTableData` constant in `chart-data.ts`
2. Ensure the `DatawrapperTable` component renders it
3. Add a `datawrapper-table` entry to `contentBlocks`

Without all three, the user sees an empty page. The same applies to Birdkit
tables, interactive medal tables, and all chart types.

### Mandatory Output Sections

After generating the ARTICLES entry, verify these three sections will render:

- **Typography section** (requires `fonts` array with >= 1 entry)
- **Colors section** (requires `colors.chartPalette` or extractable chart colors)
- **Chart Types section** (requires `chartTypes` array)

If any are empty, STOP and extract the missing data.

The generated ARTICLES entry MUST populate these fields — if any are empty,
STOP and investigate:
- `fonts` array — at least 1 entry with extracted computed styles
- `colors` object — at least `page.primaryText` and `page.background`
- `chartTypes` array — at least 1 entry if the article has any embeds/charts
- `contentBlocks` array — at least 3 entries (header + byline + author-bio minimum)
- `url` field — MUST be set (populates the "View Page" button in ArticleDetailPage)

### View Page Button

The `url` field in the ARTICLES entry populates the "View Page" button in
ArticleDetailPage. Always set `url` to the original article URL. If the user
provided `articleUrl` in the input contract, use that value. If it came from
`metadata.url` in the extraction, use that. Never leave `url` empty -- without
it the user cannot navigate to the source article from the design docs page.

### Interactive State Management

For articles with interactive components (dropdown tables, sortable tables):
- Use React `useState` for the selected option
- Wire `onChange` to update state AND re-render data
- Pre-load ALL option data as constants (not fetched at runtime)
- Test that changing selection actually changes rendered data

For dropdown/filter components specifically:
1. Declare state: `const [selected, setSelected] = useState(defaultOption)`
2. Build a data map: `const DATA_BY_OPTION: Record<string, RowData[]> = { ... }`
3. Wire the dropdown: `<select onChange={e => setSelected(e.target.value)}>`
4. Render from state: `{DATA_BY_OPTION[selected].map(row => ...)}`
5. Verify: changing the dropdown MUST change the visible table rows

Example Athletic article:
```typescript
contentBlocks: [
  { type: "storyline", title: "Super Bowl LX", items: [...] },
  { type: "featured-image", credit: "..." },
  { type: "header" },
  { type: "byline" },
  { type: "ad-container", position: "mid1" },
  { type: "showcase-link", title: "...", excerpt: "...", href: "...", imageUrl: "..." },
  { type: "datawrapper-table", id: "UYsk6", title: "...", note: "...", source: "...", url: "..." },
  { type: "subhed", text: "Takeaways" },
  { type: "subhed", text: "Let's go LaFleur it" },
  { type: "twitter-embed", author: "...", handle: "...", text: "...", date: "...", url: "..." },
  { type: "subhed", text: "Have you learned nothing?" },
  { type: "ad-container", position: "mid2" },
  { type: "showcase-link", title: "...", excerpt: "...", href: "...", imageUrl: "..." },
  { type: "subhed", text: "Didn't think I'd see you here" },
  { type: "showcase-link", title: "...", excerpt: "...", href: "...", imageUrl: "..." },
  { type: "subhed", text: "Advantage, Patriots" },
  { type: "subhed", text: "Methodology" },
  { type: "ad-container", position: "mid3" },
  { type: "puzzle-entry-point", game: "Connections: Sports Edition", title: "...", subtitle: "..." },
  { type: "author-bio" },
]
```

---

## Step 4 -- Generate chart data constants

For each chart in the `charts` extraction array, generate a typed constant to
append to `chart-data.ts`.

### Naming convention

```
BRAND_SLUG_CHART_TOPIC_DATA
```

Derive the brand slug from the publication domain in `metadata.url`:
- `nytimes.com` --> `NYT`
- `wsj.com` --> `WSJ`
- `washingtonpost.com` --> `WAPO`
- `economist.com` --> `ECONOMIST`
- Other --> uppercase first word of hostname

Derive the topic slug from the chart's `topic` field:
1. Uppercase.
2. Replace spaces and special characters with underscores.
3. Remove consecutive underscores.
4. Strip trailing underscores.

Examples:
- Brand `NYT`, topic `"Food Prices"` --> `NYT_FOOD_PRICES_DATA`
- Brand `NYT`, topic `"S&P 500"` --> `NYT_SP500_DATA`
- Brand `NYT`, topic `"Trade deficit by country"` --> `NYT_TRADE_DEFICIT_BY_COUNTRY_DATA`

### Type mapping

| Datawrapper type                   | TypeScript type          |
|------------------------------------|--------------------------|
| `d3-lines`                         | `LineChartData`          |
| `d3-bars`, `d3-bars-split`         | `BarChartData`           |
| `d3-stacked-area`                  | `LineChartData`          |
| **`tables`**                       | **`DatawrapperTableData`** |
| Unknown                            | `LineChartData`          |

When generating `DatawrapperTableData` constants, also generate a
`HEATMAP_EXACT` lookup constant if the table uses heatmap coloring:

```typescript
const HEATMAP_EXACT: Record<string, { bg: string; fg: string }> = {
  "18.1%": { bg: "#002728", fg: "#FFFFFF" },
  // ... one entry per data row
};
```

### Constant structure

Each constant must fully satisfy its interface. See the
`extract-datawrapper-charts` skill for the full `BarChartData`,
`LineChartData`, and `DatawrapperTableData` interfaces and field-mapping rules.

Include a comment header above each constant:

```typescript
/** <topic> data from Datawrapper <chartId>/<version> -- <N> monthly values (<date range>) */
export const NYT_FOOD_PRICES_DATA: LineChartData = {
  values: [...],
  startYear: 2015,
  lineColor: "#bf1d02",
  // ... all required fields
};
```

### Import handling

The imports for `BarChartData` and `LineChartData` already exist at the top of
`chart-data.ts`. Do not duplicate them. If a new chart type interface is needed
(unlikely), add the import alongside the existing ones.

---

## Step 5 -- Validate and emit

### ARTICLES entry validation

Before emitting the ARTICLES entry, verify:

- [ ] `id` is unique within the existing ARTICLES array
- [ ] `date` is in `"YYYY-MM-DD"` format
- [ ] `type` is either `"interactive"` or `"standard"` with `as const` annotation
- [ ] `ogImage` is a valid URL or empty string
- [ ] `tags` is a non-empty array (warn if empty but do not block)
- [ ] `graphicsCount` and `figuresCount` are non-negative integers
- [ ] `tools` object has all four keys populated
- [ ] `chartTypes` array length matches the sum of Datawrapper embeds +
      ai2html artboards
- [ ] `quoteSections` badge colors are valid hex
- [ ] `fonts` array has at least one entry
- [ ] `brandFonts.editorial` and `brandFonts.graphics` are non-empty
- [ ] `architecture.hierarchy` is a non-empty string array
- [ ] `architecture.publicAssets.datawrapperCharts` length matches the number
      of Datawrapper embeds
- [ ] All URL strings use `https://`

### Chart data validation

- [ ] Each constant name follows `BRAND_SLUG_CHART_TOPIC_DATA` pattern
- [ ] `values` array is non-empty
- [ ] `startYear` is a four-digit integer
- [ ] `yTicks` are sorted ascending
- [ ] Color strings are valid 6-digit hex with `#` prefix
- [ ] `source` is a non-empty string
- [ ] No duplicate constant names

### Emit format

#### For `design-docs-config.ts`

Insert the new entry at the end of the `ARTICLES` array, before the closing
`] as const;`. Maintain the existing indentation style (2-space indent).

```typescript
  {
    id: "new-article-slug",
    title: "...",
    url: "...",
    // ... complete entry
  },
] as const;
```

The entry must include `type: "interactive" as const` or
`type: "standard" as const` to preserve the literal type.

#### For `chart-data.ts`

Append new constants at the bottom of the file, after all existing constants.
Separate from the previous constant with a blank line.

```typescript

/** Real <topic> data from Datawrapper <id>/<version> -- <N> monthly values (<range>) */
export const NYT_NEW_TOPIC_DATA: LineChartData = {
  // ...
};
```

---

## Step 6 -- Handle missing or ambiguous data

When extraction data is incomplete:

1. **Missing chart data values**: If the `charts[].data` field is empty or
   null, do NOT generate a chart constant. Instead, add a `// TODO:` comment
   in `chart-data.ts` referencing the chart URL, and set the corresponding
   `chartTypes` entry in the ARTICLES config but omit the `url` field.

2. **Missing architecture details**: If the `architecture` object is not
   provided, construct a minimal version using only what can be inferred:
   - `framework`: from Step 2 detection
   - `hosting`: from URL analysis
   - `hierarchy`: `["Unknown -- architecture extraction not available"]`
   - `layoutTokens`: `{}`
   - `cssFiles`: from `assets.stylesheets`
   - `contentBlocks`: derive from unique `blocks[].type` values
   - `publicAssets`: build what you can from available data

3. **Missing fonts**: If the `fonts` array is empty, set `fonts: []` and
   `brandFonts: { editorial: [], graphics: [] }`. Add a `// TODO:` comment
   noting that font extraction was not available.

4. **Ambiguous quote badge colors**: If a badge text does not clearly map to
   red/yellow/green, ask the user to confirm the color mapping before emitting.

---

## Execution Checklist

When you receive merged extraction JSON:

1. Read the existing `ARTICLES` array in `design-docs-config.ts` to check for
   slug collisions and understand the current entry count.
2. Read the existing constants in `chart-data.ts` to check for name collisions.
3. Generate the article slug (Step 1).
4. Detect tools from scripts (Step 2).
5. Build the complete ARTICLES entry object (Step 3).
6. Generate chart data constants for each chart with available data (Step 4).
7. Run all validation checks (Step 5).
8. Insert the ARTICLES entry into `design-docs-config.ts`.
9. Append chart constants to `chart-data.ts`.
10. Report what was generated: article slug, number of chart constants, any
    `// TODO:` items that need manual follow-up.

Do not modify any other files. Do not reformat existing code in either file.

### Cross-Population Output

After generating the article config entry, emit a separate list of
"cross-population candidates" -- data that should be propagated back to the
parent brand section (`Brand{Name}Section.tsx`). Include:

1. New font families or weights not in the brand section's `FONTS` array.
2. New chart/graphic colors not in the brand's `GRAPHICS_COLORS`.
3. New content block types not in the brand's `CONTENT_BLOCKS`.

Report these to the caller so the generate-brand-section skill can be re-run
or the brand section file can be manually updated.

---

## Data-Driven ArticleDetailPage Rendering

`ArticleDetailPage` is fully data-driven -- it renders dynamically based on the
article config entry, not hardcoded for any single article. The component reads
the ARTICLES entry and conditionally renders sections based on which fields are
populated. This means the config you generate directly controls what appears on
the page.

### Heading Styles by Article Type

The `type` field in the ARTICLES entry controls heading rendering:

### RULE: Always Extract Actual Heading Styles — Never Assume

Do NOT use a fixed lookup table of known heading styles (e.g., "Athletic = 40px/400",
"NYT = 31px/700"). Every publication, and even different articles within the same
publication, may use different heading styles.

**For every article, extract the actual computed heading styles from the source HTML:**

1. **h1 (headline)**: Extract `fontSize`, `fontWeight`, `fontStyle`, `lineHeight`,
   `textAlign`, `color`, and `className` from the rendered page using
   `getComputedStyle()` or by parsing inline/CSS styles.
2. **h2 (section heading)**: Same properties — values MUST be extracted independently.
3. **h3 (sub-section heading)**: Same properties — MUST differ from h2.

The `fonts` array role field should describe the actual extracted values:

```
role: "Display headlines — {extracted}: {fontSize}px/{fontWeight}/{fontStyle}/{textAlign}"
```

Examples from past articles (for reference only — do NOT hardcode these):

| Article | h1 fontSize | fontWeight | fontStyle | textAlign |
|---------|------------|------------|-----------|-----------|
| NYT Birdkit interactive | 45px | 800 | normal | center |
| NYT standard article | 31px | 700 | italic | left |
| Athletic featured | 40px | 400 | italic | center |
| WaPo feature (hypothetical) | 36px | 300 | normal | left |

These values were extracted from specific articles. Your article may have
different values. **Always extract, never assume.**

### Heading Level Differentiation

A common failure is rendering h2 and h3 identically. The agent MUST verify
that the extracted h2 and h3 styles differ in at least one property (fontSize,
fontWeight, or lineHeight). If they appear identical in the extraction, re-check
the source HTML — they almost certainly differ on the live page.

### CRITICAL: Per-Article Font Data Accuracy

Each article's `fonts` array must contain the **actual computed styles** from
that specific article's page. DO NOT copy font data from one article to another.

Common mistake: The sweepstakes article had identical font entries to the Trump
economy article because the data was copy-pasted. The sizes, weights, and styles
were wrong for the sweepstakes article. Always extract fresh font data for each
article.

When populating the `fonts` array, use the heading style values from the page
structure extraction, not from a previous article's config entry.

### `quoteSections: []` -- No Promise Tracker or Quote Blocks

When `quoteSections` is set to an empty array `[]`, ArticleDetailPage will **not**
render the promise tracker sidebar or any quote/badge blocks. This is the correct
setting for articles that do not follow a campaign-promise or policy-tracking
pattern. Only populate `quoteSections` when the source article contains clearly
labeled promise/commitment sections with colored status badges.

### `ai2htmlArtboards` in `publicAssets` -- Flowchart Display

When `architecture.publicAssets` includes `ai2htmlArtboards` entries (with
mobile and desktop variants), ArticleDetailPage renders these as responsive
flowchart graphics. The component swaps between mobile and desktop artboard
images based on viewport width. If no `ai2htmlArtboards` are present, the
flowchart section is skipped entirely.

### `reportCard` in `publicAssets` -- Promise Tracker Display

When `architecture.publicAssets` includes a `reportCard` object (with `mobile`
and `desktop` sub-objects containing `url`, `width`, and `desc`),
ArticleDetailPage renders the report card as a responsive image block. If
`reportCard` is absent or not set, no report card section renders.

### Articles Without Datawrapper Charts

Not all articles have interactive Datawrapper embeds. For articles that reference
charts only as static images or do not include any charts at all:

- Still populate `chartTypes` entries for **metadata display purposes** -- these
  entries describe the types of visualizations the article contains and appear in
  the tools/tech summary section of the design doc page.
- However, no interactive chart rendering will occur. The chart data constants in
  `chart-data.ts` are only needed when the article has live Datawrapper embeds
  that the app re-renders.
- If there are no Datawrapper embeds at all, set
  `architecture.publicAssets.datawrapperCharts: []` and skip chart data constant
  generation entirely.

---

## RULE: ai2html Overlay Data Requirements

Every ai2html content block MUST include overlay data for BOTH mobile and desktop artboards:

1. **Overlay positions** come from the source HTML's `g-ai0-*` (mobile) and `g-ai1-*` (desktop) divs — copy `top`, `left`, `margin-top`, `width` exactly.
2. **Badge/status text** uses `color: "#fff"` (white text on baked-in colored bars) — NOT the badge component with colored background. The colors are in the PNG.
3. **Pixel widths** from source must be converted to percentage widths: `px / artboard_width * 100`.
4. **Font sizes** must be scaled for mobile: typically `desktop_size * 0.7` for both labels and badges.
5. **`marginTop`** (negative, e.g., `"-9.8px"`) from source `g-aiPointText` style MUST be included for baseline alignment.
6. **`whiteSpace: "nowrap"`** is required for all point text overlays to prevent wrapping.
7. **`letterSpacing: "0.05em"`** is required for badge text to match the source's `g-pstyle1` class.

Example desktop overlay:
```typescript
{ id: "rc-1", text: "Lower food prices", top: "7.23%", left: "21.59%", width: "23.5%", marginTop: "-9.8px",
  style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } }
```

Example mobile overlay (same content, scaled):
```typescript
{ id: "rcm-1", text: "Lower food prices", top: "9.77%", left: "12.94%", width: "39.4%", marginTop: "-7px",
  style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } }
```

---

## Live Font Specimens

ArticleDetailPage renders a **live font specimen** below each `usedIn` entry in the Typography section. The specimen is a `<div>` styled with the actual NYT web font at the exact size/weight/style/color from the usedIn string.

### How it works

1. **Font loading**: A `useEffect` injects `<link>` to `https://g1.nyt.com/fonts/css/web-fonts.css` into `<head>` on mount
2. **Parsing**: `parseUsedInSpec(spec)` extracts fontSize, fontWeight, lineHeight, fontStyle, textAlign, color, letterSpacing, textTransform from the usedIn string format `"element.class: NNpx/NNN/NNpx font-style:X #RRGGBB"`
3. **Specimen text**: `getSpecimenText(fontSize, isUppercase, className, article.*)` returns **actual text from the article** based on the element class name:
   - `h1.Headline` → the article's actual title
   - `p.Summary` / `p.Description` → the article's actual description
   - `p.Byline` → "By [actual author names]"
   - `time.Timestamp` → the actual article date
   - `p.BodyText` → a real sentence from the article body
   - `div.Badge` / `div.PromiseBadge` → "HASN'T HAPPENED" (actual badge text)
   - `p.TopicTag` → actual article tags joined with " · "
   - `span.SectionLabel` → the article's section name uppercased
   - Labels/badges (uppercase, no class match): "SECTION LABEL · BADGE TEXT"
   - Small text (≤12px, no class match): "Source: Bureau of Labor Statistics."
   - **RULE:** NEVER use "The quick brown fox" or other Lorem Ipsum — always use real text from the article being documented
4. **Rendering**: Each specimen is a white box with `1px solid #e8e5e0` border, 600px max-width
5. **Article header uses real fonts**: The h1 headline uses the actual `nyt-cheltenham` font stack (not CSS variables), with per-article-type styling (interactive: 45px/800/normal/center; standard: 31px/700/italic/left)

### RULE: usedIn format must be parseable

Every `usedIn` entry MUST follow this format for specimens to render correctly:

```
"element.ClassName: {fontSize}px/{fontWeight}/{lineHeight}px [font-style:italic] [text-align:center] [letter-spacing:0.05em] [uppercase] #RRGGBB"
```

Examples:
- `"h1.Headline (css-88wicj): 40px/700/46px font-style:italic text-align:center #121212"`
- `"p.BodyText (css-ac37hb): 20px/500/25px #363636"`
- `"div.Badge: 12px/600/- letter-spacing:0.02em uppercase #FFFFFF"`

If a usedIn string doesn't follow this format, the specimen will render with default styling (14px/400/normal/#121212).

---

## Lessons Learned -- Winter Olympics Article

The following patterns were discovered during the Winter Olympics article page
build. They apply to any article that uses these components.

### Birdkit Medal / Data Tables

When an article uses Birdkit `CTableDouble` or `CTable` Svelte components
(identified by `data-birdkit-hydrate` attributes and `CTableDouble`/`CTable`
in the hydration data), the agent must extract **ALL** table data from the SSR
HTML and create interactive React replicas. Birdkit renders table data
server-side into the HTML; the hydration script only wires up interactivity.
The agent cannot rely on client-side data loading -- all values are in the
static markup.

#### contentBlock types for tables

| Block type                  | Use case                                                      |
|-----------------------------|---------------------------------------------------------------|
| `birdkit-table`             | Static medal tables (no user interaction beyond scrolling)    |
| `birdkit-table-interactive` | Dropdown-filterable tables (user selects a category/sport)    |

Add these to the `contentBlocks` array in the ARTICLES entry at the correct
document-order position.

#### Consistent row count for interactive tables

Interactive dropdown tables must **always show the same number of rows**
regardless of which filter option is selected. When a selected category has
fewer data rows than the maximum across all categories, pad with placeholder
rows that display em-dashes (`---`) in every cell. This prevents the table
height from jumping when the user changes the dropdown selection.

### Per-Article Color Palette

Each article may have its own color palette (e.g., Olympic medal colors vs
Datawrapper chart colors). The agent must extract the **actual colors** used in
the article's CSS and inline styles -- do NOT reuse colors from other articles.

When the article's colors differ from the brand default palette, add a
`colors.chartPalette` field to the `architecture` config:

```typescript
architecture: {
  // ... existing fields ...
  colors: {
    chartPalette: [
      { name: "Gold", value: "#C9B037", role: "medal-gold" },
      { name: "Silver", value: "#A8A8A8", role: "medal-silver" },
      { name: "Bronze", value: "#AD8A56", role: "medal-bronze" },
    ],
  },
}
```

### Medal Circle Headers

Table headers for medal columns should use colored circles (gold/silver/bronze)
instead of text labels like "G", "S", "B". The "Total" column header uses a
triangle of 3 mini circles (one gold, one silver, one bronze stacked) instead
of "Tot." text. Implement these as inline SVG or CSS-styled `<span>` elements
in the React replica.

### Lead Images

Standard articles (not interactive) typically have a lead image block. Extract
the image URL, alt text, caption, and credit from the `<figure>` with
`class="css-1yjl3xc"` (or equivalent CSS-in-JS class on the lead figure).
Add as a `lead-image` contentBlock type:

```typescript
{ type: "lead-image", url: "https://...", alt: "...", caption: "...", credit: "..." }
```

### Storyline Navigation Bars

Some articles have a storyline navigation bar (e.g., Olympics, Elections) that
links to related coverage. Document this as a `storyline-nav` contentBlock type.
Note that storyline nav content is article-specific -- different articles in the
same brand may have different storyline navs or none at all.

```typescript
{ type: "storyline-nav", label: "Olympics", links: [...] }
```

### Related Links Block

Articles may end with a `RelatedLinksBlock` containing linked article cards
with thumbnail images. Add as a `related-link` contentBlock type:

```typescript
{ type: "related-link", title: "...", url: "...", imageUrl: "...", description: "..." }
```

Multiple `related-link` entries may appear consecutively in the `contentBlocks`
array, one per linked article card.

---

## IMPORTANT: Brand Page Sync

After generating the article config, the parent brand tab pages **must** reflect
the new article's data. Brand tab components (`sections/brand-nyt/` and
`sections/brand-athletic/`) dynamically aggregate from the `ARTICLES` array at
render time — so adding a new article entry automatically includes its data.

However, verify these aggregation points work for the new article:

1. **Fonts**: Brand Typography tab merges `article.fonts[]` by name, unions weights.
2. **Colors**: Brand Colors tab walks `article.colors` recursively for hex values.
3. **Components**: Brand Components tab detects types from `article.contentBlocks[].type`.
4. **Charts**: Brand Charts tab catalogs from `article.chartTypes[]`.
5. **Architecture**: Brand Architecture tab shows `article.architecture` per-article.

If the new article introduces a data structure that the brand tab doesn't handle
(e.g., a new nested `colors` shape), update the brand tab component's aggregation
logic.

See `sync-brand-page/SKILL.md` for the full verification checklist.

---

### Typed Renderer Mapping (NEW)

Every `contentBlocks` entry MUST map to a named renderer component. The mapping is:

| Block Type | Renderer Component | Data Source |
|-----------|-------------------|-------------|
| `header` | (built-in ArticleDetailPage) | article title/date/section |
| `byline` | (built-in ArticleDetailPage) | article authors/date |
| `ai2html` | `Ai2htmlArtboard` | overlays from `Ai2htmlArtboard.tsx` |
| `subhed` | (built-in) | `text` field on the block |
| `birdkit-chart` | `InteractiveBarChart` or similar | named data constant from `chart-data.ts` |
| `birdkit-table` | `MedalTable` / `MedalTableGrid` | named data constant |
| `birdkit-table-interactive` | `MedalTableInteractive` | named data constant |
| `datawrapper-table` | `DatawrapperTable` | named data constant |
| `showcase-link` | (built-in) | `title`, `href`, `imageUrl`, `excerpt` on block |
| `twitter-embed` | (built-in) | `author`, `text`, `url` on block |
| `ad-container` | (built-in) | `position` field |
| `puzzle-entry-point` | (built-in) | `game`, `title`, `subtitle` on block |
| `featured-image` | (built-in) | `url`, `credit`, `caption` on block |
| `storyline` | (built-in) | `title`, `links[]` on block |
| `author-bio` | (built-in) | article authors |
| `related-link` | (built-in) | `title`, `url`, `imageUrl`, `summary` on block |

Before emitting contentBlocks, validate that every `type` value appears in this table. If a new type is needed, document it and ensure a renderer exists.

### Cross-Population Candidate List (NEW)

After generating the article config, emit a list of cross-population candidates:
```
crossPopulation: {
  newFonts: string[],           // font names not in any existing article
  newColors: string[],          // hex values not in any existing article
  newChartTypes: string[],      // chart types not yet seen for this brand
  newComponentTypes: string[],  // contentBlock types not yet seen for this brand
  newIcons: string[],           // icon names not in existing brand resources
}
```
This list helps `sync-brand-page` know exactly what changed and which sections need updating.

---

## MANDATORY: usedIn Format Enforcement

Every `usedIn` entry in the `fonts` array MUST follow this parseable format:

```
"element.ClassName: {fontSize}px/{fontWeight}/{lineHeight}px [font-style:X] [text-align:X] [letter-spacing:Xem] [text-transform:X] #hexColor"
```

Examples:
- `"h1.e1h9b8zs0: 40px/400/44px 0px #121212"`
- `"p.g-body: 16px/400/28px #333333"`
- `"h2.Storyline__heading: 15px/700/15px 0px #121212"`

Do NOT use vague descriptions like `"Article headline"` or `"Chart axis labels"`. The format must include the actual className, fontSize, fontWeight, lineHeight, and color extracted from the source HTML.

If a `usedIn` string does not contain at minimum a className, fontSize, fontWeight, and hex color, REJECT it and re-extract from the source.

---

## MANDATORY: Extract Actual Computed Styles

NEVER assume text styles from a font name, role, or lookup table. ALWAYS extract actual computed styles from the source HTML/CSS for THIS article:

1. Read the source HTML for each heading element (h1, h2, h3) and body text
2. Extract the ACTUAL values: fontSize, fontWeight, fontStyle, lineHeight, textAlign, color, letterSpacing
3. Write specimens EXACTLY as they appear in the source

### h2/h3 Differentiation STOP Rule

If the extracted h2 and h3 have identical fontSize AND fontWeight AND lineHeight, STOP and re-inspect the source. They ALWAYS differ in production. Common causes of false-identical extraction:
- Both h2 and h3 resolved to the same CSS rule because the selector was too broad
- The extraction read only one heading level and assumed the other matches
- The source HTML was incomplete

### Per-Article Independence

NEVER copy font or color data from another article's config entry, even within the same brand. Each article's extraction must produce fresh metrics from its own source HTML. After extraction, compare against existing ARTICLES entries — if byte-identical to ANY other article, discard and re-extract.
