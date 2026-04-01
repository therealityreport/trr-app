# Status — Task 15 (Credits slug and IMDb refresh)

Repo: TRR-APP
Last updated: 2026-03-30

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Implementation | Completed | Credits slug, redirects, credits proxy, show/season crew rows, and person credit classification updates landed. |

## Blockers
- None.

## Recent Activity
- 2026-03-30: Task scaffolding created.
- 2026-03-30: Switched canonical show/season cast URLs to `/credits` and kept `/cast` redirects in place.
- 2026-03-30: Reworked show and season credits tabs to keep cast cards while rendering grouped crew rows with no images from the new show credits payload.
- 2026-03-30: Updated person credits classification to use curated cast-role assignments instead of raw `Self` evidence.
- 2026-03-30: Validated app changes with targeted ESLint and `tsc --noEmit`.
