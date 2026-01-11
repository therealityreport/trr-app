#!/bin/bash
#
# Stop Hook
# Runs when Claude stops working on the TRR APP repository
#
# This hook provides a helpful summary of the current state
# and reminds about important next steps.

echo ""
echo "----------------------------------------------"
echo " Claude Session Summary"
echo "----------------------------------------------"
echo ""

# Show current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo " Current branch: $BRANCH"

# Show current directory
echo " Working directory: $(pwd)"

# Show git status
echo ""
echo " Git Status:"
echo "-------------------------------------------------"

# Get git status with color
git status --short 2>/dev/null || {
  echo "***  Not a git repository or git not available"
}

echo ""

# Count changes
STAGED=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
UNSTAGED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

# Check for any changes (staged, unstaged, or untracked)
if [ "$STAGED" -gt 0 ] || [ "$UNSTAGED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
  CHANGES_DETECTED=true
else
  CHANGES_DETECTED=false
fi

if [ "$STAGED" -gt 0 ] || [ "$UNSTAGED" -gt 0 ] || [ "$UNTRACKED" -gt 0 ]; then
  echo " Changes Summary:"
  echo "   Staged:    $STAGED file(s)"
  echo "   Unstaged:  $UNSTAGED file(s)"
  echo "   Untracked: $UNTRACKED file(s)"
fi

echo ""

# Provide guidance based on state
if [ "$CHANGES_DETECTED" = true ]; then
  echo "***  Uncommitted changes detected!"
  echo ""
  echo " Recommended next steps:"
  echo ""
  echo "  1.  Validate your work:"
  echo "      make validate"
  echo "      (or: cd apps/web && npm run lint && npx tsc --noEmit && npm run test)"
  echo ""
  echo "  2.  Review changes:"
  echo "      git status"
  echo "      git diff"
  echo ""
  echo "  3.  If validation passes, commit:"
  echo "      git add ."
  echo "      git commit -m \"your message\""
  echo ""
  echo "  4.  Or continue working in your next session"
  echo ""
else
  # No changes - check if ahead of remote
  COMMITS_AHEAD=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")

  if [ "$COMMITS_AHEAD" -gt 0 ]; then
    echo "OK: Working tree is clean"
    echo ""
    echo " You have $COMMITS_AHEAD unpushed commit(s)"
    echo ""
    echo " Next steps:"
    echo "  - Push to remote: git push"
    echo "  - Or create PR: /pr (or gh pr create)"
    echo ""
  else
    echo "OK: Working tree is clean"
    echo "OK: All commits pushed"
    echo ""
    echo "Tip: Ready to start new work or switch branches"
    echo ""
  fi
fi

# Show available worktrees if using worktrees
if command -v wt &> /dev/null; then
  NUM_WORKTREES=$(wt list 2>/dev/null | tail -n 1 | grep -oE '[0-9]+' | head -1 || echo "0")
  if [ "$NUM_WORKTREES" -gt 1 ]; then
    echo " Active worktrees: $NUM_WORKTREES"
    echo "   View all: wt list"
    echo "   Switch: wt switch <branch>"
    echo ""
  fi
fi

echo "----------------------------------------------"
echo ""
