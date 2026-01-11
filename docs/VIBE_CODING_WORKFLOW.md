# Vibe Coding Workflow Guide

A comprehensive guide to the "Vibe Coding" workflow for AI-assisted development with Claude Code.

## Philosophy

**Vibe Coding** is a workflow that enables safe, parallel feature development with AI assistance. It leverages git worktrees to create isolated development environments, allowing multiple features to be developed simultaneously without conflicts or context switching overhead.

### Core Principles

1. **Isolation:** Each feature has its own workspace (worktree)
2. **Validation:** Every change is validated before commit
3. **Safety:** Guardrails prevent destructive operations
4. **Transparency:** Clear git history and PR documentation
5. **Efficiency:** Parallel development without conflicts

## Core Concepts

### Branches vs Worktrees: The Mental Model

#### Traditional Branch Workflow

```
One Directory = One Context
--- Switch branches with git checkout
--- Risk mixing uncommitted changes
--- Stash/unstash overhead
--- One feature at a time
```

**Problems:**
- [ ] Forget to stash -> lose changes
- [ ] Switch mid-feature -> context loss
- [ ] Cannot work on multiple features
- [ ] IDE/build state confusion

#### Worktree Workflow

```
Multiple Directories = Multiple Contexts
--- Each feature has own directory
--- No switching, just cd
--- No stashing needed
--- Parallel development
```

**Benefits:**
- [x] Each feature fully isolated
- [x] Switch instantly (cd command)
- [x] No uncommitted changes conflicts
- [x] Work on multiple features in parallel

### The Analogy

**Branches = Tabs in a browser**
- Switch between tabs
- Easy to accidentally close
- One visible at a time

**Worktrees = Multiple monitors**
- Each shows different content
- All simultaneously active
- Just look at different screen

## The Vibe Coding Loop

```
----------------------------------------------+
  1. PLAN                                      
     Define what to build                      
     - Write spec (/spec)                      
     - Create plan (/plan)                     
     - Identify files to change                
----------------------------------------------+
                    
-------------------v--------------------------+
  2. ISOLATE                                   
     Create dedicated workspace                
     - wt switch --create <feature>            
     - Clean environment                       
     - Copy .env.local                         
----------------------------------------------+
                    
-------------------v--------------------------+
  3. IMPLEMENT                                 
     Make changes                              
     - Follow plan (/impl)                     
     - Write tests                             
     - Iterate until complete                  
----------------------------------------------+
                    
-------------------v--------------------------+
  4. VALIDATE                                  
     Run quality checks                        
     - Lint (ESLint)                           
     - Typecheck (TypeScript)                  
     - Test (Vitest)                           
     - Fix issues until green                  
----------------------------------------------+
                    
-------------------v--------------------------+
  5. COMMIT                                    
     Save changes to git                       
     - Review: git status, git diff            
     - Atomic commits                          
     - Descriptive messages                    
     - Co-authored by Claude                   
----------------------------------------------+
                    
-------------------v--------------------------+
  6. PUSH                                      
     Share with remote                         
     - git push -u origin <branch>             
     - Backup work                             
     - Enable collaboration                    
     - Trigger CI/CD                           
----------------------------------------------+
                    
-------------------v--------------------------+
  7. PR (Pull Request)                         
     Request code review                       
     - Descriptive title & body (/pr)          
     - Link to issues                          
     - Include test evidence                   
     - Tag reviewers                           
----------------------------------------------+
                    
-------------------v--------------------------+
  8. MERGE                                     
     Integrate approved changes                
     - After approval                          
     - CI passing                              
     - Conflicts resolved                      
----------------------------------------------+
                    
-------------------v--------------------------+
  9. CLEANUP                                   
     Remove worktree                           
     - wt remove                               
     - Auto-deletes merged branch              
     - Return to main worktree                 
----------------------------------------------+
```

## Commit vs Push: Understanding the Difference

### Commit (Local)

**What it does:**
- Saves changes to local git history
- Creates checkpoint for rollback
- Enables git log, git diff
- Completely offline

**When to commit:**
- After each logical unit of work
- Before switching contexts
- After tests pass
- Frequently (multiple times per session)

