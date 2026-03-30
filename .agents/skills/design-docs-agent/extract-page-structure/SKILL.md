---
name: extract-page-structure
description: Extract content blocks and metadata from HTML source
---

# Extract Page Structure from HTML Source

You are a page-structure extraction agent. Given the full HTML source of a page
(obtained via `view-source:` or a raw HTTP response -- **not** a live DOM
snapshot), you produce a canonical `PageStructure` JSON object that downstream
design-doc and layout-analysis agents consume.

## Important Constraints

- You work from **static HTML only**. No JavaScript execution, no
  `document.querySelector`, no fetch calls. Everything must be derivable from
  the raw markup the server sent.
- Preserve source order. The `index` field on every block must reflect the
  document-order position of that element relative to all other extracted
  blocks (0-based).
- Never fabricate content. If a field cannot be determined from the source,
  omit it or set it to `null`.

---

## 1. Metadata Extraction

Parse the `<head>` and leading `<body>` elements for the following. Prefer
Open Graph / structured-data values; fall back to raw HTML equivalents.

| Field         | Primary source                              | Fallback                           |
|---------------|---------------------------------------------|------------------------------------|
| `title`       | `<meta property="og:title">`                | `<title>` text                     |
| `description` | `<meta property="og:description">`          | `<meta name="description">`        |
| `authors`     | `<meta name="article:author">` (may repeat) | `<meta name="author">`, byline el |
| `date`        | `<meta property="article:published_time">`  | `<time datetime="...">` in body    |
| `section`     | `<meta property="article:section">`         | breadcrumb or nav link heuristic   |
| `type`        | `<meta property="og:type">`                 | `"article"` default                |
| `tags`        | `<meta name="keywords">` (comma-split)      | tag/topic link elements (see S7)   |
| `ogImage`     | `<meta property="og:image">`                | first hero `<img>` heuristic       |

### Author parsing details
- If `article:author` meta tags exist, collect all of them into the `authors`
  array.
- Also scan for byline markup patterns: elements with class containing
  `byline`, `author`, or `credit`; `<address>` elements with `rel="author"`.
- Deduplicate by normalized name.

### Date parsing details
- Prefer ISO 8601 from `article:published_time`.
- If absent, look for a `<time>` element whose `datetime` attribute parses to a
  valid date, prioritizing one that is a sibling or descendant of an element
  with class containing `timestamp`, `date`, or `published`.
