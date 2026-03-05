# Tab-Isolated Admin Operations + Resumable Streams — Task 11 Plan

Repo: TRR-APP  
Last updated: March 3, 2026

## Goal

Complete Plan B UI migration so admin run/stream workflows are tab-owned, reconnect-resumable on same-tab refresh, and never auto-adopt active work from other tabs.

## Current State

Plan B implementation is complete for listed surfaces.

- Shared tab/session/workflow policy modules are in place.
- Stream workflows are on `adminStream` callback handlers (no manual `ReadableStream` loops).
- Run workflows use explicit flow scopes/keys with tab-owned auto-resume.
- Manual attach remains explicit and available for non-owned runs.
- Reddit run-based surfaces now fetch active run lists for manual attach (no paste-only dependency).

## Executed Phases

### Phase 1 — Shared policy and session primitives

- Added/used:
  - `apps/web/src/lib/admin/workflow-policy.ts`
  - `apps/web/src/lib/admin/operation-session.ts`
  - `apps/web/src/lib/admin/run-session.ts`
  - `apps/web/src/lib/admin/use-operation-unload-guard.ts`
  - `apps/web/src/lib/admin/client-auth.ts`
  - `apps/web/src/lib/admin/admin-fetch.ts`

### Phase 2 — Stream surface migration to `adminStream`

- Migrated listed stream-heavy pages/components:
  - Show admin page
  - Season admin page
  - Person admin page
  - Scrape import page + drawer

### Phase 3 — Run surface ownership + resume/attach UX

- Migrated run-based surfaces to explicit flow scope/key and run-session ownership:
  - `WeekDetailPageView` (social week sync)
  - Reddit window posts details sync
  - Reddit post details sync
- Auto-resume now uses tab-owned active run sessions only.
- Manual attach uses explicit active run selection.

### Phase 4 — Proxy forwarding and additive backend support

- Verified stream proxies forward:
  - `x-trr-tab-session-id`
  - `x-trr-flow-key`
  - `x-trr-request-id`
- Added TRR-APP proxy `GET /api/admin/reddit/runs` and backend additive `GET /api/v1/admin/socials/reddit/runs` for manual-attach run lists.

### Phase 5 — QA, regression updates, and documentation

- Added/updated Task 11 targeted tests for:
  - run-session ownership/stale pruning
  - reddit window/details run polling and run-list attach wiring
  - season/person stream wiring expectation updates after `adminStream` migration

## Acceptance Criteria Status

1. Tab identity consistently attached to admin calls: **met**.
2. Same-tab stream replay resume via operation session: **met**.
3. Listed run-based surfaces auto-resume only tab-owned runs: **met**.
4. Manual attach remains explicit for non-owned runs: **met**.
5. No implicit cross-tab auto-adoption on migrated surfaces: **met**.
6. Additive compatibility retained for legacy clients not sending new headers/fields: **met**.

## March 5, 2026 backend unblock checkpoint

- Backend executed staging unblock actions and reran resilience scripts, but replay continuity is still blocked by missing kickoff envelopes (`operation_id`/`event_seq`) in staging.
- TRR-APP plan remains complete on consumer implementation; production canary confidence remains dependent on backend evidence completion.

March 5 continuation:
- Backend parity fix restored operation tables and reran `30/31/32` in the same evidence root.
- Envelopes are now emitted, but terminal-state/replay continuity remains blocked; TRR-APP remains unchanged and waits on backend green evidence.