**Example:**
```bash
git add src/components/Button.tsx
git commit -m "feat: add primary button variant

- Add primary color styling
- Add hover state
- Add loading state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Push (Remote)

**What it does:**
- Uploads commits to GitHub/remote
- Makes work visible to team
- Triggers CI/CD pipelines
- Backs up work to cloud

**When to push:**
- After feature complete (or milestone)
- End of work session (backup)
- Before creating PR
- When collaborating with others

**Example:**
```bash
git push -u origin feature-button-variants
```

### The Rule

> **Commit often, push when ready to share.**

- [x] Commit: 10+ times per feature
- [x] Push: 1-3 times per feature

## Parallel Feature Development

Worktrees enable true parallel development:

```
Main Worktree: ~/Projects/TRR-APP
--- Branch: main
--- Status: Clean
--- Purpose: Stable base for new worktrees

Worktree 1: ~/.claude-worktrees/TRR-APP/feature-auth
--- Branch: feature-auth
--- Status: Working on OAuth integration
--- Purpose: Add authentication

Worktree 2: ~/.claude-worktrees/TRR-APP/feature-dashboard
--- Branch: feature-dashboard
--- Status: Designing UI components
--- Purpose: Build user dashboard

Worktree 3: ~/.claude-worktrees/TRR-APP/fix-api-timeout
--- Branch: fix-api-timeout
--- Status: Testing timeout fix
--- Purpose: Fix critical bug
```

### Workflow Example

**Scenario:** You need to pause dashboard work to fix a critical bug.

**Without Worktrees:**
```bash
# On feature-dashboard branch
git stash                    # Stash dashboard work
git checkout main            # Switch to main
git checkout -b fix-bug      # Create bug fix branch
# ... fix bug ...
git commit -m "fix bug"
git checkout feature-dashboard
git stash pop               # Hope nothing breaks
# Resume dashboard work
```

**With Worktrees:**
```bash
# In dashboard worktree (no changes needed)
cd ~/.claude-worktrees/TRR-APP/fix-api-timeout  # Or: wt switch fix-api-timeout
# ... fix bug ...
git commit -m "fix bug"
git push
cd ~/.claude-worktrees/TRR-APP/feature-dashboard  # Or: wt switch feature-dashboard
# Resume exactly where you left off
```

### Benefits

- [x] **Instant context switching** - Just `cd` or `wt switch`
- [x] **No stashing** - Every worktree keeps its state
- [x] **Parallel builds** - Each can have dev server running
- [x] **Independent validation** - Test each feature separately
- [x] **Early conflict detection** - Merge conflicts found before PR

## Best Practices

### Do's

[x] **Create worktree for every feature**
```bash
wt switch --create feature-name
```

[x] **Validate before every commit**
```bash
make validate  # lint + typecheck + test
```

[x] **Write descriptive commit messages**
```bash
git commit -m "feat: add user authentication

- Implement OAuth flow
- Add session management
- Add logout functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

[x] **Push regularly**
```bash
git push  # At least once per session
```

[x] **Delete worktrees after merge**
```bash
wt remove  # After PR merged
```

[x] **Keep commits atomic**
- One logical change per commit
- Easy to review
- Easy to revert if needed

### Don'ts

[ ] **Don't work directly on main**
- Always use feature branches
- Main should only receive merges

[ ] **Don't skip validation**
- Broken code should never be committed
- Fix issues before committing

[ ] **Don't commit without testing**
- Run `make validate` first
- Ensure tests pass

[ ] **Don't leave stale worktrees**
- Remove after feature merged
- Clean up regularly

[ ] **Don't force push**
- Unless absolutely necessary
- Never force push to main

[ ] **Don't commit secrets**
- Never commit .env files
- Never commit API keys or passwords

## Slash Commands Reference

The TRR APP provides slash commands to guide the workflow:

| Command | Purpose | Mode |
|---------|---------|------|
| `/spec` | Write feature specification | Interactive |
| `/plan` | Create implementation plan | READ-ONLY |
| `/impl` | Execute implementation | Execute |
| `/validate` | Run validation checks | Execute |
| `/pr` | Create pull request | Execute |
| `/wt-new` | Create new worktree | Execute |

### Command Flow

```
Idea -> /spec -> /plan -> /wt-new -> /impl -> /validate -> commit -> /pr -> merge
```

