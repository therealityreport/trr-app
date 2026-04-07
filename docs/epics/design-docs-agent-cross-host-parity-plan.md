# Epic Plan: Design Docs Agent — Cross-Host Parity & Design Fidelity

## Epic Overview

**Purpose:** Bring the Claude Code and Codex integration layers into full parity with the canonical shared Design Docs package, fix three systemic design fidelity failures (text styles, chart formatting, icon/image/SVG handling), and add five verification improvements that prevent low-fidelity pages from shipping.

**User Value:** Today, the shared 22-skill pipeline produces pages with missing typography, malformed charts, and broken or duplicated media assets — regardless of which host runs it. Host-specific wrappers, commands, and manifests have drifted from the canonical roster, causing discovery failures and stale metadata. This epic eliminates that drift and raises output fidelity to match source material.

**Scope:**
- IN: Host adapter parity, plugin manifest parity, symlink hygiene, token schema contracts, chart rendering contracts, R2 asset dedup, visual regression, verification gates
- OUT: New skill creation beyond what is listed here, live-site scraping policy changes, TRR renderer refactors unrelated to the Design Docs pipeline

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Adapter↔roster drift | Zero — both adapters reference concrete tool names and match current roster count |
| Plugin manifest parity | Both manifests at same version, both contain interface metadata |
| Typography fidelity | Generated h1–h6 and body text match extracted token values for font-family, weight, size, line-height, letter-spacing, color |
| Chart data round-trip | 100% of extracted data rows survive generation without truncation, reordering, or value alteration |
| Asset coverage | Every `<img>`, `<svg>`, `background-image`, and icon ref in generated JSX resolves to a valid R2 URL — zero 404s, zero upstream-source URLs |
| R2 dedup | Zero duplicate uploads for assets already present in R2 |
| Source fidelity score | Every generated page scores ≥ 70 before generation proceeds |

---

## Current State (as of 2026-04-02)

### What is symmetric (auto-propagates)
- `agents/openai.yaml` — canonical roster (22 skills: 18 owned + 4 supporting)
- All `SKILL.md` files in the shared package
- `references/` documentation corpus
- `adapters/` directory (shared location, but contents are host-specific)

### What is asymmetric (requires manual propagation)
| Item | Claude Code | Codex |
|------|-------------|-------|
| Symlink for `extract-birdkit-arrow-charts` | Missing | Missing |
| `/design-docs` command | Stale (says "20-skill") | No command exists |
| TRR-APP wrapper paths | Broken (points to nonexistent `TRR-APP/.agents/`) | N/A |
| Plugin manifest richness | Minimal (no `interface` block) | Rich (has `interface`) |
| Plugin version | `1.0.0` (stale) | `1.0.0` (stale) |
| R2 dedup guidance in adapter | Absent | Absent |
| Concrete tool names in adapter | Absent (uses vague descriptions) | Absent (uses vague descriptions) |

---

## Part 1: Claude Code — Host-Specific Fixes (C1–C7)

### C1 — Fix broken paths in TRR-APP wrapper

**File:** `TRR-APP/.claude/skills/design-docs-agent/SKILL.md`

**Problem:** All path references point to `TRR-APP/.agents/skills/design-docs-agent/` which does not exist. The canonical location is `TRR/.agents/skills/design-docs-agent/`.

**Action:**
1. Replace every occurrence of `TRR-APP/.agents/skills/design-docs-agent/` with the correct absolute path `/Users/thomashulihan/Projects/TRR/.agents/skills/design-docs-agent/`
2. Verify the wrapper can resolve the canonical `SKILL.md`, `adapters/claude.md`, and all subskill `SKILL.md` files

**Acceptance:** Claude wrapper resolves all referenced paths without error.

---

### C2 — Update `/design-docs` command — stale skill count and missing skill

**File:** `.claude/commands/design-docs.md`

**Problem:** Still says "shared 20-skill pipeline" and the inline skill list stops at `extract-birdkit-tables` — missing `extract-birdkit-arrow-charts`.

**Action:**
1. Update skill count to "shared 22-skill roster (18 owned + 4 supporting)"
2. Add `extract-birdkit-arrow-charts` to the inline skill list in its correct roster position (after `extract-birdkit-tables`, wave 2 extraction)
3. Verify the command text matches the canonical `openai.yaml` roster

