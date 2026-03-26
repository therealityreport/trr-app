---
name: extract-css-tokens
description: Extract design tokens from CSS stylesheets
---

# Extract CSS Tokens

Extract structured design tokens from CSS stylesheets, inline style blocks, and CSS-in-JS output. Produce a normalized `CSSTokenMap` JSON object that downstream skills (generate-brand-section, generate-article-page) consume for theming and layout.

## Inputs

You will receive one or more of:

1. **CSS file URLs** -- fetch each URL and parse the response body as CSS.
2. **Inline `<style>` blocks** -- extracted from source HTML; parse the text content directly.
3. **`<link rel="stylesheet">` hrefs** -- treat identically to CSS file URLs.

When multiple sources are provided, merge them in document order. Later declarations override earlier ones for the same variable name.

### Fetching CSS from live pages

When working with a live page (not raw HTML), use the host's browser
capabilities to collect CSS:

1. **Navigate to the page:** `browser.navigate` with the target URL.
2. **Discover loaded stylesheets:** `browser.network.list` filtered to stylesheet resources to find loaded CSS URLs.
3. **Read stylesheet contents:** `browser.evaluate` to run in-page JS that reads `document.styleSheets` or fetches CSS text via `fetch()`:
   ```js
   async () => {
     const sheets = [];
     for (const ss of document.styleSheets) {
       try { sheets.push({ href: ss.href, rules: [...ss.cssRules].map(r => r.cssText).join('\n') }); }
       catch(e) { if (ss.href) { const r = await fetch(ss.href); sheets.push({ href: ss.href, rules: await r.text() }); } }
     }
     return sheets;
   }
   ```
4. **Read inline styles:** `browser.evaluate` to extract `<style>` block contents from the DOM.

## Output Schema

Return a single JSON object conforming to `CSSTokenMap`:

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

## Step-by-Step Procedure

### Step 1 -- Collect Raw CSS

- For each URL, fetch the resource. If the response is HTML (content-type `text/html`), extract all `<style>` blocks and `<link rel="stylesheet">` hrefs recursively (one level deep only).
- Concatenate all CSS text into a single working string, preserving source order.
- If the CSS is minified (no newlines or very long lines), insert newlines before every `{` and `}` to normalize it for regex parsing.

### Step 2 -- Extract Raw CSS Variables

Scan for custom property declarations inside `:root`, `html`, and `body` rule blocks.

**Regex pattern:**

```
/:root\s*\{([^}]+)\}/g
/html\s*\{([^}]+)\}/g
/body\s*\{([^}]+)\}/g
```

Within each matched block, extract individual variable declarations:

```
/(--[\w-]+)\s*:\s*([^;]+);/g
```

Store every match in `rawVariables` as `{ [varName]: resolvedValue }`.

**Variable resolution:** If a value references another variable via `var(--name)` or `var(--name, fallback)`, resolve it by looking up the referenced variable in the current map. Apply resolution up to 3 levels deep to handle chained references. If unresolvable, keep the raw `var(...)` expression.

### Step 3 -- Parse @font-face Blocks

**Regex pattern:**

```
/@font-face\s*\{([^}]+)\}/g
```

Within each block, extract:

| Property       | Pattern                                                  |
| -------------- | -------------------------------------------------------- |
| font-family    | `/font-family\s*:\s*['"]?([^'";,]+)['"]?/`              |
| font-weight    | `/font-weight\s*:\s*(\d+(?:\s+\d+)?)/`                  |
| font-style     | `/font-style\s*:\s*(italic|oblique|normal)/`             |
| src URL        | `/url\(['"]?([^'")\s]+)['"]?\)/`                         |
| format         | `/format\(['"]?([^'")\s]+)['"]?\)/`                      |

Group fonts by family name. Merge weight values into a single `weights: number[]` array per family. If a weight range like `100 900` is found, expand to `[100, 200, 300, 400, 500, 600, 700, 800, 900]`.

**Role heuristics for fonts:**

- If the family name or its CSS variable contains `heading`, `display`, `title`, or `serif` (and is the first/primary font), assign `role: "heading"`.
- If it contains `body`, `text`, `sans`, `system`, or `ui`, assign `role: "body"`.
- If it contains `mono`, `code`, or `courier`, assign `role: "code"`.
- If a CSS variable like `--font-heading` or `--ff-body` maps to this family, record it in `cssVar`.

### Step 4 -- Classify Colors

Collect colors from two sources:

