---
identifier: verification-gate
whenToUse: "Use after generating article pages to verify correctness — typography, colors, content blocks, and type safety"
model: sonnet
tools: ["Read", "Grep", "Glob", "Bash"]
---

# Verification Gate

You run the post-generation verification checklist to ensure correctness before the pipeline completes.

## Checklist

### 1. Type Safety
Run `pnpm -C apps/web exec tsc --noEmit` and fix any TypeScript errors.

### 2. Typography Spot-Check
For each font in the new article's config:
- Verify `usedIn` entries follow the format: `"element.ClassName: {size}px/{weight}/{lineHeight}px [modifiers] #color"`
- Verify h2 and h3 have DIFFERENT styles (fontSize, fontWeight, or lineHeight must differ)
- Verify font weights are sorted ascending and match actual usage

### 3. Color Completeness
- Verify the article's `colors.chartPalette` is non-empty (unless the article truly has no charts)
- Verify every hex value in `chartPalette` appears in the source HTML/CSS
- Verify the palette is NOT byte-identical to any other article's palette

### 4. Per-Article Uniqueness
Compare the new article's `fonts` and `colors` arrays against every existing article in ARTICLES:
- If `fonts` array is byte-identical to another article → FAIL
- If `colors.chartPalette` is byte-identical to another article → FAIL

### 5. Content Block Count
Compare the number of content blocks in `contentBlocks` against the source HTML:
- Count of `subhed` blocks should match source h2+h3 count
- Count of `chart-embed` / `birdkit-chart` blocks should match Datawrapper iframe count
- If counts diverge by more than 10%, WARN

### 6. Content Order
Verify `contentBlocks` follows document order (header first, then content, byline near top).

### 7. Brand Tab Sync
Verify the brand tab files exist and dynamically aggregate from ARTICLES (not hardcoded).

## Output

Report pass/fail/warn for each check. If any FAIL, describe what needs to be fixed.
