type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

const stringOrDefault = (value: unknown, fallback: string): string => (typeof value === "string" ? value : fallback);

export interface SocialBladeCookieHealth {
  healthy: boolean;
  status: string;
  reason: string | null;
  retryable: boolean;
  cookieNames: string[];
  cookieFile: {
    path: string;
    exists: boolean;
    modifiedAt: string | null;
  } & JsonRecord;
  validation: {
    checked: boolean;
    healthy: boolean | null;
    reason: string | null;
    url: string | null;
  } & JsonRecord;
  checkedAt: string;
}

export type NormalizedSocialBladeCookieHealth = SocialBladeCookieHealth & JsonRecord;

export function normalizeSocialBladeCookieHealth(input: unknown): NormalizedSocialBladeCookieHealth {
  const source = isRecord(input) ? input : {};
  const healthy = typeof source.healthy === "boolean" ? source.healthy : false;
  const cookieFileSource = isRecord(source.cookieFile)
    ? source.cookieFile
    : isRecord(source.cookie_file)
      ? source.cookie_file
      : {};
  const validationSource = isRecord(source.validation) ? source.validation : {};
  const cookieNamesSource = Array.isArray(source.cookieNames)
    ? source.cookieNames
    : Array.isArray(source.cookie_names)
      ? source.cookie_names
      : [];

  return {
    ...source,
    healthy,
    status: stringOrDefault(source.status, healthy ? "ready" : "unknown"),
    reason: stringOrNull(source.reason),
    retryable: typeof source.retryable === "boolean" ? source.retryable : false,
    cookieNames: cookieNamesSource.filter((name): name is string => typeof name === "string"),
    cookieFile: {
      ...cookieFileSource,
      path: stringOrDefault(cookieFileSource.path, ""),
      exists: typeof cookieFileSource.exists === "boolean" ? cookieFileSource.exists : false,
      modifiedAt: stringOrNull(cookieFileSource.modifiedAt ?? cookieFileSource.modified_at),
    },
    validation: {
      ...validationSource,
      checked: typeof validationSource.checked === "boolean" ? validationSource.checked : false,
      healthy: typeof validationSource.healthy === "boolean" ? validationSource.healthy : null,
      reason: stringOrNull(validationSource.reason),
      url: stringOrNull(validationSource.url),
    },
    checkedAt: stringOrDefault(source.checkedAt ?? source.checked_at, new Date().toISOString()),
  };
}
