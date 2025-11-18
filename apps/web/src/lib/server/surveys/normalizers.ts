import "server-only";

const ARRAY_DELIMITERS = /[,|]/;

const toString = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
};

const tryParseJsonArray = (raw: string): unknown[] | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? `[${trimmed.slice(1, -1)}]`
      : trimmed;
  if (!normalized.startsWith("[") || !normalized.endsWith("]")) return null;
  try {
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export function normalizeStringArrayValue(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const normalized = value
      .map(toString)
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0))
      .map((entry) => entry.trim());
    return normalized.length ? normalized : null;
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = tryParseJsonArray(raw);
    if (parsed) {
      const normalized = parsed
        .map(toString)
        .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0))
        .map((entry) => entry.trim());
      return normalized.length ? normalized : null;
    }
    const split = raw
      .split(ARRAY_DELIMITERS)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return split.length ? split : null;
  }
  return null;
}

export function normalizeJsonValue<T = unknown>(value: T): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return value as T;
    }
  }
  return value;
}
