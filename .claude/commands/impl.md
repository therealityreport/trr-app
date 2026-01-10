You are in IMPLEMENTATION mode for the TRR APP repository.

Your task: Implement a feature following a detailed plan.

## Prerequisites

Before starting implementation:
1. ✅ You have a detailed implementation plan (from /plan)
2. ✅ User has confirmed they want you to proceed
3. ✅ You are in a clean worktree (check: `git branch`)

## Process

### 1. Verify Environment
```bash
git branch --show-current  # Confirm correct branch
git status                 # Should be clean
pwd                        # Confirm in worktree path
```

### 2. Review the Plan
- Confirm plan is recent and accurate
- Ask user if any changes needed
- Clarify ambiguities before coding

### 3. Implement Step-by-Step

Follow the plan's implementation steps in order:

**For each step:**
- ✅ Implement the change
- ✅ Follow existing code patterns
- ✅ Add proper TypeScript types
- ✅ Write tests alongside implementation
- ✅ Keep user informed of progress

### 4. Code Quality Guidelines

#### TypeScript
- Use strict type checking
- Avoid `any` unless absolutely necessary
- Define interfaces for complex objects
- Use type inference where clear

#### React/Next.js
- Follow existing component patterns
- Use Server Components by default
- Add "use client" only when needed
- Match existing file structure

#### Error Handling
- Add proper error boundaries
- Handle edge cases from spec
- Use try-catch for async operations
- Provide user-friendly error messages

#### Testing
- Write tests in `apps/web/tests/`
- Use Vitest with jsdom
- Cover happy path and edge cases
- Match existing test patterns

#### Code Style
- Follow existing patterns in similar files
- Use existing components/utilities
- Add comments for complex logic only
- Keep functions focused and testable

### 5. Implementation Checklist

As you implement:
- [ ] Files created match plan
- [ ] Code follows TypeScript best practices
- [ ] Existing patterns followed
- [ ] Error handling added
- [ ] Tests written
- [ ] No console.log() left in code
- [ ] Imports organized
- [ ] No unused variables

## Communication

Keep the user informed:
- ✅ **Starting:** "Implementing [step] from plan..."
- ✅ **Progress:** "Created [file], added [functionality]..."
- ✅ **Completion:** "Implementation complete. Summary: [list changes]"
- ✅ **Blockers:** "Encountered [issue], suggesting [solution]..."

## After Implementation

When complete:
1. **Summarize changes**
   - List new files created
   - List modified files
   - Note any deviations from plan

2. **Suggest next step**
   ```
   Implementation complete!

   Files created:
   - path/to/new-file.ts
   - path/to/test-file.test.ts

   Files modified:
   - path/to/existing-file.ts (added X functionality)

   Next: Run /validate to check your work
   ```

## Important Reminders

- ❌ **DO NOT commit yet** - User will commit after validation
- ❌ **DO NOT skip validation** - Always recommend /validate
- ❌ **DO NOT deviate from plan** without asking user first
- ✅ **DO follow existing patterns** - Match the codebase style
- ✅ **DO write tests** - Test coverage is important
- ✅ **DO communicate** - Keep user informed of progress

## Tech Stack Reminders

### File Locations
- **Pages:** `apps/web/src/app/`
- **Components:** `apps/web/src/components/`
- **Lib/Utils:** `apps/web/src/lib/`
- **Tests:** `apps/web/tests/`
- **Migrations:** `apps/web/db/migrations/`

### Import Patterns
```typescript
// Prefer absolute imports
import { Component } from "@/components/component"
import { util } from "@/lib/utils"

// Type imports
import type { User } from "@/types"
```

### Component Patterns
```typescript
// Server Component (default)
export default function Page() {
  return <div>...</div>
}

// Client Component
"use client"
export default function InteractivePage() {
  return <div>...</div>
}
```

## Troubleshooting

### Type Errors
- Check TypeScript version compatibility
- Ensure types are imported correctly
- Use proper generic constraints

### Build Errors
- Clear .next: `npm run clean`
- Restart dev server
- Check for circular dependencies

### Test Failures
- Ensure jsdom environment configured
- Mock external dependencies
- Check test file naming (*.test.ts)

## Next Steps

After implementation:
- User should run: `/validate`
- Fix any issues found
- Then user can commit changes
