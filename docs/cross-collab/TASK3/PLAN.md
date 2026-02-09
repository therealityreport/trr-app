# Supabase Schema Cleanup — Task 3 Plan

Repo: TRR-APP
Last updated: February 8, 2026

## Goal

Update frontend queries and types to consume the new credits model and enriched people data, replacing references to dropped/modified Supabase tables.

## Status Snapshot

Not yet started. Depends on TRR-Backend TASK4 (replacement views and migrations must exist before code changes).

## Scope

### Phase 6c (Code Changes): Update Cast Query Sites

TRR-APP has 5+ query sites referencing `show_cast` and `episode_cast` tables that must switch to the `credits` + `credit_occurrences` model.

Files to change:
- `apps/web/src/lib/server/trr-api/trr-shows-repository.ts` — 5+ references to `show_cast` and `episode_cast` tables; also uses `v_season_cast` and `v_person_show_seasons` views. All must switch to `credits` + `credit_occurrences`.
- `apps/web/src/lib/server/supabase-trr-core.ts` — Cast table type definitions
- Frontend types/interfaces matching `show_cast` / `episode_cast` column shapes — update to credits model

### Phase 6e (Code Changes): Display Enriched People Data

Person detail pages should display canonical multi-source fields with source attribution.

Files to change:
- Person detail page components — display `birthday`, `gender`, `biography`, `place_of_birth`, `homepage`, `profile_image_url` from multi-source jsonb fields
- Source attribution UI (show which source each value comes from: tmdb, fandom, manual)

## Out of Scope

- Supabase migrations (owned by TRR-Backend TASK4)
- Data migration scripts (owned by TRR-Backend TASK4)
- Replacement view creation (owned by TRR-Backend TASK4)
- screenalytics cast read migration (owned by screenalytics TASK5)
- All other Phase 6 sub-phases (TRR-Backend only)
- Screenalytics data layer unification (separate task, no TRR-APP work)

## Locked Contracts

### Credits Model Shape (from TRR-Backend)
```
credits: {person_id, show_id, credit_category, billing_order, role, ...}
credit_occurrences: {credit_id, episode_id, air_year, credit_text, attributes, is_archive_footage, ...}
```

### `core.people` Multi-Source Field Convention
```json
{"tmdb": "1990-05-15", "fandom": "May 15, 1990"}
```
Each field stores values keyed by source. Resolution order: tmdb > fandom > manual.

### Shows Column Changes
- `network` / `streaming` dropped (already using `networks[]` / `streaming_providers[]` — likely no changes needed)
- `most_recent_episode_*` columns consolidated into `most_recent_episode` jsonb — no TRR-APP references found

## Acceptance Criteria

1. All cast display pages render correctly using `credits` + `credit_occurrences` model.
2. No references to `show_cast` or `episode_cast` direct tables remain in TRR-APP code.
3. Person detail pages display enriched canonical fields with source attribution.
4. Frontend build passes with no TypeScript errors.
5. Existing tests pass with no regressions.
6. Task 3 docs are synchronized across repos.
