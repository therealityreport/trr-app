# Status — Task 23 (Final Supabase connection audit and donor transition inventory)

Repo: TRR-APP
Last updated: 2026-04-02

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-04-02
  current_phase: "app parity inventory recorded"
  next_action: "preserve these app-facing flows while backend ownership replaces screenalytics"
  detail: self
```

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Env/docs cleanup | Complete | Clarified Supabase env roles and removed stale `SCREENALYTICS_API_URL` from `.env.example` |
| 2 | App-facing parity checklist | Complete | `/screenalytics`, facebank-related admin flows, image-analysis flows, and cast-screentime remain the reset parity set |

## Blockers
- None for the audit.
- Follow-on work: the DeepFace reset still needs backend changes so these app routes no longer depend on the separate `screenalytics` service.

## Recent Activity
- 2026-04-02: Confirmed raw Postgres runtime stays canonical and server-side Supabase auth is active.
- 2026-04-02: Updated app env/docs and captured the app-visible parity surface for the reset.
