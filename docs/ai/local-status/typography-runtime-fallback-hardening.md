# Typography runtime fallback hardening

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "client runtime typography restored"
  next_action: "Use managed Chrome to verify live admin assignment changes repaint target pages without a full browser reload"
  detail: self
```

- `TypographyRuntimeStyles.tsx` now treats the runtime typography DB read as a best-effort dependency and emits a one-time warning before continuing with the seeded client fallback state.
- `TypographyRuntimeStyles.tsx` now treats the runtime typography DB read as a best-effort dependency and silently falls back to seeded client state when the runtime typography store is unavailable.
- `typography-repository.ts` now retries the parallel seed race and falls back to a typed seed snapshot if the persistent store is still empty after retries.
- This removes the repeated root-layout noise from the parallel `next build` static-generation workers.
- The async server wrapper has been replaced in [`layout.tsx`](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/layout.tsx) with the client-safe [`TypographyRuntimeClient.tsx`](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/typography/TypographyRuntimeClient.tsx), which injects runtime typography styles after hydration and avoids the webpack dev HMR crash path.
- A new public read-only route, [`/api/design-system/typography`](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/design-system/typography/route.ts), now serves typography state without admin auth so the frontend runtime can apply saved assignments globally.
- [`TypographyTab.tsx`](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/design-system/TypographyTab.tsx) now broadcasts a runtime refresh event after set saves, duplicates, deletes, and assignment updates so the live app can pick up admin changes immediately.
- [`typography-seed.ts`](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/typography-seed.ts) now builds a full seeded runtime state with concrete assignment-to-set wiring, so fallback mode still applies real seeded assignments instead of returning sets with an empty assignment list.
- A fresh `make dev` boot now reaches healthy app status, `/api/design-system/typography` returns live populated state, and direct requests to `/hub` and `/rhoslc/s6/social/w1/instagram` no longer trigger the prior server/runtime crash signature in `/.logs/workspace/trr-app.log`.
- Validation:
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/layout.tsx /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/typography/TypographyRuntimeClient.tsx /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/admin/design-system/TypographyTab.tsx /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/api/design-system/typography/route.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/typography-seed.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/typography/runtime-client.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/design-system-typography-routes.test.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/typography-runtime.test.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/typography-tab.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/design-system-typography-routes.test.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/typography-runtime.test.ts /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/typography-tab.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/layout.tsx`
  - `make dev` from `/Users/thomashulihan/Projects/TRR`
  - `curl http://127.0.0.1:3000/hub`
  - `curl http://admin.localhost:3000/rhoslc/s6/social/w1/instagram`
  - `curl http://127.0.0.1:3000/api/design-system/typography` -> `25` sets / `27` assignments