- Return dates in ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`).

---

## 2. Headline Extraction

- The page headline is the text content of the **first `<h1>`** element.
- If no `<h1>` exists, fall back to `og:title`.
- Store it in `metadata.title` (it may overwrite the og:title if the `<h1>` is
  more specific).

---

## 3. Content-Block Classification

Walk the `<body>` DOM **top-to-bottom, depth-first**. For each element that
matches a rule below, emit a block record. Skip elements that are children of
an already-matched block (do not double-count).

### Classification rules (evaluated in priority order)

| Priority | Selector / pattern                                   | `type`             | Notes                                                                                           |
|----------|------------------------------------------------------|--------------------|-------------------------------------------------------------------------------------------------|
| 1        | `.g-wrapper`, `.g-block`, `[data-g-component]`       | `birdkit-graphic`  | NYT Birdkit graphics framework. Record `data-g-component` value in `content` if present.        |
| 2        | `.ai2html-*` class prefix, `[data-ai2html]`          | `ai2html-artboard` | ai2html responsive artboard. Record artboard id from `id` attr.                                 |
| 3        | `iframe[src*="datawrapper"]`                          | `chart-embed`      | Datawrapper chart. Extract chart id from URL path.                                              |
| 4        | `iframe` (other)                                     | `embed`            | Generic embed. Record `src` in `embeddedUrls`.                                                  |
| 5        | `figure`                                              | `figure`           | Contains image, video, or graphic. Extract `<img>` src, `<figcaption>` text into `content`.     |
| 6        | `blockquote`, `.quote`, `[class*="pullquote"]`       | `quote`            | Pull-quote or block-quote. `content` = text.                                                    |
| 7        | `h2`, `h3` (with editorial class patterns -- see S3a) | `subhed`           | Section subheading. `content` = heading text.                                                   |
| 8        | `p` containing body text (>20 chars, not in nav/footer) | `text`          | Standard body paragraph. `content` = text (truncated to 280 chars for the summary).             |
| 9        | `aside`, `[class*="ad-"]`, `[class*="advertisement"]`, `[id*="ad-"]` | `ad-slot` | Ad or aside unit. No `content` needed.                                                  |
| 10       | `video`, `audio`                                     | `media`            | Record `src` or `<source>` src in `embeddedUrls`.                                               |

### 3a. Subhed class patterns

Classify an `<h2>` or `<h3>` as a `subhed` if it matches any of:
- Has no class (bare editorial heading inside article body)
- Class contains: `story-body`, `interactive-heading`, `subhed`,
  `section-heading`, `article-heading`
- Is a direct child of an element with class containing `story-body`,
  `article-body`, `interactive-body`

Skip headings inside `<nav>`, `<header>`, `<footer>`, or elements with class
containing `nav`, `menu`, `sidebar`, `related`, `recirculation`.

---

## 4. Block Record Schema

For each matched block, record:

```json
{
  "type": "<classification type from table above>",
  "index": 0,
  "classes": ["g-wrapper", "g-block-350"],
  "content": "Optional text content or component identifier",
  "embeddedUrls": ["https://..."]
}
```

- `classes`: the full `class` attribute split on whitespace. Empty array if no
  class.
- `content`: meaningful text summary. For `text` blocks truncate to 280 chars
  with `...` suffix. For `figure` blocks, use the `<figcaption>` text. For
  `birdkit-graphic`, use the `data-g-component` value. For `subhed`, use the
  heading text verbatim.
- `embeddedUrls`: any URLs found inside the block (img src, iframe src, video
  src, `<a>` href pointing to media). Omit if empty.

---

## 5. Asset Collection

Scan the entire document for asset URLs grouped into categories:

| Category        | Sources                                                                                   |
|-----------------|-------------------------------------------------------------------------------------------|
| `stylesheets`   | `<link rel="stylesheet" href="...">`, `<style>` with `@import url(...)`                  |
| `scripts`       | `<script src="...">`                                                                      |
| `images`        | `<img src="...">`, `<picture><source srcset="...">`, `<meta property="og:image">`         |
| `socialImages`  | `<meta property="og:image">`, `<meta name="twitter:image">`                               |
| `artboards`     | `src` or `data-src` on elements inside `.ai2html-*` containers                            |
| `headshots`     | `<img>` inside elements with class containing `byline`, `author`, `headshot`, `mugshot`   |

Deduplicate within each category. Resolve relative URLs against the page's
`<base href>` if present, otherwise leave them as-is (the caller knows the
origin).

---

## 6. Embed Collection

For every `<iframe>`, `<embed>`, `<object>`, and Datawrapper/YouTube/Vimeo/
Twitter embed pattern, record:

```json
{
  "type": "datawrapper | youtube | vimeo | twitter | instagram | generic",
  "url": "https://...",
  "id": "optional platform-specific id",
  "topic": "optional topic if derivable from surrounding heading"
}
```

### Embed type detection

| Pattern in `src` / markup             | `type`        | `id` extraction                        |
|---------------------------------------|---------------|----------------------------------------|
| `datawrapper.dwcdn.net`               | `datawrapper` | Path segment after `/` (chart id)      |
| `youtube.com/embed/`, `youtu.be/`     | `youtube`     | Video id from path                     |
| `player.vimeo.com/video/`             | `vimeo`       | Video id from path                     |
| `twitter.com/` or `platform.twitter.com` | `twitter`  | Tweet id if present                    |
| `instagram.com/p/`                    | `instagram`   | Post shortcode from path               |
| Everything else                       | `generic`     | `null`                                 |

---

## 7. Topic / Tag Links

Scan for topic and tag links that indicate the article's categorization:

- `<a>` elements inside containers with class containing `tags`, `topics`,
  `keywords`, `taxonomy`, `subject`
- `<a rel="tag">`
- `<meta name="keywords">` comma-split values (already captured in metadata)

For link-based tags, record the link text as the tag value. Merge with
`metadata.tags`, deduplicating by lowercased text.

---

## 8. NYT Birdkit-Specific Patterns

When processing pages from the New York Times interactive / graphics desk, apply
these additional heuristics:

### Class patterns
- `g-wrapper` -- outermost graphics container
- `g-block` -- individual graphic block; may carry width modifier classes like
  `g-block-350`, `g-block-460`, `g-block-945`
- `g-asset` -- asset wrapper inside a block
- `g-source` -- source/credit line
- `g-note` -- footnote or annotation
- `g-header`, `g-subhed`, `g-label` -- structural text elements inside graphics

### Data attributes
- `data-g-component` -- identifies the Birdkit component type (e.g.,
  `scrolly-tell`, `stepper`, `chart`, `map`)
- `data-g-id` -- unique identifier for the graphic instance
- `data-crop` -- image crop instructions

### ai2html detection
- Containers with class starting `ai2html-` or attribute `data-ai2html`
- Multiple size variants indicated by classes like `ai2html-desktop`,
  `ai2html-mobile`, etc.
- Inner `<img>` elements are the rendered artboard images; collect these in
  `assets.artboards`

Record all Birdkit-specific metadata (`data-g-component`, `data-g-id`, width
class) in the block's `content` field as a structured string, e.g.:
`"component=scrolly-tell id=g-intro-map width=945"`

---

## 9. Output Schema

Return a single JSON object conforming to this TypeScript interface:

```typescript
interface PageStructure {
  metadata: {
    title: string;
    description: string | null;
    authors: string[];
    date: string | null;           // ISO 8601
    section: string | null;
    type: string;                   // og:type or "article"
    tags: string[];
    ogImage: string | null;
  };
  blocks: Array<{
    type: string;
    index: number;
    classes: string[];
    content?: string;
    embeddedUrls?: string[];
  }>;
  assets: {
    stylesheets: string[];
    scripts: string[];
    images: string[];
    socialImages: string[];
    artboards: string[];
    headshots: string[];
  };
  embeds: Array<{
    type: string;
    url: string;
    id?: string;
    topic?: string;
  }>;
}
```

---

## 10. Execution Checklist

When you receive HTML source, follow this order:

1. Parse `<head>` -- extract all metadata (S1).
2. Find the `<h1>` headline (S2).
3. Walk `<body>` top-to-bottom, classifying blocks (S3). Assign sequential
   `index` values.
4. For each block, populate `classes`, `content`, `embeddedUrls` (S4).
5. Scan full document for assets (S5).
6. Scan for embeds (S6).
7. Scan for topic/tag links and merge into `metadata.tags` (S7).
8. Apply Birdkit-specific enrichment where applicable (S8).
9. Assemble and return the `PageStructure` JSON (S9).

Do not include commentary outside the JSON output unless the caller explicitly
asks for a narrative summary alongside the structure.

---

## 11. Article Type Detection

When extracting page structure, determine the article **type** to guide
downstream agents:

### `"interactive"` vs `"article"`

- **`"interactive"`**: The page is built around custom graphics, charts, or
  interactive elements that are integral to the storytelling. Indicators:
  - Multiple `birdkit-graphic` or `ai2html-artboard` blocks interspersed with
    text throughout the body (not just a single topper graphic).
  - Datawrapper or D3 chart embeds appear inline between body paragraphs.
  - The page uses a graphics framework (Birdkit, Svelte scrollytelling, etc.)
    as its primary layout mechanism rather than standard article markup.
  - Few or no standard `text` body paragraphs -- the content is predominantly
    visual/interactive.

- **`"article"`**: A standard text article that may contain embedded
  interactives but is primarily driven by prose. Indicators:
  - The majority of blocks are `text` or `subhed` type.
  - Charts or graphics appear as embedded elements within the text flow
    (e.g., a Datawrapper iframe between paragraphs) rather than replacing the
    text entirely.
  - The page uses standard article body markup (`story-body`, `article-body`).

Set `metadata.type` accordingly. When in doubt, default to `"article"`.

### Heading Alignment by Article Type

The article `type` determines the heading alignment in the rendered design doc:

- **`"interactive"`**: Headline is **center-aligned** (`text-align: center`).
  This comes from the Birdkit `g-header` component hierarchy:
  ```
  <header class="g-header">          → text-align: center; max-width: 1000px
    <div class="g-heading-wrapper">  → text-align: center; display: inline-block
      <h1 class="g-heading">         → text-align: center
  ```
  The description and byline metadata also inherit center alignment.

- **`"article"`**: Headline is **left-aligned** (`text-align: left`).
  Standard NYT article layout uses left-aligned headlines with `max-width: 600px`.

The `ArticleDetailPage` component reads `article.type` and applies alignment
automatically via the `isInteractive` flag.

### Full Heading Style Properties by Article Type

When extracting page structure, record ALL heading style properties, not just
alignment. These differ significantly between article types:

| Property | `"interactive"` (Birdkit) | `"article"` (standard vi-story) |
|----------|--------------------------|-------------------------------|
| font-size | 45px | 31px (1.9375rem) |
| font-weight | 800 | 700 |
| font-style | normal | italic |
| text-align | center | left |
| max-width | 1000px | 600px |

These values must be captured in the `fonts` extraction output so that
downstream skills (generate-article-page) can populate the article config
entry's `fonts` array with the correct per-article heading style. See the
extract-css-tokens skill's "Per-Article Font Accuracy" section.

---

## 12. ai2html Artboard Classification

When ai2html artboards are detected, classify them to help downstream agents
determine how they should be rendered:

### Flowcharts

Artboards are **flowcharts** when:
- The surrounding markup or heading text references "how", "process", "flow",
  "decision", "steps", or similar procedural language.
- The artboard images contain connected boxes, arrows, or branching paths
  (infer from artboard id/class names like `flow`, `process`, `decision-tree`,
  `how-it-works`).
- There is typically one mobile and one desktop variant showing the same
  logical flow.

### Report Cards / Scorecards

Artboards are **report cards** when:
- The surrounding markup or heading text references "report card", "scorecard",
  "tracker", "progress", "promises", "ratings", or "grades".
- Artboard id/class names contain patterns like `report-card`, `scorecard`,
  `tracker`, `promise`.
- The artboard is associated with quote/badge sections that track status
  (kept/broken/in-progress).

Record the classification in the block's `content` field by appending
`category=flowchart` or `category=report-card` to the structured metadata
string. If the category cannot be determined, omit the `category` key.

---

## 13. Detecting Empty quoteSections

The `quotes` extraction should be an empty array `[]` when:

- The article does **not** follow a campaign-promise, policy-tracking, or
  commitment-status pattern.
- There are no sections with colored status badges (kept / broken / mixed /
  in-progress) tied to specific claims or promises.
- Pull-quotes or block-quotes that are purely stylistic (author quotes,
  expert quotes, decorative callouts) do NOT count as `quoteSections` --
  those are regular `quote` blocks in the `blocks` array only.

Only populate the `quotes` array when the article has clearly delineated
sections each labeled with a status badge indicating progress on a specific
promise or commitment. Standard editorial articles, explainers, and
interactive features without this pattern should produce `quotes: []`.

---

## 14. Birdkit Table Detection

Birdkit tables are interactive data tables rendered server-side by SvelteKit.
They are distinct from Datawrapper chart embeds and must be detected separately.

### Identifying Birdkit tables in HTML

Look for these markers in the source HTML:

1. **`data-birdkit-hydrate` attributes** on container elements. These indicate
   a Birdkit component that will be hydrated client-side.
2. **`CTableDouble` or `CTable`** in hydration script blocks. The hydration
   call typically looks like:
   ```
   kit.start(app, element, { ... data: [...], route: {...} })
   ```
   The `component` field or the script path will contain `CTableDouble` or
   `CTable`.

### Hydration data parsing

The Birdkit hydration block contains structured data that describes the
component and its configuration:

```javascript
kit.start(app, element, {
  component: "CTableDouble",  // or "CTable"
  option: "medals-by-country", // descriptive option identifier
  data: [...],                 // server-rendered data payload
  route: { ... }
})
```

Extract the following fields from the hydration data:

| Field       | Description                                          |
|-------------|------------------------------------------------------|
| `component` | The Svelte component name (`CTableDouble`, `CTable`) |
| `option`    | The option/variant parameter for the table           |

These should be recorded in the block's `content` field as a structured string:
`"component=CTableDouble option=medals-by-country"`

### Block classification

Birdkit tables should be classified as:

| Component      | Block type                  | Notes                                    |
|----------------|-----------------------------|------------------------------------------|
| `CTable`       | `birdkit-table`             | Static table, no dropdown interaction    |
| `CTableDouble` | `birdkit-table-interactive` | Has dropdown filter for switching views  |

The actual table data is fully rendered in the SSR HTML within the container
element. All `<tr>`, `<td>`, and `<th>` elements contain the real data values
and must be captured for downstream extraction.

---

## 15. Lead Image Extraction

Standard articles (non-interactive) typically have a lead image at the top of
the article body. Identify the lead image by looking for:

- `<figure class="css-1yjl3xc">` (or the equivalent CSS-in-JS hashed class on
  the outermost `<figure>` that contains the hero/lead image)
- The `<figure>` contains a `<picture>` element with responsive `srcSet`
  attributes on `<source>` elements and an `<img>` fallback.
- A `<figcaption>` element inside the `<figure>` provides the caption text and
  a credit/attribution line (often in a `<span>` with a class like
  `css-*` containing "credit").

Extract:

| Field     | Source                                          |
|-----------|-------------------------------------------------|
| `url`     | The highest-resolution `src` or `srcSet` URL    |
| `alt`     | The `<img alt="...">` attribute                 |
| `caption` | The `<figcaption>` text content (minus credit)  |
| `credit`  | The credit `<span>` text inside `<figcaption>`  |

Record this as a block with `type: "lead-image"` and include the extracted
fields in the block's `content` as a structured string or in `embeddedUrls`
for the image URL.

---

## Additional Block Type Detection Rules

The following block types were discovered during the Athletic and Winter Olympics
article builds and must be detected in addition to the original classification table:

### showcase-link (Athletic / NYT)
**Selector:** `a.showcase-link-container`, `[class*="showcase-link"]`, `div.in-content-module-link`
**Extract:** title from `.showcase-link-title`, excerpt from `.showcase-link-excerpt`, href from `<a>`, imageUrl from child `<img>`

### twitter-embed
**Selector:** `blockquote.twitter-tweet`, `div[data-tweet-id]`
**Extract:** author from first link text, handle from `href` path, text from `<p>`, date from last `<a>` text, tweet URL from `<a>[href*="twitter.com"]`

### ad-container
**Selector:** `div.ad-container`, `div[class*="ad-wrapper"]`, `div[data-position]`
**Extract:** position from `data-position` attribute or child `div#mid1`/`div#mid2`/`div#mid3` id