**Acceptance:** Command text matches current roster exactly.

---

### C3 — Enrich `.claude-plugin/plugin.json`

**File:** `.agents/skills/design-docs-agent/.claude-plugin/plugin.json`

**Problem:** Claude's manifest has only `name`, `version`, `description`, `skills`, `author`. Codex has a full `interface` block with `displayName`, `category`, `capabilities`, `defaultPrompt`, and `brandColor`.

**Action:** Add an `interface` block matching the Codex manifest structure:
```json
{
  "interface": {
    "displayName": "Design Docs Agent",
    "shortDescription": "Generate or update TRR design-docs pages from saved source bundles, HTML captures, and source inventories.",
    "longDescription": "Shared Design Docs package for Claude Code and Codex. 22-skill roster (18 owned + 4 supporting). Roster, status, and ordering defined in agents/openai.yaml. Workflow behavior defined in package SKILL.md.",
    "developerName": "The Reality Report",
    "category": "Productivity",
    "capabilities": ["Read", "Write"],
    "defaultPrompt": [
      "Use design docs to ingest an article plus a saved source bundle.",
      "List the shared Design Docs skill roster.",
      "Verify shared package skill parity."
    ],
    "brandColor": "#1B365D"
  }
}
```

**Acceptance:** Claude plugin manifest has the same interface fields as Codex.

---

### C4 — Add concrete MCP tool names to Claude adapter

**File:** `.agents/skills/design-docs-agent/adapters/claude.md`

**Problem:** Capability mappings use vague descriptions like "Chrome DevTools MCP page navigation" instead of concrete tool identifiers.

**Action:** Update the capability mapping table:

| Shared capability | Claude behavior |
|---|---|
| `browser.navigate` | `navigate_page` via Chrome DevTools MCP |
| `browser.snapshot` | `get_accessibility_tree` via Chrome DevTools MCP |
| `browser.evaluate` | `evaluate_javascript` via Chrome DevTools MCP |
| `browser.network.list` | `list_network_requests` via Chrome DevTools MCP |
| `browser.network.get` | `get_network_response` via Chrome DevTools MCP |
| `browser.screenshot` | `take_screenshot` via Chrome DevTools MCP |
| `delegate.parallel` | Claude subagents (max 3 concurrent, sequential fallback) |
| `fs.edit` | Claude `Edit` tool |
| `check.typecheck` | `npx tsc --noEmit` via shell |
| `media.hosted_check` | Query R2 bucket for existing asset key before upload |

**Acceptance:** Every capability maps to a specific, invocable tool name.

---

### C5 — Update TRR-APP command copy

**File:** `TRR-APP/.claude/commands/design-docs.md`

**Problem:** Kept "in sync" with root but currently stale — same issues as C2.

**Action:** Mirror the changes from C2 into the TRR-APP copy.

**Acceptance:** Both command files are byte-identical or functionally equivalent.

---

### C6 — Add R2 asset-reuse instructions to Claude adapter

**File:** `.agents/skills/design-docs-agent/adapters/claude.md`

**Problem:** No guidance on checking R2 before uploading assets.

**Action:** Add a new capability mapping row for `media.hosted_check` and a new section:

```markdown
## R2 Asset Reuse

Before uploading any icon, image, or SVG to R2:
1. Derive the expected R2 object key from the asset's source URL and usage class
2. Query the R2 bucket to check if that key already exists
3. If it exists, reuse the existing hosted URL — do not re-upload
4. If it does not exist, upload and record the new hosted URL in the media manifest
```

**Acceptance:** Adapter contains explicit R2 dedup instructions.

---

### C7 — Document Claude subagent parallelism limits

**File:** `.agents/skills/design-docs-agent/adapters/claude.md`

**Problem:** `delegate.parallel` says "Claude subagents when available" but does not specify concurrency limits, isolation model, or fallback behavior.

**Action:** Add a section:

```markdown
## Delegation Model

- Max concurrent subagents: 3 (limited by Claude Code session model)
- Isolation: each subagent operates in the same working directory but with independent tool state
- Fallback: if subagents are unavailable, execute skills sequentially in roster order
- Subagent assignment: group by pipeline phase (extraction wave 1, extraction wave 2, generation, verification)
```

