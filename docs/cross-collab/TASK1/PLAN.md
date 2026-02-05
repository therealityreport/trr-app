# Facebank Seed Flagging — Task 1 Plan

Repo: TRR-APP

Goal
Allow admins to flag person gallery images as facebank seed candidates for Screenalytics.

Locked Decisions
- Flag type: `facebank_seed` boolean on `core.media_links`
- Screenalytics behavior: seed-preferred (use flagged if any; otherwise fallback to all)
- TRR App data path: Supabase read + backend update endpoint
- Admin auth: allowlist-only for new admin endpoints

App TODOs
- Read gallery images from `core.v_person_images_served_media_v2` including `facebank_seed`
- Add “Facebank Seed” toggle in the person gallery UI
- Call backend allowlist-only endpoint to update `facebank_seed`
- Optional: filter view for seeded-only images
- Handle auth errors for non-allowlist users

Constraints
- No code changes in this phase beyond documentation

Coordination
- Update cross-collab docs first
- Wait for backend schema + endpoint before wiring UI
