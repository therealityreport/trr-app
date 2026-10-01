# Social account profile collaborators search filter

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

- Reworked the feature into a standalone caption-search control that sits beside the tab pills instead of attaching to the `Collaborators / Tags` tab.
- The control now opens a visible `Search Posts` pill plus inline input, so it does not depend on the `Collaborators / Tags` tab being active or highlighted.
- Search requests now target the backend `posts` endpoint with an additive `search` parameter, which filters across all stored post captions and related text fields for the profile.
- Exact `@handle` and `#hashtag` queries now use token-aware matching instead of broad substring matching, so `@paige` no longer falls through to unrelated posts and trailing punctuation like `@peacock.` normalizes to `@peacock`.
- The `Collaborators / Tags` surface now renders three distinct buckets: `Collaborators`, `Tagged Accounts`, and `Mentions`.
- Root cause: the backend was previously folding `mentions` into the `tags` aggregate, so TikTok `Tagged Accounts` was really showing caption mentions rather than true tagged-account data.
- Matching results render in a separate `Caption Search` panel below the tab row without changing the active tab.
- Validation:
  - `cd /Users/thomashulihan/Projects/TRR/TRR-Backend && pytest tests/repositories/test_social_season_analytics.py -k 'filters_all_captions or matches_exact_mentions or collaborators_tags_separates_mentions_and_tags'`
  - `cd /Users/thomashulihan/Projects/TRR/TRR-Backend && pytest tests/api/routers/test_socials_season_analytics.py -k 'profile_collaborators_tags'`
  - `cd /Users/thomashulihan/Projects/TRR/TRR-Backend && ruff check trr_backend/repositories/social_season_analytics.py tests/repositories/test_social_season_analytics.py tests/api/routers/test_socials_season_analytics.py`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec eslint src/components/admin/SocialAccountProfilePage.tsx tests/social-account-profile-page.runtime.test.tsx`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec vitest run tests/social-account-profile-page.runtime.test.tsx -c vitest.config.ts --pool=forks --poolOptions.forks.singleFork`
  - `pnpm -C /Users/thomashulihan/Projects/TRR/TRR-APP/apps/web exec next build --webpack`
- Note: TikTok tagged-account data is only as good as what the stored source rows currently expose. The UI now stops mislabeling mentions as tagged accounts, but truly tagged TikTok accounts will only appear once they are present in `profile_tags`.
