---
name: audit-responsive-accessibility
description: Post-generation quality gate for heading hierarchy, WCAG contrast, keyboard accessibility, responsive overflow, and alt text
---

# Audit Responsive Accessibility

## Purpose

After article page and brand tab generation, audit the generated components for
accessibility and responsive design issues. This is a quality gate that catches
issues before the user reviews the output.

Canonical executable implementation:

- `apps/web/src/lib/admin/design-docs-pipeline-validators.ts`
- `apps/web/scripts/design-docs/run-accessibility-audit.mjs`

## Trigger

Run during Step 7 (Verify), after `audit-generated-config-integrity` passes.

## Input

- `articleId` — The article just generated
- `brandSlug` — The brand these pages belong to
- `generatedFiles` — List of files created/modified during this pipeline run

## Checks

### 1. Heading Hierarchy
Scan generated components for heading elements (`h1`–`h6`):
- Verify h1 appears exactly once per page
- Verify heading levels don't skip (h1→h3 without h2 is invalid)
- Verify heading font sizes decrease with level (h1 > h2 > h3)
- In ArticleDetailPage: verify the article title is h1, section labels are h2/h3

### 2. Color Contrast (WCAG 2.1 AA)
For every text-on-background color pair in the generated components:
- Calculate contrast ratio using relative luminance formula
- Normal text (< 18px or < 14px bold): minimum ratio 4.5:1
- Large text (≥ 18px or ≥ 14px bold): minimum ratio 3:1
- Check: heading colors against page background
- Check: body text colors against page background
- Check: label/caption colors against card backgrounds
- Check: accent colors (links, badges) against their backgrounds

Common pairs to verify:
| Text Color | Background | Context | Minimum Ratio |
|-----------|-----------|---------|---------------|
| `#121212` | `#FFFFFF` | Body text | 4.5:1 ✅ (18.1:1) |
| `#363636` | `#FFFFFF` | Secondary text | 4.5:1 ✅ (10.2:1) |
| `#727272` | `#FFFFFF` | Muted text | 4.5:1 ✅ (4.9:1) |
| `#326891` | `#FFFFFF` | NYT blue links | 4.5:1 ✅ (4.8:1) |
| `#FFFFFF` | `#bc261a` | Badge text on red | 4.5:1 (check) |
| `#FFFFFF` | `#53a451` | Badge text on green | 4.5:1 (check) |
| `#C4C4C0` | `#121212` | Footer links on dark | 4.5:1 (check) |

### 3. Keyboard Accessibility
For interactive elements in generated components:
- Sortable table headers: verify they are `<th>` with `scope` attributes (not `<div>`)
- Dropdown selectors: verify they use `<select>` or have `role="listbox"` + `aria-expanded`
- Clickable images (ClickableImage component): verify `tabIndex={0}` and keyboard handler
- Toggle sections (expandable): verify `aria-expanded` attribute

### 4. Responsive Overflow
Check for potential text overflow at mobile widths:
- Identify elements with fixed pixel widths > 320px
- Identify text with `white-space: nowrap` that may overflow
- Identify horizontal scroll containers missing `overflow-x: auto`
- Ai2html overlays: verify percentage widths (not fixed px) at mobile breakpoints
- Tables: verify they have `overflow-x: auto` wrapper

### 5. Alt Text and ARIA
- All `<img>` elements must have `alt` attribute
- Decorative images should have `alt=""`
- SVG icons should have `aria-label` or `aria-hidden="true"`
- Interactive icons (buttons with only an SVG) must have `aria-label`
- Chart containers should have `role="img"` and `aria-label` describing the chart

### 6. Touch Target Size
For mobile (< 600px viewport):
- All tappable elements should be ≥ 44x44px
- Check: pill buttons, sort icons, dropdown triggers, close buttons
- If element is smaller, recommend adding padding or min-height/min-width

## Output Schema

See `apps/web/src/lib/admin/design-docs-pipeline-types.ts` for the canonical
`A11yAuditResult` contract.

## Severity Classification

| Severity | Description | Action |
|----------|-------------|--------|
| `error` | WCAG AA failure, missing alt text, skipped heading level | Must fix before closing |
| `warning` | Marginal contrast (ratio 4.5-5.0), small touch targets, missing aria-label on decorative elements | Should fix, doesn't block |
| `info` | Suggestions for improvement (add aria-describedby, consider reduced motion) | Nice to have |

## Validation

- [ ] All 6 checks run to completion
- [ ] Zero `error` findings before the pipeline reports success
- [ ] `warnings` are listed in the output for the user to review
