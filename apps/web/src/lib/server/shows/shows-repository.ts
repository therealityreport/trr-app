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
}

export interface ShowRecord {
  id: string;
  key: string;
  title: string;
  short_title: string | null;
  network: string | null;
  status: string | null;
  logline: string | null;
  palette: ShowPalette | null;
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
  shortTitle?: string | null;
  network?: string | null;
  status?: string | null;
  logline?: string | null;
  palette?: ShowPalette | null;
  iconUrl?: string | null;
  wordmarkUrl?: string | null;
  heroUrl?: string | null;
  tags?: string[];
}

export interface UpdateShowInput {
  title?: string;
  shortTitle?: string | null;
  network?: string | null;
  status?: string | null;
  logline?: string | null;
  palette?: ShowPalette | null;
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
// Show Functions
// ============================================================================

export async function getAllShows(): Promise<ShowRecord[]> {
  const result = await query<ShowRecord>(
    `SELECT
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    ORDER BY title ASC`
  );
  return result.rows.map(parseShowJsonFields);
}

export async function getActiveShows(): Promise<ShowRecord[]> {
  const result = await query<ShowRecord>(
    `SELECT
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE is_active = true
    ORDER BY title ASC`
  );
  return result.rows.map(parseShowJsonFields);
}

export async function getShowByKey(key: string): Promise<ShowRecord | null> {
  const result = await query<ShowRecord>(
    `SELECT
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE key = $1`,
    [key]
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function getShowById(id: string): Promise<ShowRecord | null> {
  const result = await query<ShowRecord>(
    `SELECT
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at
    FROM survey_shows
    WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function createShow(input: CreateShowInput): Promise<ShowRecord> {
  const result = await query<ShowRecord>(
    `INSERT INTO survey_shows (
      key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at`,
    [
      input.key,
      input.title,
      input.shortTitle ?? null,
      input.network ?? null,
      input.status ?? null,
      input.logline ?? null,
      input.palette ? JSON.stringify(input.palette) : null,
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
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
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
      id, key, title, short_title, network, status, logline,
      palette, icon_url, wordmark_url, hero_url, tags, is_active,
      created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? parseShowJsonFields(row) : null;
}

export async function deleteShow(key: string): Promise<boolean> {
  const result = await query(`DELETE FROM survey_shows WHERE key = $1`, [key]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// Season Functions
// ============================================================================

export async function getSeasonsByShowKey(showKey: string): Promise<ShowSeasonRecord[]> {
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
// Helpers
// ============================================================================

function parseShowJsonFields(row: ShowRecord): ShowRecord {
  return {
    ...row,
    palette: typeof row.palette === "string" ? JSON.parse(row.palette) : row.palette,
  };
}

function parseSeasonJsonFields(row: ShowSeasonRecord): ShowSeasonRecord {
  return {
    ...row,
    colors: typeof row.colors === "string" ? JSON.parse(row.colors) : row.colors,
    cast_members: typeof row.cast_members === "string" ? JSON.parse(row.cast_members) : row.cast_members,
  };
}
