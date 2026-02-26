import "server-only";
import { query } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export interface ShowPalette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
}

export interface SeasonColors {
  primary: string;
  accent: string;
  neutral: string;
}

export interface CastAsset {
  name: string;
  image: string;
  role?: string;
  instagram?: string;
  status?: "main" | "friend" | "new" | "alum";
  trrPersonId?: string;
  sourceUrl?: string;
}

export type PaletteLibrarySourceType = "upload" | "url" | "media_library";

export interface PaletteSamplePoint {
  x: number;
  y: number;
  radius: number;
}

export interface PaletteLibraryEntryRecord {
  id: string;
  trr_show_id: string;
  season_number: number | null;
  name: string;
  colors: string[];
  source_type: PaletteLibrarySourceType;
  source_image_url: string | null;
  seed: number;
  marker_points: PaletteSamplePoint[];
  created_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaletteLibraryEntryInput {
  trrShowId: string;
  seasonNumber: number | null;
  name: string;
  colors: string[];
  sourceType: PaletteLibrarySourceType;
  sourceImageUrl?: string | null;
  seed: number;
  markerPoints: PaletteSamplePoint[];
  createdByUid?: string | null;
}

export interface ListPaletteLibraryEntriesOptions {
  seasonNumber?: number | null;
  includeAllSeasonEntries?: boolean;
}

export interface ShowRecord {
  id: string;
  key: string;
  trr_show_id: string | null;
  title: string;
  short_title: string | null;
  network: string | null;
  status: string | null;
  logline: string | null;
  palette: ShowPalette | null;
  fonts: Record<string, unknown>;
  icon_url: string | null;
  wordmark_url: string | null;
  hero_url: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShowSeasonRecord {
  id: string;
  show_id: string;
  season_number: number;
  label: string;
  year: string | null;
  description: string | null;
  colors: SeasonColors | null;
  show_icon_url: string | null;
  wordmark_url: string | null;
  hero_url: string | null;
  cast_members: CastAsset[];
  notes: string[];
  is_active: boolean;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShowInput {
  key: string;
  title: string;
  trrShowId?: string | null;
  shortTitle?: string | null;
  network?: string | null;
  status?: string | null;
  logline?: string | null;
  palette?: ShowPalette | null;
  fonts?: Record<string, unknown> | null;
  iconUrl?: string | null;
  wordmarkUrl?: string | null;
  heroUrl?: string | null;
  tags?: string[];
}

export interface UpdateShowInput {
  title?: string;
  trrShowId?: string | null;
  shortTitle?: string | null;
  network?: string | null;
  status?: string | null;
  logline?: string | null;
  palette?: ShowPalette | null;
  fonts?: Record<string, unknown> | null;
  iconUrl?: string | null;
  wordmarkUrl?: string | null;
  heroUrl?: string | null;
  tags?: string[];
  isActive?: boolean;
}

export interface CreateSeasonInput {
  showId: string;
  seasonNumber: number;
  label: string;
  year?: string | null;
  description?: string | null;
  colors?: SeasonColors | null;
  showIconUrl?: string | null;
  wordmarkUrl?: string | null;
  heroUrl?: string | null;
  castMembers?: CastAsset[];
  notes?: string[];
}

export interface UpdateSeasonInput {
  label?: string;
  year?: string | null;
  description?: string | null;
  colors?: SeasonColors | null;
  showIconUrl?: string | null;
  wordmarkUrl?: string | null;
  heroUrl?: string | null;
  castMembers?: CastAsset[];
  notes?: string[];
  isActive?: boolean;
  isCurrent?: boolean;
}

// ============================================================================
// Schema Safety
// ============================================================================

let surveyShowsSchemaEnsured = false;
let surveyShowsSchemaEnsuring: Promise<void> | null = null;
let paletteLibrarySchemaEnsured = false;
let paletteLibrarySchemaEnsuring: Promise<void> | null = null;

async function ensureSurveyShowsSchema(): Promise<void> {
  if (surveyShowsSchemaEnsured) return;
  if (surveyShowsSchemaEnsuring) return surveyShowsSchemaEnsuring;

  // Some environments may be missing later migrations (e.g. `trr_show_id`, `fonts`).
  // These ALTERs are idempotent and keep admin Brand Assets screens functional.
  surveyShowsSchemaEnsuring = (async () => {
    await query(`ALTER TABLE survey_shows ADD COLUMN IF NOT EXISTS trr_show_id uuid;`);
    await query(
      `ALTER TABLE survey_shows ADD COLUMN IF NOT EXISTS fonts jsonb NOT NULL DEFAULT '{}'::jsonb;`
    );
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_shows_trr_show_id_unique
       ON survey_shows (trr_show_id)
       WHERE trr_show_id IS NOT NULL;`
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_survey_shows_trr_show_id
       ON survey_shows (trr_show_id);`
    );
    surveyShowsSchemaEnsured = true;
    surveyShowsSchemaEnsuring = null;
  })();

  return surveyShowsSchemaEnsuring;
}

async function ensurePaletteLibrarySchema(): Promise<void> {
  if (paletteLibrarySchemaEnsured) return;
  if (paletteLibrarySchemaEnsuring) return paletteLibrarySchemaEnsuring;

  paletteLibrarySchemaEnsuring = (async () => {
    await query(
      `CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = now();
         RETURN NEW;
       END;
       $$ LANGUAGE plpgsql;`,
    );
    await query(
      `CREATE TABLE IF NOT EXISTS survey_show_palette_library (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trr_show_id uuid NOT NULL,
        season_number integer,
        name text NOT NULL,
        colors jsonb NOT NULL DEFAULT '[]'::jsonb,
        source_type text NOT NULL,
        source_image_url text,
        seed integer NOT NULL,
        marker_points jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by_uid text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT survey_show_palette_library_season_number_valid
          CHECK (season_number IS NULL OR season_number > 0),
        CONSTRAINT survey_show_palette_library_source_type_valid
          CHECK (source_type IN ('upload', 'url', 'media_library'))
      )`,
    );
    await query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_show_palette_library_name_scope
       ON survey_show_palette_library (trr_show_id, COALESCE(season_number, -1), lower(name))`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_survey_show_palette_library_show
       ON survey_show_palette_library (trr_show_id)`,
    );
    await query(
      `CREATE INDEX IF NOT EXISTS idx_survey_show_palette_library_show_season
       ON survey_show_palette_library (trr_show_id, season_number)`,
    );
    await query(
      `DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1
           FROM pg_trigger
           WHERE tgname = 'trg_survey_show_palette_library_updated_at'
         ) THEN
           CREATE TRIGGER trg_survey_show_palette_library_updated_at
           BEFORE UPDATE ON survey_show_palette_library
           FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
         END IF;
       END $$;`,
    );

    paletteLibrarySchemaEnsured = true;
    paletteLibrarySchemaEnsuring = null;
  })();

