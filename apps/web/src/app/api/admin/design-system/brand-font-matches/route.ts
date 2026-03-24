import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { NextRequest, NextResponse } from "next/server";

import {
  buildBrandFontMatchesApiResponseFromArtifacts,
  getGeneratedBrandFontMatchesApiResponse,
} from "@/lib/fonts/brand-fonts";
import { buildBrandFontArtifacts } from "@/lib/fonts/brand-fonts/generator.ts";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const PROJECT_ROOT_MARKER = "src/styles/cdn-fonts.css";

function resolveWebProjectRoot(): string {
  const cwd = process.cwd();
  const candidates = [cwd, resolve(cwd, "apps/web"), resolve(cwd, "TRR-APP/apps/web")];
  const projectRoot = candidates.find((candidate) =>
    existsSync(join(candidate, PROJECT_ROOT_MARKER)),
  );
  if (!projectRoot) {
    throw new Error("brand-font-project-root-not-found");
  }
  return projectRoot;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    if (request.nextUrl.searchParams.get("refresh") !== "1") {
      return NextResponse.json(getGeneratedBrandFontMatchesApiResponse());
    }

    const artifacts = buildBrandFontArtifacts(resolveWebProjectRoot());
    return NextResponse.json(
      buildBrandFontMatchesApiResponseFromArtifacts(artifacts, "live-regenerated"),
    );
  } catch (error) {
    console.error("[api] Failed to load brand font matches", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
