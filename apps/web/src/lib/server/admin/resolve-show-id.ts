import "server-only";

import { resolveShowSlug } from "@/lib/server/trr-api/trr-shows-repository";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuidLike = (value: string | null | undefined): boolean => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 && UUID_RE.test(normalized);
};

export const resolveAdminShowId = async (
  showIdOrSlug: string | null | undefined
): Promise<string | null> => {
  const normalized = typeof showIdOrSlug === "string" ? showIdOrSlug.trim() : "";
  if (!normalized) return null;
  if (isUuidLike(normalized)) return normalized;

  try {
    const resolved = await resolveShowSlug(normalized);
    if (!resolved?.show_id || !isUuidLike(resolved.show_id)) return null;
    return resolved.show_id;
  } catch {
    return null;
  }
};
