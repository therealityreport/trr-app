# Other Projects — Task 4 (Supabase Schema Cleanup)

Repo: TRR-APP
Last updated: February 8, 2026

## Cross-Repo Snapshot

- TRR-Backend: Not yet started. Owns all migrations, data migration scripts, replacement views, and its own code changes. See TRR-Backend TASK4.
- TRR-APP: Not yet started. Owns code changes for Phase 6c (cast queries) and Phase 6e (people enrichment display).
- screenalytics: Not yet started. Must also update cast reads (separate TASK5).

## Responsibility Alignment

- TRR-Backend
  - Writes all Supabase migrations (0106-0113).
  - Creates replacement view `core.v_show_cast` and data migration scripts.
  - Updates all TRR-Backend services/routers/pipeline code.
  - Defines credits model shape and multi-source field conventions.
- TRR-APP
  - Updates cast query sites in `trr-shows-repository.ts` (5+ references).
  - Updates type definitions to match credits model.
  - Displays enriched people data with source attribution.
- screenalytics
  - Updates `trr_metadata_db.py` to read from replacement view (TASK5).
  - Must complete before TRR-Backend drops `core.show_cast`.

## Dependency Order

1. TRR-Backend creates replacement view `core.v_show_cast` and deploys credits model.
2. TRR-APP updates cast query sites (this task) — can start once replacement view exists.
3. screenalytics updates `trr_metadata_db.py` (TASK5) — independent of TRR-APP.
4. After ALL consumers switched, TRR-Backend drops legacy cast tables (migration 0107).
5. TRR-APP updates people display code (Phase 6e) — can start once migration 0109 is applied.

## Locked Contracts (Mirrored)

- Credits model: `{person_id, show_id, credit_category, billing_order, role, ...}`
- Credit occurrences: `{credit_id, episode_id, air_year, credit_text, attributes, is_archive_footage, ...}`
- `core.people` multi-source fields: jsonb keyed by source, resolution order tmdb > fandom > manual
- Shows columns: `network`/`streaming` dropped (TRR-APP already uses arrays — likely no changes needed)
