# Show Refresh Settings + Social Reddit Provisioning

Last updated: 2026-03-16

## Status
- App phase complete, with one remaining broad validation gap.

## What changed
- Expanded show refresh UI state and labels to include `videos`, `news`, and `social_setup`.
- Show Home now surfaces `Premiere Date` in the top read-only summary.
- Settings now contains the editable metadata form for:
  - display name
  - nickname
  - premiere date
  - alt names
  - description
  - TMDb / IMDb / TVDb / Wikidata / TV Rage IDs
  - genres
  - networks
  - streaming providers
  - tags
- Show update API and TRR repository mapping now persist those expanded fields.
- Refresh orchestration now runs the expanded target list and auto-seeds `r/BravoRealHousewives` for eligible Bravo shows when missing.
- Reddit community create/edit flows now use explicit scope types:
  - show-based
  - franchise-based
  - network-based

## Validation
- Passed: targeted eslint on touched show admin and Reddit manager files
- Did not complete in-session: `pnpm exec tsc --noEmit --pretty false` (no compiler output was returned before close-out)

## Notes
- Cast Comparison already routes through the backend SocialBlade proxy path in the app; this pass did not need a separate transport rewrite.

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "app complete"
  next_action: "follow up on broad typecheck when needed"
  detail: self
```
