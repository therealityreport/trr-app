export type ScopedRequestIdPart = {
  prefix?: string;
  value: unknown;
  fallback?: string;
};

export function sanitizeAdminRequestIdToken(
  value: unknown,
  fallback = "unknown",
): string {
  const cleaned = String(value ?? fallback)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return cleaned || fallback;
}

export function buildScopedAdminRequestId({
  prefix,
  counter,
  parts,
  now = Date.now(),
}: {
  prefix: string;
  counter: number;
  parts: ScopedRequestIdPart[];
  now?: number;
}): string {
  const timestampToken = now.toString(36);
  const scopedParts = parts.map(({ prefix: partPrefix = "", value, fallback }) => {
    return `${partPrefix}${sanitizeAdminRequestIdToken(value, fallback)}`;
  });
  return [prefix, ...scopedParts, timestampToken, String(counter)].join("-");
}

export function resolveRequestIdFromPayload(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as { request_id?: unknown }).request_id === "string"
  ) {
    return (payload as { request_id: string }).request_id;
  }
  return fallback;
}