## Real-World Examples

### Example 1: Adding a Feature

**Task:** Add dark mode toggle

```bash
# 1. Create spec
# User explains requirements
# Claude runs /spec to document

# 2. Create plan
# Claude runs /plan (READ-ONLY exploration)

# 3. Create worktree
wt switch --create feature-dark-mode

# 4. Implement
# Claude runs /impl, creates files

# 5. Validate
make validate
# Fix any issues
make validate  # Until green

# 6. Commit
git add .
git commit -m "feat: add dark mode toggle

- Add theme context provider
- Add toggle component
- Add dark mode styles
- Persist preference to localStorage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 7. Push
git push -u origin feature-dark-mode

# 8. PR
gh pr create --title "feat: add dark mode toggle"

# 9. After merge, cleanup
wt remove
```

### Example 2: Fixing a Bug

**Task:** Fix survey submission error

```bash
# Quick worktree for bug fix
wt switch --create fix-survey-submission

# Investigate and fix
# ... make changes ...

# Validate
make validate

# Commit
git add .
git commit -m "fix: resolve survey submission error

Survey submissions were failing due to missing
validation on episodeRating field. Added proper
null check and validation message.

Fixes #123

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push and PR
git push -u origin fix-survey-submission
gh pr create

# Cleanup after merge
wt remove
```

### Example 3: Working on Multiple Features

**Scenario:** Dashboard design + API optimization

```bash
# Create first feature
wt switch --create feature-dashboard
# ... work on dashboard ...
# Leave in progress

# Create second feature (parallel)
wt switch --create perf-api-optimization
# ... optimize API ...

# Switch back to dashboard
wt switch feature-dashboard
# Continue where left off

# Complete API optimization first
wt switch perf-api-optimization
make validate
git commit -m "perf: optimize API queries"
git push
gh pr create

# Return to dashboard
wt switch feature-dashboard
# Continue dashboard work
```

## Troubleshooting

### "I'm in the wrong worktree"

```bash
# List all worktrees
wt list

# Switch to correct one
wt switch <branch-name>

# Or manually
cd ~/.claude-worktrees/TRR-APP/<worktree-name>
```

### "Validation is failing"

```bash
# Run checks individually to isolate
make lint        # Check for code style issues
make typecheck   # Check for type errors
make test        # Check for test failures

# Fix issues and re-run until all pass
make validate
```

### "I have uncommitted changes in wrong worktree"

```bash
# In worktree with changes
git status                    # See what changed

# Option 1: Commit them
git add .
git commit -m "wip: work in progress"

# Option 2: Move to correct worktree (advanced)
git stash
cd <correct-worktree>
git stash pop
```

### "Worktree already exists"

```bash
# List existing worktrees
wt list

# Option 1: Use existing
cd <worktree-path>

# Option 2: Remove and recreate
wt remove
wt switch --create <new-name>
```

## Advanced Topics

### Customizing Worktree Location

Edit `.config/wt.toml`:
```toml
[worktree]
path = "~/my-custom-location/TRR-APP"
```

### Pre-Merge Validation Hook

Worktrunk automatically runs validation before merging:
```toml
[hooks]
pre-merge = """
  cd "$WT_WORKTREE_PATH/apps/web"
  npm run lint || exit 1
  npx tsc --noEmit || exit 1
  npm run test || exit 1
"""
```

### Multiple Features from Same Base

```bash
# Create feature A from main
wt switch --create feature-a

# Create feature B from main
wt switch main
wt switch --create feature-b

# Create feature C based on feature A
cd ~/.claude-worktrees/TRR-APP/feature-a
git worktree add -b feature-c ~/.claude-worktrees/TRR-APP/feature-c
```

## Summary

The Vibe Coding workflow provides:

- **Safety:** Validation and hooks prevent mistakes
- **Efficiency:** Parallel development without conflicts
- **Clarity:** Clean git history and documentation
- **Confidence:** Test before commit, validate before merge

### The Golden Rules

1. **One worktree per feature**
2. **Validate before commit**
3. **Commit often, push when ready**
4. **Clean PR descriptions**
5. **Remove worktrees after merge**

---

**Ready to vibe?** Start with `/wt-new` and build something amazing! !
