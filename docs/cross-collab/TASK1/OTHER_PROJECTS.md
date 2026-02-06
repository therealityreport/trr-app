# Other Projects — Task 1

This repo (TRR-APP) owns the admin UX and internal proxy workflow for facebank seed toggling.

Shared Contract
- Toggle endpoint (backend): `PATCH /api/v1/admin/person/{person_id}/gallery/{link_id}/facebank-seed`
- Toggle payload: `{ "facebank_seed": boolean }`
- Photos contract for screenalytics: `GET /api/v1/screenalytics/people/{person_id}/photos?seed_only={bool}`
- Shared field: `facebank_seed` on `core.media_links`

TRR-Backend Responsibilities
- Own schema + views exposing `facebank_seed`.
- Enforce endpoint-scoped auth:
  - allowlisted user JWT, or
  - `service_role` + valid `X-TRR-Internal-Admin-Secret` header.
- Keep endpoint path/payload stable.

SCREENALYTICS Responsibilities
- Seed-first fetch with `seed_only=true`.
- Fallback to `seed_only=false` only after a successful empty `seed_only=true` response.
- Use `served_url` and preserve backend order.
- Persist imported rows via `import_facebank_images` into `face_bank_images`.

TRR-APP Responsibilities
- Add proxy endpoint:
  - `PATCH /api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed`
- Require Firebase admin allowlist check before proxy call.
- Forward backend auth headers:
  - `Authorization: Bearer ${TRR_CORE_SUPABASE_SERVICE_ROLE_KEY}`
  - `X-TRR-Internal-Admin-Secret: ${TRR_INTERNAL_ADMIN_SHARED_SECRET}`
- Show/toggle `facebank_seed` in person gallery for media-link-backed photos only.

Dependency Order
1. Backend auth hardening
2. App proxy + UI
3. Screenalytics seed-first rollout
