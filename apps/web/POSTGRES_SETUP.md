# TRR-APP Postgres Setup And Ownership

This document describes the current TRR-APP Postgres contract after the migration-runner ownership cleanup.

## Runtime Contract

TRR-APP runtime reads use:

```bash
TRR_DB_URL=postgresql://user:password@host:port/database
TRR_DB_FALLBACK_URL=
TRR_DB_FORCE_FALLBACK=
```

- `TRR_DB_URL` is the canonical runtime database URL.
- `TRR_DB_FALLBACK_URL` is optional operator-engaged break-glass fallback.
- Runtime request handling does not switch candidates automatically on transient query errors.
- To engage fallback, set `TRR_DB_FORCE_FALLBACK=1` in the deployment env and redeploy. That choice stays pinned for the process lifetime until the flag is removed and the process restarts.
- When fallback is engaged, the app emits a one-shot `postgres_pool_engaged_fallback` structured log event so operators can verify the lane selection in log drains.
- `DATABASE_URL` is not part of the app runtime contract. The migration runner still accepts it as a compatibility-only input for older tooling flows, but it is no longer the preferred source.

The app server resolves Postgres in the same order as the runtime code in [src/lib/server/postgres.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/postgres.ts): `TRR_DB_URL`, then `TRR_DB_FALLBACK_URL`.

For Supavisor session-mode runtimes, the committed local defaults are intentionally bounded: `POSTGRES_POOL_MAX=1` and `POSTGRES_MAX_CONCURRENT_OPERATIONS=1` in development. Deployed session-pooler defaults are `POSTGRES_POOL_MAX=2` and `POSTGRES_MAX_CONCURRENT_OPERATIONS=1` for production, and `POSTGRES_POOL_MAX=1` / `POSTGRES_MAX_CONCURRENT_OPERATIONS=1` for preview unless explicitly overridden.

Every app pool sets `application_name` for `pg_stat_activity` attribution. The default is `trr-app:web`; override with `POSTGRES_APPLICATION_NAME` only when a deployment lane needs a more specific name.

Session-mode clients can hold Supavisor slots while idle. Keep these timeout controls explicit when tuning the app pool:

```bash
POSTGRES_POOL_CONNECTION_TIMEOUT_MS=5000
POSTGRES_POOL_IDLE_TIMEOUT_MS=5000
# Supported by node-postgres as max uses rather than time-based lifetime in this app.
POSTGRES_POOL_MAX_USES=
```

## What The App Migration Runner Owns

`pnpm -C apps/web run db:migrate` now defaults to the app-local lane only.

That default lane covers the legacy/public-schema tables that still exist under `apps/web/db/migrations/`, including:

- legacy survey registry and response tables
- survey editor support tables such as `surveys`, `survey_cast`, and `survey_episodes`
- legacy app-local/editor tables such as `survey_shows`, `survey_show_seasons`, and `survey_show_palette_library`

Run it with the canonical env contract:

```bash
cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web
TRR_DB_URL="postgresql://..." pnpm run db:migrate
```

Targeted dry validation:

```bash
cd /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web
TRR_DB_URL="postgresql://..." pnpm run db:migrate -- --dry-run
```

## What The App Migration Runner Does Not Own

Shared-schema ownership is backend-owned.

That means new or canonical migrations for these surfaces belong in `TRR-Backend`, not in `TRR-APP`:

- `firebase_surveys.*`
- `admin.*`
- shared grants / RLS / role setup
- shared tables that reference backend-owned schemas such as `core.*`

Shared-schema migrations are owned by `TRR-Backend/supabase/migrations` and run via `make supabase-db-push` or the workspace reconcile. The TRR-APP migration runner applies only app-local migrations, wraps each applied file and its `__migrations` insert in one transaction, and rejects the legacy `--include-transitional-shared-schema` flag. Backend-owned shared-schema files that still physically exist under `apps/web/db/migrations/` remain backlog only and are ignored by the app runner until they are ported out of the app repo.

## Backend-Owned Parity Checklist

This is the concrete backlog still living on the app side. It is not complete, and this checklist is intentionally not phrased as if the port is done.