  return paletteLibrarySchemaEnsuring;
}

// ============================================================================
// Show Functions
// ============================================================================

export async function getAllShows(): Promise<ShowRecord[]> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `SELECT
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    ORDER BY title ASC`
  );
  return result.rows.map(parseShowJsonFields);
}

export async function getActiveShows(): Promise<ShowRecord[]> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `SELECT
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE is_active = true
    ORDER BY title ASC`
  );
  return result.rows.map(parseShowJsonFields);
}

export async function getShowByKey(key: string): Promise<ShowRecord | null> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `SELECT
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE key = $1`,
    [key]
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function getShowById(id: string): Promise<ShowRecord | null> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `SELECT
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function getShowByTrrShowId(trrShowId: string): Promise<ShowRecord | null> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `SELECT
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE trr_show_id = $1`,
    [trrShowId]
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function createShow(input: CreateShowInput): Promise<ShowRecord> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowRecord>(
    `INSERT INTO survey_shows (
      key, title, short_title, network, status, logline,
      trr_show_id, palette, fonts, icon_url, wordmark_url, hero_url, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at`,
    [
      input.key,
      input.title,
      input.shortTitle ?? null,
      input.network ?? null,
      input.status ?? null,
      input.logline ?? null,
      input.trrShowId ?? null,
      input.palette ? JSON.stringify(input.palette) : null,
      JSON.stringify(input.fonts ?? {}),
      input.iconUrl ?? null,
      input.wordmarkUrl ?? null,
      input.heroUrl ?? null,
      input.tags ?? [],
    ]
  );
  return parseShowJsonFields(result.rows[0]);
}

export async function updateShowByKey(
  key: string,
  input: UpdateShowInput
): Promise<ShowRecord | null> {
  await ensureSurveyShowsSchema();
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.trrShowId !== undefined) {
    updates.push(`trr_show_id = $${paramIndex++}`);
    values.push(input.trrShowId);
  }
  if (input.shortTitle !== undefined) {
    updates.push(`short_title = $${paramIndex++}`);
    values.push(input.shortTitle);
  }
  if (input.network !== undefined) {
    updates.push(`network = $${paramIndex++}`);
    values.push(input.network);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }
  if (input.logline !== undefined) {
    updates.push(`logline = $${paramIndex++}`);
    values.push(input.logline);
  }
  if (input.palette !== undefined) {
    updates.push(`palette = $${paramIndex++}`);
    values.push(input.palette ? JSON.stringify(input.palette) : null);
  }
  if (input.fonts !== undefined) {
    updates.push(`fonts = $${paramIndex++}`);
    values.push(JSON.stringify(input.fonts ?? {}));
  }
  if (input.iconUrl !== undefined) {
    updates.push(`icon_url = $${paramIndex++}`);
    values.push(input.iconUrl);
  }
  if (input.wordmarkUrl !== undefined) {
    updates.push(`wordmark_url = $${paramIndex++}`);
    values.push(input.wordmarkUrl);
  }
  if (input.heroUrl !== undefined) {
    updates.push(`hero_url = $${paramIndex++}`);
    values.push(input.heroUrl);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(input.tags);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }

  if (updates.length === 0) {
    return getShowByKey(key);
  }

  values.push(key);
  const result = await query<ShowRecord>(
    `UPDATE survey_shows
    SET ${updates.join(", ")}
    WHERE key = $${paramIndex}
    RETURNING
      id, key, trr_show_id, title, short_title, network, status, logline,
      palette, fonts, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function deleteShow(key: string): Promise<boolean> {
  await ensureSurveyShowsSchema();
  const result = await query(`DELETE FROM survey_shows WHERE key = $1`, [key]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// Season Functions
// ============================================================================

export async function getSeasonsByShowKey(showKey: string): Promise<ShowSeasonRecord[]> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowSeasonRecord>(
    `SELECT
      ss.id, ss.show_id, ss.season_number, ss.label, ss.year, ss.description,
      ss.colors, ss.show_icon_url, ss.wordmark_url, ss.hero_url,
      ss.cast_members, ss.notes, ss.is_active, ss.is_current,
      ss.created_at, ss.updated_at
    FROM survey_show_seasons ss
    JOIN survey_shows s ON ss.show_id = s.id
    WHERE s.key = $1
    ORDER BY ss.season_number DESC`,
    [showKey]
  );
  return result.rows.map(parseSeasonJsonFields);
}

export async function getSeasonsByShowId(showId: string): Promise<ShowSeasonRecord[]> {
  const result = await query<ShowSeasonRecord>(
    `SELECT
      id, show_id, season_number, label, year, description,
      colors, show_icon_url, wordmark_url, hero_url,
      cast_members, notes, is_active, is_current,
      created_at, updated_at
    FROM survey_show_seasons
    WHERE show_id = $1
    ORDER BY season_number DESC`,
    [showId]
  );
  return result.rows.map(parseSeasonJsonFields);
}

export async function getSeasonById(id: string): Promise<ShowSeasonRecord | null> {
  const result = await query<ShowSeasonRecord>(
    `SELECT
      id, show_id, season_number, label, year, description,
      colors, show_icon_url, wordmark_url, hero_url,
      cast_members, notes, is_active, is_current,
      created_at, updated_at
    FROM survey_show_seasons
    WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? parseSeasonJsonFields(row) : null;
}

export async function getCurrentSeason(showKey: string): Promise<ShowSeasonRecord | null> {
  await ensureSurveyShowsSchema();
  const result = await query<ShowSeasonRecord>(
    `SELECT
      ss.id, ss.show_id, ss.season_number, ss.label, ss.year, ss.description,
      ss.colors, ss.show_icon_url, ss.wordmark_url, ss.hero_url,
      ss.cast_members, ss.notes, ss.is_active, ss.is_current,
      ss.created_at, ss.updated_at
    FROM survey_show_seasons ss
    JOIN survey_shows s ON ss.show_id = s.id
    WHERE s.key = $1 AND ss.is_current = true`,
    [showKey]
  );
  const row = result.rows[0];
  return row ? parseSeasonJsonFields(row) : null;
}

export async function createSeason(input: CreateSeasonInput): Promise<ShowSeasonRecord> {
  const result = await query<ShowSeasonRecord>(
    `INSERT INTO survey_show_seasons (
      show_id, season_number, label, year, description,
      colors, show_icon_url, wordmark_url, hero_url, cast_members, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id, show_id, season_number, label, year, description,
      colors, show_icon_url, wordmark_url, hero_url,
      cast_members, notes, is_active, is_current,
      created_at, updated_at`,
    [
      input.showId,
      input.seasonNumber,
      input.label,
      input.year ?? null,
      input.description ?? null,
      input.colors ? JSON.stringify(input.colors) : null,
      input.showIconUrl ?? null,
      input.wordmarkUrl ?? null,
      input.heroUrl ?? null,
      JSON.stringify(input.castMembers ?? []),
      input.notes ?? [],
    ]
  );
  return parseSeasonJsonFields(result.rows[0]);
}

export async function updateSeasonById(
  id: string,
  input: UpdateSeasonInput
): Promise<ShowSeasonRecord | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.label !== undefined) {
    updates.push(`label = $${paramIndex++}`);
    values.push(input.label);
  }
  if (input.year !== undefined) {
    updates.push(`year = $${paramIndex++}`);
    values.push(input.year);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.colors !== undefined) {
    updates.push(`colors = $${paramIndex++}`);
    values.push(input.colors ? JSON.stringify(input.colors) : null);
  }
  if (input.showIconUrl !== undefined) {
    updates.push(`show_icon_url = $${paramIndex++}`);
    values.push(input.showIconUrl);
  }
  if (input.wordmarkUrl !== undefined) {
    updates.push(`wordmark_url = $${paramIndex++}`);
    values.push(input.wordmarkUrl);
  }
  if (input.heroUrl !== undefined) {
    updates.push(`hero_url = $${paramIndex++}`);
    values.push(input.heroUrl);
  }
  if (input.castMembers !== undefined) {
    updates.push(`cast_members = $${paramIndex++}`);
    values.push(JSON.stringify(input.castMembers));
  }
  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(input.notes);
  }
  if (input.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(input.isActive);
  }
  if (input.isCurrent !== undefined) {
    updates.push(`is_current = $${paramIndex++}`);
    values.push(input.isCurrent);
  }

  if (updates.length === 0) {
    return getSeasonById(id);
  }

  values.push(id);
  const result = await query<ShowSeasonRecord>(
    `UPDATE survey_show_seasons
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, show_id, season_number, label, year, description,
      colors, show_icon_url, wordmark_url, hero_url,
      cast_members, notes, is_active, is_current,
      created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? parseSeasonJsonFields(row) : null;
}

export async function setCurrentSeason(showId: string, seasonId: string): Promise<ShowSeasonRecord | null> {
  // Clear current flag from all seasons for this show
  await query(
    `UPDATE survey_show_seasons SET is_current = false WHERE show_id = $1`,
    [showId]
  );

  // Set the new current season
  return updateSeasonById(seasonId, { isCurrent: true });
}

export async function deleteSeason(id: string): Promise<boolean> {
  const result = await query(`DELETE FROM survey_show_seasons WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// Palette Library Functions
// ============================================================================

export async function listPaletteLibraryEntriesByShow(
  trrShowId: string,
  options: ListPaletteLibraryEntriesOptions = {},
): Promise<PaletteLibraryEntryRecord[]> {
  await ensurePaletteLibrarySchema();

  const includeAllSeasonEntries = options.includeAllSeasonEntries ?? true;
  const seasonNumber = options.seasonNumber;

  if (seasonNumber === undefined) {
    const result = await query<PaletteLibraryEntryRecord>(
      `SELECT
         id, trr_show_id, season_number, name, colors, source_type, source_image_url,
         seed, marker_points, created_by_uid, created_at, updated_at
       FROM survey_show_palette_library
       WHERE trr_show_id = $1
       ORDER BY lower(name) ASC, created_at DESC`,
      [trrShowId],
    );
    return result.rows.map(parsePaletteLibraryJsonFields);
  }

  if (seasonNumber === null) {
    const result = await query<PaletteLibraryEntryRecord>(
      `SELECT
         id, trr_show_id, season_number, name, colors, source_type, source_image_url,
         seed, marker_points, created_by_uid, created_at, updated_at
       FROM survey_show_palette_library
       WHERE trr_show_id = $1 AND season_number IS NULL
       ORDER BY lower(name) ASC, created_at DESC`,
      [trrShowId],
    );
    return result.rows.map(parsePaletteLibraryJsonFields);
  }

  const result = await query<PaletteLibraryEntryRecord>(
    `SELECT
       id, trr_show_id, season_number, name, colors, source_type, source_image_url,
       seed, marker_points, created_by_uid, created_at, updated_at
     FROM survey_show_palette_library
     WHERE trr_show_id = $1
       AND (
         season_number = $2
         OR ($3::boolean = true AND season_number IS NULL)
       )
     ORDER BY season_number NULLS LAST, lower(name) ASC, created_at DESC`,
    [trrShowId, seasonNumber, includeAllSeasonEntries],
  );
  return result.rows.map(parsePaletteLibraryJsonFields);
}

export async function createPaletteLibraryEntry(
  input: CreatePaletteLibraryEntryInput,
): Promise<PaletteLibraryEntryRecord> {
  await ensurePaletteLibrarySchema();
  const result = await query<PaletteLibraryEntryRecord>(
    `INSERT INTO survey_show_palette_library (
       trr_show_id, season_number, name, colors, source_type, source_image_url, seed, marker_points, created_by_uid
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9)
     RETURNING
       id, trr_show_id, season_number, name, colors, source_type, source_image_url,
       seed, marker_points, created_by_uid, created_at, updated_at`,
    [
      input.trrShowId,
      input.seasonNumber,
      input.name,
      JSON.stringify(input.colors),
      input.sourceType,
      input.sourceImageUrl ?? null,
      input.seed,
      JSON.stringify(input.markerPoints),
      input.createdByUid ?? null,
    ],
  );

  return parsePaletteLibraryJsonFields(result.rows[0]);
}

export async function deletePaletteLibraryEntryById(id: string): Promise<boolean> {
  await ensurePaletteLibrarySchema();
  const result = await query(`DELETE FROM survey_show_palette_library WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// Helpers
// ============================================================================

function parseShowJsonFields(row: ShowRecord): ShowRecord {
  const nextFontsRaw = (row as unknown as { fonts?: unknown }).fonts;

  return {
    ...row,
    palette: typeof row.palette === "string" ? JSON.parse(row.palette) : row.palette,
    fonts:
      typeof nextFontsRaw === "string"
        ? JSON.parse(nextFontsRaw)
        : (nextFontsRaw as Record<string, unknown> | null) ?? {},
  };
}

function parseSeasonJsonFields(row: ShowSeasonRecord): ShowSeasonRecord {
  return {
    ...row,
    colors: typeof row.colors === "string" ? JSON.parse(row.colors) : row.colors,
    cast_members: typeof row.cast_members === "string" ? JSON.parse(row.cast_members) : row.cast_members,
  };
}

function parsePaletteLibraryJsonFields(row: PaletteLibraryEntryRecord): PaletteLibraryEntryRecord {
  const rowWithUnknownJson = row as unknown as {
    colors?: unknown;
    marker_points?: unknown;
  };
  return {
    ...row,
    colors:
      typeof rowWithUnknownJson.colors === "string"
        ? (JSON.parse(rowWithUnknownJson.colors) as string[])
        : ((rowWithUnknownJson.colors as string[] | null) ?? []),
    marker_points:
      typeof rowWithUnknownJson.marker_points === "string"
        ? (JSON.parse(rowWithUnknownJson.marker_points) as PaletteSamplePoint[])
        : ((rowWithUnknownJson.marker_points as PaletteSamplePoint[] | null) ?? []),
  };
}
