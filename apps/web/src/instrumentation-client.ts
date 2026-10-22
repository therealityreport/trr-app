import * as Sentry from "@sentry/nextjs";
import { sentryEnabled, sentryEnvironment, sentrySampleRate } from "./lib/observability/sentry-options";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN;

if (sentryEnabled(dsn, process.env.NODE_ENV, process.env.NEXT_PUBLIC_SENTRY_ENABLED)) {
  Sentry.init({
    dsn,
    environment: sentryEnvironment(
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      process.env.NEXT_PUBLIC_TRR_ENV,
      process.env.NODE_ENV,
    ),
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: sentrySampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],
    replaysSessionSampleRate: sentrySampleRate(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0.01),
    replaysOnErrorSampleRate: sentrySampleRate(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, 1),
    sendDefaultPii: false,
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
