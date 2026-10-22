import * as Sentry from "@sentry/nextjs";
import { sentryEnabled, sentryEnvironment, sentrySampleRate } from "./lib/observability/sentry-options";

export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN;
  if (!sentryEnabled(dsn, process.env.NODE_ENV, process.env.SENTRY_ENABLED)) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: sentryEnvironment(
        process.env.VERCEL_ENV,
        process.env.TRR_ENV || process.env.APP_ENV,
        process.env.NODE_ENV,
      ),
      release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: sentrySampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
      sendDefaultPii: false,
      debug: process.env.SENTRY_DEBUG === "true",
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
