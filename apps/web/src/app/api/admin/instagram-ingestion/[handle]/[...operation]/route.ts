import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { fetchSocialBackendJson, SocialProxyError } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ handle: string; operation: string[] }> };
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const READ = new RegExp(`^(capabilities|runs/recent|runs/${UUID}(/diagnostics)?)$`);
const WRITE = new RegExp(`^(runs|runs/${UUID}/(cancel|resume|retry-targets|replay))$`);

async function proxy(request: NextRequest, context: Context) {
  try {
    const user = await requireAdmin(request);
    const { handle, operation } = await context.params;
    const account = handle.replace(/^@/, "").toLowerCase();
    const route = operation.join("/");
    if (!/^[a-z0-9._]{1,30}$/.test(account) || !(request.method === "GET" ? READ : WRITE).test(route)) {
      return NextResponse.json({ detail: { code: "INGESTION_ROUTE_NOT_FOUND", status: 404, message: "Unknown ingestion route." } }, { status: 404 });
    }
    const key = request.headers.get("idempotency-key")?.trim();
    if (request.method === "POST" && (!key || key.length > 200)) {
      return NextResponse.json({ detail: { code: "INGESTION_IDEMPOTENCY_REQUIRED", status: 422, message: "A valid request identity is required." } }, { status: 422 });
    }
    const query = new URLSearchParams();
    const allowedQuery = route === "runs/recent" ? ["source_scope", "limit"] : route.endsWith("/diagnostics") ? ["limit"] : [];
    for (const name of request.nextUrl.searchParams.keys()) {
      if (!allowedQuery.includes(name)) return NextResponse.json({ detail: { code: "INGESTION_INVALID_QUERY", status: 422, message: "Unsupported ingestion filter." } }, { status: 422 });
      query.set(name, request.nextUrl.searchParams.get(name)!);
    }
    const data = await fetchSocialBackendJson(`/profiles/instagram/${encodeURIComponent(account)}/ingestion/${route}`, {
      routeFamily: "instagram-ingestion-v2",
      method: request.method,
      adminContext: toVerifiedAdminContext(user),
      headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
      body: request.method === "POST" ? await request.text() : undefined,
      queryString: query.toString(),
      retries: 0,
      timeoutMs: 30_000,
      fallbackError: "The ingestion service could not be reached.",
    });
    return NextResponse.json(data, { status: request.method === "POST" && !route.endsWith("/replay") ? 202 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof SocialProxyError ? error.status : error instanceof Error && error.message === "forbidden" ? 403 : error instanceof Error && /unauth|not authenticated/i.test(error.message) ? 401 : 503;
    const upstream = error instanceof SocialProxyError ? error.upstreamDetail : undefined;
    const typed = upstream && typeof upstream === "object" && "code" in upstream && "message" in upstream ? upstream : null;
    return NextResponse.json({ detail: typed ?? {
      code: status === 401 ? "AUTHENTICATION_REQUIRED" : status === 403 ? "ADMIN_ACCESS_REQUIRED" : "INGESTION_SERVICE_UNAVAILABLE",
      status,
      message: status === 401 || status === 403 ? "Admin access is required." : "The ingestion service could not be reached.",
      retryable: status >= 500,
      retry_after_ms: error instanceof SocialProxyError && error.retryAfterSeconds != null ? error.retryAfterSeconds * 1000 : null,
    } }, { status, headers: { "Cache-Control": "no-store", ...(error instanceof SocialProxyError && error.retryAfterSeconds != null ? { "Retry-After": String(error.retryAfterSeconds) } : {}) } });
  }
}
export const GET = proxy;
export const POST = proxy;
