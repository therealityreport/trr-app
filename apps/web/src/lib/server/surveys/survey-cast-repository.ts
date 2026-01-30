import "server-only";
import { query, withTransaction } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export type CastStatus = "main" | "friend" | "new" | "alum";

export interface SurveyCastRecord {
  id: string;
  survey_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  role: string | null;
  status: CastStatus | null;
  instagram: string | null;
  display_order: number;
  is_alumni: boolean;
  alumni_verdict_enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateCastMemberInput {
  surveyId: string;
  name: string;
  slug?: string;
  imageUrl?: string | null;
  role?: string | null;
  status?: CastStatus | null;
  instagram?: string | null;
  displayOrder?: number;
  isAlumni?: boolean;
  alumniVerdictEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateCastMemberInput {
  name?: string;
  slug?: string;
  imageUrl?: string | null;
  role?: string | null;
  status?: CastStatus | null;
  instagram?: string | null;
  displayOrder?: number;
  isAlumni?: boolean;
  alumniVerdictEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Repository Functions
// ============================================================================

/**
 * Get all cast members for a survey, ordered by display_order
 */
export async function getCastBySurveyId(surveyId: string): Promise<SurveyCastRecord[]> {
  const result = await query<SurveyCastRecord>(
    `SELECT
      id, survey_id, name, slug, image_url, role, status, instagram,
      display_order, is_alumni, alumni_verdict_enabled, metadata,
      created_at, updated_at
    FROM survey_cast
    WHERE survey_id = $1
    ORDER BY display_order ASC, name ASC`,
    [surveyId]
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get all cast members for a survey by survey key
 */
export async function getCastBySurveyKey(surveyKey: string): Promise<SurveyCastRecord[]> {
  const result = await query<SurveyCastRecord>(
    `SELECT
      sc.id, sc.survey_id, sc.name, sc.slug, sc.image_url, sc.role, sc.status, sc.instagram,
      sc.display_order, sc.is_alumni, sc.alumni_verdict_enabled, sc.metadata,
      sc.created_at, sc.updated_at
    FROM survey_cast sc
    INNER JOIN surveys s ON s.id = sc.survey_id
    WHERE s.key = $1
    ORDER BY sc.display_order ASC, sc.name ASC`,
    [surveyKey]
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get active cast members (non-alumni) for a survey
 */
export async function getActiveCastBySurveyKey(surveyKey: string): Promise<SurveyCastRecord[]> {
  const result = await query<SurveyCastRecord>(
    `SELECT
      sc.id, sc.survey_id, sc.name, sc.slug, sc.image_url, sc.role, sc.status, sc.instagram,
      sc.display_order, sc.is_alumni, sc.alumni_verdict_enabled, sc.metadata,
      sc.created_at, sc.updated_at
    FROM survey_cast sc
    INNER JOIN surveys s ON s.id = sc.survey_id
    WHERE s.key = $1 AND sc.is_alumni = false
    ORDER BY sc.display_order ASC, sc.name ASC`,
    [surveyKey]
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get alumni cast members for a survey (for ex-wife verdicts)
 */
export async function getAlumniCastBySurveyKey(surveyKey: string): Promise<SurveyCastRecord[]> {
  const result = await query<SurveyCastRecord>(
    `SELECT
      sc.id, sc.survey_id, sc.name, sc.slug, sc.image_url, sc.role, sc.status, sc.instagram,
      sc.display_order, sc.is_alumni, sc.alumni_verdict_enabled, sc.metadata,
      sc.created_at, sc.updated_at
    FROM survey_cast sc
    INNER JOIN surveys s ON s.id = sc.survey_id
    WHERE s.key = $1 AND sc.is_alumni = true AND sc.alumni_verdict_enabled = true
    ORDER BY sc.display_order ASC, sc.name ASC`,
    [surveyKey]
  );
  return result.rows.map(parseJsonFields);
}

/**
 * Get a single cast member by ID
 */
export async function getCastMemberById(id: string): Promise<SurveyCastRecord | null> {
  const result = await query<SurveyCastRecord>(
    `SELECT
      id, survey_id, name, slug, image_url, role, status, instagram,
      display_order, is_alumni, alumni_verdict_enabled, metadata,
      created_at, updated_at
    FROM survey_cast
    WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? parseJsonFields(row) : null;
}

/**
 * Create a new cast member
 */
export async function createCastMember(input: CreateCastMemberInput): Promise<SurveyCastRecord> {
  const slug = input.slug ?? generateSlug(input.name);

  // Get next display order if not provided
  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const maxResult = await query<{ max: number | null }>(
      `SELECT MAX(display_order) as max FROM survey_cast WHERE survey_id = $1`,
      [input.surveyId]
    );
    displayOrder = (maxResult.rows[0]?.max ?? -1) + 1;
  }

  const result = await query<SurveyCastRecord>(
    `INSERT INTO survey_cast (
      survey_id, name, slug, image_url, role, status, instagram,
      display_order, is_alumni, alumni_verdict_enabled, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING
      id, survey_id, name, slug, image_url, role, status, instagram,
      display_order, is_alumni, alumni_verdict_enabled, metadata,
      created_at, updated_at`,
    [
      input.surveyId,
      input.name,
      slug,
      input.imageUrl ?? null,
      input.role ?? null,
      input.status ?? null,
      input.instagram ?? null,
      displayOrder,
      input.isAlumni ?? false,
      input.alumniVerdictEnabled ?? false,
      input.metadata ? JSON.stringify(input.metadata) : "{}",
    ]
  );
  return parseJsonFields(result.rows[0]);
}

/**
 * Update an existing cast member
 */
export async function updateCastMember(
  id: string,
  input: UpdateCastMemberInput
): Promise<SurveyCastRecord | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(input.slug);
  }
  if (input.imageUrl !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    values.push(input.imageUrl);
  }
  if (input.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }
  if (input.instagram !== undefined) {
    updates.push(`instagram = $${paramIndex++}`);
    values.push(input.instagram);
  }
  if (input.displayOrder !== undefined) {
    updates.push(`display_order = $${paramIndex++}`);
    values.push(input.displayOrder);
  }
  if (input.isAlumni !== undefined) {
    updates.push(`is_alumni = $${paramIndex++}`);
    values.push(input.isAlumni);
  }
  if (input.alumniVerdictEnabled !== undefined) {
    updates.push(`alumni_verdict_enabled = $${paramIndex++}`);
    values.push(input.alumniVerdictEnabled);
  }
  if (input.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex++}`);
    values.push(JSON.stringify(input.metadata));
  }

  if (updates.length === 0) {
    return getCastMemberById(id);
  }

  values.push(id);
  const result = await query<SurveyCastRecord>(
    `UPDATE survey_cast
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING
      id, survey_id, name, slug, image_url, role, status, instagram,
      display_order, is_alumni, alumni_verdict_enabled, metadata,
      created_at, updated_at`,
    values
  );
  const row = result.rows[0];
  return row ? parseJsonFields(row) : null;
}

/**
 * Delete a cast member
 */
export async function deleteCastMember(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM survey_cast WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Reorder cast members for a survey
 * @param surveyId The survey ID
 * @param orderedIds Array of cast member IDs in the desired order
 */
export async function reorderCastMembers(
  surveyId: string,
  orderedIds: string[]
): Promise<void> {
  await withTransaction(async (client) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        `UPDATE survey_cast SET display_order = $1 WHERE id = $2 AND survey_id = $3`,
        [i, orderedIds[i], surveyId]
      );
    }
  });
}

/**
 * Bulk create cast members for a survey (useful for seeding)
 */
export async function bulkCreateCastMembers(
  surveyId: string,
  members: Omit<CreateCastMemberInput, "surveyId">[]
): Promise<SurveyCastRecord[]> {
  const results: SurveyCastRecord[] = [];
  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const created = await createCastMember({
      ...member,
      surveyId,
      displayOrder: member.displayOrder ?? i,
    });
    results.push(created);
  }
  return results;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse JSONB fields from database row
 */
function parseJsonFields(row: SurveyCastRecord): SurveyCastRecord {
  return {
    ...row,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata ?? {}),
  };
}
