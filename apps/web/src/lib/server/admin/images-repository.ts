import "server-only";

import { query } from "@/lib/server/postgres";

// ============================================================================
// Types
// ============================================================================

export type ImageType = "cast" | "episode" | "season";
export type ReassignMode = "preserve" | "copy";

export type AuditAction =
  | "archive"
  | "unarchive"
  | "delete"
  | "reassign"
  | "copy_reassign";

const TABLE_MAP: Record<ImageType, string> = {
  cast: "cast_photos",
  episode: "episode_images",
  season: "season_images",
};

interface ArchiveParams {
  imageType: ImageType;
  imageId: string;
  adminUid: string;
  reason?: string;
}

interface ReassignParams {
  imageType: ImageType;
  imageId: string;
  toType?: ImageType;
  toEntityId: string;
  mode: ReassignMode;
  adminUid: string;
}

// ============================================================================
// Audit Logging (admin schema - uses raw Postgres)
// ============================================================================

async function logAudit(
  imageType: ImageType,
  imageId: string,
  action: AuditAction,
  adminUid: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO admin.image_audit_log
       (image_type, image_id, action, performed_by_firebase_uid, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [imageType, imageId, action, adminUid, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    // Best-effort. Some environments don't have this table yet.
    const code = (error as { code?: string } | null)?.code;
    if (code !== "42P01" && code !== "3F000") {
      console.warn("[images] Failed to write audit log", error);
    }
  }
}

// ============================================================================
// Image Operations (core schema - uses Supabase TRR Core)
// ============================================================================

/**
 * Archive an image (soft delete).
 * Sets archived_at, archived_by_firebase_uid, and optional reason.
 */
export async function archiveImage(params: ArchiveParams): Promise<void> {
  const { imageType, imageId, adminUid, reason } = params;
  const table = TABLE_MAP[imageType];
  const now = new Date().toISOString();
  const patch = {
    archived: true,
    archived_at: now,
    archived_by_firebase_uid: adminUid,
    archived_reason: reason ?? null,
  };

  await query(
    `UPDATE core.${table}
     SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [imageId, JSON.stringify(patch)]
  );

  await logAudit(imageType, imageId, "archive", adminUid, { reason });
}

/**
 * Unarchive a previously archived image.
 */
export async function unarchiveImage(
  params: Omit<ArchiveParams, "reason">
): Promise<void> {
  const { imageType, imageId, adminUid } = params;
  const table = TABLE_MAP[imageType];
  const patch = {
    archived: false,
    archived_at: null,
    archived_by_firebase_uid: null,
    archived_reason: null,
  };

  await query(
    `UPDATE core.${table}
     SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE id = $1::uuid`,
    [imageId, JSON.stringify(patch)]
  );

  await logAudit(imageType, imageId, "unarchive", adminUid);
}

/**
 * Permanently delete an image.
 * Stores image details in audit log before deletion.
 */
export async function deleteImage(params: {
  imageType: ImageType;
  imageId: string;
  adminUid: string;
}): Promise<void> {
  const { imageType, imageId, adminUid } = params;
  const table = TABLE_MAP[imageType];

  // Get image details before deletion for audit
  const imageResult = await query<Record<string, unknown>>(
    `SELECT *
     FROM core.${table}
     WHERE id = $1::uuid
     LIMIT 1`,
    [imageId]
  );
  const image = imageResult.rows[0] ?? null;

  await query(
    `DELETE FROM core.${table}
     WHERE id = $1::uuid`,
    [imageId]
  );

  await logAudit(imageType, imageId, "delete", adminUid, {
    deletedImage: image,
  });
}

/**
 * Reassign an image to a different entity.
 *
 * If `toType` is different from `imageType`, the image is COPIED to the
 * destination table and the original is archived (copy_reassign).
 *
 * If same type, the entity FK is updated in place (reassign).
 */
export async function reassignImage(params: ReassignParams): Promise<void> {
  const { imageType, imageId, toType, toEntityId, adminUid } = params;
  const sourceTable = TABLE_MAP[imageType];
  const destType = toType ?? imageType;
  const destTable = TABLE_MAP[destType];

  // Get the source image
  const sourceResult = await query<Record<string, unknown>>(
    `SELECT *
     FROM core.${sourceTable}
     WHERE id = $1::uuid
     LIMIT 1`,
    [imageId]
  );
  const sourceImage = sourceResult.rows[0];
  if (!sourceImage) throw new Error("Source image not found");

  const sourceEntityIdColumn = getEntityIdColumn(imageType);
  const fromEntityId = sourceImage[sourceEntityIdColumn];

  // If type is changing, must copy to new table and archive original
  if (destType !== imageType) {
    const destEntityIdColumn = getEntityIdColumn(destType);

    // Build new image record for destination table
    // Remove source-specific fields and set destination entity ID
    const newImage: Record<string, unknown> = {};

    // Copy compatible fields (url, hosted_url, source, caption, etc.)
    const copyFields = [
      "source",
      "url",
      "hosted_url",
      "caption",
      "width",
      "height",
      "metadata",
    ];
    for (const field of copyFields) {
      if (field in sourceImage) {
        newImage[field] = sourceImage[field];
      }
    }
    newImage[destEntityIdColumn] = toEntityId;

    await query(
      `INSERT INTO core.${destTable}
       (source, url, hosted_url, caption, width, height, metadata, ${destEntityIdColumn})
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::uuid)`,
      [
        newImage.source ?? null,
        newImage.url ?? null,
        newImage.hosted_url ?? null,
        newImage.caption ?? null,
        newImage.width ?? null,
        newImage.height ?? null,
        JSON.stringify((newImage.metadata as Record<string, unknown> | null | undefined) ?? null),
        newImage[destEntityIdColumn],
      ]
    );

    // Archive the original
    await archiveImage({
      imageType,
      imageId,
      adminUid,
      reason: `Reassigned to ${destType} ${toEntityId}`,
    });

    await logAudit(imageType, imageId, "copy_reassign", adminUid, {
      fromType: imageType,
      fromEntityId,
      toType: destType,
      toEntityId,
    });
  } else {
    // Same type, just update the entity ID
    const entityIdColumn = getEntityIdColumn(imageType);

    await query(
      `UPDATE core.${sourceTable}
       SET ${entityIdColumn} = $2::uuid,
           updated_at = NOW()
       WHERE id = $1::uuid`,
      [imageId, toEntityId]
    );

    await logAudit(imageType, imageId, "reassign", adminUid, {
      fromEntityId,
      toEntityId,
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getEntityIdColumn(type: ImageType): string {
  switch (type) {
    case "cast":
      return "person_id";
    case "episode":
      return "episode_id";
    case "season":
      return "season_id";
  }
}

/**
 * Get an image by ID and type.
 */
export async function getImage(
  imageType: ImageType,
  imageId: string
): Promise<Record<string, unknown> | null> {
  const table = TABLE_MAP[imageType];

  const result = await query<Record<string, unknown>>(
    `SELECT *
     FROM core.${table}
     WHERE id = $1::uuid
     LIMIT 1`,
    [imageId]
  );
  return result.rows[0] ?? null;
}
