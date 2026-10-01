# Social week Instagram route unreachable fix

Last updated: 2026-03-30

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

- Fixed the `unreachable (trace: ...)` failure on `/rhoslc/social/s6/w0/instagram`.
- The initial client week-detail load now caps `max_comments_per_post` at `25` so first paint does not trigger an effectively uncapped comment hydration request.
- The admin `shows/resolve-slug` route now resolves from the local TRR DB first and only falls back to the backend resolver when local lookup misses.
- Social admin season resolution now resolves `season_id` from the local TRR DB first and only falls back to the backend season-list scan when needed.
- Verified with Vitest route/wiring coverage and a browser check showing the Instagram week page rendering metrics and posts without the unreachable banner.
