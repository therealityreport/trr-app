---
name: design-docs
description: "Design Docs agent — ingest articles, extract design tokens, generate pages, sync brand tabs. Invoke with /design-docs <articleUrl>"
argument-hint: "<articleUrl> [sourceHtml path]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent"]
---

# Design Docs Agent

Unified entry point for the Design Docs pipeline. Orchestrates article ingestion from source HTML through a 5-wave pipeline: Validate → Extract → Generate → Wire → Sync & Verify.

## Usage

```
/design-docs-agent:design-docs <articleUrl> [sourceHtml path]
```

## Pipeline

Load the canonical orchestrator skill at:
`TRR-APP/.agents/skills/design-docs-agent/SKILL.md`

Follow its workflow exactly. The canonical SKILL.md defines:
- Step 0: Auto-detect mode (add-article, add-first-article, create-brand, update-article)
- Step 1: Validate and discover
- Step 1.5: Classify publisher patterns
- Step 2: Extraction wave (parallel sub-skills)
- Step 3: Merge extraction outputs
- Step 4: Generation wave
- Step 5: Wiring
- Step 5.5: Config integrity audit
- Step 6: Sync all 15 brand tabs
- Step 7: Verify

## MANDATORY Rules (Non-Negotiable)

These rules override any default behavior. They exist because of repeated failures during past agent runs.

### 1. Extract Actual Computed Styles — Never Assume

NEVER use a lookup table of known heading styles. NEVER assume text styles from a font name or role.
ALWAYS extract actual computed styles from source HTML/CSS for EVERY article independently:
- fontSize (actual px value from CSS rules or computed styles)
- fontWeight (actual numeric weight)
- fontStyle (normal/italic)
- lineHeight (actual value)
- textAlign (left/center/right)
- color (actual hex)
- letterSpacing (if present)

Write text style specimens EXACTLY as they appear in the source.
If h2 style === h3 style, STOP — they are almost certainly different. Re-inspect the source and extract independently.

### 2. Per-Article Color Independence

NEVER copy colors from other articles, even within the same brand.
Extract colors from THIS article's CSS rules and inline styles.
After extraction, compare against existing ARTICLES entries.
If byte-identical to another article's colors, STOP — you copied instead of extracting.

### 3. 15-Tab Immediate Scaffolding

In `create-brand` mode, ALL 15 tab page files must be created immediately:
1. Create all 15 tab page component files in `sections/brand-{slug}/`
2. Each file dynamically reads from the ARTICLES array
3. Sub-sections only render when data exists
4. Empty tabs show "No components discovered yet" placeholder
5. DO NOT skip tabs. ALL 15 must exist from the start.

### 4. usedIn Format Enforcement

The `usedIn` field format MUST be parseable:
```
"element.ClassName: {fontSize}px/{fontWeight}/{lineHeight}px [font-style:X] [text-align:X] [letter-spacing:Xem] [uppercase] #RRGGBB"
```
Example: `"h1.e1h9b8zs0: 40px/400/1.1 #121212"`

Extract these values from actual CSS — never assume from font name.

### 5. Chrome vs Specimen Colors

When generating or editing brand pages:
- Page chrome (backgrounds, borders, section labels, card styles) → use CSS variables (`var(--dd-brand-accent)`, `var(--dd-brand-bg)`, etc.)
- Specimen colors (actual brand palette being documented) → keep as hardcoded hex values

The `.brand-scope-*` class on the parent `.design-docs` container sets all chrome variables per brand.

## CSS Variable Reference

```
var(--dd-brand-accent)         → Brand accent color
var(--dd-brand-accent-bg)      → Light accent background
var(--dd-brand-text-primary)   → Primary text
var(--dd-brand-text-secondary) → Secondary text
var(--dd-brand-text-muted)     → Muted text
var(--dd-brand-section-label)  → Section label color
var(--dd-brand-surface)        → Card/component background
var(--dd-brand-surface-alt)    → Alternate surface
var(--dd-brand-border)         → Border color
var(--dd-brand-border-subtle)  → Subtle border
var(--dd-brand-bg)             → Page background
var(--dd-brand-stat-number)    → Stat/KPI number color
var(--dd-brand-link)           → Link color
```

Card classes: Use `dd-brand-card` instead of `rounded-xl border border-zinc-200 bg-white shadow-sm`.
