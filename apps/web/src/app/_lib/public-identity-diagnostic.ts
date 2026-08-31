import { PublicIdentityApiError } from "@/lib/server/trr-api/public-identities";

export const PUBLIC_SHOW_IDENTITY_DIAGNOSTIC_RUN_ID = "e14-show-preview-3c922b-20260824";

const MAX_MESSAGE_LENGTH = 300;
const MAX_SHOW_SLUG_LENGTH = 160;
const MAX_VALUE_LENGTH = 160;
const USER_ADDRESSABLE_STATUSES = new Set([400, 404, 409]);

export type PublicShowIdentityFailureDiagnostic = {
  schema_version: 1;
  event: "e14.public_show_identity_failure";
  diagnostic_run_id: string;
  route_kind: "bare_show_alias";
  show_slug: string;
  vercel_env: string;
  git_commit_sha: string;
  error_name: string;
  error_code: string | null;
  error_status: number | null;
  error_retryable: boolean | null;
  backend_trace_id: string | null;
  backend_request_id: string | null;
  message: string;
  stack_frames: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sanitizeText = (value: string): string =>
  value
    .replace(/([a-z][a-z\d+.-]*:\/\/)([^/\s@]+)@/gi, "$1[REDACTED]@")
    .replace(
      /([a-z][a-z\d+.-]*:\/\/[^\s?#]+)\?[^\s#]*/gi,
      "$1?[REDACTED]",
    )
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b((?:access[_-]?token|refresh[_-]?token|token|api[_-]?key|key|secret|password|passwd|cookie|authorization)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1[REDACTED]",
    )
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const boundedText = (value: string, maxLength: number): string =>
  sanitizeText(value).slice(0, maxLength);

const optionalBoundedText = (value: unknown, maxLength = MAX_VALUE_LENGTH): string | null => {
  if (typeof value !== "string" || value.length === 0) return null;
  const bounded = boundedText(value, maxLength);
  return bounded.length > 0 ? bounded : null;
};

const errorDigest = (error: unknown): string | null => {
  if (!isRecord(error) || typeof error.digest !== "string") return null;
  return error.digest;
};

const shouldSkipDiagnostic = (error: unknown): boolean => {
  if (error instanceof PublicIdentityApiError && USER_ADDRESSABLE_STATUSES.has(error.status)) {
    return true;
  }
  const digest = errorDigest(error);
  return digest === "NEXT_HTTP_ERROR_FALLBACK;404" || digest?.startsWith("NEXT_REDIRECT;") === true;
};

const stackFrames = (error: unknown): string[] => {
  if (!(error instanceof Error) || typeof error.stack !== "string") return [];

  const frames: string[] = [];
  for (const line of error.stack.split("\n")) {
    if (!/^\s*at\s+/.test(line)) continue;
    const match = line.match(/(?:^|\s|\()([^()\s]+):(\d+):(\d+)\)?\s*$/);
    if (!match) continue;
    const [, rawPath, lineNumber, columnNumber] = match;
    const path = rawPath.replace(/^file:\/\//, "");
    const marker = "/apps/web/";
    const markerIndex = path.indexOf(marker);
    const relativePath = markerIndex >= 0 ? path.slice(markerIndex + marker.length) : path;
    if (markerIndex < 0 || !relativePath.startsWith("src/")) continue;
    const frame = optionalBoundedText(
      `${relativePath}:${lineNumber}:${columnNumber}`,
      MAX_VALUE_LENGTH,
    );
    if (!frame) continue;
    frames.push(frame);
    if (frames.length === 5) break;
  }
  return frames;
};

const errorName = (error: unknown): string =>
  error instanceof Error && typeof error.name === "string" && error.name.length > 0
    ? boundedText(error.name, MAX_VALUE_LENGTH)
    : "UnknownError";

const errorMessage = (error: unknown): string =>
  boundedText(
    error instanceof Error && typeof error.message === "string"
      ? error.message
      : "Unknown public show identity error.",
    MAX_MESSAGE_LENGTH,
  );

const environmentValue = (value: string | undefined): string =>
  boundedText(value && value.length > 0 ? value : "unknown", MAX_VALUE_LENGTH) || "unknown";

export function logPublicShowIdentityFailure(showSlug: string, error: unknown): void {
  if (shouldSkipDiagnostic(error)) return;

  const publicIdentityError = error instanceof PublicIdentityApiError ? error : null;
  const problem = publicIdentityError?.problem;
  const diagnostic: PublicShowIdentityFailureDiagnostic = {
    schema_version: 1,
    event: "e14.public_show_identity_failure",
    diagnostic_run_id: PUBLIC_SHOW_IDENTITY_DIAGNOSTIC_RUN_ID,
    route_kind: "bare_show_alias",
    show_slug: boundedText(showSlug, MAX_SHOW_SLUG_LENGTH),
    vercel_env: environmentValue(process.env.VERCEL_ENV),
    git_commit_sha: environmentValue(process.env.VERCEL_GIT_COMMIT_SHA),
    error_name: errorName(error),
    error_code: publicIdentityError ? optionalBoundedText(publicIdentityError.code) : null,
    error_status:
      publicIdentityError && Number.isInteger(publicIdentityError.status)
        ? publicIdentityError.status
        : null,
    error_retryable:
      publicIdentityError && typeof publicIdentityError.retryable === "boolean"
        ? publicIdentityError.retryable
        : null,
    backend_trace_id: optionalBoundedText(problem?.trace_id),
    backend_request_id: optionalBoundedText(problem?.request_id),
    message: errorMessage(error),
    stack_frames: stackFrames(error),
  };

  console.error(diagnostic);
}
