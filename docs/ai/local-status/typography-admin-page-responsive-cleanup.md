# Typography admin page responsive cleanup

Last updated: 2026-03-24

## Handoff Snapshot
```yaml
handoff:
  include: false
  state: archived
  last_updated: 2026-03-24
  current_phase: "archived continuity note"
  next_action: "See newer continuity notes if follow-up is needed"
  detail: self
```

- The typography screen now uses a neutral header shell and wrapping-safe layouts.
- The Set Library now supports `Most Used`, `Heading Font A-Z`, and `Number of Fonts` sorting plus `All/Admin/Surveys/Frontend/Other` filtering.
- Set cards are now one-per-row, no longer show the old mobile/desktop metric dump, and use clickable `Used On` pills plus role popovers for specimen previews.
- The specimen modal and the role popovers now render page-like text compositions instead of generic title/body placeholders, and the modal exposes an `Open actual page` action when a stable route exists.
- The editor header now uses a full-width description block and a single active preview specimen instead of separate mobile/desktop specimen cards.
- `MatrixLikertInput.tsx` no longer scales prompt/statement/option typography from container width; those text roles now use exact breakpoint-aware fallback sizes aligned with the seeded typography set values.
- `DesignSystemPageClient.tsx` now forces the shared `countFontStyles` helper to return a numeric total, fixing the bad `number | FontWeight` inference that was breaking app typecheck and destabilizing the refreshed fonts catalog logic.
- `brand-profile-repository.ts` now imports `appendSearchParam` and `getUnifiedBrandsSectionHref` from the canonical `brands-workspace` module so app typecheck is green again.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/components/admin/design-system/DesignSystemPageClient.tsx src/components/admin/design-system/TypographyTab.tsx tests/design-system-fonts-page.test.tsx tests/typography-tab.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/design-system-fonts-page.test.tsx tests/typography-tab.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/components/admin/design-system/TypographyTab.tsx src/components/survey/MatrixLikertInput.tsx tests/typography-tab.test.tsx tests/matrix-likert-input.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/typography-tab.test.tsx tests/matrix-likert-input.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web typecheck`
