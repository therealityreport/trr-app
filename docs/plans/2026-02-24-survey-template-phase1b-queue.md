# Survey Builder Phase 1B Queue (Single Prioritized Queue)

## Purpose
This is the single source of truth for **remaining survey template requests** after Phase 1A closeout.

- Intake model: **Single prioritized queue**
- Phase 1 exit mode: **Core Stable + Intake Ready**
- Status taxonomy: `Backlog` | `In Progress` | `Done` | `Blocked`
- Priority taxonomy: `P0` (publishing/usability blocker), `P1` (current rollout need), `P2` (polish/optional)

## Prioritization Rules
1. P0 first: anything that blocks survey publishability or question-type parity.
2. P1 next: templates required for near-term show/season surveys.
3. P2 last: visual variants, optional formats, or deferred polish.
4. FIFO within same priority unless dependency ordering requires change.

## Queue Schema (Required Fields Per Request)
Each queue item must define all fields below:

1. `template_key`
2. `question_family` (`ranking` / `cast-select` / `likert` / `text-entry` / `multi-select` / `single-select` / `numeric` / `other`)
3. `source` (Figma URL/node or local component/spec)
4. `interaction_model`
5. `required_continue_behavior`
6. `responsive_constraints` (`mobile/tablet/desktop`)
7. `a11y_requirements`
8. `acceptance_criteria`
9. `required_tests`
10. `priority` (`P0`/`P1`/`P2`)
11. `status`
12. `owner`

## Prioritized Queue

### P0 — Publishing / Parity Blockers
| template_key | question_family | source | interaction_model | required_continue_behavior | responsive_constraints | a11y_requirements | acceptance_criteria | required_tests | priority | status | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `survey-dropdown-template` | `single-select` | `apps/web/src/lib/surveys/ui-templates.ts (uiVariant: "dropdown")` + `apps/web/src/components/survey/DropdownInput.tsx` | Single-select dropdown with keyboard + click selection | Continue appears once valid selection is made; deselect rules follow question requirements | No clipping/overflow on 320px+, tablet/desktop parity in preview | Label association, keyboard navigation, focus-visible states, aria semantics for select | Dropdown variant is exposed in survey template catalog and renders in preview with expected defaults | Add/update tests for QuestionsTab presence + QuestionRenderer route sanity for dropdown | `P0` | `Backlog` | `Unassigned` |

### P1 — Current Rollout Needs
| template_key | question_family | source | interaction_model | required_continue_behavior | responsive_constraints | a11y_requirements | acceptance_criteria | required_tests | priority | status | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `template-request-slot-01` | `other` | `Pending intake (user-provided Figma/spec)` | `TBD at intake` | `TBD at intake` | `Must define mobile/tablet/desktop rules` | `Must define aria + keyboard expectations` | `Decision-complete criteria required before implementation` | `Targeted component tests + renderer route tests` | `P1` | `Backlog` | `Unassigned` |
| `template-request-slot-02` | `other` | `Pending intake (user-provided Figma/spec)` | `TBD at intake` | `TBD at intake` | `Must define mobile/tablet/desktop rules` | `Must define aria + keyboard expectations` | `Decision-complete criteria required before implementation` | `Targeted component tests + renderer route tests` | `P1` | `Backlog` | `Unassigned` |
| `template-request-slot-03` | `other` | `Pending intake (user-provided Figma/spec)` | `TBD at intake` | `TBD at intake` | `Must define mobile/tablet/desktop rules` | `Must define aria + keyboard expectations` | `Decision-complete criteria required before implementation` | `Targeted component tests + renderer route tests` | `P1` | `Backlog` | `Unassigned` |

### P2 — Optional / Polish
| template_key | question_family | source | interaction_model | required_continue_behavior | responsive_constraints | a11y_requirements | acceptance_criteria | required_tests | priority | status | owner |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `template-request-slot-04` | `other` | `Pending intake (user-provided Figma/spec)` | `TBD at intake` | `TBD at intake` | `Must define mobile/tablet/desktop rules` | `Must define aria + keyboard expectations` | `Decision-complete criteria required before implementation` | `Targeted component tests + renderer route tests` | `P2` | `Backlog` | `Unassigned` |
| `template-request-slot-05` | `other` | `Pending intake (user-provided Figma/spec)` | `TBD at intake` | `TBD at intake` | `Must define mobile/tablet/desktop rules` | `Must define aria + keyboard expectations` | `Decision-complete criteria required before implementation` | `Targeted component tests + renderer route tests` | `P2` | `Backlog` | `Unassigned` |

## Phase 1B Execution Protocol
1. Pull the top `Backlog` item by priority and order in this file.
2. If the item has `TBD` fields, complete intake first and update this file before coding.
3. Implement only one queue item at a time.
4. For each item:
   - implement UI/component behavior,
   - add targeted tests,
   - run scoped lint/tests + build validation,
   - update status to `Done` (or `Blocked` with reason).
5. Update:
   - `docs/ai/HANDOFF.md` with evidence and risks,
   - this queue file with final status and links to touched files/tests.

## Intake Checklist (Per New Request)
Before a new request enters `In Progress`, confirm:
1. Figma source or equivalent spec is attached.
2. Continue-button behavior is explicit.
3. Mobile/tablet/desktop constraints are explicit.
4. Selection/deselection behavior is explicit.
5. Acceptance criteria + tests are explicit.
