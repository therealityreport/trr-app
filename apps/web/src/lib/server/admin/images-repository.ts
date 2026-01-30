import "server-only";

import { getSupabaseTrrCore } from "@/lib/server/supabase-trr-core";
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
  await query(
    `INSERT INTO admin.image_audit_log
     (image_type, image_id, action, performed_by_firebase_uid, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [imageType, imageId, action, adminUid, details ? JSON.stringify(details) : null]
  );
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
  const supabase = getSupabaseTrrCore();
  const table = TABLE_MAP[imageType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any)
    .update({
      archived_at: new Date().toISOString(),
      archived_by_firebase_uid: adminUid,
      archived_reason: reason ?? null,
    })
    .eq("id", imageId);

  if (error) throw new Error(`Failed to archive image: ${error.message}`);

  await logAudit(imageType, imageId, "archive", adminUid, { reason });
}

/**
 * Unarchive a previously archived image.
 */
export async function unarchiveImage(
  params: Omit<ArchiveParams, "reason">
): Promise<void> {
  const { imageType, imageId, adminUid } = params;
  const supabase = getSupabaseTrrCore();
  const table = TABLE_MAP[imageType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any)
    .update({
      archived_at: null,
      archived_by_firebase_uid: null,
      archived_reason: null,
    })
    .eq("id", imageId);

  if (error) throw new Error(`Failed to unarchive image: ${error.message}`);

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
  const supabase = getSupabaseTrrCore();
  const table = TABLE_MAP[imageType];

  // Get image details before deletion for audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: image } = await (supabase.from(table) as any)
    .select("*")
    .eq("id", imageId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).delete().eq("id", imageId);

  if (error) throw new Error(`Failed to delete image: ${error.message}`);

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
  const supabase = getSupabaseTrrCore();
  const sourceTable = TABLE_MAP[imageType];
  const destType = toType ?? imageType;
  const destTable = TABLE_MAP[destType];

  // Get the source image
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sourceImage, error: fetchError } = await (supabase.from(sourceTable) as any)
    .select("*")
    .eq("id", imageId)
    .single();

  if (fetchError || !sourceImage) {
    throw new Error("Source image not found");
  }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from(destTable) as any)
      .insert(newImage);

    if (insertError)
      throw new Error(`Failed to copy image: ${insertError.message}`);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from(sourceTable) as any)
      .update({ [entityIdColumn]: toEntityId })
      .eq("id", imageId);

    if (updateError)
      throw new Error(`Failed to reassign image: ${updateError.message}`);

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
  const supabase = getSupabaseTrrCore();
  const table = TABLE_MAP[imageType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table) as any)
    .select("*")
    .eq("id", imageId)
    .single();

  if (error) return null;
  return data;
}
