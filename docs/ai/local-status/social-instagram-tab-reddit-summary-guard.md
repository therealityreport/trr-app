# Social Instagram Tab Reddit Summary Guard

Last updated: 2026-03-26

## Status
- App phase complete.

## What changed
- Restricted the additive Reddit summary and freshness cards in the season social analytics surface to the overview platform tab.
- Added a regression test covering the Instagram tab route with Reddit analytics present, proving the Reddit manager cards stay hidden outside overview.

## Root Cause
- The metric row only checked `analyticsView`, so any Bravo or Sentiment platform tab with Reddit analytics in the payload rendered Reddit coverage cards even when the operator had drilled into a non-Reddit platform like Instagram.

## Validation
- Passed: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/season-social-analytics-section.test.tsx`

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-26
  current_phase: "instagram tab reddit-summary regression fixed in season social analytics"
  next_action: "reload /rhoslc/social/s6/instagram and confirm the overview still shows Reddit cards while the Instagram tab does not"
  detail: self
```
