# Other Projects — TASK3 (Multi-Person Tagged Image Dedup)

Repo: TRR-APP  
Last updated: February 10, 2026

Status Snapshot (As of February 10, 2026)
Complete (TRR-Backend + TRR-APP shipped).

## Cross-Repo Snapshot
- TRR-Backend: shipped — cast-photo mirroring uses shared hosted keys (`media/{sha256[:2]}/{sha256}{ext}`) in `trr_backend/media/s3_mirror.py#mirror_cast_photo_row`.
- TRR-APP: shipped — People gallery dedupes by canonical identity (not just `hosted_url`) and prefers `media_links` rows on collisions (`apps/web/src/lib/server/trr-api/person-photo-utils.ts` + `apps/web/src/lib/server/trr-api/trr-shows-repository.ts#getPhotosByPersonId`).
- SCREENALYTICS: no code changes.

## Dependency Order
1. Deploy TRR-Backend.
2. Deploy TRR-APP.
3. Backfill (refresh+force_mirror) for affected people.
