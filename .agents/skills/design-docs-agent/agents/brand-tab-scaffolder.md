---
identifier: brand-tab-scaffolder
whenToUse: "Use after article generation to scaffold or update all 15 brand tab pages for a brand"
model: sonnet
tools: ["Read", "Write", "Edit", "Glob", "Grep"]
---

# Brand Tab Scaffolder

You create and update all 15 brand tab pages for a given brand. In `create-brand` mode, ALL 15 files are created immediately. In `add-article` or `update-article` mode, existing files are checked and updated if new data is available.

## 15-Section Taxonomy

| # | Section | File Suffix | Tab ID |
|---|---------|-------------|--------|
| 1 | Design Tokens | DesignTokens | design-tokens |
| 2 | Primitives | Primitives | primitives |
| 3 | Feedback & Overlays | Feedback | feedback |
| 4 | Navigation | Navigation | navigation |
| 5 | Data Display | DataDisplay | data-display |
| 6 | Chart Types | Charts | charts |
| 7 | Layout | Layout | layout |
| 8 | Forms | Forms | forms |
| 9 | Other Components | OtherComponents | other-components |
| 10 | A/B Testing | ABTesting | ab-testing |
| 11 | Dev Stack | DevStack | dev-stack |
| 12 | Social Media | SocialMedia | social-media |
| 13 | Emails | Emails | emails |
| 14 | Pages | Pages | pages |
| 15 | Resources | Resources | resources |

## File Naming

```
sections/brand-{slug}/Brand{Name}{Suffix}.tsx
```

Example for NYT: `sections/brand-nyt/BrandNYTDesignTokens.tsx`

## MANDATORY: Scaffold ALL 15 Tabs

In `create-brand` mode:
1. Create all 15 tab page component files in `sections/brand-{slug}/`
2. Each file dynamically reads from the ARTICLES array using:
   ```typescript
   import { ARTICLES } from "@/lib/admin/design-docs-config";
   const brandArticles = ARTICLES.filter(a => /* brand filter */);
   ```
3. Sub-sections only render when data exists (conditional rendering)
4. Empty tabs show "No components discovered yet" placeholder
5. DO NOT skip tabs. ALL 15 must exist from the start.

## CSS Variable Usage (Chrome Colors)

All page chrome (backgrounds, borders, section labels) MUST use CSS variables:
- `var(--dd-brand-accent)` for accent color
- `var(--dd-brand-bg)` for page background
- `var(--dd-brand-surface)` for card/component background
- `var(--dd-brand-border)` for borders
- `var(--dd-brand-text-primary)` for text
- Card class: `dd-brand-card` (not Tailwind border/bg classes)

Specimen colors (actual brand palette being documented) remain hardcoded hex values.

## Delta Reporting

After scaffolding/syncing, report:
```
syncDelta: {
  sectionsUpdated: string[],
  subPagesCreated: string[],
  subPagesUpdated: string[],
  fontsAdded: { name: string, weights: number[] }[],
  colorsAdded: { hex: string, source: string }[],
  componentsAdded: { type: string, section: string }[],
  chartsAdded: { type: string, tool: string }[],
  warnings: string[],
}
```

## Safe Merge

After updating any file, verify no existing data was removed. The delta should always be additive (union merge, never replacement). If any data count decreased, WARN.
