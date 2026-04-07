# Status — Task 24 (TRR-APP Supabase Simplification and Index Hardening)

Repo: TRR-APP
Last updated: 2026-04-02

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-04-02
  current_phase: "app cleanup complete"
  next_action: "carry forward the recorded repo-wide warning/test drift; Flashback gameplay remains disabled until a future auth redesign"
  detail: self
```

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Live app audit | Complete | Confirmed Flashback gameplay is the only browser Supabase data surface and that server raw Postgres is already correct |
| 2 | Backend dependency wait | Complete | Backend migration landed first as required |
| 3 | Route disablement and cleanup | Complete | `/flashback*` now redirects to `/hub`, hub/admin no longer advertise live Flashback gameplay, and browser Supabase data modules were removed |

## Blockers
- No implementation blockers.
- `pnpm -C apps/web run lint` and `pnpm -C apps/web exec next build --webpack` completed successfully, but lint still reports many pre-existing warnings outside this task.
- The full `pnpm -C apps/web run test:ci` suite still fails in unrelated existing tests; targeted verification for Flashback disablement and server auth fallback passed cleanly.

## Recent Activity
- 2026-04-02: Task scaffolding created.
- 2026-04-02: Confirmed live Flashback gameplay is incomplete because the app never establishes a Supabase user session while RLS requires `auth.uid() = user_id`.
- 2026-04-02: Identified the exact public route, hub-entry, env/doc, and test files that need cleanup once backend work completes.
- 2026-04-02: Disabled `/flashback`, `/flashback/cover`, and `/flashback/play`, removed the hub Flashback card, and marked Flashback live gameplay disabled in admin game metadata.
- 2026-04-02: Removed the browser Supabase client modules, updated env/docs, and passed targeted Vitest coverage for Flashback disablement plus `TRR_CORE_SUPABASE_*` auth fallback behavior.
