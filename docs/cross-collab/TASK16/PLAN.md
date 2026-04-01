# Instagram catalog gap analysis and operator guidance — Task 16 Plan

Repo: TRR-APP
Last updated: 2026-03-30

## Goal
Instagram catalog gap analysis and operator guidance

## Status Snapshot
Implemented in TRR-APP and validated with targeted runtime and route tests.

## Scope

### Phase 1: Implement
Consume backend gap-analysis data in the admin social profile page, surface deterministic guidance when posts and catalog counts diverge, and route operators toward the correct recovery action.

Files to change:
- `apps/web/src/components/admin/SocialAccountProfilePage.tsx`
- `apps/web/src/lib/admin/social-account-profile.ts`
- `apps/web/src/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/gap-analysis/route.ts`
- `apps/web/tests/social-account-profile-page.runtime.test.tsx`
- `apps/web/tests/social-account-catalog-gap-analysis-route.test.ts`

## Out of Scope
- Items owned by other repos unless explicitly required.
- Replacing the existing `Backfill Posts` CTA or changing its `full_history` payload.

## Locked Contracts
- Keep shared API/schema contracts synchronized across affected repos.
- Consume the additive backend `catalog/gap-analysis` read route without altering existing catalog write routes.

## Acceptance Criteria
1. TRR-APP changes complete and validated.
2. Cross-repo dependency order is respected.
3. Targeted route/runtime checks pass for banner rendering and CTA payloads.
4. Task docs remain synchronized.