### puzzle-entry-point
**Selector:** `div[class*="PuzzleEntryPoint"]`, `div[class*="puzzle-entry"]`
**Extract:** game from logo alt text, title from `h2[class*="PuzzlesTitle"]`, subtitle from `p[class*="PuzzlesSubtitle"]`

### featured-image
**Selector:** `div[class*="FeaturedImage"]`, `div[class*="featured-image"]`, leading `<figure>` with `<img fetchpriority="high">`
**Extract:** credit from `span[class*="ImageCredit"]` or `<figcaption>` credit span

### storyline
**Selector:** `div[class*="Storyline"]`, `div[id*="storyline"]`
**Extract:** title from `p[class*="StorylineTitle"]`, items array from `<a>` children with label text and href

### related-link
**Selector:** `div[class*="RelatedLinks"]`, `aside[class*="related"]` containing linked article cards
**Extract:** title, url, imageUrl, summary per card

---

## Full-Document Walk Rule

The block walker MUST traverse the ENTIRE `<body>` DOM, not just elements matching
the original classification table patterns. Every element that maps to a `ContentBlock`
union type in `design-docs-config.ts` must be detected.

The `ContentBlock` union supports 16 types: `header`, `byline`, `ai2html`, `subhed`,
`birdkit-chart`, `birdkit-table`, `birdkit-table-interactive`, `datawrapper-table`,
`showcase-link`, `twitter-embed`, `ad-container`, `puzzle-entry-point`,
`featured-image`, `storyline`, `author-bio`, `related-link`.