1. **CSS variables** whose values are color-like: hex (`#xxx`, `#xxxxxx`, `#xxxxxxxx`), `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)`, named CSS colors.
2. **Inline property values** for `color`, `background-color`, `background`, `border-color`, `border`, `outline-color`, `fill`, `stroke`, `accent-color`.

**Color detection regex:**

```
/#(?:[0-9a-fA-F]{3,4}){1,2}\b/
/rgba?\(\s*\d+[\s,]+\d+[\s,]+\d+(?:[\s,/]+[\d.]+%?)?\s*\)/
/hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*[\s,]+[\d.]+%?\s*[\s,]+[\d.]+%?(?:[\s,/]+[\d.]+%?)?\s*\)/
```

**Semantic role assignment heuristics:**

| Variable name or property contains | Assigned role       | Target bucket  |
| ---------------------------------- | ------------------- | -------------- |
| `text`, `fg`, `foreground`, `font` | `text`              | `colors.core`  |
| `bg`, `background`, `surface`      | `background`        | `colors.core`  |
| `border`, `outline`, `divider`     | `border`            | `colors.core`  |
| `accent`, `primary`, `brand`       | `accent`            | `colors.core`  |
| `link`, `hover`, `active`, `focus` | `interactive`       | `colors.core`  |
| `error`, `warning`, `success`      | `status`            | `colors.semantic` |
| `info`, `danger`, `muted`          | `status`            | `colors.semantic` |
| `shadow`, `overlay`, `backdrop`    | `effect`            | `colors.semantic` |
| `gradient`, `svg`, `icon`, `img`   | (none -- graphical) | `colors.graphics` |

Colors that do not match any heuristic go into `colors.core` with `role: "unknown"`.

### Step 5 -- Extract Spacing Patterns

Scan for `margin` and `padding` shorthand and longhand properties across all rule blocks.

**Regex pattern:**

```
/(?:margin|padding)(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+);/g
```

Parse each value and collect unique spacing values. Normalize:

- Convert `0px` to `0`.
- Keep `rem`, `em`, `px`, `%`, `vw`, `vh` units as-is.
- Ignore `auto`, `inherit`, `initial`, `unset`.

Also scan CSS variables whose names contain `space`, `gap`, `margin`, `padding`, `gutter`.

Store as `spacing: Record<string, string>` where keys are semantic names (from variable names) or generated keys like `sp-{value}` for raw values. Deduplicate by resolved value.

### Step 6 -- Extract Border-Radius Patterns

**Regex pattern:**

```
/border-radius\s*:\s*([^;]+);/g
```

Also collect CSS variables containing `radius`, `rounded`, `corner`.

Collect unique values into `radius: string[]`, sorted by numeric magnitude (treat `rem` as `rem * 16` for sorting). Deduplicate.

### Step 7 -- Extract Layout Widths

**Regex pattern:**

```
/max-width\s*:\s*([^;]+);/g
/width\s*:\s*([^;]+);/g
/min-width\s*:\s*([^;]+);/g
```

Also collect CSS variables containing `width`, `container`, `breakpoint`, `screen`.

Ignore percentage-only widths and `100%`, `100vw`, `auto`, `fit-content`, `min-content`, `max-content`.

Store as `layoutWidths: Record<string, string>` where keys are semantic names from variable names, or generated from context (e.g., `max-width-article` if found inside an `.article` or `[class*="article"]` selector).

### Step 8 -- Handle CSS-in-JS Hashed Classes

CSS-in-JS libraries (Emotion, styled-components, Linaria) produce classes like `.css-1a2b3c`, `.sc-abc123`, `.emotion-0`.

**Detection regex:**

```
/\.(css|sc|emotion|styled|stitches|vanilla)-[a-z0-9]+/g
```

When these are detected:

1. Do NOT use the hashed class name as a semantic key.
2. Instead, inspect the property values inside the rule block and assign tokens based on the property names and values (same heuristics as above).
3. If a hashed class contains a `font-family` declaration, check if the value matches a known `@font-face` family and link them.
4. Prefix generated keys with `cssinjs-` to flag their origin.

### Step 9 -- Multi-File Merging

When processing multiple CSS sources:

- Later sources override earlier ones for variables with the same name.
- Font families are merged: if the same family appears in multiple files, union their weights.
- Colors are deduplicated by resolved value; keep the most semantically named version.
- Spacing, radius, and layout widths are unioned and deduplicated.
- `rawVariables` is the full merged map.

