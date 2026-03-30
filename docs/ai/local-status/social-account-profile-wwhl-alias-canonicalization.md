# Social Account Profile WWHL Alias Canonicalization

Last updated: 2026-03-30

## Status
- App phase complete.

## What changed
- Added shared social-account route canonicalization so `wwhlbravo` resolves to the canonical admin profile handle `bravowwhl`.
- Updated the admin social profile page entrypoints to redirect alias URLs onto the canonical route for stats, hashtags, posts, catalog, and collaborators/tags tabs.
- Added route-helper coverage proving both URL building and URL parsing normalize the WWHL alias.

## Validation
- Passed: targeted `eslint` on the touched social profile route files, route helper, and `tests/show-admin-routes.test.ts`
- Passed: `pnpm -C apps/web exec vitest run tests/show-admin-routes.test.ts`
- Passed: `curl -I -s http://admin.localhost:3000/admin/social/instagram/wwhlbravo` returning `307` with `location: /admin/social/instagram/bravowwhl`

## Handoff Snapshot
```yaml
handoff:
  include: false
  state: archived
  last_updated: 2026-03-30
  current_phase: "archived continuity note"
  next_action: "Refer to newer status notes if follow-up work resumes on this thread."
  detail: self
```
