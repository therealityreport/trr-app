# Gallery hosted-media canonical repair

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "app mitigation complete"
  next_action: "Browser confirmation is still useful, but the repaired Bravo variant URLs are now canonical and return 200 directly"
  detail: self
```

- `hosted-media.ts` now rewrites legacy media-variant, cast-photo-variant, and face-crop URLs to the current R2 public base.
- Focused vitest coverage passed when the mitigation shipped.