### Step 10 -- Final Assembly and Validation

Assemble the `CSSTokenMap` object. Before returning, validate:

1. `colors.core` is non-empty (warn if empty -- the source may lack CSS variables).
2. `fonts` is non-empty (warn if empty -- the source may use system fonts only).
3. All `rawVariables` values are resolved (no unresolved `var(...)` references remain, or they are flagged).
4. No duplicate entries exist in any array.

## CRITICAL: Per-Article Font Accuracy

The `fonts` array extracted here feeds into BOTH the brand section AND each
article's config entry. Each article may use the same font families but with
**different sizes, weights, styles, and alignment**.

**DO NOT copy-paste font data between articles.** Each article's `fonts` array
must reflect the actual computed styles from THAT specific page. For example,
NYT uses `nyt-cheltenham` for headlines in both interactive and standard
articles, but:

| Property | Interactive article | Standard article |
|----------|-------------------|-----------------|
| font-size | 45px | 31px |
| font-weight | 800 | 700 |
| font-style | normal | italic |
| text-align | center | left |

If working from static HTML, extract font styles from:
1. Inline `style` attributes on heading elements
2. CSS class rules that match the heading elements
3. `<style>` blocks that contain the relevant selectors

If working from a live page, use `getComputedStyle()` on the actual heading
element to get the resolved values.

**Never assume** one article's font metrics apply to another, even within the
same publication.

---

## Edge Cases

**Minified CSS:** Normalize by inserting newlines before `{`, `}`, and `;` before applying regexes.

**Media queries and @supports:** Extract tokens from inside these blocks as well. Prefix variable names from media queries with the condition for context (e.g., `@media(prefers-color-scheme:dark)/--color-bg`), but store the light-mode / default value as the primary entry.

**!important declarations:** Strip `!important` before storing values.

**Shorthand properties:** For `background`, `border`, `font` shorthands, attempt to decompose into individual values. If decomposition is ambiguous, store the full shorthand value and flag it.

**Empty or inaccessible URLs:** If a CSS URL returns a non-200 status or times out, log a warning and continue with remaining sources. Do not fail the entire extraction.

**Duplicate variable names in different scopes:** Prefer `:root` over `html` over `body`. If the same variable appears in a media query and at root level, the root-level value is the primary; the media-query value is noted but not overridden.

## Example Output
```json
{
  "colors": {
    "core": [
      { "name": "--color-text-primary", "value": "#1a1a1a", "role": "text" },
      { "name": "--color-bg", "value": "#ffffff", "role": "background" },
      { "name": "--color-accent", "value": "#e63946", "role": "accent" },
      { "name": "--color-border", "value": "#dee2e6", "role": "border" }
    ],
    "graphics": [
      { "name": "--color-svg-fill", "value": "#457b9d" }
    ],
    "semantic": [
      { "name": "--color-error", "value": "#dc3545", "role": "status" },
      { "name": "--color-success", "value": "#28a745", "role": "status" }
    ]
  },
  "fonts": [
    {
      "family": "GT Sectra",
      "weights": [400, 700],
      "style": "normal",
      "srcUrl": "https://example.com/fonts/GTSectra-Regular.woff2",
      "format": "woff2",
      "role": "heading",
      "cssVar": "--font-heading"
    },
    {
      "family": "Inter",
      "weights": [400, 500, 600, 700],
      "role": "body",
      "cssVar": "--font-body"
    }
  ],
  "spacing": {
    "--space-xs": "0.25rem",
    "--space-sm": "0.5rem",
    "--space-md": "1rem",
    "--space-lg": "2rem",
    "--space-xl": "4rem"
  },
  "radius": ["0.25rem", "0.5rem", "1rem", "9999px"],
  "layoutWidths": {
    "--width-article": "680px",
    "--width-container": "1200px",
    "--width-wide": "1440px"
  },
  "rawVariables": {
    "--color-text-primary": "#1a1a1a",
    "--color-bg": "#ffffff",
    "--color-accent": "#e63946",
    "--font-heading": "GT Sectra",
    "--font-body": "Inter",
    "--space-md": "1rem",
    "--width-article": "680px"
  }
}
```

---

## CRITICAL: Per-Article Color Extraction

Do NOT assume all articles use the same color palette. Each article's colors
must be extracted independently from that article's actual CSS classes and
inline styles.

