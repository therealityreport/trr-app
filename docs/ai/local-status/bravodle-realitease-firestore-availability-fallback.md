# Bravodle and Realitease Firestore availability fallback

Last updated: 2026-03-18

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-18
  current_phase: "complete"
  next_action: "Monitor the Bravodle and Realitease cover/play routes in a Firestore-disabled environment and confirm they now render fallback messaging instead of crashing"
  detail: self
```

- `bravodle/manager.ts` and `realitease/manager.ts` now expose non-throwing optional singleton accessors so route render does not crash when `getDb()` returns `null`.
- The Bravodle and Realitease cover routes now disable the primary CTA and show a stable unavailable message when Firebase Firestore is missing.
- The Bravodle and Realitease play routes now short-circuit bootstrap and talent loading when Firestore is unavailable, then render the existing error shell instead of throwing during render.
- Validation:
  - `pnpm -C apps/web exec tsc --noEmit`
  - `pnpm -C apps/web exec eslint src/app/bravodle/cover/page.tsx src/app/bravodle/play/page.tsx src/app/realitease/cover/page.tsx src/app/realitease/play/page.tsx src/lib/bravodle/manager.ts src/lib/realitease/manager.ts`
  - `pnpm -C apps/web run lint` still fails on pre-existing unrelated issues in `src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx`, `src/app/flashback/play/page.tsx`, `src/components/admin/ImageLightbox.tsx`, and `src/components/admin/season-social-analytics-section.tsx`
  - `pnpm -C apps/web exec next build --webpack` reached `Compiled successfully` and `Running TypeScript ...`, but the full build was stopped after the long static-generation phase exceeded the time budget
