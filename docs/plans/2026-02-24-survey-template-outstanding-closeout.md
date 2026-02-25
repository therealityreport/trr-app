# Survey Template Outstanding Closeout Plan

## Summary
Yes, there are still outstanding changes to close out the current survey-template workstream safely. The remaining items are not new feature asks; they are verification, regression coverage, and release-hygiene tasks needed to make recent UI behavior changes durable.

## Current State Snapshot
- Repo: `/Users/thomashulihan/Projects/TRR/TRR-APP`
- Survey components of interest are present:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/survey/RankTextFields.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/components/survey/ReunionSeatingPredictionInput.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx`
- Existing targeted tests include:
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/reunion-seating-prediction-input.test.tsx`
  - `/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/tests/question-renderer-rankings.test.tsx`
- Missing direct test coverage discovered:
  - No dedicated behavioral tests for `RankTextFields` drag-over displacement/live reorder.
  - No test coverage for `QuestionsTab` archive behavior (`Numeric Slider` hidden in active list and shown in collapsed archive section).
  - No explicit even-spacing quality assertion for reunion seat spacing variance (current test focuses on non-overlap).
- Working tree currently has many unrelated admin/social changes already in progress; survey closeout must avoid reworking unrelated files.

## Goal and Measurable Success Criteria
1. Dragging in `RankTextFields` clearly reflows neighbors during drag with no duplicate drag visual artifact.
2. Reunion seat placeholders are visually even along the U-curve (not just non-overlapping), including mobile preview.
3. `Numeric Slider` is confirmed hidden from active survey template list and available in collapsed archive section.
4. Survey changes are documented in handoff and validated with reproducible commands.
5. No regressions in question routing or continue-button flow.

## Scope (In / Out)
In scope:
- Survey component behavior verification and test additions for:
  - `RankTextFields`
  - `ReunionSeatingPredictionInput`
  - `QuestionsTab` archive container behavior for `numeric-slider`
- Handoff/doc updates for this change set.

Out of scope:
- New survey template design changes beyond current behavior.
- Backend/schema/screenalytics changes.
- Refactoring unrelated admin/social files currently modified in the same repo.

## Architecture/Approach
1. Treat current code as baseline implementation and harden with targeted tests.
2. Validate behavior in two surfaces:
   - Component-level interaction tests (Vitest + RTL).
   - Admin preview/manual viewport checks in Questions tab.
3. Keep API contracts unchanged (UI-only behavior hardening).
4. Isolate closeout edits to a small file set to avoid conflict with unrelated in-progress work.

## Workstreams and Ordered Tasks
1. Test hardening for `RankTextFields`
   - Add `apps/web/tests/rank-text-fields-input.test.tsx` with cases:
     - drag-over reorders list before drop.
     - source row does not render as a second “dragging-selected” visual while overlay is active.
     - drag cancel restores original order.
     - drop outside container does not emit order change.
2. Test hardening for reunion spacing
   - Extend `apps/web/tests/reunion-seating-prediction-input.test.tsx`:
     - Add spacing-uniformity assertion:
       - Compute consecutive arc distances and enforce bounded variance (tolerance band).
       - Keep current non-overlap assertions.
3. Admin catalog regression test
   - Add/update a QuestionsTab test file (e.g. `apps/web/tests/admin-fonts-tabs.test.ts`):
     - Assert `Numeric Slider` is not rendered in active survey templates section.
     - Assert it appears inside `Archive Container`.
     - Assert archive container defaults collapsed.
4. Manual QA pass (interactive)
   - Verify in admin preview:
     - `RankTextFields` drag path pushes neighbors in real time.
     - `ReunionSeatingPrediction` seat placeholders look evenly spaced across phone/tablet/desktop previews.
5. Documentation closeout
   - Append a new entry in `/Users/thomashulihan/Projects/TRR/TRR-APP/docs/ai/HANDOFF.md` with:
     - files touched
     - validation evidence
     - residual risks (if any)

## Public APIs/Interfaces/Types Impact
- No external API contract changes expected.
- No backend route/type changes expected.
- Internal-only impact:
  - Potential exported test helper(s) for spacing metrics if needed; avoid changing runtime component props unless testability requires it.

## Data/Migration/Compatibility Impact
- No database migration.
- No persisted data format changes.
- Compatibility:
  - Existing survey answer payload formats remain unchanged.
  - Continue event contract (`survey-question-continue`) remains unchanged.

## Tests and Scenarios
1. Unit/component scenarios
   - Drag reorder preview updates on hover-over target rows.
   - Drag cancel restore path.
   - Drag end commit path.
   - Reunion spacing consistency check across representative widths (`320`, `390`, `768`, `1024`).
   - Archive container behavior in Questions tab.
2. Regression scenarios
   - QuestionRenderer still routes `rank-text-fields` to `RankTextFields`.
   - Existing reunion assignment interactions still emit expected output shape.
3. Manual scenarios
   - Phone/tablet/desktop previews in admin fonts tab.
   - Real pointer drag and touch drag checks for RankTextFields.

## Rollout/Rollback/Observability
- Rollout:
  - Merge as UI-only closeout patch with targeted tests.
- Rollback:
  - Revert survey component/test commits only; no backend coordination required.
- Observability:
  - Primary evidence is deterministic test pass set + manual preview confirmation screenshots/video if needed.
  - Record final evidence in `docs/ai/HANDOFF.md`.

## Risks and Mitigations
1. Risk: Overfitting spacing to test tolerance while looking wrong visually.
   - Mitigation: combine mathematical tolerance + manual visual QA.
2. Risk: Drag behavior differs between pointer and touch sensors.
   - Mitigation: include both pointer/touch manual checks and keep activation constraints explicit.
3. Risk: Unrelated in-progress files create noisy validation runs.
   - Mitigation: run targeted test files first, then full suite as a final gate.

## Assumptions/Defaults Chosen
1. This closeout remains in `TRR-APP` only.
2. Current design intent is already accepted; remaining work is behavior hardening and verification.
3. Existing continue-button styling decisions remain unchanged in this plan.

## Validation Commands
Run from `/Users/thomashulihan/Projects/TRR/TRR-APP`:

```bash
pnpm -C apps/web exec eslint \
  apps/web/src/components/survey/RankTextFields.tsx \
  apps/web/src/components/survey/ReunionSeatingPredictionInput.tsx \
  apps/web/src/app/admin/fonts/_components/QuestionsTab.tsx \
  apps/web/tests/rank-text-fields-input.test.tsx \
  apps/web/tests/reunion-seating-prediction-input.test.tsx \
  apps/web/tests/admin-fonts-tabs.test.ts

pnpm -C apps/web exec vitest run \
  tests/rank-text-fields-input.test.tsx \
  tests/reunion-seating-prediction-input.test.tsx \
  tests/admin-fonts-tabs.test.ts \
  tests/question-renderer-rankings.test.tsx

pnpm -C apps/web run lint
pnpm -C apps/web run test:ci
pnpm -C apps/web exec next build --webpack
```
