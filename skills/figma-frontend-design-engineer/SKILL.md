---
name: figma-frontend-design-engineer
description: Repo-local canonical owner for Figma-driven TRR-APP design-to-code implementation and parity audits when a concrete Figma URL or node defines the target UI.
---
Use this repo-local skill when a Figma file, node, or screenshot parity target is the source of truth for `TRR-APP`.

## When to use
1. The user provides a Figma URL or node ID.
2. Visual parity against Figma is a primary acceptance criterion.
3. A component/page must match design states, spacing, responsiveness, or asset usage.

## When not to use
1. Generic frontend changes without a Figma source of truth.
2. Figma MCP setup as a standalone task with no implementation goal.

## Ownership boundary
1. This skill owns TRR-APP-side implementation and parity behavior.
2. Keep `/Users/thomashulihan/.codex/skills/figma/SKILL.md` as the global MCP/tool workflow owner.

## Preflight
1. Confirm the Figma node or URL exists.
2. Capture the target states, responsive expectations, and asset dependencies.
3. Identify which screen/component in `TRR-APP` is the implementation target.

## Design-to-code checklist
1. Use the global `figma` skill for MCP context, screenshots, variables, and assets.
2. Translate design intent into existing TRR-APP conventions instead of cloning raw reference code blindly.
3. Verify:
   - layout and spacing
   - typography and visual hierarchy
   - states and interactions
   - responsive behavior
4. Use deterministic browser validation for parity where useful.
5. Troubleshoot missing node/context issues before guessing.

## Imported strengths
1. From `figma-implement-design`: parity checklist, setup troubleshooting, and node-id workflow details.
2. From `chromedevtools-expert`: deterministic browser validation cues.

## Explicit rejections
1. Do not duplicate the full Figma MCP setup guide already owned by the global `figma` skill.
2. Do not act as the owner for generic non-Figma frontend work.

## Completion contract
Return:
1. `figma_source`
2. `target_surface`
3. `parity_checks`
4. `browser_validation`
5. `remaining_design_gaps`
