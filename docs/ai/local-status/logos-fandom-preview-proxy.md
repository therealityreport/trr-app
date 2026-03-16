# logos.fandom preview proxy

Last updated: 2026-03-16

## Handoff Snapshot
```yaml
handoff:
  include: true
  state: recent
  last_updated: 2026-03-16
  current_phase: "complete"
  next_action: "Run a managed-Chrome verification pass when chrome-devtools is available in-thread"
  detail: self
```

- Added a same-origin admin preview proxy for brand logo candidates so `logos_fandom` assets are fetched server-side instead of hotlinked from the browser.
- Updated `BrandLogoOptionsModal` to rewrite unsaved `logos_fandom` candidate previews through the proxy while leaving hosted and non-Fandom assets unchanged.
- Added route and modal regression coverage for the preview path and provider-specific URL rewriting.
