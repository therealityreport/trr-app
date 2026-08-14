import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureExpectedConsoleError } from "./helpers/expected-console";
import { verifyCheckedArtifact } from "../scripts/generate-nyt-homepage-preview-fragments.mjs";

const { requireAdminMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

import { GET } from "@/app/api/admin/design-docs/nyt-homepage-preview/route";
import {
  decodeGeneratedArtifact,
  resolveFragmentArtifactIds,
} from "@/lib/admin/nyt-homepage-preview-runtime";

const testCiScript = path.join(process.cwd(), "scripts", "test-ci.mjs");
const gunzipAsync = promisify(gunzip);

const IMMUTABLE_VC_FRAGMENT_EXPECTATIONS = [
  ["VC-01", "wirecutter-package", "Product recommendations"],
  ["VC-02", "product-rails", "preview-stack"],
  ["VC-03", "games-package", "Daily puzzles"],
  ["VC-04", "watch-todays-videos", "Watch Today’s Videos"],
  ["VC-05", "more-news", "More News"],
  ["VC-06", "edition-rail"],
  ["VC-07", "masthead"],
  ["VC-08", "nested-nav"],
  ["VC-09", "lead-programming"],
  ["VC-10", "site-index"],
  ["VC-11", "footer"],
  ["VC-12", "tip-strip"],
  ["VC-13", "poetry-promo"],
  ["VC-14", "weather-strip"],
  ["VC-15", "opinion-label"],
  ["VC-16", "well-package"],
  ["VC-17", "culture-lifestyle-package"],
  ["VC-18", "athletic-package"],
  ["VC-19", "audio-package"],
  ["VC-20", "cooking-package"],
] as const;

describe("NYT homepage preview route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("requires admin access", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to render NYT homepage preview .*unauthorized/);
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    const response = await GET(
      new NextRequest("http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=not-a-fragment"),
    );

    expect(response.status).toBe(401);
    expectedError.expectCalled();
  });

  it("renders the precomputed script-free page view", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/design-docs/nyt-homepage-preview?view=page"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/^text\/html\b/);
    const html = await response.text();
    expect(html).toContain("The New York Times Homepage Snapshot");
    expect(html).not.toMatch(/<script\b/i);
  });

  it("resolves every immutable VC-01 through VC-20 fragment request", async () => {
    for (const [requestId, fragmentId, expectedBody] of IMMUTABLE_VC_FRAGMENT_EXPECTATIONS) {
      const response = await GET(
        new NextRequest(
          `http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=${fragmentId}`,
          { headers: { accept: "text/html" } },
        ),
      );

      expect(response.status, requestId).toBe(200);
      expect(response.headers.get("content-type"), requestId).toMatch(/^text\/html\b/);
      if (expectedBody) {
        expect(await response.text(), requestId).toContain(expectedBody);
      }
    }
  }, 30000);

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

  it("uses a readable app-owned compressed snapshot shipped with the server route", async () => {
    const snapshotPath = path.join(
      process.cwd(),
      "data",
      "nyt-homepage-2026-04-21",
      "generated-preview",
      "fragments",
      "wirecutter-package.html.gz",
    );

    const compressedSnapshot = await readFile(snapshotPath);
    const snapshotHtml = (await gunzipAsync(compressedSnapshot)).toString("utf8");

    expect(compressedSnapshot.byteLength).toBeGreaterThan(0);
    expect(snapshotHtml).toContain("Product recommendations");
    expect(snapshotHtml).not.toContain("<script");
  });

  it("keeps generated preview artifacts deterministic", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), "scripts", "generate-nyt-homepage-preview-fragments.mjs"), "--check"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("NYT homepage preview fragments are up to date.");
    expect(result.stderr).toBe("");
  });

  it.each(["page", "not-a-fragment"])("rejects %s as a fragment id", async (id) => {
    const expectedError = captureExpectedConsoleError(
      new RegExp(`^\\[api\\] Failed to render NYT homepage preview .*Unknown homepage fragment "${id}"`),
    );
    const response = await GET(
      new NextRequest(
        `http://localhost/api/admin/design-docs/nyt-homepage-preview?view=fragment&id=${id}`,
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: `Unknown homepage fragment "${id}"` });
    expectedError.expectCalled();
  });

  it("preserves exact composite order and one artifact per leaf request", () => {
    expect(resolveFragmentArtifactIds("wirecutter-package")).toEqual([
      "wirecutter-package",
    ]);
    expect(resolveFragmentArtifactIds("inline-interactives")).toEqual([
      "tip-strip",
      "poetry-promo",
      "weather-strip",
      "opinion-label",
    ]);
    expect(resolveFragmentArtifactIds("product-rails")).toEqual([
      "well-package",
      "culture-lifestyle-package",
      "athletic-package",
      "audio-package",
      "cooking-package",
      "wirecutter-package",
      "games-package",
    ]);
  });

  it("fails closed on corrupt artifact bytes and decompression ceilings", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(process.cwd(), "data", "nyt-homepage-2026-04-21", "generated-preview", "manifest.json"),
        "utf8",
      ),
    );
    const artifact = manifest.artifacts["wirecutter-package"];
    const compressed = await readFile(
      path.join(process.cwd(), "data", "nyt-homepage-2026-04-21", "generated-preview", artifact.path),
    );

    const uncompressed = await gunzipAsync(compressed);
    expect(() =>
      verifyCheckedArtifact(
        "wirecutter-package",
        artifact,
        { ...artifact, compressedBytes: artifact.compressedBytes + 1, compressedSha256: "0".repeat(64) },
        compressed,
        uncompressed,
      ),
    ).not.toThrow();

    const corruptedCompressed = Buffer.from(compressed);
    corruptedCompressed[corruptedCompressed.length - 1] ^= 1;
    expect(() =>
      verifyCheckedArtifact(
        "wirecutter-package",
        artifact,
        artifact,
        corruptedCompressed,
        uncompressed,
      ),
    ).toThrow("compressed integrity");

    await expect(
      decodeGeneratedArtifact(
        "wirecutter-package",
        manifest,
        { ...artifact, compressedSha256: "0".repeat(64) },
        compressed,
      ),
    ).rejects.toThrow("integrity check failed");
    await expect(
      decodeGeneratedArtifact(
        "wirecutter-package",
        manifest,
        { ...artifact, uncompressedBytes: 4 * 1024 * 1024 + 1 },
        compressed,
      ),
    ).rejects.toThrow("Invalid generated NYT preview artifact");
  });

  it("keeps jsdom and the full snapshot out of the production route module", async () => {
    const source = await readFile(
      path.join(
        process.cwd(),
        "src",
        "app",
        "api",
        "admin",
        "design-docs",
        "nyt-homepage-preview",
        "route.ts",
      ),
      "utf8",
    );

    expect(source).not.toContain('from "jsdom"');
    expect(source).not.toContain("index.html.gz");
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
