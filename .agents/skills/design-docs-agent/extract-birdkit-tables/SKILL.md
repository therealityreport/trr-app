---
name: extract-birdkit-tables
description: Extract structured data from Birdkit CTableDouble and CTable Svelte components rendered in NYT article SSR HTML and produce typed constants for interactive table recreation
---

# Extract Birdkit Tables

Extract all table data from Birdkit `CTableDouble` and `CTable` Svelte components
rendered in server-side-rendered (SSR) HTML from NYT articles. This skill fills the
gap where no extraction capability existed for Birdkit table components. It produces
structured `BirdkitTableExtraction` objects that downstream skills
(`generate-article-page`) consume to recreate fully interactive React table
components with medal-circle headers, dropdown selectors, and consistent row counts.

---

## Detection: Finding Birdkit Tables in HTML

### Container divs with `data-birdkit-hydrate`

Birdkit tables are wrapped in container `<div>` elements bearing a
`data-birdkit-hydrate` attribute. Scan the entire source HTML for these:

```html
<div data-birdkit-hydrate="CTableDouble" data-birdkit-props="...">
  <!-- SSR-rendered table content -->
</div>

<div data-birdkit-hydrate="CTable" data-birdkit-props="...">
  <!-- SSR-rendered interactive table content -->
</div>
```

**Detection regex:**

```
/<div[^>]+data-birdkit-hydrate="(CTableDouble|CTable)"[^>]*>/g
```

### Hydration `<script>` blocks

Each Birdkit container is followed by a hydration `<script>` block that wires up
client-side interactivity. These scripts contain the call pattern:

```javascript
kit.start(app, element, {
  component: "CTableDouble",
  route: { "id": "/olympics-alttop" },
  // ... additional config
});
```

Parse these script blocks to extract:

| Field | What it tells you |
|-------|-------------------|
| `component` | Svelte component type: `CTableDouble` or `CTable` |
| `route.id` | The NYT route identifier for the article/page |
| `props` | Serialized props object (may duplicate `data-birdkit-props`) |

### Component type classification

| Component | Behavior | UI Pattern |
|-----------|----------|------------|
| `CTableDouble` | Static multi-table grid | Multiple sub-tables rendered simultaneously, each with its own subtitle |
| `CTable` | Interactive dropdown selector | Single table view with a `<select>` dropdown to switch between data categories |

---

## Data Extraction Procedure

Birdkit renders ALL table data server-side into the SSR HTML. The hydration script
only wires up interactivity (dropdown selection, hover states) -- it does NOT fetch
data from an API. If data is visible in the HTML, extract it. If it is not in the
HTML, it will not appear in the recreated component.

### Step 1 -- Parse `<tr>/<td>` elements within Birdkit containers

Walk every `<tr>` and `<td>` element inside each Birdkit container div. For each
container:

1. Locate all `<table>` elements (older Birdkit) or flexbox `<div>` row containers
   (newer Birdkit).
2. For each table/container, separate header rows (`<thead>`) from body rows
   (`<tbody>`).

### Step 2 -- CTableDouble: Static multi-table extraction

For `CTableDouble` components:

1. **Locate sub-table titles**: Each sub-table within the grid has a `.subtitle`
   `<div>` (or element with class containing `subtitle`). Extract its text content
   as the sub-table title.
2. **Extract rows from `<tbody>`**: For each sub-table, walk every `<tr>` in
   `<tbody>` and extract cell values from `<td>` elements.
3. **Group by sub-table**: Store rows keyed by the sub-table title string.

### Step 3 -- CTable: Interactive dropdown extraction

For `CTable` components:

1. **Extract the dropdown `<select>` options**: Locate the `<select>` element
   within the container. Parse every `<option>` element to get:
   - `value` attribute (the programmatic key)
   - Text content (the display label)
2. **Extract the default visible table rows**: The SSR HTML renders the default
   option's data. Extract all rows from the visible `<tbody>`.
3. **Attempt full data extraction**: Check `data-birdkit-props` (JSON) and the
   hydration `<script>` for embedded data covering ALL dropdown options, not just
   the default.

### Step 4 -- Column definitions from `<thead>`

Parse each header cell in `<thead>` to build the column definition array. Common
columns for Olympic medal tables:

