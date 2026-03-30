---
name: generate-brand-section
description: Generate a complete Brand page component from extracted design tokens.
---

# Generate Brand{Name}Section Component

## Purpose

Take merged extraction JSON (output of extract-css-tokens, extract-page-structure,
extract-quote-components, extract-datawrapper-charts, etc.) and produce a single
React component file that renders the full brand design-doc section.

## Input

A single merged JSON object with keys populated by prior extraction skills:

| Key | Source skill | Contains |
|-----|-------------|----------|
| `brand` | manual / config | `{ name, slug, domain, accentColor, description }` |
| `fonts` | extract-css-tokens | Array of `{ font, cssVar, weights, role, example }` |
| `coreColors` | extract-css-tokens | Array of `{ name, token, hex, use }` |
| `graphicsColors` | extract-css-tokens | Array of `{ name, token, hex, use }` |
| `themeColors` | extract-css-tokens | Array of `{ label, hex, note }` |
| `layoutTokens` | extract-page-structure | Array of `{ label, token, value }` |
| `domTree` | extract-page-structure | Multiline string of DOM hierarchy |
| `contentBlocks` | extract-page-structure | Array of block-type strings |
| `archFeatures` | extract-page-structure | Array of `{ label, value }` |
| `resources` | manual / config | Array of `{ title, href, description }` |

## Output

A single `.tsx` file at:

```
apps/web/src/components/admin/design-docs/sections/Brand{Name}Section.tsx
```

where `{Name}` is the PascalCase brand name (e.g., `NYT`, `WashPost`, `Guardian`).

## MANDATORY: 15-Tab Scaffolding in create-brand Mode

When this skill runs in `create-brand` mode (creating a brand for the first time), ALL 15 tab page files MUST be created immediately:

1. Create all 15 tab page component files in `sections/brand-{slug}/`:
   - `Brand{Name}DesignTokens.tsx`
   - `Brand{Name}Primitives.tsx`
   - `Brand{Name}Feedback.tsx`
   - `Brand{Name}Navigation.tsx`
   - `Brand{Name}DataDisplay.tsx`
   - `Brand{Name}Charts.tsx`
   - `Brand{Name}Layout.tsx`
   - `Brand{Name}Forms.tsx`
   - `Brand{Name}OtherComponents.tsx`
   - `Brand{Name}ABTesting.tsx`
   - `Brand{Name}DevStack.tsx`
   - `Brand{Name}SocialMedia.tsx`
   - `Brand{Name}Emails.tsx`
   - `Brand{Name}Pages.tsx`
   - `Brand{Name}Resources.tsx`
2. Each file dynamically reads from the ARTICLES array — never hardcoded data
3. Sub-sections only render when data exists (conditional rendering)
4. Empty tabs show a "No components discovered yet" placeholder
5. DO NOT skip tabs. ALL 15 must exist from the start.

This ensures the brand page has the full 15-tab navigation immediately, even if most tabs start empty.

## Reference Pattern

The canonical reference is `BrandNYTSection.tsx` at:

```
apps/web/src/components/admin/design-docs/sections/BrandNYTSection.tsx
```

Every generated component MUST follow this file's structure exactly.

## Component Structure (mandatory)

### 1. File header

```tsx
"use client";

import Link from "next/link";
import type { Route } from "next";
```

The `"use client"` directive is required because the component renders in the
admin design-docs dashboard which uses client-side interactivity.

### 2. SectionLabel helper

Define an inline `SectionLabel` component. It renders an `<h3>` with:

- `fontFamily: "var(--dd-font-sans)"`
- `fontSize: 11`
- `fontWeight: 600`
- `textTransform: "uppercase"`
- `letterSpacing: "0.12em"`
- `color: "var(--dd-brand-accent)"` — resolved per brand by the CSS scope class
- `marginBottom: 8`, `marginTop: 32`
- `borderLeft: "3px solid var(--dd-brand-accent)"`
- `paddingLeft: 10`

Accepts `children: React.ReactNode` and optional `id?: string`.

