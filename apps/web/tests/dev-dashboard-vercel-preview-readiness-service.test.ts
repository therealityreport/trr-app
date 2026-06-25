import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readVercelCleanupDoctor, readVercelPreviewReadinessArtifact } from "@/lib/server/admin/dev-dashboard-service";

describe("readVercelPreviewReadinessArtifact", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), "trr-vercel-preview-ready-"));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it("returns null when no latest preview readiness artifact exists", async () => {
    await expect(readVercelPreviewReadinessArtifact(workspaceRoot)).resolves.toBeNull();
  });

  it("parses enabled observability checks from the latest artifact", async () => {
    const artifactDir = join(workspaceRoot, ".logs", "workspace", "vercel-preview-ready");
    await mkdir(artifactDir, { recursive: true });
    await writeFile(
      join(artifactDir, "latest.json"),
      JSON.stringify(
        {
          generatedAt: "2026-06-23T19:14:16.000Z",
          projectName: "trr-app",
          teamSlug: "the-reality-reports-projects",
          teamId: "team_7H0rrcso8BtSY2Npuf2cWWaJ",
          activeProjectDir: "/Users/thomashulihan/Projects/TRR/TRR-APP",
          latestDeploymentUrl: "https://trr-example-the-reality-reports-projects.vercel.app",
          checks: {
            webAnalytics: {
              status: 0,
              stdout: 'Vercel CLI 48.10.0\n{"enabled":true}',
              stderr: "",
            },
            speedInsights: {
              status: 0,
              stdout: 'Vercel CLI 48.10.0\n{"enabled":true}',
              stderr: "",
            },
            deployments: {
              status: 0,
              stdout:
                'Vercel CLI 48.10.0\n{"deployments":[{"url":"trr-example-the-reality-reports-projects.vercel.app","state":"READY"}]}',
              stderr: "",
            },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    const readiness = await readVercelPreviewReadinessArtifact(workspaceRoot);

    expect(readiness).toMatchObject({
      projectName: "trr-app",
      teamSlug: "the-reality-reports-projects",
      latestDeploymentUrl: "https://trr-example-the-reality-reports-projects.vercel.app",
      webAnalyticsEnabled: true,
      speedInsightsEnabled: true,
      errors: [],
    });
    expect(readiness?.artifactPath).toBe(join(artifactDir, "latest.json"));
  });
});

describe("readVercelCleanupDoctor", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(join(tmpdir(), "trr-vercel-cleanup-doctor-"));
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  async function writeProjectLink(projectDir: string, projectName: string, projectId: string) {
    const vercelDir = join(projectDir, ".vercel");
    await mkdir(vercelDir, { recursive: true });
    await writeFile(
      join(vercelDir, "project.json"),
      JSON.stringify(
        {
          projectName,
          projectId,
          orgId: "team_test",
        },
        null,
        2,
      ),
      "utf-8",
    );
  }

  it("reports stale nested web project links", async () => {
    await writeProjectLink(workspaceRoot, "trr-app", "prj_MHpStkwr26rV5kjt0f80zqhwZpAs");
    await writeProjectLink(join(workspaceRoot, "apps", "web"), "web", "prj_0nWn8xpm9ikhcvhzE3ma4jUXTe1p");

    const doctor = await readVercelCleanupDoctor(workspaceRoot);

    expect(doctor.ok).toBe(false);
    expect(doctor.links.map((link) => link.classification)).toEqual([
      "project-of-record",
      "stale-old-web-project",
    ]);
    expect(doctor.links[1]?.cleanupPath).toBe(join(workspaceRoot, "apps", "web", ".vercel"));
  });
});