| Column | Key | Alignment | Header rendering |
|--------|-----|-----------|-----------------|
| Country name | `country` | `left` | Text label |
| Gold medals | `gold` | `center` | Gold circle SVG |
| Silver medals | `silver` | `center` | Silver circle SVG |
| Bronze medals | `bronze` | `center` | Bronze circle SVG |
| Total medals | `total` | `center` | Triangle of 3 mini circles |

### Step 5 -- Detect `.usabold` leading rows

Rows with the CSS class `.usabold` represent the leading/highlighted entry (e.g.,
the user's country or the top-ranked entry). These rows receive bold styling
(`font-weight: 700`). Detect this class and set a `bold: true` flag on those row
objects.

### Step 6 -- Extract route ID

From the hydration `<script>` block, parse the `route` object:

```javascript
route: { "id": "/olympics-alttop" }
```

Store this as the `route` field in the extraction output. It identifies which NYT
route originally hosted this table.

---

## Medal Circle Headers (CRITICAL)

Column headers for medal columns use **colored SVG circles**, NOT text labels like
"G", "S", "B", or "Tot." The agent must detect these visual elements and reproduce
them exactly.

### Individual medal circles

| Medal | Circle color | Size |
|-------|-------------|------|
| Gold | `#C9B037` | 12px diameter |
| Silver | `#A8A8A8` | 12px diameter |
| Bronze | `#AD8A56` | 12px diameter |

Each is rendered as a circular `<div>` or `<span>` with:

```css
width: 12px;
height: 12px;
border-radius: 50%;
background-color: #C9B037; /* or #A8A8A8 or #AD8A56 */
display: inline-block;
```

### Total column: Triangle arrangement of 3 mini circles

The "Total" column header does NOT use the text "Tot." or "Total". Instead, it
renders a **triangle arrangement of 3 mini circles**: gold on top, silver and
bronze on the bottom row.

```
    [gold]
  [silver][bronze]
```

Mini circle size: **8px diameter** each.

### React/JSX implementation pattern

```jsx
{/* Individual medal circle header */}
<div style={{
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: '#C9B037', // gold
  display: 'inline-block',
}} />

{/* Total column: triangle of 3 mini circles */}
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
  <div style={{
    width: 8, height: 8, borderRadius: '50%',
    backgroundColor: '#C9B037',
  }} />
  <div style={{ display: 'flex', gap: 1 }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      backgroundColor: '#A8A8A8',
    }} />
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      backgroundColor: '#AD8A56',
    }} />
  </div>
</div>
```

### Detection selectors in source HTML

```css
/* Individual medal circles */
span[style*="border-radius: 50%"][style*="background-color: #C9B037"]  /* Gold */
span[style*="border-radius: 50%"][style*="background-color: #A8A8A8"]  /* Silver */
span[style*="border-radius: 50%"][style*="background-color: #AD8A56"]  /* Bronze */

/* SVG circles (alternate rendering) */
svg circle[fill="#C9B037"], svg circle[fill="#A8A8A8"], svg circle[fill="#AD8A56"]
```

When a header cell contains 3 child elements with the three medal colors arranged
vertically or in a triangular pattern, classify it as the `total` column with
`medalCircle: "total"`.

---

## RULE: Consistent Row Count for Interactive Tables

> **RULE:** All dropdown options in an interactive table MUST show the same number
> of rows. When a category has fewer entries than the maximum, pad with placeholder
> rows using em-dash (---) in every cell. Use `_placeholder: true` flag on padded
> rows for styling (gray text, lighter weight).

### Rationale

Inconsistent row counts between dropdown options cause layout shift (content
jumping) when the user changes the selection. This makes the UI feel broken and
disrupts reading flow.

### Implementation

```typescript
// Calculate max rows across all dropdown options
const maxRows = Math.max(...options.map(opt => opt.rows.length));

// Pad each option's rows to maxRows
for (const option of options) {
  while (option.rows.length < maxRows) {
    const placeholderRow: Record<string, string | number | boolean> = {
      _placeholder: true,
    };
    for (const col of columns) {
      placeholderRow[col.key] = "\u2014"; // em-dash
    }
    option.rows.push(placeholderRow);
  }
}
```

### Placeholder row styling

Placeholder rows must render with:

- `color: #999999` (gray text)
- `font-weight: 400` (lighter weight than data rows)
- No hover highlight
- em-dash character in every cell, centered for numeric columns

---

## Component Recreation Fidelity Checklist

When `generate-article-page` creates the React replica from extraction data, it
must satisfy ALL of these criteria:

- [ ] **CSS flexbox or CSS grid layout** -- use `display: flex` or `display: grid`
      containers, NOT HTML `<table>` elements (matching Birdkit production behavior)
- [ ] **Font family** -- `nyt-franklin, sans-serif` as the primary typeface
- [ ] **Medal circles in header** -- 12px diameter circles with correct colors,
      NOT text characters like "G" / "S" / "B" / bullet characters
- [ ] **Total header triangle** -- 8px mini circles arranged in triangle (gold top,
      silver+bronze bottom), NOT "Tot." text
- [ ] **Row hover** -- `background: #f7f5f0` on mouse enter, transparent on leave
- [ ] **First row bold** (`.usabold`) -- `font-weight: 700` for the leading entry
- [ ] **Source note** -- 12px font-size, `color: #727272`, below the table
- [ ] **Max-width** -- `600px` matching the NYT `--g-width-body` CSS variable
- [ ] **Tabular numbers** -- `font-variant-numeric: tabular-nums` on all number
      columns for aligned digits
- [ ] **Column alignment** -- right-align number columns, left-align text columns
- [ ] **Number formatting** -- commas for thousands, consistent decimal places
- [ ] **Dropdown wiring** -- `useState` for selected option, `onChange` handler
      that swaps the displayed data
- [ ] **Consistent rows** -- all dropdown options padded to `maxRows` with
      placeholder rows using em-dash

---

## Output Schema

```typescript
interface BirdkitTableExtraction {
  /** Svelte component type */
  component: "CTableDouble" | "CTable";
  /** NYT route identifier from hydration script */
  route: string;
  /** Table title text */
  title: string;
  /** Column definitions */
  columns: Array<{
    /** Programmatic key for row data lookup */
    key: string;
    /** Display label (may be empty for medal-circle columns) */
    label: string;
    /** Text alignment */
    align: "left" | "center" | "right";
    /** Medal circle type for visual header rendering */
    medalCircle?: "gold" | "silver" | "bronze" | "total";
  }>;
  /**
   * Sub-tables for CTableDouble components.
   * Each entry has its own title and row data.
   */
  tables?: Array<{
    title: string;
    rows: Array<Record<string, string | number>>;
  }>;
  /**
   * Dropdown options for CTable components.
   * Each entry has a label, value, and its own row data.
   */
  options?: Array<{
    label: string;
    value: string;
    rows: Array<Record<string, string | number>>;
  }>;
  /** Maximum row count across all sub-tables or dropdown options */
  maxRows: number;
}
```

---

## Integration with contentBlocks

The extraction output maps to two `contentBlocks` entry types in the ARTICLES
config:

### CTableDouble -> `birdkit-table`

```typescript
{
  type: "birdkit-table",
  title: "Medal Count by Country",
  route: "/olympics-alttop",
}
```

This tells `ArticleDetailPage` to render a `MedalTable` component with the
corresponding data constant from `chart-data.ts`.

### CTable -> `birdkit-table-interactive`

```typescript
{
  type: "birdkit-table-interactive",
  title: "Medal Count by Sport",
  route: "/olympics-alttop",
}
```

This tells `ArticleDetailPage` to render a `MedalTableInteractive` component with
a dropdown selector and the full dataset from `chart-data.ts`.

---

## Data for Unavailable Dropdown Options

When the SSR HTML only contains the default option's data and no hydration script
or `data-birdkit-props` JSON includes the full dataset:

### Step 1 -- Mark missing options

For each dropdown `<option>` that has no corresponding extracted row data, create
an entry in the `options` array with an empty `rows` array and a `_dataMissing`
flag:

```typescript
{
  label: "Alpine Skiing",
  value: "alpine-skiing",
  rows: [],
  _dataMissing: true,
}
```

### Step 2 -- Pad with placeholder rows

Apply the consistent row count rule: pad every missing option's `rows` array to
`maxRows` using placeholder rows with em-dashes in every cell and
`_placeholder: true`.

### Step 3 -- Source note for missing data

When any options have `_dataMissing: true`, append a source note below the table:

> Data requires live Birdkit application

This tells the user that the recreated component has partial data and that the full
dataset can only be obtained from the live NYT page with JavaScript execution.

### Preferred approach: Use Chrome DevTools

When Chrome DevTools MCP is available and the page is accessible (not behind bot
detection), prefer extracting ALL dropdown option data live:

1. Navigate to the page.
2. For each dropdown option, simulate selection via `evaluate_script`:
   ```javascript
   const dropdown = document.querySelector('select');
   dropdown.value = 'Alpine Skiing';
   dropdown.dispatchEvent(new Event('change'));
   ```
3. After each selection, wait 200ms for Svelte reactivity, then extract the
   updated table rows.
4. Repeat for every option in the dropdown.

This produces a complete dataset with no missing options.

---

## CSS Property Extraction

For each table, extract the visual styling properties used in recreation:

| Property | Source | Typical value |
|----------|--------|---------------|
| `headerBg` | Header row background-color | `transparent` or `#f5f5f5` |
| `headerText` | Header cell color | `#333333` |
| `rowHoverBg` | Row `:hover` background | `#f7f5f0` |
| `borderColor` | Cell border-color | `#e0e0e0` |
| `fontSize` | Cell font-size | `14px` |
| `fontFamily` | Cell font-family | `nyt-franklin, sans-serif` |

Use `getComputedStyle()` via Chrome DevTools `evaluate_script` if the page is
accessible. Otherwise parse inline styles from the SSR HTML.

---

## Validation

Before emitting the extraction output, verify:

- [ ] Every dropdown option has data extracted (compare option count vs data keys)
- [ ] `maxRows` equals the maximum row count across ALL options or sub-tables
- [ ] Medal circle columns have valid hex color values (`#C9B037`, `#A8A8A8`, `#AD8A56`)
- [ ] Number columns contain parseable numeric values
- [ ] Column count is consistent across all rows and all options/sub-tables
- [ ] Static tables (`CTableDouble`) use the `tables` array, not `options`
- [ ] Interactive tables (`CTable`) use the `options` array, not `tables`
- [ ] `title` is non-empty
- [ ] `route` is non-empty
- [ ] At least 2 columns per table
- [ ] At least 1 row of data per table or option
- [ ] Placeholder rows have `_placeholder: true` flag set
- [ ] All placeholder cells contain em-dash, not hyphens or empty strings

---

## Naming Convention for Data Constants

Generated TypeScript constants follow the pattern:

```
BRAND_TABLE_TOPIC_DATA
```

Examples:

- `NYT_MEDAL_TABLE_STANDARD` -- static medal table (CTableDouble)
- `NYT_MEDAL_TABLE_ATHLETES` -- athlete medal table by sport (CTable)
- `NYT_MEDAL_TABLE_MID_LATITUDE` -- mid-latitude countries sub-table

The constant must satisfy either `MedalTableData` (static) or
`MedalTableInteractiveData` (dropdown) interface from `chart-data.ts`.

---

## Reference Implementation

The Winter Olympics article (`/admin/design-docs/nyt-articles/winter-olympics`)
was built using manual extraction of 6 Birdkit tables. The existing data
constants in `chart-data.ts` (`MEDAL_TABLE_STANDARD`, `MEDAL_TABLE_ATHLETES`,
etc.) serve as the reference for correct output format.

---

### Column Semantics (NEW)

Classify each column by content type:
```
type ColumnType = "country" | "numeric" | "medal-circle" | "percentage" | "text" | "rank";
```
Detection rules:
- Country: contains flag emoji or country name patterns
- Numeric: all cells are numbers (possibly with + or - prefix)
- Medal-circle: header contains SVG circle elements (gold/silver/bronze)
- Percentage: cells contain "%" suffix
- Text: default for non-numeric content
- Rank: sequential integers starting from 1

Include column types in extraction output: `columns: [{ name: string, type: ColumnType, width?: string }]`

### Accessibility Metadata (NEW)

Generate a11y attributes for the extracted table:
- `aria-label` for the table element: use the table title
- `scope="col"` for all header cells
- `scope="row"` for the first cell in each data row (if it's a country/label column)
- `role="table"` on the container element

Include in output: `a11y: { ariaLabel: string, headerScope: "col", firstColumnScope: "row" | null }`

### Renderer Parity Checks (NEW)

After extraction, verify the data will render correctly:
1. Row count: compare extracted rows against visible SSR `<tr>` count
2. Column count: compare extracted columns against SSR `<th>` count
3. Leading row styling: verify the "leading" country (e.g., USA) has correct bold/highlight data
4. If any count mismatches, warn: "Renderer parity check failed: extracted N rows but SSR shows M"
