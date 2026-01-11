# Claude Code Guide for TRR APP

This document provides guidelines for Claude Code when working with the TRR APP repository.

## Vibe Coding Rules (NON-NEGOTIABLE)

1. **NEVER run risky bash commands** without explicit user permission
2. **ALWAYS validate before committing** (lint + typecheck + test)
3. **ALWAYS use worktrees** for feature work (via Worktrunk)
4. **ALWAYS check git status** before proposing commits
5. **NEVER modify files** in read-only planning mode
6. **NEVER work directly on main branch** - always use feature branches

## Quick Start: Worktrunk Workflow

### Creating a New Feature Branch

**Preferred method** (Worktrunk CLI):
```bash
wt switch --create feature-name
```

**Manual fallback** (git worktree):
```bash
git worktree add -b feature-name ~/.claude-worktrees/TRR-APP/feature-name main
cd ~/.claude-worktrees/TRR-APP/feature-name
```

### Workflow Loop

1. **Create worktree:** `wt switch --create <feature>`
2. **Implement changes:** Follow spec and plan
3. **Validate:** `make validate` (lint + typecheck + test)
4. **Commit:** Follow Git Safety Protocol
5. **Push:** `git push -u origin <branch>`
6. **Create PR:** `gh pr create` or `/pr`
7. **After merge:** `wt remove` (auto-deletes merged branch)

### Managing Worktrees

```bash
wt list              # List all worktrees
wt switch main       # Switch to main worktree
wt switch <branch>   # Switch to feature worktree
wt remove            # Remove current worktree
```

## Repository Commands

### Installation
```bash
# Install root dependencies
npm install

# Install web app dependencies
npm --prefix apps/web install

# Or use Makefile
make install
```

### Development
```bash
# Start dev server (Turbopack enabled)
npm run dev

# Or: make dev

# Stable fallback (without Turbopack)
npm run dev:stable

# Or: make dev-stable

# With Firebase emulators
npm run dev:local

# Or: make dev-local
```

### Validation
```bash
# Lint (ESLint)
npm --prefix apps/web run lint
# Or: make lint

# Typecheck (TypeScript)
npx tsc --noEmit -p apps/web
# Or: make typecheck

# Test (Vitest)
npm --prefix apps/web run test
# Or: make test

# ALL validation checks
make validate
```

### Build & Database
```bash
# Production build
npm run web:build
# Or: make build

# Clean build artifacts
npm run web:clean
# Or: make clean

# Run database migrations
npm --prefix apps/web run db:migrate
# Or: make migrate
```

## Tech Stack

- **Frontend:** Next.js 15.5.7 + React 19 + TypeScript
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest with jsdom environment
- **Linting:** ESLint 9 (flat config)
- **Database:** PostgreSQL (migrations in `apps/web/db/migrations/`)
- **Backend:** Firebase Auth + Firestore + Admin SDK
- **Build:** Turbopack (dev), standard Next.js build (prod)

## Repository Structure

```
TRR-APP/
  apps/
    web/                      # Main Next.js application
      src/
        app/                  # App Router pages & routes
        components/           # Shared React components
        lib/                  # Utilities & business logic
        styles/               # Global styles
      db/
        migrations/           # PostgreSQL migrations
      public/                 # Static assets
      scripts/                # Maintenance scripts
      tests/                  # Test files
    vue-wordle/               # Legacy Vue Wordle app
  .claude/
    commands/                 # Slash commands (/spec, /plan, etc.)
    hooks/                    # Workflow hooks
    settings.local.json       # Claude Code settings
  .config/
    wt.toml                   # Worktrunk configuration
  docs/                       # Documentation
  CLAUDE.md                   # This file
  SETUP.md                    # Local setup guide
  Makefile                    # Common dev tasks
```

## Slash Commands

Use these commands to guide your workflow:

- `/spec` - Write feature specifications
- `/plan` - Create implementation plans (READ-ONLY mode)
- `/impl` - Execute implementations
- `/validate` - Run validation checks (lint + typecheck + test)
- `/pr` - Create pull requests
- `/wt-new` - Create new worktrees

## Environment Setup

See [SETUP.md](SETUP.md) for detailed local development setup.

