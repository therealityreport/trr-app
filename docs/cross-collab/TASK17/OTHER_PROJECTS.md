# Other Projects — Task 17 (Supabase trust-boundary hardening)

Repo: TRR-APP
Last updated: 2026-03-30

## Cross-Repo Snapshot
- TRR-Backend: complete for internal JWT auth, startup enforcement, and backend-owned read surfaces.
- TRR-APP: complete for the app-owned runtime migration slice.
- screenalytics: complete for strict non-local DB/token enforcement and canonical DB resolver usage.

## Responsibility Alignment
- TRR-Backend
  - Own the shared internal admin auth contract and the backend `/shows/list` surface.
- TRR-APP
  - Own app route migration and Flashback admin server mediation.
- screenalytics
  - Own strict deployed-runtime posture for DB and service-token requirements.

## Dependency Order
1. TRR-Backend
2. screenalytics
3. TRR-APP

## Locked Contracts (Mirrored)
- Keep shared contracts aligned with owning repo PLAN.md.
- Do not remove `supabase-trr-admin` while auth shadow-mode verification still depends on Supabase `auth.getUser(token)`.
- Do not attempt a survey schema swap until a dedicated compatibility migration exists.
