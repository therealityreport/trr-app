---
name: sync-brand-page
description: Sync article data to parent brand tab pages — ensures fonts, colors, components, and charts are reflected in the brand landing tabs
---

# Sync Brand Page

After adding or updating an article in the Design Docs system, verify that the parent brand's tab pages dynamically reflect the article's data.

## Trigger

Run after `generate-article-page` and `wire-config-and-routing` complete. Also run when auditing existing pages for completeness.

## Input

- `articleId` — The article's `id` field from the ARTICLES array
- `brandType` — "nyt" or "athletic" (auto-detected from article URL)

## 15-Section Brand Tab Taxonomy

Every brand gets 15 tab page files. The agent populates sub-pages within each
tab only when it discovers matching components. See the canonical SKILL.md for
the full taxonomy definition.

| # | Section | Tab ID | Data Sources |
|---|---------|--------|--------------|
| 1 | Design Tokens | `design-tokens` | `fonts`, `colors`, `architecture.layoutTokens`, breakpoints |
| 2 | Primitives | `primitives` | Buttons, inputs, headings, icons, logos from `contentBlocks` + HTML |
| 3 | Feedback & Overlays | `feedback` | Toasts, alerts, dialogs, tooltips from source HTML/JS |
| 4 | Navigation | `navigation` | Header/footer specimens, tabs, breadcrumbs, search/filter patterns |
| 5 | Data Display | `data-display` | Tables, cards, lists, accordions from `contentBlocks` |
| 6 | Chart Types | `charts` | `chartTypes[]`, Datawrapper/Birdkit/ai2html from `contentBlocks` |
| 7 | Layout | `layout` | `architecture.layoutTokens`, DOM hierarchy, grid systems |
| 8 | Forms | `forms` | Form fields, inputs, comboboxes from source HTML |
| 9 | Other Components | `other-components` | Links, chips, pills, timeline, social posts |
| 10 | A/B Testing | `ab-testing` | Experimentation infrastructure from source JS/HTML |
| 11 | Dev Stack | `dev-stack` | `<script>`, `<link>`, `__NEXT_DATA__`, CDN URLs, analytics |
| 12 | Social Media | `social-media` | Social integrations (initially empty) |
| 13 | Emails | `emails` | Email templates (initially empty) |
| 14 | Pages | `pages` | `ARTICLES` array — auto-populated |
| 15 | Resources | `resources` | `publicAssets`, CSS files, external URLs |

### File naming per brand

```
sections/brand-{slug}/Brand{Name}DesignTokens.tsx
sections/brand-{slug}/Brand{Name}Primitives.tsx
sections/brand-{slug}/Brand{Name}Feedback.tsx
sections/brand-{slug}/Brand{Name}Navigation.tsx
sections/brand-{slug}/Brand{Name}DataDisplay.tsx
sections/brand-{slug}/Brand{Name}Charts.tsx
sections/brand-{slug}/Brand{Name}Layout.tsx
sections/brand-{slug}/Brand{Name}Forms.tsx
sections/brand-{slug}/Brand{Name}OtherComponents.tsx
sections/brand-{slug}/Brand{Name}ABTesting.tsx
sections/brand-{slug}/Brand{Name}DevStack.tsx
sections/brand-{slug}/Brand{Name}SocialMedia.tsx
sections/brand-{slug}/Brand{Name}Emails.tsx
sections/brand-{slug}/Brand{Name}Pages.tsx
sections/brand-{slug}/Brand{Name}Resources.tsx
```

## Verification Checklist

After syncing, verify each applicable section:

### Section 1: Design Tokens
- [ ] Typography sub-page: new font families, merged weights, usedIn entries
- [ ] Color sub-page: new palette colors deduplicated by hex
- [ ] Spacing sub-page: if new spacing values discovered
- [ ] Breakpoints: if responsive thresholds discovered

### Section 2: Primitives
- [ ] New heading styles (h1-h6) added to Labels & Text sub-page
- [ ] New icons cataloged in Icons sub-page with SVG + sizes
- [ ] Brand logos (wordmark, favicon) in Brand Logos sub-page

### Section 4: Navigation
- [ ] Header specimen present with actual SVG icons/logo from source
- [ ] Footer specimen present with link structure from source
- [ ] Tabs, breadcrumbs, pagination detected from contentBlocks

### Section 5: Data Display
- [ ] Tables (Datawrapper, Birdkit) appear in Table sub-page
- [ ] Cards (showcase-link, story cards) in Card sub-page
- [ ] Stat/KPI elements in Stat sub-page

### Section 6: Chart Types
- [ ] New `chartTypes` entries appear in correct sub-pages
- [ ] Chart anatomy documented (axes, grid, legend, tooltip)
- [ ] Article links point to correct detail page

### Section 7: Layout
- [ ] New `layoutTokens` entries in the tokens table
- [ ] DOM hierarchy from article shown
- [ ] Gallery/carousel patterns if discovered

### Section 9: Other Components
- [ ] Social posts (twitter-embed), timeline, pills/tags detected
- [ ] Puzzle entry point, storyline bar classified here or in Navigation

### Section 11: Dev Stack
- [ ] Framework detected from `<script>` tags and markers
- [ ] CDN URLs cataloged
- [ ] CSS file inventory present

### Section 14: Pages
- [ ] New article appears in the article list
- [ ] Link to detail page is correct

### Section 15: Resources
- [ ] Datawrapper chart URLs listed
- [ ] Social images listed
- [ ] CSS files listed
- [ ] Author headshot URL shown

## How Brand Tabs Aggregate

All brand tab components use this pattern:
```typescript
import { ARTICLES } from "@/lib/admin/design-docs-config";

// Filter to this brand's articles
const nytArticles = ARTICLES.filter(a => !a.url.includes("/athletic/"));
// or
const athleticArticles = ARTICLES.filter(a => a.url.includes("/athletic/"));
```

Data is aggregated at render time — no manual updates needed when articles are added to the ARTICLES array. If a brand tab fails to show data from a new article, the aggregation logic needs fixing (not the data).

## Font Reference Specimens

When new fonts are discovered during extraction, generate PNG specimens for the font matcher:

- **Script**: `pnpm -C apps/web exec node scripts/generate-font-reference-specimens.mjs --brand {brandSlug}`
- **Output**: `tmp/font-specimens/{brand-name}/{font-name}-{weight}.png`
- **R2 path**: `/fonts/references/{brand-name}/{font-name}-{weight}.png`
- **Manifest**: `tmp/font-specimens/manifest.json` — maps local paths to R2 upload destinations

Each specimen contains:
- Font name + weight label
- Full uppercase/lowercase alphabet
- Numerals + punctuation
- Pangram at display size
- Sample headline (32px) + body text (16px)

The font matcher (`apps/web/src/lib/fonts/brand-fonts/`) can then use these specimens for visual similarity scoring when pairing brand fonts with TRR hosted equivalents.

## Error Recovery

- **Missing font in brand tab**: Check that `article.fonts[]` has the font. If yes, the aggregation function has a filter that excludes it — fix the filter.
- **Missing color**: Check that `article.colors` has the color. The Colors tab walks `article.colors` recursively — ensure the nesting structure matches what the walker expects.
- **Missing component**: Check that `article.contentBlocks[]` has the block type. The Components tab detects types from the `type` field — ensure the ContentBlock union includes the new type.
- **Brand tab shows stale data**: Brand tabs don't cache — they aggregate on every render. If data appears stale, the ARTICLES array hasn't been updated yet.
