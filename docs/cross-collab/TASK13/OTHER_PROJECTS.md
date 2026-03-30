# Other Projects — Task 13 (Show refresh full pipeline gallery media)

Repo: TRR-APP
Last updated: 2026-03-27

## Cross-Repo Snapshot
- TRR-Backend: Completed backend contract and stream behavior for gallery-only photo refresh.
- TRR-APP: Completed full-refresh orchestration and modal-entry copy updates.
- screenalytics: Not touched; no dependency required for this change.

## Responsibility Alignment
- TRR-Backend
  - Provide `skip_cast_photos` and enforce gallery-only behavior in the photos stream.
- TRR-APP
  - Keep the rating-area button modal-only.
  - Run gallery media after unified refresh and report it as part of full refresh.
- screenalytics
  - No change required.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- Keep shared contracts aligned with owning repo PLAN.md.
- `POST /api/v1/admin/shows/{show_id}/refresh-photos/stream` now accepts `skip_cast_photos?: boolean`.
