---
name: audit-generated-config-integrity
description: Post-generation validation gate — type-checks config, validates block order, enforces uniqueness and union coverage
---

# Audit Generated Config Integrity

## Purpose

After `generate-article-page` and `wire-config-and-routing` complete, run this
skill as a quality gate BEFORE syncing brand pages. It validates the generated
config is correct, complete, and consistent with the rest of the system.

Can also be invoked standalone after manual config edits.

Canonical executable implementation:

- `apps/web/src/lib/admin/design-docs-pipeline-validators.ts`
- `apps/web/scripts/design-docs/validate-config-integrity.mjs`

## Trigger

Run at Step 5.5 (after wiring, before brand sync).

## Input

- `articleId` — The article just added/updated
- `configPath` — Path to `design-docs-config.ts` (default: `apps/web/src/lib/admin/design-docs-config.ts`)
- `chartDataPath` — Path to `chart-data.ts` (default: `apps/web/src/components/admin/design-docs/chart-data.ts`)

## Checks

### 1. TypeScript Compilation
Run `check.typecheck` using the repo validation command. Do not hardcode a
host-specific shell command in the orchestration layer.

If this fails, report the exact error(s) and which file(s) are affected.

### 2. ContentBlocks Document Order
For the target article, verify that `contentBlocks` entries follow the source HTML
document order. Check that:
- `header` comes before `byline`
- `byline` comes before content blocks
- `featured-image` appears at its correct document position
- `author-bio` is last (or near-last)
- No duplicate blocks of the same type at the same position

### 3. Font/Color Per-Article Uniqueness
Compare the target article's `fonts` array against ALL other articles in ARTICLES:
- `fonts[].name` arrays should have the same families but potentially different weights/usedIn
- `fonts[].usedIn` arrays MUST NOT be byte-identical to another article's
- `colors` object MUST NOT be byte-identical to another article's

If uniqueness check fails: the extraction likely copied from another article. STOP and report.

### 4. ContentBlock Union Coverage
For every `type` value in the target article's `contentBlocks`:
- Verify the type exists in the `ContentBlock` union type definition
- Verify `ArticleDetailPage.tsx` has a renderer for that type
- If a block type is missing from the union or has no renderer, report it

### 5. Chart Data Constant Existence
For every `birdkit-chart`, `birdkit-table`, `birdkit-table-interactive`, or `datawrapper-table`
block in `contentBlocks`:
- Verify a corresponding data constant exists in `chart-data.ts`
- Verify the constant is exported and imported in `ArticleDetailPage.tsx`

### 6. Required Fields
- [ ] `url` field is set (populates "View Page" button)
- [ ] `fonts` array is non-empty
- [ ] `chartTypes` array matches the number of interactive elements in `contentBlocks`
- [ ] `contentBlocks` has at least 3 entries (header + byline + at least one content)

### 7. Background Color
- Verify the article page uses the expected brand-aware page background contract
- Check in `ArticleDetailPage.tsx` or the article's rendering context

## Output Schema

See `apps/web/src/lib/admin/design-docs-pipeline-types.ts` for the canonical
`AuditResult` contract.

## Error Recovery

- **tsc fails**: Read the error, fix the type mismatch in the generated config, re-run
- **Uniqueness fails**: Re-extract fonts/colors from THIS article's source HTML
- **Missing renderer**: Add the block type to ContentBlock union + add renderer in ArticleDetailPage
- **Missing chart data**: Re-run the relevant chart extraction skill

## Validation

- [ ] All 7 checks run to completion
- [ ] `AuditResult.passed` is true before proceeding to brand sync
- [ ] Any `blockingErrors` are fixed before the orchestrator reports success
