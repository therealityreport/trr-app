---
name: extract-datawrapper-charts
description: Extract chart data from Datawrapper embeds and generate TypeScript constants.
---

# Extract Datawrapper Charts

Extract structured chart data from Datawrapper embed URLs and generate
TypeScript data constants that match TRR chart component interfaces.

## Inputs

The user provides one or more Datawrapper embed URLs. These always use the
`?plain=1` query parameter (e.g.
`https://datawrapper.dwcdn.net/AbCdE/1/?plain=1`).

For each URL the user may also supply:
- A brand slug (e.g. `NYT`, `WSJ`, `ECONOMIST`)
- A topic slug (e.g. `FOOD_PRICES`, `GDP_GROWTH`)

## Step 1 -- Fetch the embed HTML

Use the host's browser capabilities to load the embed page and extract its
content:

1. **Open the embed URL:** `browser.navigate` with the Datawrapper embed URL.
2. **Take a snapshot:** `browser.snapshot` to read the page structure.
3. **Extract HTML/data:** `browser.evaluate` to run in-page JS that reads the DOM content (script tags, CSV data, metadata).

The page is static HTML with inline scripts; full JavaScript execution in the
page context via `evaluate_script` can access all embedded data.

## Step 2 -- Locate chart data in the HTML

Datawrapper embeds store data in several places. Check them in priority order:

### 2a. Inline JSON blobs

Use `browser.evaluate` to check for these
patterns in the page context:

```
window.__DW_DATA__ = { ... };
```

```
__dw_data = { ... };
```

Parse the JSON. It contains:
- `chartData` or `data` -- the raw data series
- `metadata` -- title, description, source, notes, axes, colors, annotations
- `type` -- the Datawrapper chart type string (e.g. `d3-lines`,
  `d3-bars-split`, `d3-bars`, `d3-stacked-area`, `tables`)

### 2b. CSV in a script element

Some embeds include:

```html
<script type="text/csv" id="datawrapper-chart-data">
Year,Value
2010,42
...
</script>
```

Use `browser.evaluate` to extract this:
```js
() => {
  const el = document.getElementById('datawrapper-chart-data');
  return el ? el.textContent : null;
}
```

Parse this CSV. Column headers become series labels; the first column is
typically the x-axis (year or category).

### 2c. Noscript fallback table

Inside `<noscript>` there is often a plain HTML `<table>` with the same data.
Parse rows and headers as a last resort.

### 2d. Metadata attributes

Also extract from the page using `browser.evaluate`:
- `<meta>` tags or `aria-label` attributes for title/description
- `.dw-chart-header` or `.dw-chart-notes` text content for annotations and
  source lines
- Color values from inline CSS custom properties
  (`--color-0`, `--color-1`, ...) or the metadata JSON

## Step 3 -- Map Datawrapper type to TRR component

| Datawrapper `type`          | TRR Component            | Data Interface     |
| --------------------------- | ------------------------ | ------------------ |
| `d3-lines`                  | `InteractiveLineChart`   | `LineChartData`    |
| `d3-bars`, `d3-bars-split`  | `InteractiveBarChart`    | `BarChartData`     |
| `d3-stacked-area`           | Custom stacked SVG       | `LineChartData`    |

If the type is not in this table, default to `LineChartData` and add a
`// TODO: verify chart type mapping` comment.

### Visualization Type Display Names

When populating the `chartTypes` array in the ARTICLES config entry (done by
the generate-article-page skill), use human-readable **visualization type**
names, not just the Datawrapper tool identifier. The `chartTypes` table uses
three columns: Tool | Visualization Type | Topic.

| Datawrapper `type` | `tool` field | `type` field (display name) |
|---------------------|-------------|----------------------------|
| `d3-lines` | `"datawrapper"` | `"Line chart"` |
| `d3-bars` | `"datawrapper"` | `"Bar chart"` |
| `d3-bars-split` | `"datawrapper"` | `"Grouped bar chart"` |
| `d3-stacked-area` | `"datawrapper"` | `"Stacked area chart"` |
| `tables` | `"datawrapper"` | `"Data table"` |
| ai2html artboard | `"ai2html"` | `"Static graphic"` or `"Report card"` |

The `topic` field should be a short description of what the chart shows
(e.g., "Food Prices", "S&P 500 Performance", "Trade Deficit by Country").
Derive this from the chart title, surrounding subhed, or the topic slug.

## Step 4 -- Generate TypeScript constants