**Quick reference:**
- **Environment variables:** `apps/web/.env.local` (copy from `.env.example`)
- **Database setup:** See [POSTGRES_SETUP.md](apps/web/POSTGRES_SETUP.md)
- **Deployment:** See [DEPLOY.md](apps/web/DEPLOY.md)

**IMPORTANT:** DATABASE_URL is required for production builds (`make build`). The validation target (`make validate`) does NOT require DATABASE_URL as it only runs lint + typecheck + test (no build). See SETUP.md for database configuration details

## Development Guidelines

### File Locations
- **Pages:** `apps/web/src/app/`
- **Components:** `apps/web/src/components/`
- **Utilities:** `apps/web/src/lib/`
- **Tests:** `apps/web/tests/`
- **Migrations:** `apps/web/db/migrations/`

### Import Patterns
```typescript
// Prefer absolute imports with @ alias
import { Component } from "@/components/component"
import { util } from "@/lib/utils"
import type { User } from "@/types"
```

### Component Patterns
```typescript
// Server Component (default)
export default function Page() {
  return <div>...</div>
}

// Client Component (when interactivity needed)
"use client"
export default function InteractivePage() {
  const [state, setState] = useState()
  return <div>...</div>
}
```

### Database Migrations
```bash
# Create new migration
# File: apps/web/db/migrations/XXX_description.sql

# Run migrations
npm --prefix apps/web run db:migrate

# Or: make migrate
```

## Git Safety Protocol

Only create commits when requested by the user. If unclear, ask first.

**When creating commits:**
1. Run multiple git commands in parallel:
   - `git status` - See all untracked files
   - `git diff` - See both staged and unstaged changes
   - `git log --oneline -5` - See recent commit messages for style
2. Analyze all changes and draft commit message
3. Add relevant files and create commit with message ending with:
   ```
   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```
4. Run `git status` after commit to verify success

**Safety rules:**
- NEVER update git config
- NEVER run destructive git commands without explicit user permission
- NEVER skip hooks (--no-verify)
- NEVER force push to main/master
- NEVER commit without validation passing
- NEVER commit secrets (.env files, credentials)

## Pull Requests

**Using gh CLI:**
```bash
# Create PR
gh pr create --title "feat: title" --body "description"

# List PRs
gh pr list --author @me

# View PR
gh pr view --web
```

**PR checklist:**
- [ ] All commits follow conventional commits format
- [ ] Validation passed (make validate)
- [ ] Tests added/updated
- [ ] Documentation updated if needed
- [ ] No breaking changes (or clearly documented)

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
- Verify `DATABASE_URL` in `.env.local`
- Check SSL settings
- Ensure migrations have run

### Firebase Auth Issues
- Verify all `NEXT_PUBLIC_FIREBASE_*` variables
- Check authorized domains in Firebase Console
- Ensure `FIREBASE_SERVICE_ACCOUNT` is valid JSON

### Build Errors
```bash
# Clear Next.js cache
npm run clean

# Rebuild
npm run build
```

### Type Errors
- Check TypeScript version compatibility
- Ensure types are imported correctly
- Clear and rebuild if persistent

## Additional Resources

- **Setup Guide:** [SETUP.md](SETUP.md) - Local development environment
- **PostgreSQL Setup:** [apps/web/POSTGRES_SETUP.md](apps/web/POSTGRES_SETUP.md)
- **Deployment:** [apps/web/DEPLOY.md](apps/web/DEPLOY.md)
- **Survey System:** [apps/web/SURVEYS_TABLE_SETUP.md](apps/web/SURVEYS_TABLE_SETUP.md)
- **Workflow Guide:** [docs/VIBE_CODING_WORKFLOW.md](docs/VIBE_CODING_WORKFLOW.md)

## Best Practices

### Do's
- Use worktrees for every feature
- Validate before every commit
- Follow existing patterns in the codebase
- Write tests alongside implementation
- Keep commits focused and atomic
- Use conventional commit messages

### Don'ts
- Work directly on main branch
- Skip validation steps
- Commit without testing
- Force push without good reason
- Leave console.log in code
- Commit secrets or credentials

## Remember

> "Vibe Coding is about safe, parallel development with AI assistance. Use worktrees, validate everything, commit with confidence."
