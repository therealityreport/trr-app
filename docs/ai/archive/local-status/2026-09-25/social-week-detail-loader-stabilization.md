# Social week detail loader stabilization

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

- `WeekDetailPageViewLoader.tsx` now uses `next/dynamic` with the existing skeleton instead of a hand-rolled `useEffect(import(...))` boundary.
- That change stopped the dev-time webpack client crash on the social week admin route.
