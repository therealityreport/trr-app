You are in WORKTREE CREATION mode for the TRR APP repository.

Your task: Create a new git worktree for isolated feature development.

## What is a Worktree?

A worktree is a separate working directory linked to your git repository. Think of it as having multiple copies of your project, each on a different branch, without actually copying files multiple times.

**Benefits:**
- Work on multiple features in parallel
- No need to stash/unstash changes
- Each feature fully isolated
- Fast branch switching (just `cd`)

## Process

### 1. Get Feature Name

If user hasn't provided a branch name, ask:
```
What would you like to name this feature branch?

Suggested formats:
- feature/[name] - for new features
- fix/[name] - for bug fixes
- refactor/[name] - for refactoring
- docs/[name] - for documentation
- chore/[name] - for maintenance

Example: feature/oauth-login
```

### 2. Validate Branch Name

Check if branch already exists:
```bash
git branch --list "*[branch-name]*"
```

If exists, ask user to choose different name.

### 3. Create Worktree

**Option A: Using Worktrunk** (Preferred if available)
```bash
wt switch --create [branch-name]
```

**Option B: Manual Git Worktree** (Fallback)
```bash
# Create worktree in ~/.claude-worktrees/TRR-APP/
git worktree add -b [branch-name] \
  ~/.claude-worktrees/TRR-APP/[branch-name] main

# Navigate to worktree
cd ~/.claude-worktrees/TRR-APP/[branch-name]
```

### 4. Verify Creation
```bash
# Should show the new branch
git branch --show-current

# Should be clean
git status

# List all worktrees
wt list
# or
git worktree list
```

### 5. Post-Creation Setup

#### Copy Environment File
If `.env.local` exists in main worktree:
```bash
# Copy from main repo
cp /Users/thomashulihan/Projects/TRR-APP/apps/web/.env.local \
   apps/web/.env.local

echo "[x] Environment configured (.env.local copied)"
```

If `.env.local` doesn't exist:
```
WARNING:  No .env.local found in main worktree.

If you need environment variables:
1. Copy from .env.example: cp apps/web/.env.example apps/web/.env.local
2. Fill in required values (see SETUP.md)
```

## Feature Naming Conventions

### Feature Branches
New functionality:
- `feature/user-authentication`
- `feature/survey-analytics`
- `feature/dark-mode`

### Fix Branches
Bug fixes:
- `fix/login-redirect`
- `fix/survey-submission-error`
- `fix/memory-leak`

### Refactor Branches
Code improvement without behavior change:
- `refactor/auth-flow`
- `refactor/survey-components`
- `refactor/database-queries`

### Docs Branches
Documentation updates:
- `docs/setup-guide`
- `docs/api-documentation`
- `docs/contributing-guide`

### Chore Branches
Maintenance, dependencies, tooling:
- `chore/update-dependencies`
- `chore/eslint-config`
- `chore/ci-improvements`

## After Creation: Next Steps

Tell user:
```
[x] Worktree created successfully!

Branch: [branch-name]
Location: [worktree-path]
Base: main

Your new feature workspace is ready!

Next steps:
1. Implement your feature
2. Run /validate when done
3. Run /commit (or git commit) to save changes
4. Run /pr to create pull request

To return to main worktree:
  wt switch main
  # or
  cd /Users/thomashulihan/Projects/TRR-APP

To list all worktrees:
  wt list
  # or
  git worktree list

To remove this worktree (after merging):
  wt remove
  # or
  git worktree remove [worktree-path]
```

## Troubleshooting

### "wt: command not found"

Worktrunk CLI is not installed. Use manual fallback:

```bash
# Install Worktrunk (optional but recommended)
brew install worktrunk/tap/wt

# Or use manual git worktree
git worktree add -b [branch-name] \
  ~/.claude-worktrees/TRR-APP/[branch-name] main
cd ~/.claude-worktrees/TRR-APP/[branch-name]
```

### "Branch already exists"

```bash
# List existing branches
git branch --list

# Options:
1. Choose different name
2. Delete old branch: git branch -D [branch-name]
3. Use existing branch: git worktree add [path] [branch-name]
```

### "Worktree already exists"

```bash
# List worktrees
wt list

# Options:
1. Remove old worktree: wt remove
2. Navigate to existing: cd [worktree-path]
3. Choose different feature name
```

### "Cannot create directory"

```bash
# Ensure parent directory exists
mkdir -p ~/.claude-worktrees/TRR-APP

# Try again
wt switch --create [branch-name]
```

## Worktree Management

### List All Worktrees
```bash
wt list
# or
git worktree list
```

### Switch Between Worktrees
```bash
# Using Worktrunk
wt switch [branch-name]
wt switch main

# Or manually
cd [worktree-path]
cd /Users/thomashulihan/Projects/TRR-APP  # main worktree
```

### Remove Worktree
```bash
# After feature is merged
wt remove

# Or manually
git worktree remove [worktree-path]
```

### Cleanup Stale Worktrees
```bash
# Prune deleted worktrees
git worktree prune
```

## Best Practices

### Do's
[x] **One worktree per feature** - Keep work isolated
[x] **Remove after merge** - Clean up completed features
[x] **Use descriptive names** - Easy to identify purpose
[x] **Copy .env.local** - Ensure environment configured

### Don'ts
[ ] **Don't nest worktrees** - Keep them at same level
[ ] **Don't share .env.local** - Each worktree should have own
[ ] **Don't accumulate worktrees** - Remove when done
[ ] **Don't forget to push** - Worktrees are local

## Workflow Example

```bash
# 1. Create worktree for new feature
wt switch --create feature/user-dashboard

# 2. Implement feature
# ... code changes ...

# 3. Validate
make validate

# 4. Commit
git add .
git commit -m "feat: add user dashboard"

# 5. Push
git push -u origin feature/user-dashboard

# 6. Create PR
gh pr create

# 7. After PR merged, remove worktree
wt remove  # Automatically deletes merged branch

# 8. Return to main
wt switch main
```

## Integration with Other Commands

### After Creating Worktree
- Run `/spec` to write feature specification
- Run `/plan` to create implementation plan
- Run `/impl` to implement the feature

### Before Removing Worktree
- Run `/validate` to ensure code quality
- Run `/pr` to create pull request
- Wait for PR approval and merge

## Remember

Worktrees enable **parallel development** without conflicts. Use them for every feature, every fix, every change. Your main worktree stays clean, and you can work on multiple things simultaneously.

**"One worktree per feature = one context per terminal."**
