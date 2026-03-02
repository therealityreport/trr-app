import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/server/auth";

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
const SENSITIVE_KEY_RE = /(token|secret|password|cookie|authorization|api[_-]?key|session|credential|jwt|bearer)/i;

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
  const sharedSecret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim() ?? "";
  const providedSecret =
    request.headers.get("x-trr-internal-admin-secret")?.trim() ||
    request.headers.get("x-internal-admin-secret")?.trim() ||
    "";
  if (sharedSecret && providedSecret && providedSecret === sharedSecret) {
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
