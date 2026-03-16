# Cast Screen-Time Operator Acceptance Checklist

Repo: TRR-APP  
Last updated: 2026-03-16

## Rollout Guard
- `TRR_CAST_SCREENTIME_ADMIN_ENABLED`
  - `true`: `/admin/cast-screentime` and `/api/admin/trr-api/cast-screentime/*` are available
  - `false`: both routes must return `404`

## Browser Walkthrough
Validate in managed Chrome against the target environment:

1. Open `/admin/cast-screentime`.
2. Confirm the admin shell renders and no auth or proxy errors appear.
3. Upload an episode asset and launch a run.
4. Upload a promo asset and launch a run.
5. Import a promo trailer by YouTube or external URL.
6. Open a run and verify:
   - leaderboard
   - segments timeline
   - evidence preview
   - excluded sections
   - scenes
   - title-card matches
   - confessional candidates
   - cast suggestions
   - unknown review queues
   - progress
   - cache metrics
   - flashback review
7. Persist one cast suggestion decision and one unknown-review decision.
8. Reload the run and confirm decisions persist.
9. For an approved episode run, verify publish controls appear.
10. For a promo run, verify publish controls do not appear and independent-report labeling is visible.
11. Verify canonical show/season rollups exclude promo runs.

## Rollback Drill
1. Set `TRR_CAST_SCREENTIME_ADMIN_ENABLED=false`.
2. Confirm `/admin/cast-screentime` returns `404`.
3. Confirm the cast-screentime admin proxy route returns `404`.
4. Re-enable the flag only after rollback behavior is confirmed.