**Common mistake**: Medal tables use Olympic gold/silver/bronze colors
(`#C9B037`, `#A8A8A8`, `#AD8A56`), not Datawrapper chart colors. An economics
article may use a red line color (`#bf1d02`) while a sports article uses
entirely different colors. Carrying forward colors from a previous article
extraction will produce incorrect results.

**Procedure**:

1. When extracting colors, always work from the CSS rules that apply to the
   specific article being processed.
2. Look for colors in:
   - Inline `style` attributes on table cells, chart elements, and decorative
     elements
   - CSS class rules that match elements in the article body
   - SVG `fill` and `stroke` attributes on inline SVG elements
   - Background colors on medal/badge/status indicator elements
3. If the article uses a domain-specific color palette (e.g., Olympic medal
   colors, election party colors, financial gain/loss colors), document these
   in the `colors.graphics` array with descriptive `name` values that reflect
   their semantic meaning in the article context (e.g., `"medal-gold"`,
   `"party-democrat"`, `"gain-positive"`).

---

## Step 3b — Extract Computed Element Styles

When Chrome DevTools MCP or WebFetch is available, extract EXACT computed
values for key elements. Do NOT rely solely on `@font-face` declarations to
determine which weights are actually used.

Target elements for computed style extraction:

| Element | Properties to extract |
|---------|----------------------|
| `h1` (headline) | fontSize, fontWeight, lineHeight, letterSpacing, fontStyle, textAlign, color, className |
| `h2` (section heading) | Same — values MUST differ from h3 |
| `h3` (sub-section heading) | Same — values MUST differ from h2 |
| Body text `p` (first body paragraph) | Same |
| Datawrapper chart title (if present) | Same |
| Nav labels | Same |
| Image credit text | Same |

Use `evaluate_script` with `getComputedStyle()` to read these properties from
the live page, or parse inline styles from the source HTML when DevTools is
unavailable.

### RULE: Always Extract — Never Assume Heading Styles

Do NOT use a lookup table of known heading styles. Every page may have different
heading values. Extract the ACTUAL computed styles from every page independently.

If the extracted h2 and h3 values are identical (same fontSize, fontWeight,
lineHeight), STOP and investigate — they almost certainly differ on the live
page. Common causes of false-identical extraction:
- Both h2 and h3 resolved to the same CSS rule because the selector was too broad
- The extraction read only one heading level and assumed the other matches
- The source HTML was incomplete (e.g., missing closing tags caused DOM misparse)

### Output format for `usedIn`

Each `usedIn` entry MUST follow this format:

```
"className: size/weight/lineHeight letterSpacing color"
```

Examples:
- `"Article_Headline__ou0D2: 40px/400/44px 0px #121212"`
- `"Storyline_StorylineTitle__lns7V: 15px/700/15px 0px #121212"`
- `"Datawrapper th span.dw-bold: 13.76px/500 uppercase 0.08px #52524F"`

Do NOT use vague descriptions like "Article headline" or "Chart axis labels".

### RULE: Enumerate all used weights

The `weights` array for each font family must include ALL weights actually USED
on the page, not just what `@font-face` declares.

If `@font-face` declares `font-weight: 100 900` (variable font range), you must
still enumerate the specific weights found in computed styles.

Example: If `nyt-cheltenham` is used at weights 400 (headline), 500 (h3), and
700 (h2), list `weights: [400, 500, 700]`, not just `[500]`.

---

## Step 4b — Context-Specific Color Extraction

Colors must be extracted from ALL rendering contexts, not just CSS `:root`
variables:

| Context | What to extract | Example |
|---------|----------------|---------|
| **Link colors** | `a` elements' computed `color` | `#386C92` |
| **Dark-bg text** | Nav/header elements on dark backgrounds | `#DBDBD9`, `#F0F0EE` |
| **Pure black vs near-black** | Distinguish `#000000` from `#121212` | Used differently in Athletic |
| **Footer colors** | Section header color, link color on dark footer bg | `#F0F0EE` headers, `#C4C4C0` links |
| **Datawrapper theme** | Parse `window.__DW_SVELTE_PROPS__` or theme CSS | Chart-specific text/border colors |
| **Dark mode** | `@media (prefers-color-scheme: dark)` or `.dw-dark` selectors | `#121212` bg, `#f0f0ee` text |
| **Heatmap per-row** | Each rendered heatmap `td`'s background-color and color | `{ "18.1%": { bg: "#002728", fg: "#FFFFFF" } }` |

---

## RULE: Per-Article Color and Font Enforcement

