# Workspace Environment Contract

This app-local contract captures the runtime lanes that TRR-APP must keep
documented when the app repository is checked out without the parent TRR
workspace.

## Operator Failure Lanes

When a runtime check fails, classify it by the first concrete lane named in
logs, health payloads, or readiness output.

| Lane | Primary signals | Where to verify |
|---|---|---|
| Direct URL | `url_lane=direct_url`, `source=TRR_DB_DIRECT_URL`, direct Supabase host, local-only direct lane messages. | Backend startup logs, `/health`, `/admin/health/db-pressure`. |
| Pooler URL | `url_lane=pooler_url`, `TRR_DB_SESSION_URL`, `TRR_DB_URL`, `pooler.supabase.com:5432`, or session pool sizing warnings. | Backend startup logs, DB pool logs, and `/admin/health/db-pressure`. |
| Auth | `401`, `403`, `AUTH_REQUIRED`, `FORBIDDEN`, missing admin/shared-secret/service-role allowlist flags. | App/admin responses and backend auth logs. |
| Modal deployment state | Missing Modal app, secret, function, web endpoint, runtime probe, or social auth probe. | Backend Modal readiness tooling. |

| Variable | Default | Used By | Notes |
|---|---|---|---|
| `TRR_REMOTE_DEBUG_LOG_ENABLED` | `0` | `apps/web/src/app/api/debug-log/route.ts` | Hard kill switch for remote /api/debug-log writes. |
