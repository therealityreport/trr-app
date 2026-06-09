import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/server/auth";

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
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
  if (sharedSecretAuthEnabled && sharedSecret && providedSecret && providedSecret === sharedSecret) {
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

    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const logEntry = await request.json();
    const redacted = redactPayload(logEntry);

    console.log('[PRODUCTION DEBUG]', JSON.stringify(redacted, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug log endpoint error:', error);
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
