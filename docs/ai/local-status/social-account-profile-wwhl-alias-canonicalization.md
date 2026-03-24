# Social Account Profile WWHL Alias Canonicalization

Last updated: 2026-03-21

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
  include: true
  state: recent
  last_updated: 2026-03-21
  current_phase: "app alias redirect and route canonicalization shipped"
  next_action: "add future social-handle aliases to the shared route helper so links and redirects stay canonical"
  detail: self
```