**NEVER copy fonts or colors from another article's config entry.** Each
article's `fonts` and `colors` data must be independently extracted from that
article's source HTML and CSS.

### Validation before emitting

1. Compare extracted font `weights` against computed styles from the source HTML.
   If a weight appears in `@font-face` but is NOT used by any element, remove it.
2. Compare extracted `usedIn` entries against actual elements in the source HTML.
   Every `usedIn` entry must correspond to a real element.
3. Compare against existing ARTICLES entries in `design-docs-config.ts` to detect
   accidental duplication. If the `fonts` array is byte-identical to another
   article's `fonts` array, STOP and warn — the data was likely copied, not
   extracted.

---

## RULE: Per-Article Font Accuracy (Strict)

NEVER copy font data from another article's config entry. Each extraction MUST
produce fresh font metrics from the source HTML. Before emitting, compare
against existing ARTICLES entries — if the `fonts` array is byte-identical to
ANY other article's `fonts` array, **STOP and re-extract from the source**.

This applies even when two articles are from the same publication. Different
articles use different font sizes, weights, styles, and alignment. A shared
font family (e.g., `nyt-cheltenham`) does NOT mean shared metrics.

Enforcement checklist:
1. Extract font metrics from the actual source HTML/CSS for THIS article.
2. Do not reference, copy, or consult another article's config entry during extraction.
3. After extraction, serialize the `fonts` array and compare against every
   existing ARTICLES entry's `fonts` array. If any match is byte-identical,
   the extraction is invalid — discard and re-extract.

## RULE: Per-Article Color Accuracy (Strict)

Each article MUST have its own `colors.chartPalette` extracted from its actual
CSS, SVG, and inline styles. NEVER carry forward colors from another article.

Before emitting color data:
1. Verify every hex value in `chartPalette` appears in the source HTML/CSS
   being processed (search for the literal hex string in the source).
2. If a hex value does NOT appear in the source, remove it — it was likely
   carried over from a previous extraction.
3. Compare the emitted `chartPalette` against existing ARTICLES entries. If
   identical to another article's palette, STOP and re-extract.

Domain-specific palettes (Olympic medal colors, election party colors,
financial gain/loss) are per-article by nature and must never be reused.

---

## Final Validation: Cross-Check Against Source HTML

Before returning ANY extraction result, perform this mandatory cross-check:

1. **Fonts**: For each font entry in the output, confirm the `family` name
   appears in the source HTML (in a `@font-face` block, `font-family` property,
   or inline style). Confirm each listed `weight` value appears in a computed
   style or CSS rule in the source.

2. **Colors**: For each color hex value in the output, confirm the hex string
   (case-insensitive) appears somewhere in the source HTML or CSS. If the color
   was derived from `rgb()` or `hsl()`, confirm the original function call
   appears in the source.

3. **usedIn entries**: For each `usedIn` string, confirm the referenced
   className or element selector exists in the source HTML.

4. **Cross-article duplication**: Load existing ARTICLES from
   `design-docs-config.ts`. If the extracted `fonts` OR `colors.chartPalette`
   is identical to another article, flag the extraction as suspect and
   re-extract from scratch.

If any check fails, do NOT emit the result. Fix the extraction and re-validate.

---

## usedIn String Format (for Live Specimens)

When populating the `usedIn` array in the fonts config, each entry MUST follow a parseable format so ArticleDetailPage can render live font specimens.

### Format

```
"element.ClassName: {fontSize}px/{fontWeight}/{lineHeight}px [font-style:X] [text-align:X] [letter-spacing:Xem] [uppercase] #RRGGBB"
```

### Extraction procedure

For each unique text style found in the source HTML:

1. **Identify the element**: tag name + CSS class or component name
2. **Extract computed styles**: Use Chrome DevTools MCP `evaluate_script` with `getComputedStyle(el)` or read from the inline `<style>` block
3. **Record these properties**:
   - `font-size` (in px)
   - `font-weight` (numeric: 300, 400, 500, 600, 700, 800)
   - `line-height` (in px or unitless)
   - `font-style` (normal or italic) — only include if italic
   - `text-align` (left, center, right) — only include if not left
   - `letter-spacing` (in em or px) — only include if non-zero
   - `text-transform` (uppercase) — only include if uppercase
   - `color` (as #RRGGBB hex)
4. **Format as**: `"element.Class: {size}px/{weight}/{lineHeight}px [modifiers] #color"`
5. **Deduplicate**: Two elements with identical computed styles should be merged into one entry with both names
