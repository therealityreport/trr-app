import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { fetchSocialBackendJson, socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();
    if (body?.mode !== "anonymous_research" || body?.provider !== "lurkbird") {
      return NextResponse.json({ error: "Select anonymous research with provider lurkbird." }, { status: 400 });
    }
    const data = await fetchSocialBackendJson("/twitter/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      adminContext: toVerifiedAdminContext(user),
      fallbackError: "X research search failed",
      retries: 0,
      timeoutMs: 130_000,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    return socialProxyErrorResponse(error, "[api] X research search failed");
  }
}