Produce a single exported `const` for each chart. The constant must conform
exactly to the interface for the mapped component.

### Naming convention

```
BRAND_SLUG_CHART_TOPIC_DATA
```

Examples:
- `NYT_FOOD_PRICES_DATA`
- `WSJ_UNEMPLOYMENT_RATE_DATA`
- `ECONOMIST_GDP_GROWTH_DATA`

If the user does not provide a brand or topic, derive them from the chart title
(uppercase, underscores for spaces, strip non-alphanumeric characters).

### BarChartData interface

```typescript
interface BarChartData {
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
```

Field mapping:
- `values` -- the numeric data series from the CSV / JSON
- `startYear` -- the first year in the x-axis data
- `barColor` -- primary bar color from Datawrapper metadata or CSS variable
  `--color-0`; fall back to `"#1d81a2"` if not found
- `yAxisLabel` -- from metadata axis label or first numeric column header
- `yTicks` -- compute sensible tick marks (min, max, and 3-5 intermediate
  values rounded to clean numbers)
- `xLabels` -- the category / year labels from the x-axis column
- `annotation` -- chart title or subtitle from the embed
- `source` -- the source line from `.dw-chart-notes` or metadata
- `note` -- optional footnote text if present

### LineChartData interface

```typescript
interface LineChartData {
  values: number[];
  values2?: number[];
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

Field mapping:
- `values` -- first numeric data series
- `values2` -- second numeric data series if chart has two lines
- `label2` -- legend label for the second series
- `color2` -- color for the second series from `--color-1` or metadata
- `startYear` -- first year in x-axis data
- `lineColor` -- primary line color from `--color-0` or metadata; fall back to
  `"#1d81a2"`
- `yAxisLabel` -- axis label from metadata
- `yTicks` -- computed clean tick marks
- `xLabels` -- year / category labels
- `annotation` -- chart title or annotation text
- `annotationX`, `annotationY` -- pixel coordinates of the first annotation
  marker if present in metadata
- `source` -- source attribution string
- `note` -- optional footnote
- `unit` -- e.g. `"%"`, `"$"`, `"M"` extracted from axis formatting in
  metadata
- `unitPosition` -- `"prefix"` for currency symbols, `"suffix"` for percentage
  and units
- `decimals` -- number of decimal places used in the formatted values

### Output format

```typescript
// Source: https://datawrapper.dwcdn.net/AbCdE/1/?plain=1
// Extracted: 2026-03-24
export const NYT_FOOD_PRICES_DATA: BarChartData = {
  values: [2.1, 3.4, 4.5, ...],
  startYear: 2015,
  barColor: "#1d81a2",
  yAxisLabel: "Price index",
  yTicks: [0, 2, 4, 6, 8],
  xLabels: ["2015", "2016", "2017", ...],
  annotation: "Food prices have risen steadily since 2015",
  source: "Bureau of Labor Statistics",
};
```

Always include the source URL and extraction date as comments above the
constant.

## Step 5 -- Fallbacks when data is not in the HTML

Sometimes Datawrapper serves data via XHR that is not embedded in the static
HTML. When Steps 2a-2c all fail:

### 5a. Check network requests

Use `browser.network.list` to inspect XHR/fetch
requests made by the page. Datawrapper may load chart data from an API endpoint.
Use `browser.network.get` to read the response
body of any data-bearing request.

### 5b. Vision API fallback

Take a screenshot of the embed using `browser.screenshot`
and POST it to the TRR design-docs vision endpoint:

```
POST /api/design-docs/analyze-image
Content-Type: application/json

{
  "imageUrl": "<screenshot URL or base64>",
  "prompt": "Extract all data points, axis labels, colors, title, source, and annotations from this chart image. Return as JSON."
}
```

This calls the Gemini vision API and returns structured JSON. Parse the
response and map it to the appropriate interface.

### 5c. Ask the user

If the vision API does not return usable data, ask the user to provide:
1. The raw CSV data (they can copy it from Datawrapper's "Get the data" link)
2. The chart type
3. Colors and annotation text

Then proceed with Step 4 using the user-supplied data.

## Validation checklist

Before emitting the final constant, verify:

- [ ] `values` array length matches `xLabels` array length
- [ ] `startYear` is a four-digit integer
- [ ] `yTicks` are sorted ascending and span the data range
- [ ] Color strings are valid hex (6-digit with `#` prefix)
- [ ] `source` is a non-empty string
- [ ] The constant name follows `BRAND_SLUG_CHART_TOPIC_DATA` convention
- [ ] The TypeScript compiles against the declared interface (no extra or
      missing required fields)

