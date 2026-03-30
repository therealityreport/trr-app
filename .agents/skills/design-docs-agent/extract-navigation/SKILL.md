---
name: extract-navigation
description: Extract header, footer, sidebar, breadcrumb, tab, and search/filter navigation patterns from source HTML
---

# Extract Navigation Patterns

## Purpose

Parse publisher site chrome (header, footer, sidebar, tabs, breadcrumbs, search bars)
from source HTML to produce structured `NavigationData` that feeds Section 4
(Navigation) of the 15-section brand taxonomy.

Machine-readable output shape: `NavigationData` from
`apps/web/src/lib/admin/design-docs-pipeline-types.ts`

Executable entrypoint:

`node apps/web/scripts/design-docs/extract-navigation.mjs --article-url <articleUrl> --source-html-path <path-to-html>`

## Trigger

Run during the extraction wave (Step 2) alongside other extractors.

## Input

- `sourceHtml` — Full page HTML
- `publisherClassification` — Output from classify-publisher-patterns (optional, improves accuracy)

## Extraction Targets

### Header / Navbar
- Logo (SVG wordmark, `<img>` logo, text-based brand name)
- Primary navigation links (section names, URLs, order)
- Secondary navigation (league nav, team dropdowns, sport categories)
- Hamburger menu structure (mobile nav items, nested groups)
- Search bar (presence, placeholder text, position)
- User actions (subscribe CTA, login link, share buttons)
- Sticky behavior (CSS `position: sticky/fixed`, scroll-triggered classes)

### Footer
- Column structure (section headers + link lists)
- Legal text (copyright, company name, year)
- Social links (platform icons + URLs)
- App store badges (iOS, Android links)
- Newsletter signup (if present)
- Policy links (privacy, terms, cookies, sitemap)

### Sidebar
- Presence and position (left/right, collapsible)
- Navigation tree structure (nested menu items)
- Active state indicators

### Tabs
- Tab bar patterns (content switching within a view)
- Active/inactive styling
- Horizontal scroll behavior for overflow

### Breadcrumbs
- `<nav aria-label="breadcrumb">` or `<ol>` with breadcrumb classes
- Chain: `[{ label, href }]`

### Search / Filter / Sort
- Search input presence and styling
- Filter toggles/dropdowns
- Sort controls

### Dropdown Menu / Context Menu
- Trigger element (button, link, hover)
- Menu items with icons
- Nested submenu structure

## Output Schema

See `apps/web/src/lib/admin/design-docs-pipeline-types.ts` for the canonical
TypeScript contract.

## Detection Heuristics

### Header detection
1. Look for `<header>` element or `<nav>` at top of page
2. CSS classes containing: `Header`, `Nav`, `Navbar`, `TopBar`, `SiteHeader`
3. Elements with `role="navigation"` or `role="banner"`
4. First `<nav>` element in document order

### Footer detection
1. Look for `<footer>` element
2. CSS classes containing: `Footer`, `SiteFooter`, `PageFooter`
3. Elements with `role="contentinfo"`
4. Last major structural block in document

### Publisher-specific patterns
- **NYT**: `<div id="site-navigation">`, `nyt-header`, section nav with Upshot brand bar
- **Athletic**: `HeaderNav_HeaderNav`, `DesktopNav_Wrapper`, `Footer_footer`, `Storyline_Root`
- **Generic**: Standard `<header>/<nav>/<footer>` HTML5 landmarks

## Validation

- [ ] Header logo extracted (SVG content or image URL)
- [ ] At least 3 primary nav links found
- [ ] Footer has at least 1 column of links
- [ ] Legal/copyright text extracted
- [ ] Social links detected (if present in source)
- [ ] All extracted URLs are absolute (resolve relative URLs against source domain)
