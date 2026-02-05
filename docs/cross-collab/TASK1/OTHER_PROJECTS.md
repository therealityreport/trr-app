# Other Projects — Task 1

This repo (TRR-APP) owns the admin UI and user workflow for flagging facebank seed images.

TRR-Backend responsibilities
- Add `facebank_seed` boolean to `core.media_links`
- Expose `facebank_seed` in `core.v_person_images_served_media_v2`
- Provide allowlist-only admin endpoint to toggle `facebank_seed`
- Provide screenalytics endpoint filter `seed_only`

Screenalytics responsibilities
- Prefer flagged images when seeding facebank
- Fall back to all gallery images if no seeds are flagged

Touchpoints
- Supabase view: `core.v_person_images_served_media_v2`
- Backend admin endpoint: toggle `facebank_seed`
- Backend screenalytics endpoint: `seed_only` filter

Ownership
- App owns UI and interactions
- Backend owns schema and endpoints
- Screenalytics owns seed selection behavior
