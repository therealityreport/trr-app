# TRR-APP Brain

Scope:
- Next.js app behavior
- admin flows
- server/client boundaries
- backend consumption rules

Carry forward from the previous repo `AGENTS.md`:
- follow backend contracts; do not invent response shapes
- backend access flows through `TRR_API_URL`
- prefer Server Components unless interaction requires client code
- validate with `pnpm -C apps/web run lint`, `pnpm -C apps/web exec next build --webpack`, and `pnpm -C apps/web run test:ci`
