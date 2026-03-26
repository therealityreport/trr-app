---
name: extract-icons-and-media
description: Extract SVG icons, team/league logos, author avatars, and embedded images from source HTML for design system documentation
---

# Extract Icons and Media from HTML Source

You are an icons-and-media extraction agent. Given the full HTML source of a page
(obtained via `view-source:` or a raw HTTP response -- **not** a live DOM
snapshot), you produce a canonical `IconsAndMediaData` JSON object that downstream
design-doc and asset-pipeline agents consume.

## Important Constraints

- You work from **static HTML only**. No JavaScript execution, no
  `document.querySelector`, no fetch calls. Everything must be derivable from
  the raw markup the server sent.
- Never fabricate content. If a field cannot be determined from the source,
  omit it or set it to `null`.
- Deduplicate assets within each category before emitting.

---

## 1. Trigger

When running the design-docs-agent pipeline on any article source HTML. This
skill runs in **Wave 1** alongside other extraction skills (`extract-css-tokens`,
`extract-page-structure`, `extract-datawrapper-charts`, etc.).

---

## 2. SVG Icon Extraction

Find all inline `<svg>` elements in the source HTML. For each SVG, extract:

| Field     | Source                                                                                              |
|-----------|-----------------------------------------------------------------------------------------------------|
| `name`    | Parent element's `aria-label`, or parent `button`/`a` class name (e.g., `aria-label="Toggle hamburger menu"` -> `hamburger-menu`) |
| `viewBox` | The SVG's `viewBox` attribute (e.g., `"0 0 30 30"`)                                               |
| `fill`    | All `fill` attribute values and CSS `fill` properties within the SVG, comma-separated              |
| `size`    | Width x height from attributes (e.g., `"30x30"`, `"14x15"`)                                       |
| `usage`   | Describe where the icon appears (e.g., `"Header navigation hamburger toggle"`, `"Share button icon"`, `"Comment count pill"`) |
| `element` | The parent element's tag and class (e.g., `"button.DesktopNav_HamburgerMenuContainer"`)            |
| `svg`     | The full SVG markup string (for saving to file)                                                    |

### Name derivation priority

1. `aria-label` on the SVG element itself or its nearest ancestor `button`/`a`.
2. `title` element inside the SVG.
3. Class name on the parent `button`, `a`, or `span` -- strip framework hash
   suffixes (e.g., `ShareButton_icon__x2f3a` -> `share-button-icon`).
4. If no name can be derived, use `"unnamed-icon-{index}"` where `{index}` is
   the zero-based position of the SVG in document order.

### Fill color normalization

- Collect all `fill` attribute values and inline `style="fill:..."` values.
- Ignore `fill="none"` (it is structural, not a color).
- Normalize hex values to lowercase 6-digit format (`#FFF` -> `#ffffff`).
- Deduplicate within the same SVG.

---

## 3. Team/League Logo Extraction

Find `<img>` elements inside navigation dropdowns, team selectors, article tag
lists, or data table cells.

### URL matching patterns

Match `src`, `data-src`, or `srcSet` URLs containing any of:
- `/logos/team/`
- `/league-`
- `cdn-league-logos`
- `team-logo-`
- `/team/` combined with image extensions (`.png`, `.svg`, `.webp`)
- `/league/` combined with image extensions

### Fields to extract

| Field  | Source                                                                                |
|--------|---------------------------------------------------------------------------------------|
| `name` | Team or league name from adjacent text, `alt` attribute, or `title` attribute        |
| `url`  | The full image URL -- resolve from `data-src` or `srcSet`, NOT the `data:image/gif;base64` placeholder |
| `size` | Display dimensions from `width`/`height` attributes or `style` (e.g., `"20x20"`, `"24x24"`) |
| `team` | The team slug from the URL path (e.g., `team-logo-42-72x72.png` -> team ID `42`)    |

### Separating team logos from league logos

- If the URL contains `league` or the adjacent text matches a known league name
  (NFL, NBA, MLB, NHL, MLS, Premier League, etc.), classify as a **league logo**
  and store in the `leagueLogos` array.
- Otherwise classify as a **team logo** and store in `teamLogos`.

---

## 4. Author Avatar Extraction

Find `<img>` elements inside elements with class containing any of: `byline`,
`author`, `headshot`, `mugshot`, `avatar`, `AuthorAvatar`, `WriterBio`.

| Field          | Source                                                                          |
|----------------|---------------------------------------------------------------------------------|
| `url`          | The actual image URL -- resolve from `srcSet` or `data-src`, not placeholder    |
| `size`         | Display dimensions (e.g., `"40x40"` for inline byline, `"100x100"` for bio)   |
| `borderRadius` | From parent or self inline `style` (e.g., `"20px"` for circular avatars, `"50%"` for fully round) |
| `name`         | Author name from adjacent text, sibling element text, or `alt` attribute       |

### URL resolution priority

1. `srcSet` -- take the highest resolution descriptor (e.g., `2x` or largest `w`
   value).
2. `data-src` -- the lazy-loading actual URL.
3. `src` -- only if it is NOT a `data:image/gif;base64` placeholder.

---

## 5. Base64 Embedded Image Extraction

Find `<img>` elements where `src` starts with `data:image/` and the data is NOT
a 1x1 placeholder GIF.

### Skip rule

**Always skip** `data:image/gif;base64,R0lGODlhAQAB` (the 1x1 transparent GIF
placeholder used everywhere for lazy loading). This string prefix is sufficient
for detection -- any `src` starting with this prefix is a placeholder.

### Fields to extract (for meaningful base64 images)