### 1. Shared-schema SQL still sitting in `apps/web/db/migrations/`

These files should be ported into backend-owned SQL migrations and removed from the app repo so the directory reflects real ownership:

- `013_create_surveys_schema.sql`
- `014_create_normalized_survey_tables.sql`
- `015_enable_rls.sql`
- `016_create_rls_policies.sql`
- `017_create_rls_role_grants.sql`
- `018_rename_normalized_surveys_schema.sql`
- `019_survey_trr_links_and_social_posts.sql`
- `020_create_covered_shows.sql`
- `022_create_admin_season_cast_survey_roles.sql`
- `023_create_admin_reddit_sources.sql`
- `024_add_post_flares_to_admin_reddit_communities.sql`
- `025_add_analysis_flares_to_admin_reddit_communities.sql`
- `026_add_analysis_all_flares_to_admin_reddit_communities.sql`
- `027_add_focus_fields_to_admin_reddit_communities.sql`
- `028_add_episode_discussion_rules_to_admin_reddit_communities.sql`
- `029_add_source_kind_to_admin_reddit_threads.sql`
- `031_create_admin_reddit_discovery_posts_cache.sql`
- `032_create_admin_recent_people_views.sql`
- `033_add_post_flair_categories_to_admin_reddit_communities.sql`
- `034_rename_flare_columns_to_flair.sql`
- `035_add_post_flair_assignments_to_admin_reddit_communities.sql`
- `036_backfill_admin_reddit_community_display_names.sql`

### 2. Request-time DDL status

The shows repository runtime DDL has been quarantined to backend-owned migration
`TRR-Backend/supabase/migrations/20260427131550_quarantine_show_runtime_ddl.sql`.
The app guard test [tests/shows-repository-ddl-guard.test.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/shows-repository-ddl-guard.test.ts) blocks reintroducing DDL into
[src/lib/server/shows/shows-repository.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/shows/shows-repository.ts).

Remaining request-time DDL debt outside this runner cleanup:

- [src/lib/server/admin/typography-repository.ts](/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/server/admin/typography-repository.ts)
  - `site_typography_sets`
  - `site_typography_assignments`
  - `set_site_typography_updated_at()` and related triggers

### 3. App-local SQL that remains intentionally app-scoped for now

These files still run in the default app-local lane and have not been moved during this cleanup:

- `000_create_surveys_table.sql`
- `000_seed_surveys.sql`
- `001_create_global_profile_responses.sql`
- `002_create_rhoslc_s6_responses.sql`
- `003_create_survey_x_responses.sql`
- `004_add_app_username_column.sql`
- `005_make_survey_x_show_fields_nullable.sql`
- `006_create_rhop_s10_responses.sql`
- `007_expand_surveys_table.sql`
- `008_create_survey_cast.sql`
- `009_create_survey_episodes.sql`
- `010_create_shows.sql`
- `011_create_show_seasons.sql`
- `012_create_survey_shows_tables.sql`
- `021_add_rhoslc_s6_season_rating.sql`
- `022_link_brand_shows_to_trr.sql`
- `030_create_show_palette_library.sql`

Keeping them in the app-local lane is a present-tense tooling choice, not a statement that long-term ownership is settled. The duplicate `022` prefix is intentional only as a documented legacy exception: `022_create_admin_season_cast_survey_roles.sql` is backend-owned shared-schema backlog and skipped by the app runner, while `022_link_brand_shows_to_trr.sql` remains a historical app-local/editor copy. The backend migration `20260427131550_quarantine_show_runtime_ddl.sql` is canonical for the request-time DDL that overlaps `022_link_brand_shows_to_trr.sql` and `030_create_show_palette_library.sql`.

## Practical Rule

- If the work changes shared schema, grants, RLS, or `admin` / `firebase_surveys`, land it in `TRR-Backend` first.
- If you only need the legacy app-local/public tables for TRR-APP behavior, the default app migration runner is the supported path.
- Do not add new backend-owned migrations under `TRR-APP/apps/web/db/migrations/`.