**Acceptance:** Adapter specifies concrete delegation semantics.

---

## Part 2: Codex — Host-Specific Fixes (X1–X6)

### X1 — Add a Codex command entry point

**File:** `.agents/skills/design-docs-agent/.codex-plugin/` or equivalent Codex command surface

**Problem:** Claude has `/design-docs` and `/design-docs-add-article`; Codex has no equivalent invocation path.

**Action:** Create a command definition that Codex can discover, referencing the canonical package `SKILL.md` as the entry point. Format per Codex plugin conventions.

**Acceptance:** Codex users can invoke the design-docs pipeline via a named command.

---

### X2 — Add concrete tool names to Codex adapter

**File:** `.agents/skills/design-docs-agent/adapters/codex.md`

**Problem:** Capability mappings use vague descriptions like "Codex Chrome or DevTools navigation."

**Action:** Update the capability mapping table with actual Codex tool primitives (specific tool names to be confirmed from Codex documentation):

| Shared capability | Codex behavior |
|---|---|
| `browser.navigate` | Codex `browser_navigate` tool |
| `browser.snapshot` | Codex `browser_snapshot` tool |
| `browser.evaluate` | Codex `browser_evaluate` tool |
| `browser.network.list` | Codex `browser_network_list` tool |
| `browser.network.get` | Codex `browser_network_get` tool |
| `browser.screenshot` | Codex `browser_screenshot` tool |
| `delegate.parallel` | Codex parallel delegation (specify concurrency model) |
| `fs.edit` | Codex file editing tool |
| `check.typecheck` | `npx tsc --noEmit` via shell |
| `media.hosted_check` | Query R2 bucket for existing asset key before upload |

**Acceptance:** Every capability maps to a specific Codex tool name.

---

### X3 — Update `longDescription` in Codex plugin manifest

**File:** `.agents/skills/design-docs-agent/.codex-plugin/plugin.json`

**Problem:** Does not mention current skill count (22) or newest skill (`extract-birdkit-arrow-charts`).

**Action:** Update `longDescription` to:
```
"Shared Design Docs package for Claude Code and Codex. 22-skill roster (18 owned + 4 supporting). Roster, status, and ordering defined in agents/openai.yaml. Workflow behavior defined in package SKILL.md, including saved-bundle inputs, component-inventory provenance, hosted-media rules, and interactive coverage."
```

**Acceptance:** `longDescription` reflects current roster count and mentions the newest skill.

---

### X4 — Document Codex delegation semantics

**File:** `.agents/skills/design-docs-agent/adapters/codex.md`

**Problem:** "Codex delegation when useful" does not specify parallel vs sequential, max concurrency, or handoff model.

**Action:** Add a Delegation Model section (same structure as C7, with Codex-specific limits).

**Acceptance:** Adapter specifies concrete delegation semantics.

---

### X5 — Add R2 asset-reuse instructions to Codex adapter

**File:** `.agents/skills/design-docs-agent/adapters/codex.md`

**Problem:** Same gap as Claude — no guidance on checking R2 before uploading.

**Action:** Add the same R2 Asset Reuse section as C6, adapted for Codex tool names.

**Acceptance:** Adapter contains explicit R2 dedup instructions.

---

### X6 — Add `defaultPrompt` examples for charts and media workflows

**File:** `.agents/skills/design-docs-agent/.codex-plugin/plugin.json`

**Problem:** Current `defaultPrompt` only covers article ingestion and roster listing. Missing examples for chart extraction and media mirroring.

**Action:** Expand `defaultPrompt` to:
```json
[
  "Use design docs to ingest an article plus a saved source bundle.",
  "List the shared Design Docs skill roster.",
  "Extract Datawrapper charts from this article and generate renderer-ready data.",
  "Mirror all icons and images to R2, reusing existing assets where possible.",
  "Verify shared package skill parity."
]
```

**Acceptance:** Plugin catalog shows relevant example prompts for all major workflows.

---

## Part 3: Shared — Changes to Both Hosts (B1–B14)

### B1 — Create missing symlink for `extract-birdkit-arrow-charts`

**Location:** `.agents/skills/`

