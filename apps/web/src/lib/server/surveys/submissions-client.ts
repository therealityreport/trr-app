import "server-only";
import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

/** Firebase verification stays in the app. This assertion grants access to one owner only. */
export async function proxySurveySubmission(request: NextRequest, path: "x" | "global-profile" | "show-responses") {
  try {
    const user = await requireUser(request);
    if (user.provider !== "firebase") return NextResponse.json({ error: "Firebase authentication required" }, { status: 401 });
    const secret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim();
    const url = getBackendApiUrl(`/surveys/${path}`, "v2");
    if (!secret || !url) return NextResponse.json({ error: "Survey service unavailable" }, { status: 503 });
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      iss: "trr-app-internal", aud: "trr-backend-survey-submissions", scope: "survey:own",
      provider: "firebase", sub: user.uid, email: user.email ?? null, iat: now, nbf: now, exp: now + 60,
    })}`;
    const token = `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
    const body = request.method === "GET" ? undefined : JSON.stringify(await request.json());
    const upstream = await fetch(`${url}${request.nextUrl.search}`, {
      method: request.method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body, cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    // Preserve status while avoiding transport-specific headers or cookie forwarding.
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : error instanceof SyntaxError ? 400 : 502;
    return NextResponse.json({ error: status < 500 ? message : "Survey service unavailable" }, { status });
  }
}
