import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const SNAPSHOT_FILE_PATTERN = /^[0-9TZ_.:-]+-[0-9a-f-]+-(?:media_mirror|comment_media_mirror|all)\.json$/i;

const getSnapshotDirectory = (): string =>
  path.resolve(process.cwd(), "../../..", ".logs/workspace/social-queue-snapshots");

const safeSnapshotFileName = (value: string | null): string | null => {
  const fileName = typeof value === "string" ? value.trim() : "";
  if (!fileName || path.basename(fileName) !== fileName) return null;
  if (!SNAPSHOT_FILE_PATTERN.test(fileName)) return null;
  return fileName;
};

const parseSnapshotFileName = (
  name: string,
): { createdAt: string | null; runId: string | null; stage: string | null } => {
  const match = name.match(
    /^([0-9TZ_.:-]+?)-([0-9a-f-]+)-(media_mirror|comment_media_mirror|all)\.json$/i,
  );
  if (!match) {
    return { createdAt: null, runId: null, stage: null };
  }
  const compactTimestamp = match[1];
  const compactMatch = compactTimestamp.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i,
  );
  const createdAt = compactMatch
    ? `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}T${compactMatch[4]}:${compactMatch[5]}:${compactMatch[6]}Z`
    : compactTimestamp.replace(/_/g, ":").replace(/^(\d{4}-\d{2}-\d{2})T/, "$1T");
  return {
    createdAt: createdAt.endsWith("Z") ? createdAt : `${createdAt}Z`,
    runId: match[2],
    stage: match[3],
  };
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const fileParam = request.nextUrl.searchParams.get("file");
    const requestedFile = safeSnapshotFileName(fileParam);
    if (fileParam !== null && !requestedFile) {
      return NextResponse.json({ error: "Invalid snapshot file name" }, { status: 400 });
    }
    const snapshotDir = getSnapshotDirectory();

    if (requestedFile) {
      const filePath = path.join(snapshotDir, requestedFile);
      const content = await fs.readFile(filePath, "utf8");
      return new NextResponse(content, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    const entries = await fs.readdir(snapshotDir, { withFileTypes: true }).catch((error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "ENOENT"
      ) {
        return [];
      }
      throw error;
    });
    const files = entries
      .filter((entry) => entry.isFile() && safeSnapshotFileName(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
      .slice(0, 20);

    return NextResponse.json({
      snapshots: files.map((name) => ({
        name,
        href: `/api/admin/social/media-queue/snapshots?file=${encodeURIComponent(name)}`,
        ...parseSnapshotFileName(name),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load media queue snapshots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