**Action:**
```bash
cd /Users/thomashulihan/Projects/TRR/.agents/skills
ln -s design-docs-agent/extract-birdkit-arrow-charts design-docs-extract-birdkit-arrow-charts
```

**Acceptance:** Symlink exists and resolves to the correct `SKILL.md`.

---

### B2 — Add `rosterVersion` field to both `plugin.json` files

**Files:** `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`

**Action:** Add to both:
```json
"rosterVersion": "2.1",
"rosterCount": { "owned": 18, "supporting": 4, "total": 22 }
```

**Acceptance:** Both manifests communicate the current roster state.

---

### B3 — Version-bump both `plugin.json` files to `1.1.0`

**Files:** `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`

**Action:** Change `"version": "1.0.0"` to `"version": "1.1.0"` in both files.

**Acceptance:** Both manifests show `1.1.0`.

---

### B4 — Add `last_synced` timestamp to both adapters

**Files:** `adapters/claude.md`, `adapters/codex.md`

**Action:** Add a metadata block at the top of each adapter:
```markdown
<!-- roster_hash: sha256 of openai.yaml at time of last sync -->
<!-- last_synced: 2026-04-02 -->
<!-- roster_count: 22 (18 owned + 4 supporting) -->
```

**Acceptance:** Both adapters contain a sync timestamp and roster hash that CI can validate.

---

### B5 — Standardize capability mapping specificity in both adapters

**Files:** `adapters/claude.md`, `adapters/codex.md`

**Problem:** Both use vague natural-language descriptions instead of concrete tool identifiers.

**Action:** Covered by C4 (Claude) and X2 (Codex). This item tracks the shared requirement.

**Acceptance:** Both adapters use concrete tool names in their capability tables.

---

### B6 — Add `extract-birdkit-arrow-charts` to references taxonomy

**File:** `references/birdkit-component-taxonomy.md`

**Action:** Add an entry for arrow chart patterns:
- Component class: `arrow-chart`
- Source selectors: `.g-arrow-chart`, `.g-screenreader-only` within arrow containers
- Data shape: `{ label, priorValue, newValue, changeDirection, changeMagnitude }`
- Extraction priority: screen-reader prose over geometry inference
- Renderer contract: horizontal bar pairs with directional arrow stems

**Acceptance:** Taxonomy documents the arrow chart pattern and its extraction/rendering contract.

---

### B7 — Fix text style adoption — define `TokenSchema` contract

**Files:** `extract-css-tokens/SKILL.md`, `generate-article-page/SKILL.md`, `generate-brand-section/SKILL.md`, `references/rendering-contracts.md`

**Problem:** `extract-css-tokens` outputs `typography_specimens` and `tokens` but no unified shape contract defines the exact object structure. Generation skills consume tokens but rely on implicit knowledge.

**Action:**
1. Add a `TokenSchema` type definition to `rendering-contracts.md`:
```typescript
interface TypographyToken {
  selector: string;          // e.g. "h1", "h2", ".g-body-text"
  fontFamily: string;        // e.g. "nyt-cheltenham, georgia, serif"
  fontWeight: number;        // e.g. 700 (always numeric)
  fontSize: string;          // e.g. "2.25rem"
  lineHeight: string;        // e.g. "1.2"
  letterSpacing: string;     // e.g. "-0.01em" or "normal"
  color: string;             // e.g. "#121212"
  usedIn: string;            // e.g. "article headline"
}

interface ColorToken {
  name: string;              // semantic name, e.g. "brand-accent"
  value: string;             // hex, e.g. "#567B95"
  usedIn: string;            // e.g. "section dividers, link hover"
  cssVar?: string;           // e.g. "--dd-brand-accent"
}

interface TokenPayload {
  typography: TypographyToken[];
  colors: ColorToken[];
  spacing: Record<string, string>;
  radii: Record<string, string>;
  rawVariables: Record<string, string>;
}
```
2. Update `extract-css-tokens/SKILL.md` output contract to require `TokenPayload` shape
3. Update `generate-article-page/SKILL.md` to consume `TokenPayload` and apply each token to the correct element
4. Update `generate-brand-section/SKILL.md` to aggregate `TokenPayload` from article data

