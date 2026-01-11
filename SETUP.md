# TRR APP Local Development Setup

Complete guide for setting up the TRR APP locally for development.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** >= 18.18 (v22.x recommended)
  ```bash
  node --version  # Should be 18.18 or higher
  ```

- **npm** >= 8.0
  ```bash
  npm --version
  ```

- **Git**
  ```bash
  git --version
  ```

- **PostgreSQL** (local or hosted)
  - Recommended providers: [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app)
  - Or local: [PostgreSQL Downloads](https://www.postgresql.org/download/)

- **Firebase Account**
  - Project: `trr-web-25d2e`
  - Access to Firebase Console

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd TRR-APP
```

### 2. Install Dependencies

**Option A: Using Makefile** (recommended)
```bash
make install
```

**Option B: Manual**
```bash
# Install root dependencies
npm install

# Install web app dependencies
npm --prefix apps/web install
```

### 3. Environment Variables

#### Copy Environment Template
```bash
cp apps/web/.env.example apps/web/.env.local
```

#### Edit .env.local

Open `apps/web/.env.local` and configure the following variables:

**Firebase Configuration** (Required):
```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

**Database** (Required):
```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**IMPORTANT:** DATABASE_URL is required for `npm run build` (production builds). Next.js build process collects page data which requires database access. This means:
- Local builds require DATABASE_URL in `.env.local`
- CI/CD builds require DATABASE_URL as a secret environment variable
- Development server (`npm run dev`) works without DATABASE_URL but some pages may error

**Firebase Admin SDK** (Required for API):
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**Admin Access** (Optional):
```env
ADMIN_EMAIL_ALLOWLIST="user1@example.com,user2@example.com"
```

**Firebase Emulators** (Optional for local testing):
```env
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false  # Set to true for local dev
```

### 4. PostgreSQL Database Setup

See [apps/web/POSTGRES_SETUP.md](apps/web/POSTGRES_SETUP.md) for detailed instructions.

**Quick Setup:**

1. **Create Database**
   - Use Neon, Supabase, Railway, or local PostgreSQL
   - Note the connection string

2. **Add DATABASE_URL**
   - Add connection string to `apps/web/.env.local`
   - Format: `postgresql://user:password@host:port/database?sslmode=require`
   - **For Supabase users:** Use your Supabase Postgres connection string as `DATABASE_URL` (found in Database Settings > Connection String > URI). Do NOT create a separate `SUPABASE_DB_URL` variable

3. **Run Migrations**
   ```bash
   npm --prefix apps/web run db:migrate
   # Or: make migrate
   ```

### 5. Firebase Configuration

#### Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `trr-web-25d2e`
3. Go to **Project Settings** > **General**
4. Scroll to **Your apps** > **Web app**
5. Copy configuration values to `.env.local`

#### Download Service Account Key

1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file securely
4. **Minify to single line** (remove all newlines)
5. Add to `FIREBASE_SERVICE_ACCOUNT` in `.env.local`

**Minification example:**
```bash
# Original (formatted JSON)
{
  "type": "service_account",
  "project_id": "...",
  ...
}

# Minified (single line)
{"type":"service_account","project_id":"...",...}
```

#### Enable Auth Providers

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable:
   - Email/Password
   - Google (optional)

## Running the Application

### Development Server

**Option A: Using Makefile** (recommended)
```bash
make dev
```

**Option B: Using npm**
```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

### Development with Firebase Emulators

For local testing without connecting to production Firebase:

**Terminal 1: Start Firebase Emulators**
```bash
npm run emulators
```

**Terminal 2: Start Dev Server**
```bash
# Set environment variable
export NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Start dev server
npm --prefix apps/web run dev:emu

# Or use concurrent mode
npm run dev:local
```

## Development Commands

See [CLAUDE.md](CLAUDE.md) for full command reference.

### Common Tasks

```bash
# Development
make dev              # Start dev server
make dev-stable      # Start without Turbopack
make dev-local       # Start with Firebase emulators

# Validation
make lint            # Run linter
make test            # Run tests
make typecheck       # Type check
make validate        # Run all checks

# Build
make build           # Production build
make clean           # Clean build artifacts

# Database
make migrate         # Run migrations

# Help
make help            # Show all commands
```

## Project Structure

```
TRR-APP/
  apps/
    web/                      # Main Next.js application
      src/
        app/                  # App Router pages (Next.js 13+)
        components/           # Shared React components
        lib/                  # Utilities & business logic
        styles/               # Global styles
      db/
        migrations/           # PostgreSQL migrations
      public/                 # Static assets (images, fonts)
      scripts/                # Maintenance scripts
      tests/                  # Test files (Vitest)
      .env.local              # Environment variables (not committed)
  .claude/                    # Claude Code configuration
  .config/                    # Project configuration
  docs/                       # Documentation
  Makefile                    # Development commands
```

## Verification

After setup, verify everything works:

### 1. Check Dependencies
```bash
npm --version           # Should be >= 8.0
node --version          # Should be >= 18.18
```

### 2. Run Validation
```bash
make validate
```

Should output:
```
[x] Linting complete
[x] Type checking complete
[x] Tests complete
[x] All validation checks passed!
```

### 3. Start Dev Server
```bash
make dev
```

Visit [http://localhost:3000](http://localhost:3000) - should see the application

### 4. Test Database Connection
```bash
# Run migrations
make migrate

# Should complete without errors
```

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Database Connection Failed

**Check connection string:**
- Verify `DATABASE_URL` format
- Ensure host/port/database/credentials are correct
- Check SSL settings (`sslmode=require` for cloud databases)

**Test connection:**
```bash
# Using psql
psql "$DATABASE_URL"

# Should connect successfully
```

**Common issues:**
- Incorrect password
- Database doesn't exist
- Firewall blocking connection
- SSL certificate issues

### Firebase Auth Not Working

**Check environment variables:**
```bash
# Ensure all NEXT_PUBLIC_FIREBASE_* variables are set
cat apps/web/.env.local | grep FIREBASE
```

**Verify Firebase Console:**
- Auth providers enabled
- Authorized domains include `localhost`
- Service account key is valid

**Check browser console:**
- Look for Firebase initialization errors
- Verify API key is correct

### Build Errors

```bash
# Clear Next.js cache
make clean

# Or manually
rm -rf apps/web/.next
rm -rf apps/web/.turbo

# Rebuild
make build
```

### Type Errors

```bash
# Run typecheck
make typecheck

# Common issues:
# - Missing type definitions: npm install @types/...
# - Circular imports
# - Incorrect import paths
```

### Test Failures

```bash
# Run tests with verbose output
cd apps/web
npm run test -- --reporter=verbose

# Run specific test file
npm run test path/to/test.test.ts
```

### Firebase Emulator Issues

```bash
# Ensure Firebase CLI installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Clear emulator data
rm -rf .firebase/emulator-data
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | `project-id` |
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON (minified) | `{"type":"service_account",...}` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated admin emails | none |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | Use local emulators | `false` |
| `PORT` | Dev server port | `3000` |

## Next Steps

After successful setup:

1. **Read Documentation**
   - [CLAUDE.md](CLAUDE.md) - AI-assisted development workflow
   - [apps/web/POSTGRES_SETUP.md](apps/web/POSTGRES_SETUP.md) - Database details
   - [apps/web/DEPLOY.md](apps/web/DEPLOY.md) - Deployment guide
   - [docs/VIBE_CODING_WORKFLOW.md](docs/VIBE_CODING_WORKFLOW.md) - Workflow concepts

2. **Explore Codebase**
   - Start with `apps/web/src/app/page.tsx` (home page)
   - Check `apps/web/src/components/` for reusable components
   - Review `apps/web/src/lib/` for utilities

3. **Start Development**
   - Create a feature branch: `wt switch --create feature-name`
   - Make changes
   - Validate: `make validate`
   - Commit and create PR

## Additional Help

- **Issues:** Report bugs or ask questions in GitHub Issues
- **Documentation:** Check `docs/` directory
- **Firebase:** [Firebase Documentation](https://firebase.google.com/docs)
- **Next.js:** [Next.js Documentation](https://nextjs.org/docs)

## Quick Reference

```bash
# Setup
make install          # Install dependencies
make dev             # Start development

# Validation
make validate        # Run all checks (lint + typecheck + test)

# Database
make migrate         # Run migrations

# Help
make help            # Show all commands
```

Ready to build! !
