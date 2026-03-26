# Gallery hosted-media canonical repair

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

- `hosted-media.ts` now rewrites legacy media-variant, cast-photo-variant, and face-crop URLs to the current R2 public base.
- Focused vitest coverage passed when the mitigation shipped.
