# Instagram Catalog Backfill Posts CTA And Social Profile Reliability Fix

Last updated: 2026-03-22

## Status
- App phase complete.

## What changed
- Renamed the shared social account catalog CTA from `Backfill History` to `Backfill Posts`, including the in-flight and queued success copy.
- Added a focused runtime test that clicks the CTA and verifies the full-history catalog backfill request payload.
- Fixed the hashtag review draft initialization path so operators do not lose the suggested show when they switch to season assignment before the draft state hydrates.
- Hardened the social profile summary state so transient summary refresh failures do not blank the page after a run is already visible.
- Cleared stale summary state on handle changes so operators do not see the previous profile's stats after a failed navigation refresh.
- Switched the summary proxy route to the shared social admin timeout constant instead of a one-off 30 second timeout.
- Added runtime coverage for active-run summary refresh failures and cross-handle stale summary resets.

## Validation
- Passed: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/social-account-profile-page.runtime.test.tsx`
- Attempted: local `admin.localhost` smoke check via unauthenticated HTML fetch; route responded but did not expose an authenticated admin session in headless mode

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-22
  current_phase: "app backfill CTA rename and social profile timeout-hardening shipped"
  next_action: "profile the backend summary endpoint if operators still see repeated timeout banners under heavy catalog-run load"
  detail: self
```
