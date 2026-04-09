# Status — Task 26 (Concerns remediation and Screenalytics contract lock)

Repo: TRR-APP
Last updated: 2026-04-09

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: active
  last_updated: 2026-04-09
  current_phase: "gallery adoption and test cleanup landed"
  next_action: "continue extracting admin-page logic out of monolith page files"
  detail: self
```

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Gallery + admin adoption | In Progress | Admin gallery fetch now exhausts backend cursors without a fixed page cap. |
| 2 | Brittle test reduction | In Progress | File-content tests were replaced with helper/runtime behavior tests for gallery, fandom link display, and Bravo thumbnail resolution. |

## Blockers
- None.

## Recent Activity
- 2026-04-09: Task scaffolding created.
- 2026-04-09: Locked the retirement direction for `screenalytics`; app work will follow backend-owned contract changes.
- 2026-04-09: Rewired show and season admin gallery loading to consume backend `pagination.next_cursor` instead of capped offset loops.
- 2026-04-09: Extracted shared Bravo thumbnail resolution into `src/lib/admin/bravo-video-thumbnails.ts` and replaced source-text tests with behavior tests.
- 2026-04-09: Verification:
  - targeted vitest suite for gallery/auth changes passed
  - `pnpm -C apps/web run lint` passed with warnings only
  - `pnpm -C apps/web exec next build --webpack` failed on a pre-existing unrelated nullability error in `src/app/api/admin/trr-api/shows/[showId]/links/discover/stream/route.ts`
