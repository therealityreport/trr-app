You are in PULL REQUEST mode for the TRR APP repository.

Your task: Create a well-formatted, informative pull request.

## Prerequisites

Before creating a PR:
1. ✅ Changes are committed to a feature branch
2. ✅ Validation has passed (lint + typecheck + test)
3. ✅ Branch is ready to push to remote

If any prerequisite missing, stop and complete it first.

## Process

### 1. Verify Current State
```bash
git branch --show-current  # Confirm on feature branch
git status                 # Should be clean (all changes committed)
git log --oneline main..HEAD  # Show commits that will be in PR
```

### 2. Analyze All Changes

**Important:** Review ALL commits on this branch, not just the latest one.

```bash
# See full diff from main
git diff main...HEAD

# See commit history
git log main..HEAD --oneline

# See changed files
git diff --name-status main...HEAD
```

### 3. Draft PR Description

Use this template:

```markdown
## Summary
- [High-level overview in 2-3 bullet points]
- [What problem does this solve?]
- [What value does it provide?]

## Changes

### Components
- [What components were added/modified]

### API / Backend
- [What API changes were made]

### Database
- [What migrations were added]
- [What schema changes occurred]

### Configuration
- [What config changes were made]

### Tests
- [What tests were added/updated]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Configuration change

## Testing

### Automated
- [x] Lint passed
- [x] Typecheck passed
- [x] Tests passed

### Manual Testing
- [ ] Tested scenario 1
- [ ] Tested scenario 2
- [ ] Tested edge cases

### Browser Testing (if UI changes)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile

## Screenshots (if UI changes)
[Add screenshots showing before/after or new functionality]

## Database Migrations
[If applicable]
- Migration file: `apps/web/db/migrations/XXX_description.sql`
- Migration tested: [Yes/No]
- Rollback plan: [describe]

## Breaking Changes
[If applicable]
- [ ] Breaking change 1: [description]
- [ ] Breaking change 2: [description]

## Deployment Notes
[If applicable]
- [ ] Environment variables needed
- [ ] Configuration changes needed
- [ ] Database migrations must run
- [ ] Cache must be cleared

## Follow-up Tasks
[If applicable]
- [ ] Task 1 (link to issue)
- [ ] Task 2 (link to issue)

## Related Issues
Closes #[issue number]
Fixes #[issue number]
Related to #[issue number]

---

🤖 Generated with Claude Code
```

### 4. Push Branch (if needed)
```bash
# Push branch to remote
git push -u origin $(git branch --show-current)

# Or if branch exists
git push
```

### 5. Create PR

**Using GitHub CLI (Preferred):**
```bash
gh pr create \
  --title "feat: [clear, concise title]" \
  --body "$(cat <<'EOF'
[Paste drafted PR description here]
EOF
)"
```

**Manual Alternative:**
1. Go to GitHub repository
2. Click "Pull requests" → "New pull request"
3. Select base: `main`, compare: `[feature-branch]`
4. Fill in title and description
5. Click "Create pull request"

### 6. Verify PR Created
```bash
# List your PRs
gh pr list --author @me

# View PR in browser
gh pr view --web
```

## PR Title Guidelines

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks
- `perf:` Performance improvements

**Examples:**
- ✅ `feat: add user authentication with OAuth`
- ✅ `fix: resolve memory leak in survey component`
- ✅ `docs: update SETUP.md with Firebase instructions`
- ❌ `updated stuff`
- ❌ `fixes`

## PR Description Best Practices

### Do's
✅ **Be specific** - Explain what changed and why
✅ **Include context** - Link to issues, specs, or discussions
✅ **Show evidence** - Include test results, screenshots
✅ **List breaking changes** - Call out any compatibility issues
✅ **Mention follow-ups** - Note what's not included

### Don'ts
❌ **Don't be vague** - "Fixed some stuff"
❌ **Don't skip testing** - Always include test results
❌ **Don't hide complexity** - Call out complex changes
❌ **Don't ignore failures** - Address all validation issues first

## Special Cases

### Large PR (100+ files changed)
```
## Summary
This PR is large because [reason]. It can be reviewed by:
1. Reviewing [component A] first
2. Then [component B]
3. Finally [integration]

Key files to review:
- path/to/critical-file.ts (core logic)
- path/to/test.ts (test coverage)
```

### Breaking Changes PR
```
## ⚠️ Breaking Changes

This PR includes breaking changes:

1. **Change 1:** [description]
   - **Before:** [old behavior]
   - **After:** [new behavior]
   - **Migration:** [how to update]

2. **Change 2:** ...

## Migration Guide
[Step-by-step guide for users]
```

### Database Migration PR
```
## Database Changes

Migration: `apps/web/db/migrations/012_add_user_roles.sql`

**Schema Changes:**
- Added `user_roles` table
- Added `role_id` column to `users` table

**Rollback:**
```sql
DROP TABLE user_roles;
ALTER TABLE users DROP COLUMN role_id;
```

**Testing:**
- [x] Migration runs successfully
- [x] Data integrity maintained
- [x] Rollback tested
```

## After PR Created

### Tell User
```
✅ Pull request created successfully!

PR: [URL]
Title: [title]
Branch: [feature-branch] → main

Next steps:
1. Request reviews from team members
2. Address any CI failures
3. Respond to reviewer feedback
4. Merge after approval

View PR: gh pr view --web
```

### Monitor PR
- Watch for CI/CD status
- Respond to review comments promptly
- Update PR if changes requested

## Troubleshooting

### "No commits between main and [branch]"
```bash
# Check if branch is ahead of main
git log main..HEAD --oneline

# If empty, you may be on main or branch is not ahead
git branch --show-current
git status
```

### "gh: command not found"
```bash
# Install GitHub CLI
# macOS:
brew install gh

# Then authenticate:
gh auth login

# Or create PR manually via GitHub web UI
```

### "Branch has no tracking information"
```bash
# Set upstream and push
git push -u origin $(git branch --show-current)
```

## Remember

A great PR:
- ✅ Tells a clear story
- ✅ Provides context
- ✅ Includes evidence (tests, screenshots)
- ✅ Makes reviewers' job easy
- ✅ Documents breaking changes
- ✅ Links to related issues

**"Your PR description is documentation for the future."**
