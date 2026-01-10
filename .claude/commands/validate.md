You are in VALIDATION mode for the TRR APP repository.

Your task: Run all validation checks and ensure code quality before committing.

## Validation Suite

The TRR APP requires three checks to pass:

1. **Lint** (ESLint) - Code quality and style
2. **Typecheck** (TypeScript) - Type safety
3. **Test** (Vitest) - Functionality correctness

## Process

### 1. Verify Location
```bash
pwd  # Should be in TRR-APP worktree
git branch --show-current  # Confirm branch
```

### 2. Run All Validation

**Option A: Using Makefile** (Preferred)
```bash
make validate
```

**Option B: Manual Commands**
```bash
cd apps/web
npm run lint          # Must pass
npx tsc --noEmit      # Must pass
npm run test          # Must pass
```

### 3. Interpret Results

#### ✅ All Checks Pass
```
🔍 Running ESLint...
✓ Linting complete

🔍 Type checking...
✓ TypeScript check complete

🧪 Running tests...
✓ Tests passed

✅ All validation checks passed!
```

**Action:** Tell user validation passed, ready to commit.

#### ❌ Failures Detected

**Lint Failures:**
```
Error: Unexpected console statement (no-console)
Error: 'variable' is assigned a value but never used
```

**Typecheck Failures:**
```
src/app/page.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'
```

**Test Failures:**
```
FAIL tests/component.test.ts
  ✗ renders correctly
    Expected: "Hello"
    Received: "Goodbye"
```

## Handling Failures

### Step 1: Show Clear Error
Display the actual error output to user.

### Step 2: Explain What's Wrong
- **Lint:** "ESLint found code style issues..."
- **Typecheck:** "TypeScript found type mismatches..."
- **Test:** "Tests are failing because..."

### Step 3: Suggest Fixes

**For Lint Issues:**
- Remove console.log statements
- Remove unused variables
- Fix import order
- Add missing semicolons

**For Type Issues:**
- Add proper type annotations
- Fix type mismatches
- Add null checks
- Use type assertions if safe

**For Test Failures:**
- Update test expectations
- Fix implementation bugs
- Add missing test coverage
- Mock external dependencies

### Step 4: Offer to Fix
```
I can fix these issues for you. Would you like me to:
1. Fix all automatically
2. Guide you through fixes
3. Let you fix manually
```

### Step 5: Re-run Until Green
After fixes applied:
```bash
make validate  # Run again
```

Repeat until all checks pass.

## Success Criteria

**You may only proceed to commit if:**
- ✅ Lint: No errors or warnings
- ✅ Typecheck: No type errors
- ✅ Tests: All tests passing

## Critical Rules

1. **NEVER commit if validation fails**
   - Broken code should never enter git history
   - Always fix issues first

2. **NEVER skip validation**
   - Even for "small changes"
   - Even if "in a hurry"
   - Validation is non-negotiable

3. **NEVER suggest workarounds**
   - No "we'll fix later"
   - No "disable the rule"
   - Fix the root cause

## Common Issues & Solutions

### Lint: console.log in code
```typescript
// ❌ Remove console.log
console.log("debug info")

// ✅ Use proper logging (or remove)
// If debugging: Remove before commit
```

### Lint: Unused variables
```typescript
// ❌ Unused variable
const unused = getValue()

// ✅ Use it or remove it
const value = getValue()
doSomething(value)

// ✅ Or prefix with _ if intentionally unused
const _unused = getValue()
```

### Typecheck: Type mismatch
```typescript
// ❌ Type error
const count: number = "5"

// ✅ Fix type
const count: number = 5
// Or
const count: string = "5"
```

### Tests: Failed assertion
```typescript
// ❌ Test expects wrong value
expect(result).toBe("old value")

// ✅ Update test or fix implementation
expect(result).toBe("new value")
```

## Validation Workflow

```
┌─────────────────────────┐
│   Run make validate     │
└──────────┬──────────────┘
           │
           ▼
    ┌──────────────┐
    │ All Pass?    │
    └──┬────────┬──┘
       │        │
      YES       NO
       │        │
       │        ▼
       │   ┌────────────────┐
       │   │ Show Errors    │
       │   └────────┬───────┘
       │            │
       │            ▼
       │   ┌────────────────┐
       │   │ Suggest Fixes  │
       │   └────────┬───────┘
       │            │
       │            ▼
       │   ┌────────────────┐
       │   │  Apply Fixes   │
       │   └────────┬───────┘
       │            │
       │            ▼
       │   ┌────────────────┐
       │   │   Re-run       │
       │   │   Validation   │
       │   └────────┬───────┘
       │            │
       │            │
       └────────────┴────────┐
                             ▼
                    ┌────────────────┐
                    │ ✅ All Pass!   │
                    │ Ready to commit│
                    └────────────────┘
```

## After Validation Passes

Tell user:
```
✅ All validation checks passed!

Summary:
- Lint: No issues
- Typecheck: No errors
- Tests: All passing

Your code is ready to commit.

Next steps:
1. Review changes: git status
2. Commit: git add . && git commit -m "message"
   Or use /commit command if available
```

## Tech Stack Notes

### Linting
- ESLint 9 with flat config
- Next.js and TypeScript rules enabled
- Runs on all .ts, .tsx, .js, .jsx files
- Config: `apps/web/eslint.config.mjs`

### Type Checking
- TypeScript compiler in no-emit mode
- Strict mode enabled
- Config: `apps/web/tsconfig.json`
- Checks all files in src/

### Testing
- Vitest with jsdom environment
- Coverage reporting configured
- Config: `apps/web/vitest.config.ts`
- Tests in: `apps/web/tests/`

## Troubleshooting

### "Command not found: make"
```bash
# Run commands manually
cd apps/web
npm run lint
npx tsc --noEmit
npm run test
```

### "Tests timing out"
```bash
# Increase timeout in test file
test('name', async () => {
  // ...
}, 10000)  // 10 second timeout
```

### "Type errors in node_modules"
- Usually safe to ignore
- Check if types package needs update
- Ensure skipLibCheck in tsconfig

## Remember

Validation is your safety net. It catches bugs before they reach git history, your teammates, or production. Never skip it, never work around it, always fix the issues it finds.

**"If validation fails, the code is not done."**
