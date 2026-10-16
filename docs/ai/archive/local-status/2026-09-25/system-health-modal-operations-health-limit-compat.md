# System Health Modal Operations Health Limit Compat

Last updated: 2026-03-30

## Status
- App phase complete.

## What changed
- Fixed the admin system-health modal so it no longer requests `operations/health?limit=200` from the cloud Modal backend.
- Added a compatibility clamp in the app proxy route for `/api/admin/trr-api/operations/health` so oversized `limit` values are reduced to `100` before forwarding upstream.
- Updated the modal to request the compatible `limit=100` directly.
- Added a route regression test for the clamp and refreshed the modal tests to include the admin-operations health request and current UI copy.

## Root Cause
- The modal was polling `GET /api/admin/trr-api/operations/health?limit=200`.
- In cloud mode, that request goes to the deployed Modal backend, which currently rejects that query with `422`.
- The failed admin-operations fetch forced the `System Jobs Health` panel into the red error state even while the social queue data itself was loading correctly.

## Validation
- Passed: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/admin-operations-health-route.test.ts`
- Passed: `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run -c vitest.config.ts tests/system-health-modal.test.tsx`

## Handoff Snapshot
```yaml
handoff:
  include: false
  state: archived
  last_updated: 2026-03-30
  current_phase: "archived continuity note"
  next_action: "Refer to newer status notes if follow-up work resumes on this thread."
  detail: self
```
