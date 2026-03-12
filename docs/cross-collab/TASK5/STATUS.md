# Status — Task 5 (Admin “Sync/Refresh Shows” Buttons)

Repo: TRR-APP
Last updated: February 10, 2026

## Phase Status

| Phase | Description | Status | Notes |
|------:|-------------|--------|-------|
| 1 | Next.js admin proxy routes | Implemented | Proxies for list sync + per-show refresh (10m timeout). |
| 2 | Shows search page “Sync from Lists” | Implemented | Button + notice/error in `apps/web/src/app/admin/trr-shows/page.tsx`. |
| 3 | Show detail page per-tab refresh buttons | Implemented | Buttons + per-tab notice/error + accurate progress bars (SSE) in `apps/web/src/app/admin/trr-shows/[showId]/page.tsx`. |

## Blockers

None.

## Recent Activity

- February 10, 2026: Added admin proxy routes and wired UI buttons for list sync and per-show refresh targets.
- March 5, 2026: Fixed `/admin/trr-shows` covered-shows list behavior so transient auth/load failures no longer masquerade as an empty editorial coverage table. The page now retries transient `Not authenticated` misses, surfaces a real load error with Retry action, and no longer claims `No shows added yet` when rows already exist in `admin.covered_shows`.
