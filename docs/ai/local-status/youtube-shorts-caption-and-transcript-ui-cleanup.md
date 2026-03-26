# YouTube Shorts caption and transcript UI cleanup

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

- Updated `WeekDetailPageView.tsx` so YouTube Shorts no longer render a fake title header when the only available text is the caption.
- Added a transcript error formatter so raw backend codes like `yt_dlp_unavailable` no longer appear directly in the admin drawer.
- Kept transcript rendering hidden when the backend reports `transcript_disabled`.
- Focused validation passed:
  - `pnpm exec vitest run tests/social-week-detail-wiring.test.ts`
  - `pnpm exec eslint src/components/admin/social-week/WeekDetailPageView.tsx tests/social-week-detail-wiring.test.ts`
