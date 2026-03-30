# Status — Task 14 (Supabase runtime contract cleanup)

Repo: TRR-APP
Last updated: 2026-03-30

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: active
  last_updated: 2026-03-30
  current_phase: "deploy environment cleanup complete"
  next_action: "monitor future env changes; no additional app deploy cleanup is required in this task"
  detail: self
```

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Step 1 compatibility pass | Complete | App resolver, browser env split, and targeted tests landed. |
| 2 | Step 2 cleanup | Complete | Legacy runtime DB fallbacks removed and TRR-specific service-role key is now required. |
| 3 | Deploy environment cleanup | Complete | Vercel env store has the canonical DB and public Supabase vars, legacy runtime fallbacks are removed, and the current preview/production deployments fetch successfully. |

## Blockers
- None.

## Recent Activity
- 2026-03-27: Task scaffolding created.
- 2026-03-27: Delegated TRR-APP contract-alignment changes after backend resolver landed.
- 2026-03-27: Targeted Vitest coverage passed and `pnpm -C apps/web run lint` completed. `next build --webpack` is blocked by a pre-existing type error in `src/components/admin/social-week/WeekDetailPageView.tsx`.
- 2026-03-27: Removed runtime fallback support for `SUPABASE_DB_URL` / `DATABASE_URL` and removed `SUPABASE_SERVICE_ROLE_KEY` fallback from TRR admin helpers; focused Vitest coverage passed.
- 2026-03-27: Updated live Vercel envs so `TRR_DB_URL` is present for preview and production, added preview `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and removed production `DATABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`.
- 2026-03-27: Triggered fresh preview and production Vercel redeploys so the canonical env changes can take effect on running builds.
- 2026-03-30: Verified the active `trr-app` Vercel project still exposes `TRR_DB_URL`, `NEXT_PUBLIC_SUPABASE_*`, and `TRR_CORE_SUPABASE_*` in the env inventory; production no longer exposes runtime `DATABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.
- 2026-03-30: Authenticated Vercel fetches succeeded against both current ready deployments: preview `trr-ab5bdlbj4-the-reality-reports-projects.vercel.app` and production `trr-6ic2sz494-the-reality-reports-projects.vercel.app`.
