import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server + edge runtime initialization.
 *
 * Fully env-gated: when `SENTRY_DSN` is not set, `Sentry.init(...)` is never
 * called and this module is a no-op. With no DSN the build and runtime are
 * unchanged and nothing is reported.
 */

const SENTRY_DSN = process.env.SENTRY_DSN;

// `tracesSampleRate` is env-configurable and defaults to 0 (no performance
// tracing) so enabling error reporting alone does not add tracing overhead.
const parseSampleRate = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
};

const environment =
  process.env.TRR_ENV ||
  process.env.APP_ENV ||
  process.env.NODE_ENV ||
  "development";

export async function register(): Promise<void> {
  // No DSN -> Sentry stays a no-op. Never throws.
  if (!SENTRY_DSN) {
    return;
  }

  const tracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE);

  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment,
      tracesSampleRate,
      // Keep noise low by default; opt in via env when actively debugging.
      debug: process.env.SENTRY_DEBUG === "true",
    });
  }
}

/**
 * Forwarded to Next.js so server/edge request errors are captured. Sentry's
 * `captureRequestError` is a no-op when `Sentry.init` was never called (no DSN),
 * so this is safe to export unconditionally.
 */
export const onRequestError = Sentry.captureRequestError;