**Acceptance:** Extraction output and generation input conform to the same typed schema. Generated components use exact extracted values for all typography properties.

---

### B8 — Fix chart formatting — add `ChartRenderingContract`

**Files:** `extract-datawrapper-charts/SKILL.md`, `extract-birdkit-arrow-charts/SKILL.md`, `references/rendering-contracts.md`

**Problem:** Datawrapper and Birdkit have their own extraction paths but no common formatting grammar. `rendering-contracts.md` has ai2html fidelity rules but nothing equivalent for Datawrapper or Birdkit.

**Action:**
1. Add to `rendering-contracts.md`:
```markdown
## Chart Rendering Contract

Every chart extraction skill must output:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chartId | string | yes | Unique identifier for the chart |
| chartType | string | yes | One of: bar, line, area, scatter, table, arrow, stacked-bar, grouped-bar |
| title | string | yes | Chart heading text |
| subtitle | string | no | Chart lead-in or description |
| source | string | no | Source attribution text |
| note | string | no | Footnote or methodology note |
| axisLabels | { x?: string, y?: string } | when axes exist | Axis label text |
| scale | { min?: number, max?: number, unit?: string } | when numeric | Axis scale bounds and unit |
| colorPalette | string[] | yes | Ordered list of hex colors used in the chart |
| legendEntries | { label: string, color: string }[] | when legend exists | Legend items in display order |
| data | Record<string, unknown>[] | yes | Renderer-ready row data |
| responsiveSizing | { desktop: { width: string, height: string }, mobile?: { width: string, height: string } } | yes | Viewport-specific dimensions |
```
2. Update `extract-datawrapper-charts/SKILL.md` to require this output shape
3. Update `extract-birdkit-arrow-charts/SKILL.md` to require this output shape
4. Update `generate-article-page/SKILL.md` to consume this shape for all chart types

**Acceptance:** All chart types produce a common output schema. Generated charts match source layout, colors, and labeling.

---

### B9 — Fix icon/image/SVG scraping, storage, and display with R2 dedup

**Files:** `extract-icons-and-media/SKILL.md`, `generate-article-page/SKILL.md`, `references/rendering-contracts.md`

**Problem:** Three failures: (1) assets not scraped/saved during extraction, (2) saved assets not referenced in generated components, (3) assets already in R2 re-uploaded as duplicates.

**Action:**
1. Update `extract-icons-and-media/SKILL.md` to make hosted-media manifest a **required output** (not a "follow-up task"):
```markdown
## Required Output: Hosted-Media Manifest

The skill must produce a `hostedMediaManifest` array where each entry contains:
- sourceUrl: original upstream URL
- r2Key: the R2 object key (derived from source URL hash + usage class)
- hostedUrl: the R2 public URL (populated after upload or reuse check)
- assetKind: one of icon | image | svg | background
- usageClass: one of nav-icon | page-icon | card-illustration | promo-banner | progress-state | utility-icon
- displayMetadata: { slot, desktop: { width, height }, mobile?: { width, height }, objectFit?, backgroundSize?, backgroundPosition? }

### R2 Dedup Rule
Before uploading any asset:
1. Compute the expected r2Key
2. HEAD request to R2 to check existence
3. If exists → populate hostedUrl from existing object, skip upload
4. If not exists → upload, then populate hostedUrl
```
2. Update `generate-article-page/SKILL.md` to require that every media reference in generated JSX/TSX resolves to a `hostedUrl` from the manifest — never an upstream source URL
3. Update `rendering-contracts.md` to add the dedup rule as a top-level contract

**Acceptance:** Zero upstream source URLs in generated components. Zero duplicate R2 uploads. Every media reference resolves.

---

### B10 — Define the hosted-media manifest owner

**Files:** `references/rendering-contracts.md`, `extract-icons-and-media/SKILL.md`

**Problem:** `rendering-contracts.md` says "all displayed media must render from the mirrored hosted-media manifest" but no skill is assigned ownership.

