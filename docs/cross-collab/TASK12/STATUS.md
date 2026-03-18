# Status — Task 12 (Cast Screen-Time Analytics)

Repo: TRR-APP
Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: active
  last_updated: 2026-03-16
  current_phase: "mirror-prefill and proxy env guidance shipped; operator/browser evidence pending"
  next_action: "Set TRR_INTERNAL_ADMIN_SHARED_SECRET in the TRR-APP server env, then run a fresh-session managed Chrome walkthrough for the mirrored social-week import path and the feature-flag rollback drill"
  detail: self
```

## Phase Status

| Phase | Description | Status | Notes |
|---|---|---|---|
| 1 | Implementation | Complete | App proxy and admin page shipped with review controls, recent-run loading, stale-run reconciliation, and evidence preview support |
| 2 | Review enrichment | Complete | App now triggers on-demand clip generation and renders shots, title-card candidates, confessional candidates, and video evidence |
| 3 | Scene and suggestion review | Complete | App now renders scene summaries, conservative cast suggestions, and unknown review queues from backend-served worker artifacts |
| 4 | Promo/test assets | Complete | App now creates promo/test assets through upload or import flows, filters run history by asset class, and labels promo assets as non-publishable |
| 5 | Canonical publish and rollups | Complete | App now exposes publish controls for approved episode runs, publish history, canonical rollups, and progress/flashback review while keeping promo runs independent |
| 6 | Gap-closure operator workflow | Complete | App now persists suggestion and unknown-review decisions, renders title-card matches and cache metrics, and passes app-wide typecheck again while live browser smoke remains an operational follow-up |
| 7 | Rollback and operator-acceptance closure tooling | Complete | App now enforces an env-backed feature gate on the admin surface/proxy route and ships an operator checklist for deployed validation |

## Blockers
- None.

## Recent Activity
- 2026-03-13: Task scaffolding created.
- 2026-03-13: Added authenticated cast screentime proxy route and admin upload/run inspection page; web typecheck passed.
- 2026-03-13: Managed Chrome loaded `/admin/cast-screentime` successfully and confirmed the new admin surface renders.
- 2026-03-13: Added review-status action controls, show-scoped recent run history, and structured evidence/excluded-section tables to the admin page.
- 2026-03-13: Switched evidence rendering to hosted preview cards backed by backend-provided public URLs and exposed runtime/review summary fields in the run panel.
- 2026-03-13: Added stale-run reconciliation and recent-run load actions so operators can recover and inspect P0 runs from the app-owned admin surface without dropping into backend-only tooling.
- 2026-03-15: Added backend-artifact reads for `shots.json`, `title_card_candidates.json`, and `confessional_candidates.json`, then rendered those payloads in dedicated review panels.
- 2026-03-15: Added segment-level exact and timestamp clip actions plus inline `video/mp4` evidence playback in the cast screentime admin page.
- 2026-03-16: Added backend-artifact reads for `scenes.json`, `cast_suggestions.json`, and `unknown_review_queues.json`, then rendered those payloads in dedicated admin review panels.
- 2026-03-16: Managed Chrome confirmed the page renders the new `Scenes`, `Cast Suggestions`, and `Unknown Review Queues` sections in the admin shell.
- 2026-03-16: Added owner-scoped asset creation controls for show, season, and episode linkage, defaulting to season.
- 2026-03-16: Added promo/test asset creation paths for direct upload, official YouTube import, external URL import, and conversion from existing social YouTube rows.
- 2026-03-16: Added video-class run filtering, promo/test badges, and explicit non-publishable messaging to keep trailer and episode-teaser runs separated from episode runs in the same admin area.
- 2026-03-16: Added publish controls for approved episode runs only, plus publish-history panels and canonical show/season rollup tables.
- 2026-03-16: Added progress and flashback review panels while keeping promo assets clearly labeled as independent reports that do not affect canonical totals.
- 2026-03-16: Added persisted operator actions for cast suggestions and unknown review queues with explicit episode/season/show decision scope.
- 2026-03-16: Added title-card match and cache-metrics panels so operators can review deterministic reference matches and runtime cache behavior directly from the admin page.
- 2026-03-16: Fixed the pre-existing `covered-shows-repository.ts` nullability/typecheck issue and added the missing `cast-content` route slug so app-wide typecheck passes again.
- 2026-03-16: Added `TRR_CAST_SCREENTIME_ADMIN_ENABLED` gating for the admin page and cast-screentime proxy route, plus an operator acceptance checklist for deployed walkthrough and rollback verification.
- 2026-03-16: No further app code changes were required during live closure validation; remaining app work is the fresh-session managed Chrome walkthrough after the workspace MCP fixes.
- 2026-03-16: Re-ran `make cast-screentime-gap-check`; the app proxy slice stayed green (`tests/cast-screentime-proxy-route.test.ts`, `4 passed`) while backend/screenalytics companion slices and Golden Dataset checks also passed in the workspace wrapper.
- 2026-03-16: Cross-repo closeout cleared the hosted social sync-session schema blocker in TRR-Backend, so no further app sync-session changes are pending from that backend follow-through.
- 2026-03-16: This Codex thread still did not expose a usable `chrome-devtools` tool despite the shared Chrome runtime being up, so the fresh-session `/admin/cast-screentime` walkthrough and rollback drill remain an operator follow-up rather than a completed acceptance artifact in this session.
- 2026-03-16: Updated the social-week YouTube handoff so “Send To Cast Screentime” now prefers mirrored hosted video assets over raw YouTube watch URLs, and hardened the proxy error to name the missing `TRR_INTERNAL_ADMIN_SHARED_SECRET` env plus the legacy service-role fallback path.
- 2026-03-16: Synced a local dev `TRR_INTERNAL_ADMIN_SHARED_SECRET` into the app and backend env files so the cast-screentime proxy can authenticate live imports again once the dev servers restart.
