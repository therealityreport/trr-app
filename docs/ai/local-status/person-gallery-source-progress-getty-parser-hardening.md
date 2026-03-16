# Person-Gallery Source Progress + Getty Parser Hardening

- Date: `2026-03-16`
- Status: `frontend implementation complete; managed-Chrome verification pending`

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "frontend implementation complete"
  next_action: "Run a managed-Chrome verification pass for the Get Images modal"
  detail: self
```

## What Changed
- The person-gallery progress UI now consumes structured backend `source_progress` data instead of treating Getty/NBCUMV as its own standalone ingest phase.
- The progress container renders one symmetric image-source breakdown for IMDb, TMDb, Fandom, Fandom Gallery, and Getty/NBCUMV with scraped, saved, failed, and remaining counts.
- The old dedicated `Getty / NBCUMV` pipeline step was removed; NBCUMV work is now represented inside the shared source list.

## Validation
- `pnpm -C apps/web exec vitest run tests/person-refresh-progress.test.ts`
- `pnpm -C apps/web exec eslint 'src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx' 'src/app/admin/trr-shows/people/[personId]/refresh-progress.ts' 'tests/person-refresh-progress.test.ts'`

## Remaining Follow-Up
- Verify a real `Get Images` run in managed Chrome on Mary or Lisa and confirm the modal keeps the per-source rows visible through completion and late-stage failures.
