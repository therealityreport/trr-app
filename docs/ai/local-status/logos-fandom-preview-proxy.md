# logos.fandom preview proxy

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

- Added a same-origin admin preview proxy for brand logo candidates so `logos_fandom` assets are fetched server-side instead of hotlinked from the browser.
- Updated `BrandLogoOptionsModal` to rewrite unsaved `logos_fandom` candidate previews through the proxy while leaving hosted and non-Fandom assets unchanged.
- Added route and modal regression coverage for the preview path and provider-specific URL rewriting.
