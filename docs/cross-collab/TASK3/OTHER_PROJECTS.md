# Other Projects — TASK3 (Multi-Person Tagged Image Dedup)

Repo: TRR-APP  
Last updated: February 8, 2026

## Cross-Repo Snapshot
- TRR-Backend: shared cast-photo mirroring key `media/{sha256[:2]}/{sha256}{ext}`.
- TRR-APP: canonical dedupe by source identity (IMDb `source_image_id`) with fallback to `hosted_sha256`.
- SCREENALYTICS: no code changes.

## Dependency Order
1. Deploy TRR-Backend.
2. Deploy TRR-APP.
3. Backfill (refresh+force_mirror) for affected people.
