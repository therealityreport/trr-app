import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/social/media-queue/snapshots/route";

describe("social media queue snapshot route", () => {
  let tempRoot: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    if (tempRoot) {
      rmSync(tempRoot, { force: true, recursive: true });
    }
    tempRoot = mkdtempSync(path.join(tmpdir(), "trr-media-snapshots-"));
    const appCwd = path.join(tempRoot, "TRR-APP", "apps", "web");
    vi.spyOn(process, "cwd").mockReturnValue(appCwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
    if (tempRoot) {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  it("lists safe timestamped queue snapshot links", async () => {
    const snapshotDir = path.join(tempRoot, ".logs", "workspace", "social-queue-snapshots");
    await import("node:fs/promises").then((fs) => fs.mkdir(snapshotDir, { recursive: true }));
    writeFileSync(
      path.join(snapshotDir, "20260622T143000Z-77f85ad9-0b32-4607-8ff4-999261bab84c-media_mirror.json"),
      JSON.stringify({ ok: true }),
    );
    writeFileSync(path.join(snapshotDir, "unsafe.txt"), "skip");

    const response = await GET(
      new NextRequest("http://localhost/api/admin/social/media-queue/snapshots"),
    );
    const payload = (await response.json()) as {
      snapshots?: Array<{ name: string; href: string; runId: string; stage: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.snapshots).toHaveLength(1);
    expect(payload.snapshots?.[0]).toMatchObject({
      name: "20260622T143000Z-77f85ad9-0b32-4607-8ff4-999261bab84c-media_mirror.json",
      href: "/api/admin/social/media-queue/snapshots?file=20260622T143000Z-77f85ad9-0b32-4607-8ff4-999261bab84c-media_mirror.json",
      createdAt: "2026-06-22T14:30:00Z",
      runId: "77f85ad9-0b32-4607-8ff4-999261bab84c",
      stage: "media_mirror",
    });
  });

  it("does not read unsafe file names", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/social/media-queue/snapshots?file=../../package.json"),
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid snapshot file name");
  });
});
