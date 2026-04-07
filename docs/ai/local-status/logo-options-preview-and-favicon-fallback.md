# logo options preview and favicon fallback

Last updated: 2026-04-02

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-04-02
  current_phase: "completed"
  next_action: "Managed Chrome check on /brands?category=production&view=gallery if visual confirmation is needed"
  detail: self
```

- Restored featured wordmark and featured icon frames in the shared brand-logo modal, including drag-and-drop assignment back through the existing `/assign` proxy.
- Fixed broken modal previews by routing non-hosted external logo asset URLs through the local preview proxy instead of hotlinking third-party image URLs directly.
- Added production-company favicon fallback rendering in the unified brands workspace so icon placeholders use the company site favicon when no icon asset exists yet.
- Added regression coverage for modal featured assignment, proxied saved-asset previews, and production favicon fallback cards.
- Verified with targeted Vitest coverage and a full `next build --webpack`.
