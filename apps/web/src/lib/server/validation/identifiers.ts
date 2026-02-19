export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_RE = /^\d+$/;

export const isValidUuid = (value: string | null | undefined): value is string => {
  if (typeof value !== "string") return false;
  return UUID_RE.test(value.trim());
};

export const isValidPositiveIntegerString = (
  value: string | null | undefined,
): value is string => {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!INTEGER_RE.test(normalized)) return false;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0;
};

export const isValidNonNegativeIntegerString = (
  value: string | null | undefined,
): value is string => {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!INTEGER_RE.test(normalized)) return false;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed >= 0;
};
