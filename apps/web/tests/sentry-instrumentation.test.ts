import { beforeEach, describe, expect, it, vi } from "vitest";
import { sentryEnvironment, sentrySampleRate, sentryEnabled } from "@/lib/observability/sentry-options";

const sentry = vi.hoisted(() => ({
  init: vi.fn(), replayIntegration: vi.fn(() => ({ name: "Replay" })),
  captureRequestError: vi.fn(), captureRouterTransitionStart: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sentry);

beforeEach(() => {
  vi.resetModules();
  for (const key of ["SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN", "NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN", "SENTRY_ENABLED", "NEXT_PUBLIC_SENTRY_ENABLED", "SENTRY_TRACES_SAMPLE_RATE", "NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", "NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE", "NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE", "SENTRY_RELEASE", "VERCEL_GIT_COMMIT_SHA", "VERCEL_ENV", "NEXT_PUBLIC_SENTRY_ENVIRONMENT", "NEXT_PUBLIC_SENTRY_RELEASE"]) vi.stubEnv(key, "");
  vi.stubEnv("NODE_ENV", "production");
});

describe("Sentry settings", () => {
  it("distinguishes a Vercel preview from its production-mode build", () => {
    expect(sentryEnvironment("preview", "production", "production")).toBe("preview");
    expect(sentryEnvironment("production", undefined, "production")).toBe("production");
    expect(sentryEnvironment(undefined, undefined, "development")).toBe("development");
  });
  it("preserves zero and rejects malformed or out-of-range sampling rates", () => {
    expect(sentrySampleRate("0", 0.1)).toBe(0);
    for (const rate of [undefined, "", " ", "-1", "2", "0.5bad", "NaN"]) expect(sentrySampleRate(rate, 0.1)).toBe(0.1);
    expect(sentrySampleRate("0.25", 0.1)).toBe(0.25);
  });
  it("requires both a DSN and local opt-in outside production mode", () => {
    expect(sentryEnabled(undefined, "production", "true")).toBe(false);
    expect(sentryEnabled("test-dsn", "development", undefined)).toBe(false);
    expect(sentryEnabled("test-dsn", "development", "true")).toBe(true);
  });
});

describe("runtime initialization", () => {
  it("does not initialize either runtime without DSNs", async () => {
    const server = await import("../src/instrumentation");
    await server.register();
    await import("../src/instrumentation-client");
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.replayIntegration).not.toHaveBeenCalled();
    expect(server.onRequestError).toBe(sentry.captureRequestError);
  });
  it("uses Marketplace credentials for both server runtimes with preview and release labels", async () => {
    vi.stubEnv("NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN", "marketplace-dsn");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "candidate-sha");
    const server = await import("../src/instrumentation");
    for (const runtime of ["nodejs", "edge"]) {
      vi.stubEnv("NEXT_RUNTIME", runtime);
      await server.register();
      expect(sentry.init).toHaveBeenLastCalledWith(expect.objectContaining({ dsn: "marketplace-dsn", environment: "preview", release: "candidate-sha", tracesSampleRate: 0.1, sendDefaultPii: false }));
    }
  });
  it("enables masked replay with the specified rates and public release metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "browser-dsn");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "preview");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_RELEASE", "candidate-sha");
    const client = await import("../src/instrumentation-client");
    expect(sentry.replayIntegration).toHaveBeenCalledWith({ maskAllText: true, maskAllInputs: true, blockAllMedia: true });
    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: "preview", release: "candidate-sha", tracesSampleRate: 0.1, replaysSessionSampleRate: 0.01, replaysOnErrorSampleRate: 1, sendDefaultPii: false }));
    expect(client.onRouterTransitionStart).toBe(sentry.captureRouterTransitionStart);
  });
  it("keeps local development off even with Marketplace DSNs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN", "marketplace-dsn");
    const server = await import("../src/instrumentation");
    await server.register();
    await import("../src/instrumentation-client");
    expect(sentry.init).not.toHaveBeenCalled();
  });
});
