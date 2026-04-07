# Instagram Shared-Profile Rollout Guardrails — Task 25 Plan

Repo: TRR-APP
Last updated: 2026-04-02

## Goal
Align the admin social UI with the shared-profile backend contract by surfacing operational alerts, `network_name`, and generic network-profile wording without changing route shapes.

## Status Snapshot
Implementation and targeted runtime tests are complete. Remaining work is deployment into the live app environment and authenticated canary confirmation against the backend rollout.

## Scope

### Phase 1: Shared-Profile UI Contract
Render backend alert objects and shared-profile metadata in the admin account profile UI.

Files to change:
- `apps/web/src/lib/admin/social-account-profile.ts` — additive types
- `apps/web/src/components/admin/SocialAccountProfilePage.tsx` — alert rendering, `network_name` header/source status
- `apps/web/tests/social-account-profile-page.runtime.test.tsx` — runtime coverage

### Phase 2: Bravo Alias Cleanup
Keep the legacy route but present it as generic network content for shared-profile operations.

Files to change:
- `apps/web/src/app/admin/social/bravo-content/page.tsx` — operator-facing copy only

## Out of Scope
- Vercel route topology changes
- Non-social Bravo editorial/admin surfaces
- screenalytics changes

## Locked Contracts
### Social Admin Proxy Contract
App consumers follow backend response shapes; no route rewrites.

## Acceptance Criteria
1. Catalog run alerts render in the admin account profile.
2. `network_name` appears in the header and source-status surfaces when available.
3. The Bravo alias page remains reachable while using generic network-content wording.
4. Targeted app runtime tests and lint pass.
