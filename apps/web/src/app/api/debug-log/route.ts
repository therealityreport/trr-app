import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/server/auth";

const REDACTED = "[REDACTED]";
const INVALID_JSON_BODY = Symbol("invalid_json_body");
const MAX_DEPTH = 6;
const MAX_DEBUG_LOG_BODY_BYTES = 64 * 1024;
const TOO_LARGE_BODY = Symbol("too_large_body");
const SENSITIVE_KEY_RE =
  /(token|secret|password|cookie|authorization|api[_-]?key|session|credential|jwt|bearer|email|uid|user[_-]?id)/i;

function envFlag(name: string): boolean {
  return /^(1|true|yes|on)$/i.test(process.env[name]?.trim() ?? "");
}

function isLocalDebugHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".localhost")
  );
}

function remoteDebugLoggingEnabled(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname || new URL(request.url).hostname;
  if (isLocalDebugHost(hostname)) {
    return true;
  }
  return envFlag("TRR_REMOTE_DEBUG_LOG_ENABLED");
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) {
    const paddedLeft = Buffer.alloc(rightBytes.length);
    leftBytes.copy(paddedLeft, 0, 0, Math.min(leftBytes.length, rightBytes.length));
    timingSafeEqual(paddedLeft, rightBytes);
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

function parseContentLength(request: NextRequest): number | null {
  const rawContentLength = request.headers.get("content-length")?.trim();
  if (!rawContentLength) return null;
  const parsed = Number.parseInt(rawContentLength, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readJsonBodyWithLimit(
  request: NextRequest,
): Promise<unknown | typeof INVALID_JSON_BODY | typeof TOO_LARGE_BODY> {
  const contentLength = parseContentLength(request);
  if (contentLength !== null && contentLength > MAX_DEBUG_LOG_BODY_BYTES) {
    return TOO_LARGE_BODY;
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_DEBUG_LOG_BODY_BYTES) {
    return TOO_LARGE_BODY;
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return INVALID_JSON_BODY;
  }
}

function redactPayload(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redactPayload(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? REDACTED : redactPayload(nested, depth + 1);
  }
  return out;
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const sharedSecretAuthEnabled = envFlag("TRR_DEBUG_LOG_SHARED_SECRET_ENABLED");
  const sharedSecret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim() ?? "";
  const providedSecret =
    request.headers.get("x-trr-internal-admin-secret")?.trim() ||
    request.headers.get("x-internal-admin-secret")?.trim() ||
    "";
  if (sharedSecretAuthEnabled && sharedSecret && providedSecret && timingSafeStringEqual(providedSecret, sharedSecret)) {
    return true;
  }
  try {
    await requireAdmin(request);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!remoteDebugLoggingEnabled(request)) {
      return NextResponse.json({ error: "remote_debug_logging_disabled" }, { status: 404 });
    }

    const logEntry = await readJsonBodyWithLimit(request);
    if (logEntry === TOO_LARGE_BODY) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    if (logEntry === INVALID_JSON_BODY) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const redacted = redactPayload(logEntry);

    console.log('[PRODUCTION DEBUG]', JSON.stringify(redacted, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log endpoint error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