If the source HTML contains elements matching any of these types that are NOT captured
by the classification table, add the block with the correct type and sequential index.
The output `blocks` array must contain ALL matchable blocks in exact document order.

---

## Athletic Article Type Detection

When the source URL contains `nytimes.com/athletic/` or `theathletic.com`:

- Set article type to `"article"` (not `"interactive"`)
- Headline style: `nyt-cheltenham 40px/400/44px italic, textAlign: center`
  (inside `Article_FeaturedHeadlineContainer`)
- This differs from standard NYT articles (31px/700/italic/left) and NYT
  interactives (45px/800/normal/center)
- The Athletic uses `data-theme="legacy"` on the `<html>` element
- CSS class prefixes include `Article_`, `Storyline_`, `PuzzleEntryPoint_`,
  `HeaderNav_`, `Footer_`

---

## 16. RelatedLinksBlock Detection (Expanded)

In addition to the `related-link` selectors documented in the "Additional Block
Type Detection Rules" section above, also detect related-links blocks using:

- `[data-testid="RelatedLinksBlock"]`
- `[class*="related-links"]`

These containers hold `<a>` elements with images. For each linked card, extract:

| Field      | Source                                              |
|------------|-----------------------------------------------------|
| `title`    | Link text or heading inside the `<a>` element       |
| `url`      | The `href` attribute on the `<a>` element           |
| `imageUrl` | `<img src="...">` inside the `<a>` or sibling `<figure>` |
| `summary`  | `<p>` or `[class*="summary"]` text adjacent to the link |