### 3. Inline data constants

All data is declared as typed inline arrays at module scope. Never fetch data
at runtime. Define TypeScript interfaces for each array shape:

| Constant | Interface | Fields |
|----------|-----------|--------|
| `FONTS` | `FontEntry` | `font, cssVar, weights, role, example` |
| `FONT_MAP` | `FontMapping` | `source` (source font name), `trr` (TRR equivalent), `cssVar` |
| `CORE_COLORS` | `ColorToken` | `name, token, hex, use` |
| `GRAPHICS_COLORS` | `ColorToken` | `name, token, hex, use` |
| `THEME_COLORS` | `{ label, hex, note }` | inline type |
| `LAYOUT_TOKENS` | `LayoutToken` | `label, token, value` |
| `CONTENT_BLOCKS` | `as const` string tuple | block type names |
| `ARCH_FEATURES` | `ArchFeature` | `label, value` |
| `RESOURCES` | `ResourceLink` | `title, href, description` |
| `DOM_TREE` | template literal string | preformatted DOM hierarchy |

### 4. Font mapping lookup table

When populating `FONT_MAP`, use this TRR equivalence table:

| Source Font | TRR Equivalent | CSS Variable | Notes |
|-------------|---------------|--------------|-------|
| nyt-franklin | Hamburg Serial | `var(--dd-font-ui)` | Sans-serif, UI text |
| nyt-cheltenham | Cheltenham | `var(--dd-font-headline)` | Display serif |
| nyt-karnakcondensed | Cheltenham Bold | `var(--dd-font-headline)` | Condensed display |
| nyt-imperial | Georgia | `var(--dd-font-serif)` | Body serif fallback |
| Arial / Helvetica | Hamburg Serial | `var(--dd-font-ui)` | Generic sans |
| Georgia / Times | Cheltenham | `var(--dd-font-headline)` | Generic serif |
| Roboto | Hamburg Serial | `var(--dd-font-ui)` | Google sans |
| nyt-karnak | Gloucester MT | `var(--dd-font-serif)` | Secondary display serif |
| nyt-stymie | Chomsky | `var(--dd-font-display)` | Nameplate display |

For any source font not in this table, choose the closest TRR equivalent by
role (sans -> Hamburg Serial, serif body -> Georgia/Gloucester MT,
serif display -> Cheltenham, decorative -> Chomsky).

### 5. Default export component

```tsx
export default function Brand{Name}Section() {
  return (
    <div>
      {/* header block */}
      {/* 5 sections */}
    </div>
  );
}
```

### 6. Header block

At the top of the return JSX, render:

```tsx
<div className="dd-section-label">Brand Reference</div>
<h2 className="dd-section-title">{Full Brand Name}</h2>
<p className="dd-section-desc">
  {One-to-two sentence description of the brand's design system.}
</p>
```

### 7. Landing Page — Hub with 15 Section Cards

The brand landing page is a hub that shows 15 section cards linking to their
respective tab pages. Each card shows the section title, a brief description,
and a count of discovered sub-pages/components (0 if none yet).

```tsx
const BRAND_SECTIONS = [
  { id: "design-tokens", label: "Design Tokens", desc: "Color, typography, spacing, radius, shadows, motion, breakpoints, z-index" },
  { id: "primitives", label: "Primitives", desc: "Buttons, inputs, labels, icons, logos, avatars, dividers" },
  { id: "feedback", label: "Feedback & Overlays", desc: "Toasts, alerts, dialogs, sheets, tooltips, skeletons, progress" },
  { id: "navigation", label: "Navigation", desc: "Header, footer, sidebar, tabs, breadcrumbs, pagination, search" },
  { id: "data-display", label: "Data Display", desc: "Tables, cards, lists, accordions, calendars, stats" },
  { id: "charts", label: "Chart Types", desc: "Line, bar, area, pie, scatter, heatmap, treemap, sparkline, anatomy" },
  { id: "layout", label: "Layout", desc: "Grid, container, stack, galleries, carousels, media players" },
  { id: "forms", label: "Forms & Composition", desc: "Form fields, combobox, autocomplete, multi-step wizards" },
  { id: "other-components", label: "Other Components", desc: "Links, chips, pills, tags, timeline, mentions, social posts" },
  { id: "ab-testing", label: "A/B Testing", desc: "Experimentation infrastructure, variant testing patterns" },
  { id: "dev-stack", label: "Dev Stack", desc: "Framework, bundler, CDN, analytics, hosting, build system" },
  { id: "social-media", label: "Social Media", desc: "Social integrations and sharing patterns" },
  { id: "emails", label: "Emails", desc: "Email templates and transactional patterns" },
  { id: "pages", label: "Pages", desc: "Article-level design breakdowns" },
  { id: "resources", label: "Other Resources", desc: "External docs, CDN assets, API references" },
];
```