**Action:** Assign `extract-icons-and-media` as the manifest owner. Add to `rendering-contracts.md`:
```markdown
## Hosted-Media Manifest Ownership

Owner: `extract-icons-and-media`
Consumers: `generate-article-page`, `generate-brand-section`, `sync-brand-page`

The owner skill is responsible for:
1. Creating the manifest during extraction
2. Populating all hostedUrl fields (via upload or R2 reuse)
3. Passing the manifest to downstream generation skills
4. Flagging any assets that could not be scraped or uploaded

Consumer skills must:
1. Reference only hostedUrl values from the manifest
2. Never construct media URLs independently
3. Report missing manifest entries as generation errors
```

**Acceptance:** Ownership is explicit. Consumer skills fail loudly on missing manifest entries.

---

### B11 — Add CSS variable dictionary to rendering contracts

**File:** `references/rendering-contracts.md`

**Problem:** Currently mentions `--dd-brand-accent` as an example but does not enumerate the full variable set.

**Action:** Add a complete variable dictionary:
```markdown
## Design Docs CSS Variable Dictionary

### Brand Chrome Variables
| Variable | Purpose | Example Value |
|----------|---------|---------------|
| --dd-brand-accent | Primary brand color | #567B95 |
| --dd-brand-bg | Brand section background | #F7F7F5 |
| --dd-brand-text | Brand section body text | #333333 |
| --dd-brand-border | Brand section dividers | #E0E0E0 |
| --dd-brand-heading | Brand section heading text | #121212 |
| --dd-brand-link | Brand section link color | #326891 |
| --dd-brand-link-hover | Brand section link hover | #567B95 |

### Article Specimen Variables
| Variable | Purpose | Example Value |
|----------|---------|---------------|
| --dd-article-font-primary | Article primary typeface | nyt-cheltenham, georgia, serif |
| --dd-article-font-secondary | Article secondary typeface | nyt-franklin, arial, sans-serif |
| --dd-article-bg | Article specimen background | #FFFFFF |
| --dd-article-text | Article specimen body text | #333333 |
| --dd-article-accent | Article-specific accent color | #326891 |

### Chart Variables
| Variable | Purpose | Example Value |
|----------|---------|---------------|
| --dd-chart-bg | Chart container background | #FFFFFF |
| --dd-chart-grid | Chart gridline color | #E8E8E8 |
| --dd-chart-label | Chart axis label color | #666666 |
| --dd-chart-annotation | Chart annotation text color | #333333 |
```

**Acceptance:** All CSS variables used by the Design Docs renderer are documented with purpose and example values.

---

### B12 — Add brand-sync asset class re-validation

**File:** `sync-brand-page/SKILL.md`

**Problem:** `extract-icons-and-media` preserves usage classes during extraction, but `sync-brand-page` does no re-validation during aggregation.

**Action:** Add a validation step to `sync-brand-page/SKILL.md`:
```markdown
## Asset Class Validation (during brand sync)

Before aggregating article assets into brand tabs:
1. For each asset in the article's hostedMediaManifest, verify the usageClass matches the target brand tab slot
2. Do not silently promote a nav-icon to a card-illustration or vice versa
3. If an asset class mismatch is detected, flag it as a sync warning and exclude the mismatched asset
4. Log all excluded assets in the sync report
```

**Acceptance:** Brand sync validates asset class boundaries. Mismatched assets are excluded with warnings.

---

### B13 — Add interactive specimen hydration validation

**File:** `audit-responsive-accessibility/SKILL.md`

**Problem:** `rendering-contracts.md` requires interactive specimens when source shows affordances, but no skill validates that interactive state hydrates correctly.

**Action:** Add a validation step to `audit-responsive-accessibility/SKILL.md`:
```markdown
## Interactive Specimen Hydration Check

For every generated interactive specimen (tabs, accordions, drawers, modals, TOC overlays):
1. Verify the component renders without hydration errors (no React mismatch warnings)
2. Verify at least two interactive states are reachable (e.g., tab 1 active, tab 2 active)
3. Verify content within each state matches the source extraction data
4. Flag any interactive specimen that renders as static-only when the source showed affordances
```

**Acceptance:** Audit catches specimens that fail to hydrate or have unreachable states.

---

### B14 — Add SVG points extraction automation

**Files:** `extract-icons-and-media/SKILL.md`, `generate-article-page/SKILL.md`

**Problem:** `generate-article-page` requires exact `<polygon>` and `<polyline>` `points` replication, but this is currently manual inspection only.

