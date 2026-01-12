# Repository Map Workflow Setup

This document explains how to configure the [Repository Map workflow](../../.github/workflows/repo_map.yml) for full functionality.

## Required GitHub Secrets

### OPENAI_API_KEY

**Required for:** Full repository structure generation (weekly/manual runs only)
**NOT required for:** PR runs (these skip the PGSch step entirely)

The `OPENAI_API_KEY` secret is used by the [PGSch/graph-git-repo](https://github.com/PGSch/graph-git-repo) action to generate AI-powered repository structure documentation during scheduled (weekly) and manually-triggered workflow runs.

## When the Secret is Needed

| Workflow Trigger | Uses OPENAI_API_KEY? | Behavior |
|------------------|----------------------|----------|
| **Pull Request** | ❌ No | Skips PGSch step; generates Tree-sitter diagrams only (cheap mode) |
| **Schedule** (weekly) | ✅ Yes | Full mode: PGSch + Tree-sitter generation |
| **Manual** (`workflow_dispatch`) | ✅ Yes | Full mode: PGSch + Tree-sitter generation |

## How to Add the Secret

The workflow includes a fail-fast verification step that will produce a clear error if the secret is missing during weekly/manual runs.

### Option A: GitHub Web UI

1. Go to your repository on GitHub
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `OPENAI_API_KEY`
5. Value: Paste your OpenAI API key
6. Click **Add secret**

### Option B: GitHub CLI

```bash
cd /path/to/your/repo
gh secret set OPENAI_API_KEY
# When prompted, paste your OpenAI API key (input is hidden)
```

**Security Note:** Never paste API keys into commit messages, pull request descriptions, logs, or any other plaintext location. Always use GitHub's secret management system.

## What Gets Generated

### With OPENAI_API_KEY (full mode)
- `docs/Repository/generated/REPO_STRUCTURE.md` - Directory tree listing
- `docs/Repository/generated/REPO_STRUCTURE.mermaid.md` - Visual structure diagram
- `docs/Repository/generated/CODE_IMPORT_GRAPH.md` - Tree-sitter import dependencies
- `docs/Repository/generated/SCRIPTS_FLOW.md` - Tree-sitter script entrypoints
- `docs/Repository/generated/rendered/*.svg` - Rendered Mermaid diagrams

### Without OPENAI_API_KEY (PR mode)
- `docs/Repository/generated/CODE_IMPORT_GRAPH.md` - Tree-sitter import dependencies
- `docs/Repository/generated/SCRIPTS_FLOW.md` - Tree-sitter script entrypoints
- `docs/Repository/generated/rendered/*.svg` - Rendered Mermaid diagrams
- *Note: REPO_STRUCTURE files are NOT regenerated in PR mode*

## IDE Warnings

You may see static analysis warnings like:
```
Context access might be invalid: OPENAI_API_KEY
```

This is expected. IDE linters cannot verify that GitHub secrets exist (for security reasons). The warning appears even when the secret is correctly configured. What matters is runtime behavior, not the static warning.

The workflow's fail-fast verification step ensures you'll get a clear error message if the secret is actually missing when needed.

## Verification

After adding the secret, you can verify the workflow runs successfully:

```bash
# Trigger the workflow manually
gh workflow run repo_map.yml

# Check the run status
gh run list --workflow=repo_map.yml
gh run view <run-id>
```

Or wait for the next scheduled weekly run (Sunday at midnight UTC).

## Local Development

Local development does NOT require the OpenAI API key:

```bash
# Generate Tree-sitter-based diagrams locally (no OpenAI needed)
make repo-map

# Verify diagrams are up to date
make repo-map-check
```

The PGSch step only runs in CI (weekly/manual triggers), so local development workflows are unaffected.
