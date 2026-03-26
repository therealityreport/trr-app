# GPT-5.4 Delightful Frontends

This playbook adapts the OpenAI article "Designing delightful frontends with GPT-5.4" into a TRR implementation guide. It is meant to be used with the workspace `frontend-skill`, existing TRR design tokens, and the browser verification loop already present in `apps/web/tests/e2e`.

## Quickstart

1. Classify the surface as `landing/promotional`, `app/admin/product`, or `game`.
2. Write three short inputs before touching code:
   - `visual thesis`
   - `content plan`
   - `interaction thesis`
3. Lock hard constraints:
   - one H1
   - one accent color
   - two typefaces max per surface
   - one primary CTA above the fold
   - white background by default
   - black text by default
   - no gradients
   - no decorative shadows
   - no default cards
   - no hero cards
4. Attach approved references from `docs/design/references/`.
5. Build composition-first, then componentize where it helps.
6. Verify with Playwright at desktop and mobile widths.

## Required Inputs

- Real brand or product context
- Real copy, not placeholders
- Local screenshots or mood boards
- Target audience and desired tone
- Surface-specific constraints

## Landing Surface Rules

- Full-bleed first viewport by default
- One dominant visual anchor
- Brand presence immediately visible
- Sparse supporting copy
- No collage hero
- No stat strip
- No feature-card wall in the hero

## App And Admin Rules

- Start with the useful surface, not a brand statement
- Search, status, controls, and actions should be visible without scrolling
- Copy should be operational and scannable
- Remove decorative cards that do not improve comprehension
- Headings should orient, prioritize, or trigger action

## Design System Expectations

Author and review surfaces using this semantic set first:

- `background`
- `surface`
- `primary text`
- `muted text`
- `accent`
- `display`
- `headline`
- `body`
- `caption`

Cards are permitted only when they contain an interaction or materially improve comprehension.
Use only TRR-approved palette colors when an accent is needed. Default to white, black, and one palette accent.

## Imagery Rules

- Prefer repo-local assets, captured screenshots, or approved mood-board imagery
- Keep text on stable tonal regions
- Avoid fake embedded UI inside an image
- Use one strong visual move instead of several weak ones

## Motion Rules

- Keep one entrance sequence, one depth or scroll move, and one affordance transition at most
- Prefer transform and opacity
- Remove motion if it feels ornamental or slows mobile interaction
- Default to CSS motion unless the interaction clearly needs a dedicated library
- Do not use gradients, blur effects, or shadow-driven depth as the primary visual move

## Litmus Checks

- Does the first viewport feel brand-specific?
- Is the copy shorter and clearer than the draft wanted it to be?
- Would removing one decorative element improve the page?
- For app/admin pages, is the page useful before scrolling?
- Are there any generic card patterns left that can be collapsed or removed?

## Failure Patterns To Reject

- Generic SaaS card grids
- Weak branding
- Busy imagery behind text
- Repeated visual rhythms across sections
- Carousel sections without narrative purpose
- App UI that is only stacked bordered panels

## Verification

Run:

```bash
pnpm -C apps/web run lint
pnpm -C apps/web exec next build --webpack
pnpm -C apps/web run test:ci
pnpm -C apps/web exec playwright test tests/e2e/homepage-visual-smoke.spec.ts tests/e2e/admin-dashboard-utility-copy.spec.ts
```
