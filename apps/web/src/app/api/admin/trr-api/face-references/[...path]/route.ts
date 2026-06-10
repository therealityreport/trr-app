import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";
import { buildInternalAdminHeaders } from "@/lib/server/trr-api/internal-admin-auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

async function forward(request: NextRequest, method: string, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { path } = await params;
    if (!Array.isArray(path) || path.length === 0) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    const backendPath = `/admin/face-references/${path.join("/")}${request.nextUrl.search}`;
    const backendUrl = getBackendApiUrl(backendPath);
    if (!backendUrl) {
      return NextResponse.json({ error: "Backend API not configured" }, { status: 500 });
    }

    const headers = buildInternalAdminHeaders({ Accept: "application/json" });
    const incomingContentType = request.headers.get("content-type");
    if (incomingContentType) {
      headers.set("Content-Type", incomingContentType);
    }

    const init: RequestInit = { method, headers };
    if (!["GET", "HEAD"].includes(method)) {
      const bodyText = await request.text();
      if (bodyText.length > 0) {
        init.body = bodyText;
      }
    }

    const backendResponse = await fetch(backendUrl, init);
    const text = await backendResponse.text();
    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = { raw: text };
      }
    }
    return NextResponse.json(body, { status: backendResponse.status });
  } catch (error) {
    console.error("[api] Face references proxy failed", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return forward(request, "GET", context);
}

export async function POST(request: NextRequest, context: RouteParams) {
  return forward(request, "POST", context);
}