**Action:**
1. Add to `extract-icons-and-media/SKILL.md`:
```markdown
## SVG Coordinate Extraction

For every SVG asset containing `<polygon>`, `<polyline>`, or `<path>` elements:
1. Extract the exact `points` or `d` attribute values
2. Record them in the media manifest as `svgGeometry: { tag, points|d, viewBox, fill, stroke }`
3. Do not approximate, simplify, or regenerate these values
```
2. Add to `generate-article-page/SKILL.md`:
```markdown
## SVG Shape Validation

For every SVG rendered in the generated component:
1. Compare the `points` or `d` attribute against the extracted `svgGeometry` in the media manifest
2. If any coordinate differs, flag as a generation error
3. Never substitute CSS gradients, clip-path, or background: linear-gradient for SVG shapes
```

**Acceptance:** SVG coordinate data is extracted automatically and validated during generation.

---

## Part 4: Design Fidelity Improvements (D1–D5)

### D1 — Visual regression screenshots in verification gate

**Files:** `audit-responsive-accessibility/SKILL.md`, `references/rendering-contracts.md`

**Problem:** Neither host takes a screenshot of the generated page and compares it to the source. Subtle style drift (wrong line-height, missing letter-spacing, off-brand colors) goes undetected.

**Action:**
1. Add to `audit-responsive-accessibility/SKILL.md`:
```markdown
## Visual Regression Check

After generation completes:
1. Capture desktop (1280px) and mobile (375px) screenshots of the generated article page
2. Capture equivalent screenshots of the source page from the saved bundle (or from the saved screenshot set in sourceBundle.screenshots)
3. Run a pixel-diff comparison at block level (not full-page — allows for layout differences in chrome)
4. Flag any content block where the diff exceeds 15% pixel divergence
5. Include the flagged blocks and their diff images in the verification report
```
2. Add to `rendering-contracts.md`:
```markdown
## Visual Regression Contract

Every generated article page must pass a visual regression check before the pipeline reports success. The check compares generated output against source screenshots at desktop and mobile viewports. Block-level divergence above 15% is a verification failure.
```

**Acceptance:** Verification gate produces visual diff reports. Pages with >15% block divergence are flagged.

---

### D2 — Typography specimen diff in verification phase

**File:** `audit-generated-config-integrity/SKILL.md`

**Problem:** Currently validates config structure but not typography values.

**Action:** Add a section:
```markdown
## Typography Specimen Validation

For each heading level (h1–h6) and body text in the generated component:
1. Read the applied styles from the generated JSX/TSX (inline styles or CSS variable references)
2. Compare against the extracted TokenPayload:
   - font-family: must match exactly
   - font-weight: must match (numeric)
   - font-size: must match
   - line-height: must match
   - letter-spacing: must match
   - color: must match
3. Report any delta as a config integrity failure
4. Include the expected (extracted) and actual (generated) values in the report

### Pass criteria
Zero deltas across all typography tokens for all heading levels and body text.
```

**Acceptance:** Config integrity audit catches every typography mismatch between extraction and generation.

---

### D3 — Chart data round-trip validation

**Files:** `integration-test-runner/SKILL.md`

**Problem:** `generate-article-page` checks first/last data entries but no skill validates the full dataset.

**Action:** Add a section to `integration-test-runner/SKILL.md`:
```markdown
## Chart Data Round-Trip Validation

For every chart in the generated article:
1. Parse the generated data file (TypeScript constant or JSON) back into the ChartRenderingContract schema
2. Diff against the original extraction output:
   - Row count: must be identical
   - Column order: must be identical
   - Cell values: must match exactly (no rounding, truncation, or type coercion)
   - colorPalette: must match in order
   - legendEntries: must match in order
3. Report any discrepancy as a round-trip failure
4. Include the diff (expected vs actual) in the test report

### Pass criteria
Zero discrepancies across all charts in the article.
```

**Acceptance:** Integration test catches any data loss or mutation between extraction and generation.

---

### D4 — Asset coverage audit in verification phase

**File:** `audit-generated-config-integrity/SKILL.md` (or new skill if scope warrants)

**Problem:** No skill verifies that generated components actually reference valid R2 URLs.

