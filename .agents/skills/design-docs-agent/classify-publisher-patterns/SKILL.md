---
name: classify-publisher-patterns
description: Detect publisher technology stack and classify layout patterns into the 15-section brand taxonomy
---

# Classify Publisher Patterns

## Purpose

Perform two functions:
1. **Tech detection** — Wappalyzer-style technology inventory from source HTML
2. **Taxonomy classification** — Map extracted components to the 15-section brand taxonomy

This skill runs BEFORE the extraction wave (Step 1.5) to inform which extractors
to invoke and which classification rules to apply. It also produces the Dev Stack
inventory for Section 11.

Machine-readable output shape: `PublisherClassification` from
`apps/web/src/lib/admin/design-docs-pipeline-types.ts`

Executable entrypoint:

`node apps/web/scripts/design-docs/classify-publisher-patterns.mjs --article-url <articleUrl> --source-html-path <path-to-html>`

## Trigger

Run after Step 1 (Validate and Discover), before Step 2 (Extraction Wave).

## Input

- `sourceHtml` — Full page HTML
- `articleUrl` — Original article URL

## Phase 1: Technology Detection

Scan source HTML for technology markers:

### Framework Detection
| Marker | Technology |
|--------|-----------|
| `__NEXT_DATA__` script tag | Next.js |
| `data-birdkit-hydrate` | Birdkit (NYT Svelte/SvelteKit) |
| `data-svelte-h` or `svelte-*` classes | Svelte/SvelteKit |
| `_app.tsx` or `_next/static` | Next.js |
| `__nuxt` | Nuxt.js |
| `data-reactroot` or `data-reactid` | React |
| `ng-version` | Angular |

### CDN Detection
| URL Pattern | Service |
|-------------|---------|
| `static01.nyt.com` | NYT Static CDN |
| `static01.nyt.com/athletic` | The Athletic CDN |
| `g1.nyt.com/fonts` | NYT Font CDN |
| `datawrapper.dwcdn.net` | Datawrapper |
| `cdn-league-logos.theathletic.com` | Athletic League Logos |
| `cdn-media.theathletic.com` | Athletic Media CDN |
| `transcend-cdn.com` | Transcend (privacy) |
| `platform.twitter.com` | Twitter embeds |
| `googletagmanager.com` | GTM |
| `brandmetrics.com` | Brand Metrics |
| `datadoghq-browser-agent.com` | Datadog RUM |

### Analytics Detection
| Pattern | Tool |
|---------|------|
| `nyt_et` function | NYT Event Tracker |
| `GTM-*` container ID | Google Tag Manager |
| `DD_RUM` | Datadog Real User Monitoring |
| `ga('create'` or `gtag(` | Google Analytics |

### CSS Framework Detection
| Pattern | Framework |
|---------|-----------|
| `tailwind` in class names | Tailwind CSS |
| `css-*` hashed classes (6+ chars) | CSS Modules or CSS-in-JS |
| `styled-components` | Styled Components |
| `__jsx-*` style IDs | Styled JSX |

## Phase 2: Layout Family Classification

Based on detected technology, classify the page into a layout family:

| Family | Indicators | Extraction Strategy |
|--------|-----------|-------------------|
| `nyt-interactive` | Birdkit, ai2html, `static01.nytimes.com/newsgraphics/` | Full extraction: all 8 skills |
| `nyt-article` | NYT vi platform, `css-*` classes, nyt-cheltenham font | Standard: page-structure + css-tokens + icons |
| `athletic-article` | Next.js, `data-theme="legacy"`, Athletic CSS modules | Standard + Datawrapper theme detection |
| `generic-publisher` | None of the above | Conservative: page-structure + css-tokens |

## Phase 3: Taxonomy Mapping

Auto-classify source elements into the 15-section taxonomy:

```typescript
interface TaxonomyMapping {
  sections: {
    [sectionId: string]: {
      discovered: boolean;
      elements: string[];  // CSS selectors of matched elements
      subPages: string[];  // which sub-pages should be created
    }
  }
}
```

### Classification Rules

| Source Element | Section | Sub-page |
|--------------|---------|----------|
| `<header>`, `<nav>`, hamburger SVG | 4. Navigation | Navbar / Header |
| `<footer>`, footer link columns | 4. Navigation | Footer |
| `<h1>`–`<h6>`, body text styles | 1. Design Tokens | Typography |
| Color values in CSS | 1. Design Tokens | Color |
| `max-width`, `padding`, `margin` | 1. Design Tokens | Spacing |
| `border-radius` values | 1. Design Tokens | Border Radius |
| `box-shadow` values | 1. Design Tokens | Shadows |
| `breakpoint` media queries | 1. Design Tokens | Breakpoints |
| `<button>`, `role="button"` | 2. Primitives | Buttons |
| `<input>`, `<select>`, `<textarea>` | 2. Primitives | Inputs |
| Inline SVG icons | 2. Primitives | Icons |
| Logo SVG/image | 2. Primitives | Brand Logos |
| Datawrapper `<iframe>` | 6. Charts | (by chart type) |
| Birdkit table markup | 5. Data Display | Table |
| ai2html containers | 6. Charts | (by graphic type) |
| `showcase-link-container` | 5. Data Display | Card |
| `twitter-tweet` blockquote | 9. Other | Social Media Posts |
| `PuzzleEntryPoint` | 9. Other | (puzzle component) |
| `Storyline_Root` | 4. Navigation | Tabs |
| `<script>`, `<link>`, CDN URLs | 11. Dev Stack | (auto-populated) |

## Output Schema

See `apps/web/src/lib/admin/design-docs-pipeline-types.ts` for the canonical
TypeScript contract.

## Validation

- [ ] At least 1 framework detected (or classified as `generic-publisher`)
- [ ] Layout family is one of the 4 valid values
- [ ] Taxonomy mapping has at least sections 1, 4, 11 populated (tokens, navigation, dev-stack are always present)
- [ ] Extraction plan lists at least `extract-page-structure` and `extract-css-tokens` as required
