# Person gallery short admin-route rewrite

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "short admin-host person gallery rewrite fixed"
  next_action: "No follow-up required unless additional person tabs fail to resolve on admin.localhost"
  detail: self
```

- Fixed the admin-host short route `/people/:personId/gallery` so it rewrites to the admin person workspace even when `showId` is absent.
- Added middleware regression coverage for the no-`showId` gallery case.
- Verified in managed Chrome that `http://admin.localhost:3000/people/lisa-barlow/gallery` now loads the real admin gallery UI rather than the public-safe fallback page.
