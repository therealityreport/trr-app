# PostgreSQL Survey Storage Setup Guide

This guide explains how to configure PostgreSQL storage for TRR surveys and enable the admin survey responses UI.

## Overview

The app has been fully implemented with:
- ✅ PostgreSQL database schema (migrations created)
- ✅ API endpoints for saving and retrieving survey responses
- ✅ Admin UI at `/admin/survey-responses` for viewing and exporting responses
- ✅ Server-side RBAC (role-based access control) with email allowlisting

**Status:** All code is ready. Only environment configuration is needed.

---

## Required Environment Variables

Add these to `apps/web/.env.local`:

### 1. PostgreSQL Database Connection

```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Where to get this:**
- **Neon:** https://neon.tech (Free tier available)
- **Supabase:** https://supabase.com (Includes PostgreSQL)
- **Railway:** https://railway.app
- **Local:** `postgresql://localhost:5432/trr_dev`

### 2. Firebase Admin Service Account

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**How to get this:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `trr-web-25d2e`
3. Click ⚙️ **Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. Download the JSON file
6. **Minify it to a single line** (remove all line breaks)
7. Paste the minified JSON as the value (wrapped in single quotes)

**Example minification:**
```bash
# Original (multi-line):
{
  "type": "service_account",
  "project_id": "my-project"
}

# Minified (single line):
{"type":"service_account","project_id":"my-project"}
```

### 3. Admin Email Allowlist

```bash
ADMIN_EMAIL_ALLOWLIST=your-email@example.com,another-admin@example.com
```

**Important:**
- Comma-separated list of admin emails
- Only users with these emails can access `/admin/survey-responses`
- Leave empty to allow ANY authenticated user (not recommended for production)

---

## Setup Steps

### Step 1: Configure Environment Variables

Edit `apps/web/.env.local` and add the three required variables above.

### Step 2: Run Database Migrations

This creates the PostgreSQL tables for survey responses:

```bash
cd apps/web
DATABASE_URL='your-connection-string' npm run db:migrate
```

**Expected output:**
```
[migrations] Applying 001_create_global_profile_responses.sql
[migrations] Applying 002_create_rhoslc_s6_responses.sql
[migrations] Complete
```

**Tables created:**
- `survey_global_profile_responses` - For Survey X (viewing habits survey)
- `survey_rhoslc_s6_responses` - For RHOSLC Season 6 flashback rankings
- `__migrations` - Migration tracking table

### Step 3: Restart Development Server

```bash
npm run dev
```

### Step 4: Test Survey Submission

1. Go to `/hub/surveys` (Survey X)
2. Fill out and submit the survey
3. Check the console - should see no errors
4. Verify in PostgreSQL that a row was inserted into `survey_global_profile_responses`

### Step 5: Access Admin UI

1. Sign in with an account matching an email in `ADMIN_EMAIL_ALLOWLIST`
2. Navigate to `/admin/survey-responses`
3. You should see:
   - Survey selector dropdown (Global Profile Survey, RHOSLC S6 Flashback Ranking)
   - Date range filters
   - Paginated table of responses
   - "Export CSV" button

---

## Database Schema

### `survey_global_profile_responses`

Common columns (all surveys):
- `id` - UUID primary key
- `created_at` - Timestamp (auto)
- `updated_at` - Timestamp (auto, updates on changes)
- `respondent_id` - External respondent ID (optional)
- `app_user_id` - Firebase UID (required, unique constraint)
- `app_user_email` - User's email
- `source` - Default: `'trr_app'`
- `show_id`, `season_number`, `episode_number` - For episode-specific surveys

Survey-specific columns:
- `view_live_tv_household` - Yes/No
- `view_platforms_subscriptions` - JSON array of platforms
- `view_devices_reality` - JSON array of devices
- `view_bravo_platform_primary` - Primary platform
- `view_hours_week` - Viewing frequency
- `view_binge_style` - Watch mode (live/next-day/binge/mix)
- `view_reality_cowatch` - Who they watch with
- `view_live_chats_social` - Social media engagement
- ...and more (see migration file)

### `survey_rhoslc_s6_responses`

Episode ranking survey columns:
- `season_id`, `episode_id` - Episode identifiers
- `ranking` - JSON array of cast member rankings
- `completion_pct` - Survey completion percentage
- `completed` - Boolean flag
- `client_schema_version`, `client_version` - For versioning

---

## API Endpoints

All endpoints require authentication via Firebase ID token in `Authorization: Bearer <token>` header.

### Survey Submission

**POST** `/api/surveys/global-profile`
- Saves Survey X responses to PostgreSQL
- Called automatically when users submit Survey X
- Returns: `{ ok: true }`

### Admin Endpoints

**GET** `/api/admin/surveys`
- Lists all available surveys
- Returns: `{ surveys: SurveyMetadata[] }`

**GET** `/api/admin/surveys/:surveyKey/responses?page=1&pageSize=25&from=2025-01-01&to=2025-12-31`
- Fetches paginated survey responses with filters
- Query params: `page`, `pageSize`, `from`, `to`, `showId`, `seasonNumber`, `episodeNumber`
- Returns: `{ items: [], total: number, page: number, pageSize: number, columns: [] }`

**GET** `/api/admin/surveys/:surveyKey/responses/:id`
- Fetches a single response by ID
- Returns: `{ item: {...} }`

