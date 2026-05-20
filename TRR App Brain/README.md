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
- validate app lint/typecheck from the workspace root with `make app-check`; use `pnpm -C apps/web exec next build --webpack` and `pnpm -C apps/web run test:ci` for heavier TRR-APP build and test lanes after the Node 24 baseline is active
