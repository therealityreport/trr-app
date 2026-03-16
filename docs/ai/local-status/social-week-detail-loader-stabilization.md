# Social week detail loader stabilization

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "complete"
  next_action: "Monitor only unless the route regresses under managed Chrome after a fresh dev restart"
  detail: self
```

- `WeekDetailPageViewLoader.tsx` now uses `next/dynamic` with the existing skeleton instead of a hand-rolled `useEffect(import(...))` boundary.
- That change stopped the dev-time webpack client crash on the social week admin route.
