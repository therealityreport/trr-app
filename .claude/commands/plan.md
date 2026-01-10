You are in PLAN mode (READ-ONLY) for the TRR APP repository.

Your task: Create a detailed implementation plan based on a specification.

## ⚠️ CRITICAL: READ-ONLY MODE

You CANNOT in this mode:
- ❌ Create or modify files
- ❌ Run npm install or build commands
- ❌ Make git commits
- ❌ Use Write or Edit tools
- ❌ Execute any non-read-only bash commands

You CAN in this mode:
- ✅ Read files (Read tool)
- ✅ Search for patterns (Glob, Grep)
- ✅ List directories (ls, find in bash)
- ✅ View git history (git log, git diff)
- ✅ Ask user questions

## Process

1. **Get the specification**
   - Ask user for spec if not provided
   - Clarify any ambiguities

2. **Explore the codebase** (READ-ONLY)
   - Find similar features as reference
   - Identify existing patterns to follow
   - Locate files that need modification
   - Check for potential conflicts

3. **Design the implementation**
   - Architecture decisions with rationale
   - List files to create/modify
   - Identify dependencies
   - Plan testing strategy

4. **Identify challenges**
   - Technical risks
   - Potential edge cases
   - Performance considerations

## Output Format

```markdown
# Implementation Plan: [Feature Name]

## Overview
[High-level implementation strategy in 2-3 sentences]

## Architecture Decisions

### Decision 1: [Title]
**Chosen:** [approach]
**Rationale:** [why this approach]
**Alternatives considered:** [other options and why not chosen]

### Decision 2: [Title]
...

## Files to Create

1. `path/to/new-file.ts`
   - **Purpose:** [what this file does]
   - **Exports:** [main exports]
   - **Tests:** `path/to/new-file.test.ts`

## Files to Modify

1. `path/to/existing-file.ts`
   - **Changes:** [what needs to change]
   - **Location:** [specific functions/sections]
   - **Rationale:** [why these changes]

## Implementation Steps

1. **Step 1:** [title]
   - [Detail 1]
   - [Detail 2]
   - **Validation:** [how to verify this step]

2. **Step 2:** [title]
   ...

## Testing Strategy

### Unit Tests
- Test [component] for [behavior]
- Test [function] with edge cases: [list]

### Integration Tests
- Test [flow] end-to-end
- Test [integration point] between [A] and [B]

### Manual Testing
- [ ] Test scenario 1
- [ ] Test scenario 2

## Database Migrations

[If database changes needed]
- Migration file: `apps/web/db/migrations/XXX_description.sql`
- Changes: [describe schema changes]
- Rollback plan: [describe]

## Risks & Mitigations

### Risk: [Description]
- **Likelihood:** [High/Medium/Low]
- **Impact:** [High/Medium/Low]
- **Mitigation:** [how to address]

## Dependencies

- [ ] Dependency 1 - [why needed]
- [ ] Dependency 2 - [why needed]

## Validation Checklist

Before completing implementation:
- [ ] Lint passes (`make lint`)
- [ ] Typecheck passes (`make typecheck`)
- [ ] Tests pass (`make test`)
- [ ] Manual testing completed
- [ ] Database migrations tested
- [ ] No console errors
- [ ] Performance acceptable

## Estimated Complexity

**Overall:** [Simple/Medium/Complex]
**Reasoning:** [brief explanation]

---

## Critical Files for Implementation

[List the 3-5 most important files with absolute paths and brief reason]

1. `/absolute/path/to/file1.ts`
   - **Reason:** [why this file is critical]

2. `/absolute/path/to/file2.ts`
   - **Reason:** [why this file is critical]

...
```

## Best Practices

- **Follow existing patterns:** Match code style of similar files
- **Consider edge cases:** Think through error handling
- **Plan for testing:** Include test files in plan
- **Be specific:** Provide exact file paths and function names
- **Document tradeoffs:** Explain why one approach over another

## Tech Stack Reference

- **Frontend:** Next.js 15.5.7 App Router, React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest with jsdom
- **Linting:** ESLint 9 (flat config)
- **Database:** PostgreSQL (migrations in apps/web/db/migrations/)
- **Backend:** Firebase Auth + Firestore + Admin SDK
- **Build:** Turbopack (dev), standard Next.js build (prod)

## Next Steps

After creating the plan, suggest:
- "Review the plan for accuracy"
- "Ready to implement? Run /impl to start implementation"
- "Need to refine spec? Run /spec to update specification"
