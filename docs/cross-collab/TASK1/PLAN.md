# Facebank Seed Flagging — Task 1 Plan

Repo: TRR-APP

Goal
Allow admins to flag person gallery images as facebank seed candidates for SCREENALYTICS.

Status
- Implemented in code; pending rollout smoke.

Status Matrix
| Repo | Status | Notes |
| --- | --- | --- |
| TRR-Backend | Implemented | Toggle endpoint + auth hardening merged locally |
| TRR-APP | Implemented | Proxy route + gallery toggle merged locally |
| SCREENALYTICS | Implemented | Seed-first ingestion + import wiring merged locally |

Locked Contracts
1. Backend toggle endpoint: `PATCH /api/v1/admin/person/{person_id}/gallery/{link_id}/facebank-seed`.
2. Payload: `{ "facebank_seed": boolean }`.
3. Response: `{ "link_id": string, "person_id": string, "facebank_seed": boolean }`.
4. Field source: `core.media_links.facebank_seed` (via backend views).
5. Screenalytics endpoint: `GET /api/v1/screenalytics/people/{person_id}/photos?seed_only={bool}`.

Auth Contract
- TRR-APP enforces `requireAdmin` (allowlisted Firebase admin) before proxying.
- TRR-APP proxy calls backend with:
  - `Authorization: Bearer ${TRR_CORE_SUPABASE_SERVICE_ROLE_KEY}`
  - `X-TRR-Internal-Admin-Secret: ${TRR_INTERNAL_ADMIN_SHARED_SECRET}`
- Backend accepts `service_role` for this endpoint only when the internal header matches.

App Scope
- Add proxy endpoint:
  - `PATCH /api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed`
- Add `facebank_seed` to person-photo model/mapping for `media_links`-origin photos.
- Add gallery/lightbox toggle UI only when `origin === "media_links"` and `link_id` exists.
- Keep existing gallery behavior unchanged for `cast_photos` rows.

Dependencies
1. Backend hardening merged and deployed first.
2. App proxy + UI after backend auth contract is live.
3. Screenalytics rollout after app/backend path is stable.

Rollout Sequence
1. Release backend auth+tests.
2. Release app proxy route + UI toggle.
3. Verify app-to-backend seed toggle end-to-end before screenalytics rollout.
4. Verify screenalytics strict fallback behavior (fallback only on successful empty `seed_only=true`).
