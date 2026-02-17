# Season Social Analytics V3 + Reddit Stabilization — Task 7 Plan

Repo: TRR-APP
Last updated: February 17, 2026

## Goal

Update admin season social analytics UI to render no-data weeks without fake bars and show grouped comparative engagement bars by platform.

## Scope

1. Consume backend `weekly_platform_engagement` payload in:
- `apps/web/src/components/admin/season-social-analytics-section.tsx`.
2. Replace old minimum-width single bar trend visualization with grouped per-platform comparative bars.
3. Keep week rows visible for no-data periods and show `No data yet` text without rendering bars.
4. Add sentiment-driver UI note clarifying cast names/handles are excluded from terms.
5. Add targeted component tests for no-data rendering, grouped bars, and zero-value no-minimum-width behavior.

## Out of Scope

- Backend contract or analyzer changes.
- screenalytics changes.

## Acceptance Criteria

1. Weekly trend rows render with no bars for `has_data=false` weeks.
2. Data weeks show grouped platform bars with distinct platform color mapping.
3. Zero-valued platform bars are not rendered with artificial minimum width.
4. New component test file passes.

## Addendum: Reddit Page Stabilization + Flair-Enriched Community Creation

1. Persist subreddit post flairs per community (`post_flares`, `post_flares_updated_at`) via migration.
2. Add async flair refresh endpoint:
- `POST /api/admin/reddit/communities/[communityId]/flares/refresh`
3. Keep create-community flow create-first and non-blocking:
- show created community immediately
- clear busy banner on create completion
- refresh flairs asynchronously
- keep created community even when flair set is empty.
4. Harden Reddit URL validation:
- client `parseRedditUrl` requires Reddit hosts
- thread create/update APIs reject non-Reddit `url` and `permalink` values.
5. Add request timeout handling + duplicate-submit prevention on Reddit manager actions.
6. Add focused tests for flair service, flair refresh route, manager create flow/no-flair flow, and thread URL host validation.
