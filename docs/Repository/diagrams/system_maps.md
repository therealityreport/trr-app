# System Architecture Maps

<!-- Generated from scripts/generate_repo_mermaid.py; edit the template, not this output. -->

## Module Boundaries

```mermaid
flowchart LR
    routes["apps/web/src/app/ (Next.js routes)"] --> components["apps/web/src/components/ (UI)"]
    routes --> lib["apps/web/src/lib/ (app services)"]
    components --> lib
    wordle["apps/vue-wordle/src/ (reference-only Vue sandbox)"]
    scripts["scripts/ (workspace tools)"]
    lib --> backend["Sibling TRR-Backend API"]
```

## Request Flow

```mermaid
flowchart LR
    browser["Browser"] --> routes["Next.js app routes"]
    routes --> lib["App services / API clients"]
    lib --> backend["Sibling TRR-Backend API"]
```

## Key Components

- **apps/web/src/app/**: Next.js pages and API routes
- **apps/web/src/components/**: Shared app and admin UI
- **apps/web/src/lib/**: App-side services and API clients
- **apps/vue-wordle/src/**: Reference-only Vue Wordle sandbox; lifecycle and installation boundary: [README](../../../apps/vue-wordle/README.md)
- **scripts/**: Workspace tooling
