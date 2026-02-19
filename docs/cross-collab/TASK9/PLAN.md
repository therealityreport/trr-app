# Social Admin Incremental Sync + Runs UX Hardening — Task 9 Plan

Repo: TRR-APP
Last updated: February 17, 2026

## Goal

Eliminate false ingest completion messaging, harden polling against transient/stale responses, expose incremental/full-refresh ingest control, and improve run-selection labels for operator clarity.

## Status Snapshot

Implemented and validated after backend Task 10 contract rollout.

## Scope

### Phase 1: Completion/polling correctness
- Derive completion from authoritative run status/summary (runs endpoint), not transient empty jobs.
- Replace overlapping interval polling with single-flight loop and stale-response guards.
- Preserve last-good jobs data on transient empty/error responses while run is active.

Files to change:
- `apps/web/src/components/admin/season-social-analytics-section.tsx` — polling + completion logic.
- `apps/web/tests/season-social-analytics-section.test.tsx` — regression coverage.

### Phase 2: Ingest strategy UX and payload wiring
- Add `Incremental` (default) vs `Full Refresh` operator control.
- Include selected `sync_strategy` in ingest payload.

Files to change:
- `apps/web/src/components/admin/season-social-analytics-section.tsx`
- `apps/web/tests/season-social-analytics-section.test.tsx`

### Phase 3: Runs dropdown label quality
- Render rich run labels including week scope, platform scope, progress, item totals, timestamp, short run id.
- Extend `SocialRun` typing for additive backend fields (`config`, `initiated_by`, richer summary reads).

Files to change:
- `apps/web/src/components/admin/season-social-analytics-section.tsx`
- `apps/web/tests/season-social-analytics-section.test.tsx`

## Out of Scope

- Full social UI redesign.
- Backend queue/state model changes.
- Proxy envelope redesign (already completed in prior task).

## Locked Contracts

### Backend compatibility
- `sync_strategy` is additive and optional for older clients.
- Existing social proxy error envelope remains unchanged.

### Jobs behavior
- Jobs panel remains strict run-scoped (no season-history fallback when no run is selected).

## Acceptance Criteria

1. Active runs no longer show false "complete 0 jobs" from transient jobs state.
2. Ingest defaults to `incremental` with explicit `full_refresh` override.
3. Run dropdown labels are operator-friendly and include scope/progress/items/time/id.
4. Task 9 docs are synchronized with TRR-Backend TASK10 and screenalytics TASK7.
