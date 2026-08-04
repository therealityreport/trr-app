# graphify reference: commit hook and native AGENTS.md integration

Load this when the user asked to install the post-commit hook or wire graphify into a project's AGENTS.md.

## For git commit hook

Install a post-commit hook only when the user explicitly asks for it. The hook
is read-only: it reports that a graph may be stale and never invokes Graphify,
rebuilds an output, or writes a freshness marker.

```bash
graphify hook install    # install
graphify hook uninstall  # remove
graphify hook status     # check
```

After every `git commit`, the hook reports changed files and asks for an explicit
freshness preview. It must handle an initial commit, which has no `HEAD~1`:

```bash
if git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  git diff --name-only HEAD~1 HEAD
else
  git diff-tree --no-commit-id --name-only -r HEAD
fi
```

For every result, report that Graphify evidence may be stale. A user or an
interactive agent may later request the normal preview-and-refresh workflow.

If a post-commit hook already exists, graphify appends to it rather than replacing it.

---

## For native AGENTS.md integration

Run once per project to add an opt-in Graphify policy to agent sessions:

```bash
graphify agents install
```

This writes a `## graphify` section that requires a task-relevant freshness check
before graph evidence is used and requests an explicit Graphify update after
changes. It must never direct automatic rebuilds from lifecycle hooks.

```bash
graphify agents uninstall  # remove the section
```
