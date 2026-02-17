import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, resetAuthDiagnosticsSnapshot } from "@/lib/server/auth";
import { evaluateAuthCutoverReadiness } from "@/lib/server/auth-cutover";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const diagnostics = resetAuthDiagnosticsSnapshot();
    const cutoverReadiness = evaluateAuthCutoverReadiness(diagnostics);

    return NextResponse.json({
      diagnostics,
      cutoverReadiness,
      viewer: {
        uid: user.uid,
        provider: user.provider,
      },
      reset: true,
    });
  } catch (error) {
    console.error("[api] Failed to reset auth diagnostics", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