Each card links to `/admin/design-docs/brand-{slug}/{section-id}`.

### 8. Tab Page Components — 15 Files Per Brand

For each section, create a component at:
```
sections/brand-{slug}/Brand{Name}{SectionPascal}.tsx
```

Example for NYT:
```
brand-nyt/BrandNYTDesignTokens.tsx
brand-nyt/BrandNYTPrimitives.tsx
brand-nyt/BrandNYTFeedback.tsx
brand-nyt/BrandNYTNavigation.tsx
brand-nyt/BrandNYTDataDisplay.tsx
brand-nyt/BrandNYTCharts.tsx
brand-nyt/BrandNYTLayout.tsx
brand-nyt/BrandNYTForms.tsx
brand-nyt/BrandNYTOtherComponents.tsx
brand-nyt/BrandNYTABTesting.tsx
brand-nyt/BrandNYTDevStack.tsx
brand-nyt/BrandNYTSocialMedia.tsx
brand-nyt/BrandNYTEmails.tsx
brand-nyt/BrandNYTPages.tsx
brand-nyt/BrandNYTResources.tsx
```

### Lazy Sub-Page Creation Rule

Each tab page internally renders sub-sections ONLY for components that have
been discovered. Use the `ARTICLES` array to dynamically determine which
sub-sections to show:

```tsx
// Example: Design Tokens page checks what's been extracted
const nytArticles = ARTICLES.filter(a => !a.url.includes("/athletic/"));
const hasTypography = nytArticles.some(a => a.fonts?.length > 0);
const hasColors = nytArticles.some(a => a.colors != null);
const hasSpacing = nytArticles.some(a => a.architecture?.layoutTokens != null);
// Only render sub-sections that have data
```

Empty sections show:
```tsx
<div style={{ padding: 32, textAlign: "center", color: "var(--dd-ink-faint)" }}>
  <div style={{ fontSize: 13, fontFamily: "var(--dd-font-sans)" }}>
    No components discovered yet. Add articles to populate this section.
  </div>
</div>
```

### Legacy Section ID Mapping

For backwards compatibility with existing brand pages, the old 5-section IDs
map to the new taxonomy:

| Old ID | New Section(s) |
|--------|---------------|
| `typography` | Section 1: Design Tokens → Typography sub-page |
| `colors` | Section 1: Design Tokens → Color sub-page |
| `layout` | Section 7: Layout |
| `architecture` | Section 11: Dev Stack |
| `resources` | Section 15: Other Resources |
| `charts` | Section 6: Chart Types |
| `components` | Sections 2-5 + 9 (classified by type) |
| `pages` | Section 14: Pages |

## Tailwind CSS conventions (do not deviate)

