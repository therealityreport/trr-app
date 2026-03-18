# Getty/NBCUMV person-gallery bucket normalization

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: active
  last_updated: 2026-03-16
  current_phase: "Lisa Barlow gallery tabs now render from photo-backed buckets with short show labels and filtered event inventory"
  next_action: "Monitor a few more person galleries for legacy zero-count event rows and decide whether a data backfill is worth doing"
  detail: self
```

- The person gallery `Events` filter now carries grouped Getty event counts through the admin selector and keeps those rows isolated to the `event` bucket.
- The gallery show chips now derive from actual photo-backed `show` buckets instead of mixed credit/photo options, which removes duplicate `RHOSLC` tabs and hides empty credit-only tabs like `RHOBH` when no photos exist.
- Show chips now prefer nickname labels such as `RHOSLC`/`RHOBH` when the show has a canonical acronym, instead of rendering full-name-plus-acronym duplicates.
- The `Events` menu now suppresses explicit event buckets unless `grouped_image_count > 1`, so stale zero-count Getty event rows no longer appear in the selector.
- Photo metadata mapping now preserves Getty event URL/id/slug/date, grouped event counts, source resolution, Getty detail fields, and Getty tags for lightbox rendering.
- The lightbox metadata table now exposes grouped event count, source resolution, Getty event identifiers, Getty detail fields, and Getty tag lists without dropping the existing source metadata.
- The admin resumable-stream client now keys POST refresh sessions by `x-trr-request-id` when present, which prevents `Get Images` from replaying stale stored operations for identical request bodies.
- Focused validation passed: `pnpm exec eslint src/lib/admin/admin-fetch.ts tests/admin-fetch.test.ts` and `pnpm exec vitest run -c vitest.config.ts tests/admin-fetch.test.ts tests/person-refresh-images-stream-route.test.ts`.
- Focused validation passed for the gallery-tab follow-up:
  - `pnpm exec vitest run -c vitest.config.ts tests/person-gallery-media-view.test.ts`
  - `pnpm exec eslint src/lib/admin/person-gallery-media-view.ts src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx tests/person-gallery-media-view.test.ts`
- Managed Chrome confirmed that `Get Images` now sends a fresh POST to `/api/admin/trr-api/people/:personId/refresh-images/stream` instead of resuming an old operation stream.
- Live verification on 2026-03-16 now shows Lisa Barlow at `373` photos with live `NBCUMV` and `Getty` cards present, a single `RHOSLC` tab, and the `Events` button no longer exposing the stale zero-count `DIRECTV Plot Twist` entry after reload.
