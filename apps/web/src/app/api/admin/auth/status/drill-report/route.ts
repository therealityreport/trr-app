import { NextRequest, NextResponse } from "next/server";

import { getAuthDiagnosticsSnapshot, requireAdmin } from "@/lib/server/auth";
import { evaluateAuthCutoverReadiness } from "@/lib/server/auth-cutover";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const diagnostics = getAuthDiagnosticsSnapshot();
    const cutoverReadiness = evaluateAuthCutoverReadiness(diagnostics);
    const generatedAt = new Date().toISOString();

    const report = {
      generatedAt,
      runbook: {
        task: "TASK8",
        stage: "Stage 3 Cutover Drill",
      },
      diagnostics,
      cutoverReadiness,
      viewer: {
        uid: user.uid,
        provider: user.provider,
      },
      recommendedAction: cutoverReadiness.ready ? "proceed_cutover" : "continue_shadow_mode",
    };

    const format = request.nextUrl.searchParams.get("format");
    if (format === "download") {
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="auth-cutover-drill-${generatedAt}.json"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("[api] Failed to generate auth cutover drill report", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