**GET** `/api/admin/surveys/:surveyKey/export?from=2025-01-01&to=2025-12-31`
- Exports responses to CSV (max 20,000 rows)
- Same filters as responses endpoint
- Returns: CSV file download

---

## Adding New Surveys

To add a new survey (e.g., RHONJ Season 15):

### 1. Create Migration

`apps/web/db/migrations/003_create_rhonj_s15_responses.sql`:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS survey_rhonj_s15_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  respondent_id text,
  app_user_id text NOT NULL,
  app_user_email text,
  source text NOT NULL DEFAULT 'trr_app',
  show_id text,
  season_number integer,
  episode_number integer,
  -- Survey-specific columns here
  favorite_cast_member text,
  drama_rating integer,
  UNIQUE (app_user_id, episode_number)
);

DROP TRIGGER IF EXISTS trg_rhonj_s15_updated_at ON survey_rhonj_s15_responses;
CREATE TRIGGER trg_rhonj_s15_updated_at
BEFORE UPDATE ON survey_rhonj_s15_responses
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

CREATE INDEX IF NOT EXISTS idx_rhonj_s15_created_at ON survey_rhonj_s15_responses (created_at DESC);

COMMIT;
```

### 2. Add Survey Definition

In `apps/web/src/lib/server/surveys/definitions.ts`:

```typescript
{
  key: "rhonj_s15",
  name: "RHONJ S15 Episode Survey",
  description: "Season 15 episode feedback",
  tableName: "survey_rhonj_s15_responses",
  showId: "tt1119958",
  seasonNumber: 15,
  questionColumns: [
    { column: "favorite_cast_member", label: "Favorite Cast Member", type: "text" },
    { column: "drama_rating", label: "Drama Rating", type: "number" },
  ],
  previewColumns: ["favorite_cast_member", "drama_rating"],
  allowShowFilters: true,
  allowEpisodeFilters: true,
  defaultSortColumn: "created_at",
  defaultSortDirection: "desc",
  upsertColumns: ["app_user_id", "episode_number"],
}
```

### 3. Create API Route

`apps/web/src/app/api/surveys/rhonj-s15/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { upsertSurveyResponse } from "@/lib/server/surveys/repository";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const payload = await request.json();

    await upsertSurveyResponse({
      surveyKey: "rhonj_s15",
      appUserId: user.uid,
      appUserEmail: user.email,
      episodeNumber: payload.episodeNumber,
      answers: {
        favorite_cast_member: payload.favoriteCastMember,
        drama_rating: payload.dramaRating,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to save RHONJ S15 response", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

### 4. Run Migration

```bash
DATABASE_URL='your-connection-string' npm run db:migrate
```

The new survey will automatically appear in the admin UI dropdown!

---

## Troubleshooting

### 401 Unauthorized Error

**Symptom:** Survey submission fails with `401 {"error":"unauthorized"}`

**Cause:** `FIREBASE_SERVICE_ACCOUNT` is missing or invalid

**Fix:**
1. Verify `FIREBASE_SERVICE_ACCOUNT` is set in `.env.local`
2. Ensure it's a valid JSON string (check for missing quotes, commas)
3. Restart the dev server after changing env vars

### Database Connection Error

**Symptom:** `DATABASE_URL is not configured`

**Cause:** `DATABASE_URL` is missing from `.env.local`

**Fix:**
1. Add `DATABASE_URL` to `.env.local`
2. Restart the dev server

### Admin UI Shows "Forbidden"

**Symptom:** Redirected to `/hub` when accessing `/admin/survey-responses`

**Cause:** Your email is not in `ADMIN_EMAIL_ALLOWLIST`

**Fix:**
1. Add your email to `ADMIN_EMAIL_ALLOWLIST` in `.env.local`
2. Restart the dev server
3. Sign out and sign back in

### Migration Already Applied

**Symptom:** `Skipping xxx.sql (already applied)`

**Cause:** Migration tracking table shows this migration has run

**Fix:** This is normal. If you need to re-run migrations:
1. Connect to your PostgreSQL database
2. Run: `DELETE FROM __migrations WHERE name = 'xxx.sql';`
3. Re-run: `npm run db:migrate`

---

## Production Deployment

### Environment Variables

Set these in your hosting provider (Vercel, Railway, etc.):

```bash
DATABASE_URL=postgresql://...
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ADMIN_EMAIL_ALLOWLIST=admin@example.com
```

### Run Migrations

**Option 1: Manual (one-time)**
```bash
DATABASE_URL='production-url' npm run db:migrate
```

**Option 2: Automatic (on deploy)**

Add to your CI/CD pipeline or hosting provider's build command:
```bash
npm run db:migrate && npm run build
```

### Security Considerations

- **Never commit `.env.local`** to version control (already in `.gitignore`)
- **Never commit the Firebase service account JSON** to the repo
- Use server-side `ADMIN_EMAIL_ALLOWLIST` (not `NEXT_PUBLIC_ADMIN_EMAILS`)
- Enable SSL for PostgreSQL connections (`?sslmode=require`)
- Use strong passwords for database users
- Rotate service account keys periodically

---

## Support

For issues or questions:
- Check the [Firebase Console](https://console.firebase.google.com/)
- Review database logs in your PostgreSQL provider's dashboard
- Check Next.js dev server logs for detailed error messages