## Multiple charts

When the user provides multiple Datawrapper URLs, process each one
independently and emit all constants in a single TypeScript file. Group them
under a comment header per chart:

```typescript
// ============================================================
// Chart 1: Food Prices (bar)
// Source: https://datawrapper.dwcdn.net/AbCdE/1/?plain=1
// ============================================================
export const NYT_FOOD_PRICES_DATA: BarChartData = { ... };

// ============================================================
// Chart 2: Unemployment Rate (line)
// Source: https://datawrapper.dwcdn.net/FgHiJ/2/?plain=1
// ============================================================
export const NYT_UNEMPLOYMENT_RATE_DATA: LineChartData = { ... };
```

---

## Datawrapper Table Type Support

### Updated Type Mapping

| Datawrapper `type` | TRR Component | Data Interface |
|---|---|---|
| `d3-lines` | `InteractiveLineChart` | `LineChartData` |
| `d3-bars`, `d3-bars-split` | `InteractiveBarChart` | `BarChartData` |
| `d3-stacked-area` | Custom stacked SVG | `LineChartData` |
| **`tables`** | **`DatawrapperTable`** | **`DatawrapperTableData`** |

When the Datawrapper `type` is `tables`, the embed is an interactive sortable table,
NOT a chart. Use `DatawrapperTableData` (defined in `chart-data.ts` line ~11).

### Step 2e — Datawrapper Table Extraction

When type is `tables`, perform these additional extraction steps:

1. **Fetch `dataset.csv`**: Construct URL
   `https://datawrapper.dwcdn.net/{chartId}/{version}/dataset.csv`.
   Fetch via WebFetch or `evaluate_script` using `fetch()`. Parse the CSV to get
   column headers and all data rows. This is the authoritative data source — do NOT
   rely on scraping the rendered HTML table.

2. **Extract heatmap config**: Run `evaluate_script` to access
   `window.__DW_SVELTE_PROPS__` (or `window.__DW_DATA__`). Extract:
   - `metadata.visualize.heatmap-column` — which column uses heatmap coloring
   - `metadata.visualize.heatmap-colors` — the gradient color stop array
   - `metadata.visualize.sortable-columns` — list of sortable column keys
   - `metadata.visualize.default-sort-column` and `default-sort-order`
   - `theme.data.colors` — the theme's named color array

3. **Extract per-row heatmap colors**: Navigate to the rendered table in Chrome
   DevTools. For each `<td>` with class `is-heatmap`, use `evaluate_script` with
   `getComputedStyle()` to extract the exact `background-color` and `color`. Build a
   lookup map keyed by the cell's text content:
   ```typescript
   const HEATMAP_EXACT: Record<string, { bg: string; fg: string }> = {
     "18.1%": { bg: "#002728", fg: "#FFFFFF" },
     "-24.2%": { bg: "#904406", fg: "#FFFFFF" },
     // ... one entry per row
   };
   ```

4. **Extract Datawrapper theme**: From the page's `<link>` stylesheet URLs or
   `__DW_SVELTE_PROPS__`, extract the theme name (e.g., `"the-athletic"`) and the
   font CDN URL (e.g., `static.dwcdn.net/custom/themes/the-athletic/`).

### Step 4b — Generate DatawrapperTableData Constant

The `DatawrapperTableData` interface (already defined in `chart-data.ts`):

```typescript
interface DatawrapperTableData {
  title: string;
  subtitle: string;
  columns: readonly { key: string; label: string; align: "left" | "right"; heatmap?: boolean }[];
  rows: readonly Record<string, string | number>[];
  heatmapGradient?: readonly string[];
  note: string;
  source: string;
  sourceUrl: string;
  credit: string;
}
```

Generate the constant with:
- All CSV rows as the `rows` array
- Column definitions with `heatmap: true` on the gradient column
- The full `heatmapGradient` color array from the chart config
- Also generate a separate `HEATMAP_EXACT` constant for per-row colors

### Table Validation Checks

- [ ] `columns` array has at least 2 entries
- [ ] Exactly one column has `heatmap: true` when the table uses heatmap styling
- [ ] `heatmapGradient` array has at least 2 color stops when heatmap is present
- [ ] `rows` count matches the CSV row count
- [ ] All column `key` values match CSV header names (after normalization)
- [ ] `sourceUrl` is a valid URL
