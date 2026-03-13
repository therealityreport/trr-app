# Other Projects — Task 11 (Tab-Isolated Admin Operations + Resumable Streams)

Repo: TRR-APP  
Last updated: March 12, 2026

## March 13, 2026 final closeout reconciliation

- `TRR-APP` is already on the final Task 11 deployed path:
  - Vercel Preview/Production -> live backend host
- The repo now contains the single-host production fallback fix for the app host gate when explicit `ADMIN_APP_ORIGIN` / `ADMIN_APP_HOSTS` are absent.
- The live Vercel deploy still needs that hotfix rollout; until then, `/admin` on the deployed site can still fail with `Admin origin is not configured.`
- `TRR-Backend` remains the system-of-record for the migration closeout state:
  - Render serves the public backend API
  - Modal serves async jobs
  - R2 serves runtime object storage
  - Better Stack serves log ingestion
- No further consumer contract changes are required in `TRR-APP` for Task 11.

## March 12, 2026 Vercel + AWS retirement checkpoint

- `TRR-Backend` is now the live deployed backend target for the app through the Modal URL:
  - `https://admin-56995--trr-backend-api.modal.run`
- `TRR-APP` completed the deployed env-only cutover on Vercel:
  - Preview `TRR_API_URL` updated and redeployed (`dpl_7mCRQqEiWPmuruGriqTTjfLxNgSZ`)
  - Production `TRR_API_URL` updated and redeployed (`dpl_C6JooMoQh4gD1jQpNRRS5qF41Lt6`)
- The legacy AWS API runtime in the visible account is no longer the active serving path:
  - `trr-api-asg` scaled to `0/0/0`
  - the remaining instance is terminating/draining
  - no worker ASG is present

## March 7, 2026 admin-docs alignment follow-up

- TRR-Backend staging now has the full admin Modal surface required by this workspace:
  - `remote + modal` social/admin execution
  - dedicated `run_admin_vision` for covered image-analysis jobs
- TRR-APP has updated its admin docs registry to treat those documented jobs as `Modal` current runtime.
- screenalytics should no longer be considered part of the documented TRR admin job happy path on staging.

## March 7, 2026 rollout checkpoint

- TRR-Backend staging is now live on `remote + modal`.
- The app remains compatible with the deployed additive executor metadata and does not require a follow-up consumer patch for this rollout.
- Production remains blocked outside this account context because no separate `/trr/production/*` backend namespace or companion runtime target is visible here.

## Cross-Repo Snapshot

- TRR-Backend: Complete for Plan A operation persistence/replay contracts; additionally exposed additive `GET /admin/socials/reddit/runs` for Plan B manual-attach run selection.
- TRR-APP: Complete for listed Plan B stream/run UI migration surfaces.
- screenalytics: No updates required.

## Responsibility Alignment

- TRR-Backend
  - Operation APIs and stream event persistence/replay.
  - Additive reddit run-list endpoint for explicit manual attach UX.
- TRR-APP
  - Tab-scoped workflow ownership and same-tab-only auto-resume.
  - Explicit manual attach patterns on run-based admin surfaces.
  - Proxy forwarding of tab/workflow/request headers on stream routes.
- screenalytics
  - None for Task 11.

## Dependency Order (Observed)

1. TRR-Backend operation/replay contract freeze (Plan A).
2. TRR-APP shared session/stream primitives and stream proxy forwarding.
3. TRR-APP page-by-page Plan B migration.
4. TRR-Backend minor additive run-list endpoint during final Plan B integration.
5. TRR-APP reddit manual-attach list integration.

## Locked Contracts (Mirrored)

- Existing admin stream routes remain valid; `operation_id` and `event_seq` remain additive.
- Operation replay contract:
  - Backend: `/api/v1/admin/operations/*`
  - App proxy: `/api/admin/trr-api/operations/*`
- Reddit run list contract (additive):
  - Backend: `/api/v1/admin/socials/reddit/runs`
  - App proxy: `/api/admin/reddit/runs`
- Auth remains shared; workflow state isolation is enforced at tab/workflow metadata level.

## March 5, 2026 checkpoint

- Consumed backend unblock execution status from:
  - `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/cross-collab/TASK11/STATUS.md`
  - Evidence root: `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/ai/evidence/aws-worker-plane/20260304-195705-task11-unblock`
- Backend applied staging runtime fixes (SG `tcp/6543` egress + explicit `SUPABASE_DB_URL`) and reran resilience scripts.
- Replay continuity remains blocked because kickoff does not emit `operation_id`/`event_seq` in staging; keep TRR-APP contract usage unchanged and do not advance canary confidence yet.

March 5 continuation:
- Backend DB parity fix restored operation-table presence on staging runtime DB and reran `30/31/32`.
- Envelopes now emit and `operation_ids.txt` is populated, but replay continuity/terminal progression is still not green; keep canary confidence blocked.

## March 13, 2026 hosted-media runtime follow-up

- `TRR-APP` now canonicalizes legacy hosted media URLs onto the live R2 public host in the shared hosted-media resolver, social thumbnails, show logos, and lightbox metadata flows.
- `TRR-Backend` and `screenalytics` were updated in the same session to use provider-neutral hosted-media/object-storage wording and config aliases without changing published payload field names.
- Remaining non-R2 media on admin surfaces is limited to external-source fallback rows that do not yet have hosted variants in the underlying data.
