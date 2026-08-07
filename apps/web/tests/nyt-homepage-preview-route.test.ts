import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/design-docs/nyt-homepage-preview/route";

const testCiScript = path.join(process.cwd(), "scripts", "test-ci.mjs");

describe("NYT homepage preview route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("requires admin access", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to render NYT homepage preview .*unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=games-package"),
    );

    expect(response.status).toBe(401);
    expectedError.expectCalled();
  });

  it("serves distinct Watch Today’s Videos and More News fragments", async () => {
    const watchRequest = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=watch-todays-videos",
    );
    const moreNewsRequest = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=more-news",
    );

    const watchResponse = await GET(watchRequest);
    const moreNewsResponse = await GET(moreNewsRequest);

    expect(watchResponse.status).toBe(200);
    expect(moreNewsResponse.status).toBe(200);

    const watchHtml = await watchResponse.text();
    const moreNewsHtml = await moreNewsResponse.text();

    expect(watchHtml).toContain("Watch Today’s Videos");
    expect(watchHtml).toContain("Video feed");
    expect(moreNewsHtml).toContain("More News");
    expect(moreNewsHtml).toContain("London Braces for Disruption From Tube Drivers’ Strike");
    expect(moreNewsHtml).not.toEqual(watchHtml);
  }, 15000);

  it("resolves the Wirecutter package from its visible package copy", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=wirecutter-package",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("Wirecutter");
    expect(html).toContain("Product recommendations");
    expect(html).not.toContain('{"error":"Could not resolve container');
  });

  it("resolves the Games package as its own homepage module", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=games-package",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("Games");
    expect(html).toContain("Daily puzzles");
    expect(html).toContain("Wordle");
  });
});

describe("test:ci harness", () => {
  it("runs a CJS pnpm entrypoint through Node and reports generated-check failures", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "trr-test-ci-"));
    const packageManagerPath = path.join(tempDir, "fake-pnpm.cjs");
    const invocationLogPath = path.join(tempDir, "invocations.jsonl");

    try {
      await writeFile(
        packageManagerPath,
        [
          "const { appendFileSync } = require('node:fs');",
          `appendFileSync(${JSON.stringify(invocationLogPath)}, JSON.stringify(process.argv.slice(2)) + '\\n');`,
          "process.exit(process.env.FAKE_PNPM_STATUS ? Number(process.env.FAKE_PNPM_STATUS) : 0);",
          "",
        ].join("\n"),
        "utf8",
      );

      const success = spawnSync(process.execPath, [testCiScript], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          npm_execpath: packageManagerPath,
          TEST_CI_BATCH_SIZE: "99999",
        },
      });

      expect(success.status).toBe(0);
      expect(success.stderr).toBe("");
      const invocations = (await readFile(invocationLogPath, "utf8"))
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as string[]);
      expect(invocations[0]).toEqual(["run", "generated:check"]);
      expect(invocations[1]).toEqual(
        expect.arrayContaining(["exec", "vitest", "run", "-c", "vitest.config.mts", "--pool=forks"]),
      );

      const failedGeneratedCheck = spawnSync(process.execPath, [testCiScript], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          npm_execpath: packageManagerPath,
          FAKE_PNPM_STATUS: "7",
        },
      });

      expect(failedGeneratedCheck.status).toBe(7);
      expect(failedGeneratedCheck.stderr).toContain(
        "[test:ci] Generated artifact check failed (status=7; signal=none; error=none).",
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
