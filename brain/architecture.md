# TRR-APP Architecture Notes

- App code lives under `apps/web/`
- Backend calls normalize through `apps/web/src/lib/server/trr-api/backend.ts`
- Server-only access stays under `apps/web/src/lib/server/`
- Shared cross-repo API and auth contracts are documented in `/Users/thomashulihan/Projects/TRR/brain/api-contract.md`