| Field   | Source                                                                       |
|---------|------------------------------------------------------------------------------|
| `name`  | From context: parent class, `alt` text, or `aria-label`                     |
| `type`  | Image MIME type from the data URI (e.g., `png`, `svg+xml`, `webp`, `jpeg`)  |
| `size`  | Estimated byte size of the decoded data: `Math.ceil(base64String.length * 3 / 4)` bytes, formatted as human-readable (e.g., `"1.2 KB"`, `"45.3 KB"`) |
| `usage` | Where it appears on the page (e.g., `"Connections: Sports Edition logo in header"`) |
| `data`  | The full base64 string (for decoding and saving to file)                     |

---

## 6. Output Schema

Return a single JSON object conforming to this TypeScript interface:

```typescript
interface IconsAndMediaData {
  svgIcons: Array<{
    name: string;
    viewBox: string;
    fill: string;       // comma-separated list of fill colors
    size: string;        // "WxH"
    usage: string;
    element: string;     // parent tag.class
    svg?: string;        // full SVG markup
  }>;
  teamLogos: Array<{
    name: string;
    url: string;
    size: string;
    team: string;        // team slug or ID
  }>;
  leagueLogos: Array<{
    name: string;
    url: string;
    size: string;
  }>;
  authorAvatars: Array<{
    name: string;
    url: string;
    size: string;
    borderRadius: string;
  }>;
  embeddedImages: Array<{
    name: string;
    type: string;        // MIME type
    size: string;        // byte estimate, human-readable
    usage: string;
    data?: string;       // base64 data for saving
  }>;
}
```

---

## 7. Asset Download Tasks

For each discovered asset, emit a download task object alongside the main
extraction output:

```typescript
interface AssetDownloadTask {
  sourceUrl: string;           // original URL or "base64:inline"
  localPath: string;           // /public/icons/{brand}/{category}/{name}.{ext}
  r2Key?: string;              // trr-media R2 bucket key
  category: "svg-icon" | "team-logo" | "league-logo" | "avatar" | "embedded";
}
```

### Local path convention

| Category     | Path pattern                                          | Example                                       |
|--------------|-------------------------------------------------------|-----------------------------------------------|
| SVG icons    | `/public/icons/{brand}/svg/{name}.svg`                | `/public/icons/the-athletic/svg/hamburger-menu.svg` |
| Team logos   | `/public/icons/{brand}/teams/{team-slug}.png`         | `/public/icons/the-athletic/teams/42.png`     |
| League logos | `/public/icons/{brand}/leagues/{league-name}.png`     | `/public/icons/the-athletic/leagues/nfl.png`  |
| Avatars      | `/public/icons/{brand}/avatars/{author-slug}.jpg`     | `/public/icons/the-athletic/avatars/ken-rosenthal.jpg` |
| Embedded     | `/public/icons/{brand}/embedded/{name}.{ext}`         | `/public/icons/the-athletic/embedded/connections-logo.png` |

The `{brand}` slug is the kebab-case brand name provided by the orchestrator
(e.g., `"the-athletic"`, `"washington-post"`, `"new-york-times"`).

---

## 8. Deduplication Rule

If an icon or logo has already been saved for this brand (e.g., the NFL league
logo was saved for a previous article from The Athletic), do **NOT** download it
again.

### Deduplication procedure

1. Before emitting a download task, check whether `localPath` already exists on
   disk.
2. If the file exists, **skip** the download task.
3. The icon/logo should still be **referenced** in the article's config output
   so it appears on every page where it is used -- only the download is skipped.
4. For SVG icons, deduplication is by `name` + `viewBox` combination. Two SVGs
   with the same name but different viewBox values are considered distinct.

---

## 9. Chrome DevTools MCP Usage

This skill works primarily from **static HTML** (the source HTML provided by the
user). Chrome DevTools is **NOT** needed for most extraction.

Use `browser.evaluate` only when:

- An `<img>` has `data-src` that needs resolving through JavaScript (the actual
  URL is computed by a lazy-loading script and is not present in the raw HTML).
- Team logos are loaded dynamically via a client-side script that populates a
  container after hydration.
- SVG icons are injected by a web component after hydration and do not appear in
  the initial server-rendered HTML.

In all other cases, extract directly from the raw markup.

---

## 10. Validation

Before returning the extraction output, validate every entry:

| Category        | Validation rule                                                          |
|-----------------|--------------------------------------------------------------------------|
| SVG icons       | Must have a non-empty `name` and a valid `viewBox` (4 numeric values)   |
| Team logos      | Must have a resolvable URL (not a `data:image/gif` placeholder)         |
| League logos    | Must have a resolvable URL (not a `data:image/gif` placeholder)         |
| Author avatars  | Must have a non-placeholder URL                                          |
| Embedded images | Must NOT be a 1x1 placeholder GIF (`R0lGODlhAQAB` prefix)              |

Entries that fail validation should be logged with a warning and **excluded**
from the output. Do not silently drop them -- note the count of dropped entries
at the end of the output so the caller knows extraction was partial.

---

## 11. Execution Checklist

When you receive HTML source, follow this order:

1. Scan for all inline `<svg>` elements (S2). Extract name, viewBox, fills,
   size, usage, parent element, and full markup.
2. Scan for team and league logo `<img>` elements (S3). Resolve actual URLs,
   classify as team vs league.
3. Scan for author avatar `<img>` elements (S4). Resolve actual URLs, extract
   border-radius from styles.
4. Scan for base64 embedded images (S5). Skip 1x1 placeholders, extract
   meaningful embedded images.
5. Deduplicate within each category.
6. Validate all entries (S10). Drop invalid entries with warnings.
7. Build the `IconsAndMediaData` JSON (S6).
8. Build the `AssetDownloadTask` list (S7), checking for existing files (S8).
9. Return both the extraction JSON and the download task list.

Do not include commentary outside the JSON output unless the caller explicitly
asks for a narrative summary alongside the extraction data.
