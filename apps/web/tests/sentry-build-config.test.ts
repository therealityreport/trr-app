import { beforeEach, expect, it, vi } from "vitest";

const wrap = vi.hoisted(() => vi.fn((config: unknown) => config));
vi.mock("@sentry/nextjs", () => ({ withSentryConfig: wrap }));

beforeEach(() => {
  vi.resetModules();
  for (const key of ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN", "SENTRY_RELEASE", "NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN", "TRR_SENTRY_VIA_VERCEL_SENTRY_ORG", "TRR_SENTRY_VIA_VERCEL_SENTRY_PROJECT", "TRR_SENTRY_VIA_VERCEL_SENTRY_AUTH_TOKEN", "VERCEL_GIT_COMMIT_SHA", "VERCEL_ENV"]) vi.stubEnv(key, "");
});

it("leaves the Sentry build wrapper off without a DSN", async () => {
  await import("../next.config");
  expect(wrap).not.toHaveBeenCalled();
});

it("projects preview and revision metadata without exposing upload credentials", async () => {
  vi.stubEnv("NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN", "marketplace-dsn");
  vi.stubEnv("TRR_SENTRY_VIA_VERCEL_SENTRY_AUTH_TOKEN", "private-upload-token-test-only");
  vi.stubEnv("TRR_SENTRY_VIA_VERCEL_SENTRY_ORG", "hulibrands-0t");
  vi.stubEnv("TRR_SENTRY_VIA_VERCEL_SENTRY_PROJECT", "trr-sentry-vercel");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "candidate-sha");
  const { default: config } = await import("../next.config");
  expect(config.env).toEqual({ NEXT_PUBLIC_SENTRY_ENVIRONMENT: "preview", NEXT_PUBLIC_SENTRY_RELEASE: "candidate-sha" });
  expect(JSON.stringify(config.env)).not.toContain("private-upload-token-test-only");
  expect(wrap).toHaveBeenCalledWith(config, expect.objectContaining({
    authToken: "private-upload-token-test-only", org: "hulibrands-0t", project: "trr-sentry-vercel",
    release: { name: "candidate-sha" }, sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
    errorHandler: expect.any(Function),
  }));
});

it("allows DSN-only builds and skips uploads without a token", async () => {
  vi.stubEnv("SENTRY_DSN", "server-dsn");
  const { default: config } = await import("../next.config");
  expect(wrap).toHaveBeenCalledWith(config, expect.objectContaining({ sourcemaps: { disable: true, deleteSourcemapsAfterUpload: true } }));
});