If any field cannot be determined, set it to `null`. Emit one `related-link`
block per card, each with its own sequential `index` in document order.

---

## 17. Lead Image to ContentBlock Flow

After extracting the lead image (section 15) from a `<figure>` element, also
generate a corresponding `contentBlock` entry for downstream config generation:

```json
{
  "type": "featured-image",
  "credit": "Photo credit text from figcaption"
}
```

This `featured-image` contentBlock must be placed at the correct
**document-order position** relative to other contentBlocks (header, byline,
etc.). Typically the lead image appears after the `header` and `byline` blocks
but before the first `subhed` or `text` block.

The `credit` field is extracted from the `<figcaption>` credit `<span>`. If no
credit is present, set `credit` to an empty string, not `null`.

This ensures the lead image is both captured in the `assets` output (for image
URL tracking) AND represented in the `blocks` / contentBlocks array (for
layout rendering in ArticleDetailPage).

---

## 18. blockCompleteness Metric (NEW)

The extraction output MUST include a `blockCompleteness` field:

```
blockCompleteness: {
  sourceElementCount: number,    // total content-bearing elements in source HTML
  classifiedBlockCount: number,  // elements that matched a ContentBlock type
  unclassifiedElements: string[], // CSS selectors of elements that matched NO rule
  coveragePercent: number        // classifiedBlockCount / sourceElementCount * 100
}
```

If `coveragePercent` < 80%, emit a WARNING in the output so the orchestrator can decide whether to re-extract or proceed with gaps.

---

## 19. Structured Byline Parsing (NEW)

Extract bylines as structured data, not just raw strings:

```
byline: {
  authors: [{ name: string, role?: string, url?: string, avatarUrl?: string }],
  timestamp: { raw: string, iso: string },
  section: string,
  storyline?: { title: string, links: [{ label: string, href: string }] }
}
```

Parse from: `<span class="Article_BylineString">`, `<time>`, storyline nav bars, extended byline sections.

---

## 20. Breadcrumb Chain (NEW)

Detect and extract breadcrumb navigation:

- Look for `<nav aria-label="breadcrumb">`, `<ol>` with breadcrumb-like classes, or structured `<a>` chains in header areas.
- Output: `breadcrumbs: [{ label: string, href: string }]`
