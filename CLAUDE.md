# CLAUDE.md

This document provides guidance for AI assistants working with the TRR App repository.

## Project Overview

TRR App is a monorepo containing web applications for "The Reality Report" platform. The primary application is a Next.js 15 web app with Firebase authentication and PostgreSQL database integration. A secondary Vue-based Wordle game app is also included.

## Repository Structure

```
trr-app/
├── apps/
│   ├── web/                    # Main Next.js 15 application
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages and API routes
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Shared utilities and services
│   │   │   ├── signup/         # Signup flow utilities
│   │   │   └── styles/         # CSS styles
│   │   ├── db/migrations/      # PostgreSQL migration files
│   │   ├── tests/              # Vitest unit tests
│   │   └── public/             # Static assets and fonts
│   └── vue-wordle/             # Vue 3 Wordle game (Vite)
├── docs/Repository/            # Generated and curated architecture docs
├── scripts/                    # Python repo mapping scripts
├── firebase.json               # Firebase emulator configuration
├── firestore.rules             # Firestore security rules
├── Makefile                    # Python script runners
├── requirements.txt            # Python dependencies
└── ruff.toml                   # Python linter configuration
```

## Tech Stack

### Web App (`apps/web`)
- **Framework**: Next.js 15.5+ with Turbopack
- **React**: v19.1 with App Router
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript (strict mode)
- **Auth**: Firebase Authentication (Google, Email/Password)
- **Database**: Firebase Firestore + PostgreSQL
- **Testing**: Vitest with jsdom environment
- **Linting**: ESLint with next/core-web-vitals

### Vue Wordle (`apps/vue-wordle`)
- **Framework**: Vue 3.4+
- **Build**: Vite 5
- **Language**: TypeScript

### Python Tools (`scripts/`)
- **Python**: 3.11+
- **Linting**: Ruff
- **Dependencies**: Tree-sitter for code analysis

## Development Commands

### From Repository Root

```bash
# Start web app with Turbopack
npm run dev

# Start web app (stable mode, no Turbopack)
npm run dev:stable

# Start Firebase emulators + web app together
npm run dev:local

# Start only Firebase emulators
npm run emulators

# Build web app
npm run web:build

# Start vue-wordle dev server
npm run wordle:dev
```

### From `apps/web`

```bash
# Development with emulators
npm run dev:emu

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Clean build artifacts
npm run clean

# Run database migrations
npm run db:migrate
```

### Python/Repository Maps

```bash
# Generate repository maps (requires Python 3.11+)
make repo-map

# Check if maps are up to date
make repo-map-check
```

## Testing Conventions

- Tests are located in `apps/web/tests/`
- Test files follow the pattern `*.test.ts` or `*.test.tsx`
- Use Vitest with jsdom environment
- Test configuration in `apps/web/vitest.config.ts`
- Run with `npm run test` from `apps/web`

Example test structure:
```typescript
import { describe, it, expect } from "vitest";

describe("featureName", () => {
  it("does expected behavior", () => {
    expect(actual).toEqual(expected);
  });
});
```

## Code Conventions

### TypeScript
- Strict mode enabled
- Use path aliases: `@/*` maps to `./src/*`
- Prefer explicit type annotations for function parameters
- Use `type` imports for type-only imports

### React/Next.js
- App Router structure (not Pages Router)
- Use server components by default, `"use client"` only when needed
- API routes in `app/api/` using Route Handlers
- Dynamic routes use folder names like `[param]`

### File Naming
- React components: PascalCase (`GameHeader.tsx`)
- Utilities/libs: camelCase (`firebase.ts`)
- CSS: kebab-case (`side-menu.css`)
- Migrations: numbered prefix (`000_create_surveys_table.sql`)

### Imports
- Use path alias `@/` for src imports
- Group imports: external deps, then internal imports

## Firebase Configuration

### Emulators
- Auth: port 9099
- Firestore: port 8080
- Enable with: `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`
- Data persisted in `.emulator-data/`

### Production Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)
FIREBASE_SERVICE_ACCOUNT (JSON for server-side)
```

## Database

### PostgreSQL
- Migrations in `apps/web/db/migrations/`
- Run migrations: `npm run db:migrate` (from apps/web)
- Migration naming: `NNN_description.sql`

### Firestore
- Rules in `firestore.rules`
- Currently permissive for development (will be tightened)

## CI/CD Workflows

### Web Tests (`.github/workflows/web-tests.yml`)
- Triggers on PRs to main affecting `apps/web/**`
- Runs Vitest with coverage
- Uploads coverage artifacts

### Firebase Rules (`.github/workflows/firebase-rules.yml`)
- Validates rules on PRs via emulator
- Deploys to production on merge to main
- Requires `FIREBASE_TOKEN` and `FIREBASE_PROJECT_ID` secrets

### Repository Map (`.github/workflows/repo_map.yml`)
- Runs weekly (Sunday midnight UTC) and on PRs
- Generates code dependency graphs
- Auto-commits diagram updates to PR branches
- Requires `OPENAI_API_KEY` for full repo structure generation

## Key Application Routes

```
/                    # Landing page
/login               # Login page
/auth/finish         # Complete profile after auth
/profile             # User profile
/admin/*             # Admin dashboard
/hub/*               # Content hub
/surveys/*           # Survey features
/bravodle            # Game feature
/realitease/*        # Realitease game
/realations          # Realations feature
```

## API Routes

```
/api/session/login   # Create session cookie
/api/session/logout  # Clear session cookie
/api/surveys/*       # Survey endpoints
/api/admin/*         # Admin endpoints
/api/debug-log       # Debug logging
```

## Documentation

- `docs/Repository/README.md` - Documentation index
- `docs/Repository/generated/` - Auto-generated code maps (do not edit)
- `docs/Repository/diagrams/` - Curated architecture diagrams
- `apps/web/DEPLOY.md` - Vercel deployment notes
- `apps/web/POSTGRES_SETUP.md` - PostgreSQL setup guide
- `apps/web/SURVEYS_TABLE_SETUP.md` - Survey schema documentation

## Important Notes

1. **Do not manually edit** files in `docs/Repository/generated/` - they are auto-generated
2. **Environment files** (`.env`, `.env.local`) are gitignored - use `.env.example` as reference
3. **Node version**: Requires Node 18.18+ (22.x recommended for Vercel)
4. **Turbopack** is the default bundler for development; use `dev:stable` if issues arise
5. **Session cookies** are used for SSR auth guards - the client SDK handles popup auth

## Common Tasks

### Adding a New Page
1. Create folder in `apps/web/src/app/[route-name]/`
2. Add `page.tsx` for the route
3. Use `"use client"` directive if client-side interactivity needed

### Adding a Migration
1. Create file in `apps/web/db/migrations/` with next sequence number
2. Write SQL statements
3. Run `npm run db:migrate` to apply

### Running Against Local Firebase
```bash
# Terminal 1: Start emulators
npm run emulators

# Terminal 2: Start web with emulator config
npm run web:emu
```

### Debugging Auth Issues
- Check `apps/web/src/lib/firebase.ts` for auth flow
- Session management in `/api/session/` routes
- Auth guards in `src/components/ClientAuthGuard.tsx`
