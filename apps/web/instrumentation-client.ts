import * as Sentry from "@sentry/nextjs";

/**
 * Sentry browser (client) initialization.
 *
 * Fully env-gated: when `NEXT_PUBLIC_SENTRY_DSN` is not set, `Sentry.init(...)`
 * is never called and this module is a no-op. With no DSN nothing is loaded into
 * the client runtime and nothing is reported.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const parseSampleRate = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
};

const environment =
  process.env.NEXT_PUBLIC_TRR_ENV ||
  process.env.TRR_ENV ||
  process.env.NODE_ENV ||
  "development";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    // Env-configurable, defaults to 0 (no client performance tracing).
    tracesSampleRate: parseSampleRate(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    ),
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
  });
}

/**
 * Instruments Next.js client-side navigations. Safe with no DSN: when
 * `Sentry.init` was not called this resolves to a no-op.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
