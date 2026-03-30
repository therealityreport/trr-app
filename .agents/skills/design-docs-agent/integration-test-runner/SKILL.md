---
name: integration-test-runner
description: Executable validation skill that runs integration test assertions from test/integration-test.md against the actual ARTICLES array and generated files
---

# Integration Test Runner

## Purpose

Run the executable integration harness for the design-docs pipeline. Validate
the actual `ARTICLES` array in `design-docs-config.ts`, chart/data bindings,
brand sections, and article-specific assertions against repo-local code.

Canonical executable implementation:

- `apps/web/src/lib/admin/design-docs-pipeline-validators.ts`
- `apps/web/scripts/design-docs/run-integration-checks.mjs`

## Trigger

Run during Step 7 (Verify), after `audit-responsive-accessibility`.

## Input

- `configPath` — Path to `design-docs-config.ts`
- `chartDataPath` — Path to `chart-data.ts`
- `articleDetailPagePath` — Path to `ArticleDetailPage.tsx`

## Test Categories

### 1. Per-Article Structural Tests
For each article in the ARTICLES array:

```
ASSERT article.id is non-empty string
ASSERT article.title is non-empty string
ASSERT article.url starts with "https://"
ASSERT article.authors is non-empty array
ASSERT article.date matches YYYY-MM-DD format
ASSERT article.section is non-empty string
ASSERT article.type is one of: "interactive", "article", "standard"
ASSERT article.fonts is non-empty array
ASSERT article.fonts.length >= 2 (at least 2 font families)
ASSERT article.chartTypes is array (may be empty)
ASSERT article.contentBlocks is non-empty array (if present)
ASSERT article.contentBlocks.length >= 3 (header + byline + content)
```

### 2. Font Uniqueness Tests
```
FOR each pair of articles (A, B):
  ASSERT A.fonts[*].usedIn !== B.fonts[*].usedIn (not byte-identical)
  ASSERT A.fonts[*].weights !== B.fonts[*].weights (may overlap but not identical across ALL fonts)
```

### 3. Color Uniqueness Tests
```
FOR each pair of articles (A, B) that both have colors:
  ASSERT A.colors !== B.colors (not byte-identical)
```

### 4. ContentBlock Completeness
For each article with contentBlocks:
```
ASSERT contentBlocks includes { type: "header" }
ASSERT contentBlocks includes { type: "byline" }
ASSERT contentBlocks includes { type: "author-bio" } (if article has authors)
ASSERT every chartTypes entry has a corresponding contentBlock
ASSERT no duplicate adjacent blocks of the same type (except subhed)
```

### 5. Chart Data Constants
For each article's interactive elements:
```
FOR each block where type in ["birdkit-chart", "birdkit-table", "birdkit-table-interactive", "datawrapper-table"]:
  ASSERT a named data constant exists in chart-data.ts
  ASSERT the constant is exported
  ASSERT the constant is imported in ArticleDetailPage.tsx
```

### 6. Cross-Article Validation
```
ASSERT all article.id values are unique
ASSERT all article.url values are unique
ASSERT NYT articles have article.architecture defined
ASSERT Athletic articles have article.architecture.layoutTokens defined
```

### 7. Brand Tab Validation
For each brand (NYT, Athletic):
```
ASSERT brand tab directory exists: sections/brand-{slug}/
ASSERT brand landing component exists: Brand{Name}Section.tsx
ASSERT at least Typography, Colors, Components tabs have content
```

### 8. Article-Type-Specific Tests

#### Trump Economy (nyt-interactive)
```
ASSERT type === "interactive"
ASSERT chartTypes.length === 9 (1 report-card + 8 datawrapper)
ASSERT quoteSections.length === 8
ASSERT fonts includes "nyt-cheltenham-cond"
ASSERT architecture.hydrationId is non-empty
```

#### Sweepstakes Casino (nyt-article)
```
ASSERT type === "article"
ASSERT chartTypes.length === 2 (1 ai2html + 1 stacked-bar)
ASSERT quoteSections.length === 0
ASSERT contentBlocks includes { type: "ai2html" }
ASSERT contentBlocks includes { type: "birdkit-chart" }
```

#### Winter Olympics (nyt-article)
```
ASSERT type === "article"
ASSERT chartTypes.length === 6 (5 birdkit-table + 1 birdkit-table-interactive)
ASSERT colors.chartPalette includes gold (#C9B037)
ASSERT colors.chartPalette includes silver (#A8A8A8)
ASSERT colors.chartPalette includes bronze (#AD8A56)
```

#### NFL Playoff (athletic-standard)
```
ASSERT type === "standard"
ASSERT url includes "/athletic/"
ASSERT chartTypes.length === 1 (datawrapper-table)
ASSERT fonts includes "RegularSlab"
ASSERT contentBlocks includes { type: "storyline" }
ASSERT contentBlocks includes { type: "showcase-link" }
ASSERT contentBlocks includes { type: "puzzle-entry-point" }
```

## Output Schema

See `apps/web/src/lib/admin/design-docs-pipeline-types.ts` for the canonical
`IntegrationTestResult` contract.

## Validation

- [ ] All test categories run to completion
- [ ] `passed` is true (zero failures) before the pipeline reports success
- [ ] Any failures include specific article IDs and expected vs actual values
- [ ] Test results are included in the pipeline output report
