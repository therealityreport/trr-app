# TASK3 — Multi-Person Tagged Image Dedup (Shared File + Shared Gallery)

Repo: TRR-APP  
Last updated: February 10, 2026

## Goal
Ensure multi-person tagged images:
- Render **once** per person gallery (no duplicates).
- Still show in **all** tagged people’s galleries.

## Status Snapshot (As of February 10, 2026)
Complete.

- People gallery now dedupes by canonical identity (not `hosted_url` only):
  - `apps/web/src/lib/server/trr-api/person-photo-utils.ts#dedupePhotosByCanonicalKeysPreferMediaLinks`
  - `apps/web/src/lib/server/trr-api/trr-shows-repository.ts#getPhotosByPersonId` uses canonical dedupe across `cast_photos` + `media_links`.
- Collision policy is enforced:
  - Prefer `origin="media_links"` on collisions (keeps unified media_assets/media_links model authoritative).
- Regression tests added:
  - `apps/web/tests/person-photo-utils.test.ts`

## App Scope (This Repo)
### 1) Canonical identity dedupe in People gallery
Implemented canonical identity dedupe for `getPhotosByPersonId` (not `hosted_url` only).

Canonical keys used (stable, deterministic):
- Prefer DB-native identifiers when present (best):
  - `cast_photos`: `src:${source}:${source_image_id}` (when `source_image_id` is present)
  - `media_links`: `asset:${media_asset_id}` (shared across links) and `src:${source}:${source_asset_id}` (when present)
- Fallbacks (when above are missing):
  - `sha:${hosted_sha256}`
  - `url:${hosted_url}`

Collision policy:
- Prefer `origin="media_links"` when a collision occurs (keeps the unified media_assets/media_links model authoritative).

### 2) Preserve ordering determinism
Keep stable ordering by preserving first-seen order; on collision, replace in-place if the incoming row is `media_links` and existing is `cast_photos`.

## Backend Dependency
This works immediately even before backfill.
After TRR-Backend deploy + refresh+force_mirror, `hosted_url`s will also converge, further reducing incidental dupes.

## Validation
- Pick a known multi-person IMDb image (e.g. `rm4170403585`).
- Person gallery should show it once.
- Repo fast checks: `pnpm -C apps/web run lint && pnpm -C apps/web exec tsc --noEmit && pnpm -C apps/web run test:ci && pnpm -C apps/web exec next build --webpack` passing.
