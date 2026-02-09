# TASK3 — Multi-Person Tagged Image Dedup (Shared File + Shared Gallery)

Repo: TRR-APP  
Last updated: February 8, 2026

## Goal
Ensure multi-person tagged images:
- Render **once** per person gallery (no duplicates).
- Still show in **all** tagged people’s galleries.

## App Scope (This Repo)
### Canonical dedupe in People gallery
In `apps/web/src/lib/server/trr-api/trr-shows-repository.ts#getPhotosByPersonId`:
- Dedupe photos by canonical identity, not `hosted_url`.
- Canonical identity:
  - `cast_photos`: `src:${source}:${source_image_id}` (fallback `sha:${hosted_sha256}`)
  - `media_links`: `src:${source}:${source_asset_id}` (fallback `asset:${media_asset_id}`)
- Prefer `origin="media_links"` when a collision occurs.

## Backend Dependency
This works immediately even before backfill.
After TRR-Backend deploy + refresh+force_mirror, `hosted_url`s will also converge, further reducing incidental dupes.

## Validation
- Pick a known multi-person IMDb image (e.g. `rm4170403585`).
- Person gallery should show it once.