| Element | Classes |
|---------|---------|
| Card | `dd-brand-card p-4` — the `dd-brand-card` CSS class handles bg, border, radius, shadow, and hover |
| Card (small) | `dd-brand-card p-3` |
| Primary grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` |
| Color grid (core) | `grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6` |
| Color grid (graphics) | `grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6` |
| Pill | `rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 font-mono` |
| Link card hover | `hover:-translate-y-0.5 hover:shadow-md transition` |
| Preformatted | `rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm` |
| Table wrapper | `overflow-x-auto` on the card |

## Design token CSS variables used in inline styles

| Variable | Purpose |
|----------|---------|
| `var(--dd-font-sans)` | Primary sans-serif (Hamburg Serial) |
| `var(--dd-font-mono, ui-monospace, monospace)` | Monospace for code/tokens |
| `var(--dd-ink-black)` | Primary text color |
| `var(--dd-ink-faint)` | Secondary/muted text color |

Accent color uses `var(--dd-brand-accent)`. The `.brand-scope-*` class on the
parent `.design-docs` container sets the correct accent per brand. Do NOT
hardcode accent hex values — always use the CSS variable.

### Brand chrome CSS variable reference

| Variable | Purpose |
|----------|---------|
| `var(--dd-brand-accent)` | Brand accent color |
| `var(--dd-brand-accent-bg)` | Light accent background |
| `var(--dd-brand-text-primary)` | Primary text |
| `var(--dd-brand-text-secondary)` | Secondary text |
| `var(--dd-brand-text-muted)` | Muted text |
| `var(--dd-brand-section-label)` | Section label color |
| `var(--dd-brand-surface)` | Card/component background |
| `var(--dd-brand-border)` | Border color |
| `var(--dd-brand-border-subtle)` | Subtle border color |
| `var(--dd-brand-bg)` | Page background |
| `var(--dd-brand-stat-number)` | Stat number color |
| `var(--dd-brand-link)` | Link text color |

## Step-by-step generation procedure

1. Read the merged extraction JSON.
2. Determine the PascalCase brand name and accent color from `brand.name` and `brand.accentColor`.
3. Create the file at `apps/web/src/components/admin/design-docs/sections/Brand{Name}Section.tsx`.
4. Write the `"use client"` directive and imports.
5. Write the `SectionLabel` helper with the brand accent color.
6. Write all TypeScript interfaces.
7. Populate all data constants from the extraction JSON.
8. Build the `FONT_MAP` constant using the TRR equivalence lookup table above.
9. Write the default export function with the header block and all 5 sections.
10. Verify every section has the correct `id` attribute: `typography`, `colors`, `layout`, `architecture`, `resources`.
11. Verify all `<Link>` components use `href={r.href as Route}` for type safety.

## Cross-Population from Article Extractions

When an article is added to a brand that already has a brand section component,
the article's extracted data should be **merged back** into the brand section.
This ensures the brand section stays comprehensive as articles are added.

### What to cross-populate

| Data type | Where in brand section | Merge strategy |
|-----------|----------------------|----------------|
| Fonts | `FONTS` array | Add new families not already present; merge new weights into existing families |
| Colors | `GRAPHICS_COLORS` | Add new chart/graphic colors not already in the palette |
| Chart types | `CONTENT_BLOCKS` and `ARCH_FEATURES` | Add new block types; update architecture features with chart tool references |
| Layout tokens | `LAYOUT_TOKENS` | Add new layout measurements (e.g., article body width) |

### Procedure for updates

1. Read the existing brand section file.
2. Parse its inline data constants (`FONTS`, `CORE_COLORS`, etc.).
3. Merge new article data using union (not replacement).
4. Write back only the changed constants -- do not rewrite the entire file.
5. Verify the component still type-checks after the merge.

### Font merge example

If the brand section has:
```
{ font: "nyt-cheltenham", weights: [300, 700], role: "heading" }
```

And a new article uses `nyt-cheltenham` at weight 800, update to:
```
{ font: "nyt-cheltenham", weights: [300, 700, 800], role: "heading" }
```

---

## Validation checklist

Before finishing, confirm:

- [ ] `"use client"` is the first line of every file
- [ ] `Link` imported from `"next/link"` where needed
- [ ] `Route` type imported from `"next"` where needed
- [ ] `SectionLabel` uses the brand accent color in both `color` and `borderLeft`
- [ ] Landing page has all 15 section cards with correct IDs
- [ ] 15 tab page component files created in `brand-{slug}/` directory
- [ ] Each tab page dynamically reads from `ARTICLES` array
- [ ] Sub-sections only render when data exists (lazy creation rule)
- [ ] Empty tabs show the "No components discovered yet" placeholder
- [ ] Font mapping table uses correct TRR equivalents from the lookup table
- [ ] Color swatches with `#fff` hex have a border
- [ ] All `<Link>` hrefs cast with `as Route`
- [ ] No runtime data fetching -- all data derived from `ARTICLES` at render time
- [ ] Components are default exports
- [ ] Routing is wired for `/admin/design-docs/brand-{slug}/{tab-id}`

