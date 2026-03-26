# Person gallery short admin-route rewrite

Last updated: 2026-03-24

## Handoff Snapshot
```yaml
handoff:
  include: false
  state: archived
  last_updated: 2026-03-24
  current_phase: "archived continuity note"
  next_action: "See newer continuity notes if follow-up is needed"
  detail: self
```

- Fixed the admin-host short route `/people/:personId/gallery` so it rewrites to the admin person workspace even when `showId` is absent.
- Added middleware regression coverage for the no-`showId` gallery case.
- Verified in managed Chrome that `http://admin.localhost:3000/people/lisa-barlow/gallery` now loads the real admin gallery UI rather than the public-safe fallback page.
