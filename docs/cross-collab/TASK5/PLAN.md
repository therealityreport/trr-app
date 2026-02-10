# Admin “Sync/Refresh Shows” Buttons — Task 5 Plan

Repo: TRR-APP
Last updated: February 10, 2026

## Goal

Add admin-only UI controls that let editors trigger TRR-Backend show sync/import scripts from the TRR-APP admin pages:

- Shows search page: “Sync from Lists” (IMDb/TMDb lists)
- Show detail page: per-tab refresh buttons for Seasons/Episodes, Photos, Cast/Credits, and Show Details

## Status Snapshot

Implemented (proxy routes + UI). Pending: run fast checks and update cross-repo docs/handoff.

## Scope

### Phase 1: Admin Proxy Routes (Next.js App Router)

Expose Firebase-admin-gated API routes that call TRR-Backend with the service role token.

Files to change:
- `apps/web/src/app/api/admin/trr-api/shows/sync-from-lists/route.ts` — proxy `POST /api/v1/admin/shows/sync-from-lists`
- `apps/web/src/app/api/admin/trr-api/shows/[showId]/refresh/route.ts` — proxy `POST /api/v1/admin/shows/{show_id}/refresh`
- `apps/web/src/app/api/admin/trr-api/shows/[showId]/refresh/stream/route.ts` — proxy `POST /api/v1/admin/shows/{show_id}/refresh/stream` (SSE)

### Phase 2: Shows Search Page Button

Files to change:
- `apps/web/src/app/admin/trr-shows/page.tsx`

Behavior:
- Add “Sync from Lists” button (disabled while running).
- Show inline success/error notice.
- If a search query is active, rerun search after sync to reflect updates.

### Phase 3: Show Detail Page Per-Tab Refresh Buttons

Files to change:
- `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`

Buttons:
- Seasons tab: Refresh Seasons & Episodes
- Assets tab (Media view): Refresh Photos
- Cast tab: Refresh Cast/Credits
- Details tab: Refresh Show Details

Behavior:
- Each refresh action calls `/api/admin/trr-api/shows/{showId}/refresh` with a single target and waits synchronously.
- After success, refetch the affected tab’s data (or reload gallery assets if on Assets Media view).
- Render per-tab notice/error for that target (do not reuse existing cast-image refresh notice).
- Render an accurate progress bar while the refresh is running using the SSE stream.

## Out of Scope

- Background jobs / async queues.
- Adding UI for advanced refresh options (skip S3, verbose, reload schema cache).

## Locked Contracts

- Backend base comes from `TRR_API_URL` and is normalized to `/api/v1` in `apps/web/src/lib/server/trr-api/backend.ts`.
- Proxy routes must be protected by `requireAdmin(request)`.
- Proxy routes must use `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY` as Bearer token when calling TRR-Backend.
- Refresh Photos must include TMDb + IMDb mediaindex gallery (handled by backend script defaults).

## Acceptance Criteria

1. `/admin/trr-shows` has a working “Sync from Lists” button.
2. `/admin/trr-shows/[showId]` has per-tab refresh buttons and tab data updates after completion.
3. No existing TRR-APP API shapes are changed; only additive routes/UI are introduced.
4. `pnpm -C apps/web run lint && pnpm -C apps/web exec next build --webpack && pnpm -C apps/web run test:ci` passes.
5. Cross-collab docs are aligned with TRR-Backend TASK6.