**Action:** Add a section:
```markdown
## Asset Coverage Audit

After generation, scan all generated JSX/TSX files for the article:
1. Find every `<img src=`, `<svg`, `background-image:`, `backgroundImage:`, and icon component reference
2. For each reference:
   a. Verify the URL resolves (HEAD request, expect 200)
   b. Verify the URL points to R2 (domain check against configured R2 public domain)
   c. Verify the URL appears in the hostedMediaManifest
   d. Verify the asset's usageClass in the manifest matches its usage slot in the JSX
3. Report:
   - Missing assets (referenced in JSX but not in manifest)
   - Broken assets (404 on HEAD request)
   - Upstream leaks (URL points to source domain, not R2)
   - Class mismatches (usage slot does not match manifest usageClass)

### Pass criteria
Zero missing, broken, upstream-leaked, or class-mismatched assets.
```

**Acceptance:** Audit catches every asset reference issue before the pipeline reports success.

---

### D5 — Source fidelity score gate before generation

**Files:** `extract-page-structure/SKILL.md`, `classify-publisher-patterns/SKILL.md`

**Problem:** Generation proceeds regardless of extraction quality. Low-fidelity extractions produce pages that require full manual rework.

**Action:**
1. Add to `extract-page-structure/SKILL.md`:
```markdown
## Source Fidelity Score

After all extraction skills complete, compute a fidelity score (0–100):

| Component | Weight | Scoring |
|-----------|--------|---------|
| Content blocks extracted | 30% | (blocks extracted / blocks detected) × 100 |
| CSS tokens resolved | 20% | (tokens with non-default values / total token slots) × 100 |
| Media assets cataloged | 20% | (assets in manifest / asset references in source HTML) × 100 |
| Interactive artifacts with renderer-ready data | 15% | (charts + embeds with full data / total charts + embeds detected) × 100 |
| Metadata completeness | 15% | (metadata fields populated / total metadata fields) × 100 |

### Generation Gate
- Score ≥ 70: proceed to generation
- Score 50–69: proceed with warnings — list all components scoring below 50%
- Score < 50: halt generation — report gaps and recommend re-extraction with additional source inputs
```
2. Add the score computation as a required step between extraction and generation in the pipeline orchestration (`SKILL.md`)

**Acceptance:** Generation halts on low-fidelity extractions. Score and component breakdown are included in pipeline output.

---

## Execution Order

### Phase 1: Infrastructure (do first — unblocks everything else)
1. B1 — Create missing symlink
2. B3 — Version-bump both manifests
3. B4 — Add sync timestamps to adapters
4. C1 — Fix TRR-APP wrapper paths

### Phase 2: Host Parity (can be parallelized across hosts)
**Claude track:** C2, C3, C4, C5, C6, C7
**Codex track:** X1, X2, X3, X4, X5, X6
**Shared:** B2, B5, B6

### Phase 3: Design Fidelity Contracts (do before Phase 4)
1. B7 — TokenSchema contract
2. B8 — ChartRenderingContract
3. B9 — R2 dedup and manifest as required output
4. B10 — Manifest ownership
5. B11 — CSS variable dictionary
6. B14 — SVG points extraction automation

### Phase 4: Verification Improvements (depends on Phase 3 contracts)
1. D5 — Source fidelity score gate (earliest — can block bad generations)
2. D2 — Typography specimen diff
3. D3 — Chart data round-trip validation
4. D4 — Asset coverage audit
5. D1 — Visual regression screenshots

### Phase 5: Aggregation Hardening
1. B12 — Brand-sync asset class re-validation
2. B13 — Interactive specimen hydration validation

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Codex tool names change between versions | X2 adapter becomes stale | B4 sync timestamps + CI hash check |
| R2 dedup adds latency to extraction | Slower pipeline runs | Batch HEAD requests; cache R2 key existence per session |
| Visual regression is too noisy (false positives) | Developers ignore the gate | Use block-level comparison, not full-page; tune threshold from 15% |
| TokenSchema is too rigid for edge-case publishers | Extraction fails on unusual CSS patterns | Include `rawVariables` escape hatch for non-standard tokens |
| Source fidelity score halts too aggressively | Blocks legitimate low-source-quality articles | Allow manual override with explicit `--force-generate` flag |
