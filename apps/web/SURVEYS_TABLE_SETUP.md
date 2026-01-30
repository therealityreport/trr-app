# Surveys Table Implementation

This document describes the new `surveys` table that serves as a registry/directory of all surveys in TRR-APP.

## Architecture

### Database Tables

1. **`surveys`** (NEW) - Registry table listing all surveys
   - Source of truth for which surveys exist
   - Contains metadata like title, description, show/season info
   - Located at: `db/migrations/000_create_surveys_table.sql`

2. **Response Tables** (EXISTING) - One table per survey type
   - `survey_global_profile_responses`
   - `survey_rhoslc_s6_responses`
   - `survey_rhop_s10_responses`
   - `survey_x_responses`
   - Each stores actual survey responses with custom schema

### Code Organization

```
apps/web/src/lib/server/surveys/
├── definitions.ts    - Column metadata & UI config (kept for column schemas)
├── repository.ts     - Database queries (NEW: getAllSurveys, getSurveyByKey)
└── fetch.ts          - Combined DB + definitions data (UPDATED to use DB)
```

## Migration Files Created

### 1. `000_create_surveys_table.sql`
Creates the `surveys` table with:
- `id`, `created_at`, `updated_at` (standard fields)
- `key` (TEXT, UNIQUE) - Internal identifier (e.g., "global_profile")
- `title` (TEXT) - Display name
- `description` (TEXT, nullable) - Admin UI description
- `response_table_name` (TEXT) - Points to response table
- `show_id`, `season_number`, `episode_number` (nullable) - Context
- `is_active` (BOOLEAN) - Enable/disable surveys

### 2. `000_seed_surveys.sql`
Seeds initial surveys:
- **global_profile**: Demographics & psychographics survey
- **rhoslc_s6**: RHOSLC Season 6 weekly rankings
- **survey_x**: Viewer habits onboarding survey

## Setup Instructions

1. **Run migrations** (in order):
   ```bash
   pnpm run db:migrate
   ```

   This will:
   - Create the `surveys` table (000_create_surveys_table.sql)
   - Seed initial survey records (000_seed_surveys.sql)
   - Create response tables (001, 002, 003, 004, 005, 006)

2. **Restart dev server** to pick up code changes:
   ```bash
   pnpm run web:dev
   ```

3. **Verify** surveys appear in admin UI:
   - Navigate to `/admin/survey-responses`
   - Should see dropdown with: Global Profile Survey, RHOSLC S6, Survey X

## API Changes

### `GET /api/admin/surveys`
**Before**: Returned hardcoded list from `definitions.ts`

**After**: Queries `surveys` table + merges with column metadata from `definitions.ts`

**Response Format**:
```json
{
  "items": [
    {
      "key": "global_profile",
      "title": "Global Profile Survey",
      "description": "One-time demographics & psychographics profile",
      "tableName": "survey_global_profile_responses",
      "showId": null,
      "seasonNumber": null,
      "previewColumns": ["created_at", "app_user_id", ...],
      "columns": [...],
      "allowShowFilters": false,
      "allowEpisodeFilters": false
    }
  ]
}
```

### Other Admin APIs
- `GET /api/admin/surveys/:surveyKey/responses` - No changes
- `GET /api/admin/surveys/:surveyKey/export` - No changes
- Both still use `getSurveyDefinition()` for column metadata

## Key Functions

### Repository Functions (NEW)
```typescript
// Get all active surveys from DB
getAllSurveys(): Promise<SurveyRecord[]>

// Get specific survey by key
getSurveyByKey(key: string): Promise<SurveyRecord | null>
```

### Fetch Functions (UPDATED)
```typescript
// Now queries DB + merges with definitions
listSurveys(): Promise<SurveyMetadata[]>
```

## Adding New Surveys

To add a new survey to the system:

1. **Create response table migration**:
   ```sql
   -- db/migrations/004_create_my_survey_responses.sql
   CREATE TABLE my_survey_responses (
     -- common fields + survey-specific columns
   );
   ```

2. **Insert into surveys table**:
   ```sql
   INSERT INTO surveys (key, title, description, response_table_name)
   VALUES ('my_survey', 'My Survey', 'Description', 'my_survey_responses');
   ```

3. **Add definition** in `definitions.ts`:
   ```typescript
   {
     key: "my_survey",
     title: "My Survey",
     tableName: "my_survey_responses",
     columns: withCommonColumns([...]),
     previewColumns: [...],
     upsertColumns: ["app_user_id"],
   }
   ```

4. **Run migration**: `pnpm run db:migrate`

The survey will automatically appear in the admin UI!

## Benefits

✅ **Single Source of Truth**: Database controls which surveys exist
✅ **Dynamic Survey List**: Add surveys without deploying code
✅ **Metadata Separation**: DB has registry, definitions.ts has column schemas
✅ **Backward Compatible**: Existing response tables unchanged
✅ **Admin-Friendly**: Can enable/disable surveys via `is_active` flag

## Notes

- The `surveys` table is a **registry**, not a response store
- Each survey still has its own dedicated response table
- `definitions.ts` is kept for column metadata (types, labels, UI config)
- The `key` field links database records to code definitions
