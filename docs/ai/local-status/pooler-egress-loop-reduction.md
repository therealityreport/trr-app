# Pooler Egress Loop Reduction

Last updated: 2026-03-25

## Status
- App phase complete.

## What changed
- Removed the person-gallery auto-poll loop that was reloading the full `/people/{id}/photos?limit=500...` dataset every 15 seconds whenever a refresh operation was marked `running` or `queued`.
- Kept the one-shot gallery refresh on operation-state entry, so the UI still updates without continuously re-scanning the full gallery while background work runs.
- Removed the social-account active-run summary polling loop that was re-requesting `/social/profiles/{platform}/{handle}/summary` every 5 seconds during catalog runs.
- Preserved catalog run progress polling and terminal summary refresh so operators still see run state changes without hammering heavy summary queries.
- Updated the social-account runtime tests to lock in the lower-egress behavior.

## Validation
- Passed: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/social-account-profile-page.runtime.test.tsx tests/person-gallery-media-view.test.ts tests/people-page-tabs-runtime.test.tsx`
- Evidence review: March 24 archive logs showed repeated gallery scans and summary polling from the app runtime:
  - `20260324-062242/trr-app.log` logged `1007` gallery requests for `.../people/66ce2444-c6c4-46bc-94d0-4c15ae3d04af/photos?limit=500...`
  - `20260324-225258/trr-app.log` logged `654` social profile summary requests
- Attempted: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec tsc --noEmit` is still running without a result at handoff time.

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-25
  current_phase: "app-side pooler egress loops removed from person gallery and social profile pages"
  next_action: "verify in managed Chrome that gallery and social profile pages remain usable with reduced background refresh behavior"
  detail: self
```