---

## Dynamic Aggregation from ARTICLES

Brand section components (e.g., `BrandNYTSection`, `BrandTheAthleticSection`)
should read from the `ARTICLES` array dynamically rather than hardcoding
font/color data. The existing `BrandNYTSection` already does this.

### Pattern: Aggregate fonts across all articles for a brand

```typescript
import { ARTICLES } from "@/lib/admin/design-docs-config";

// Collect unique fonts across all NYT articles
const allFonts = ARTICLES
  .filter(a => a.url.includes("nytimes.com"))
  .flatMap(a => a.fonts)
  .reduce((acc, font) => {
    const existing = acc.find(f => f.name === font.name);
    if (existing) {
      // Merge weights
      existing.weights = [...new Set([...existing.weights, ...font.weights])].sort((a, b) => a - b);
      // Merge usedIn
      existing.usedIn = [...new Set([...existing.usedIn, ...font.usedIn])];
    } else {
      acc.push({ ...font, weights: [...font.weights], usedIn: [...font.usedIn] });
    }
    return acc;
  }, [] as typeof ARTICLES[0]["fonts"] extends readonly (infer T)[] ? T[] : never);
```

### Pattern: Aggregate colors across all articles for a brand

```typescript
// Collect unique chart palette colors
const allChartColors = ARTICLES
  .filter(a => a.url.includes("nytimes.com"))
  .flatMap(a => a.architecture?.colors?.chartPalette ?? [])
  .reduce((acc, color) => {
    if (!acc.some(c => c.value === color.value)) acc.push(color);
    return acc;
  }, [] as { name: string; value: string; role: string }[]);
```

This ensures adding a new article automatically enriches the brand section
without manual editing of the brand component file.

### Aggregation Pattern Summary

The dynamic aggregation follows this general pattern for any data type:

1. **Filter**: Select articles belonging to this brand (e.g., URL contains `nytimes.com`).
2. **FlatMap**: Collect all instances of the data type across filtered articles.
3. **Reduce/Deduplicate**: Union unique values, merging where appropriate.

Specific aggregation behaviors:

| Data type | Merge strategy |
|-----------|---------------|
| Font families | Union by `name`; merge `weights` arrays (sorted, deduplicated) and `usedIn` arrays |
| Font weights | `[...new Set([...existingWeights, ...newWeights])].sort((a, b) => a - b)` |
| Chart palette colors | Deduplicate by `value` (hex); keep first occurrence's `name` and `role` |
| Chart types | Collect unique `type` strings from all articles' `contentBlocks` |
| Components | Union of all component/block types used across articles |

This pattern means the brand section is always a complete, up-to-date
reflection of all articles registered for that brand in the `ARTICLES` array.

### Key Fact: No Manual Edits Needed

`BrandNYTSection.tsx` (and all brand sections following this pattern) already
reads from `ARTICLES` dynamically via
`import { ARTICLES } from "@/lib/admin/design-docs-config"`. When a new article
is added to the `ARTICLES` array in `design-docs-config.ts`, the brand section
automatically aggregates that article's fonts, colors, chart types, and
components WITHOUT any manual edits to the brand section component file.

There is no need to update `BrandNYTSection.tsx` when adding a new article.
The component derives all display data at render time from the shared
`ARTICLES` constant.
