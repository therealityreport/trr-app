# Sentry on Vercel

The web app reports to organization `hulibrands-0t`, project
`trr-sentry-vercel`. Configure Vercel project `trr-app` in team
`the-reality-reports-projects` for both Preview and Production.

## Environment configuration

| Standard variable | Marketplace fallback | Purpose |
| --- | --- | --- |
| `SENTRY_DSN` | `NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN` | Server and edge reporting |
| `NEXT_PUBLIC_SENTRY_DSN` | `NEXT_PUBLIC_TRR_SENTRY_VIA_VERCEL_SENTRY_DSN` | Browser reporting |
| `SENTRY_ORG` | `TRR_SENTRY_VIA_VERCEL_SENTRY_ORG` | Source-map organization |
| `SENTRY_PROJECT` | `TRR_SENTRY_VIA_VERCEL_SENTRY_PROJECT` | Source-map project |
| `SENTRY_AUTH_TOKEN` | `TRR_SENTRY_VIA_VERCEL_SENTRY_AUTH_TOKEN` | Private build upload credential |

Keep credentials in Vercel or ignored local environment files. Never prefix an
upload token with `NEXT_PUBLIC_`. The Marketplace aliases are read directly so
credential rotation does not require copying tokens into another variable.

Hosted events use `VERCEL_ENV` (`preview` or `production`). The build projects
only the environment and release metadata into browser variables. `SENTRY_RELEASE`
can override the release; otherwise `VERCEL_GIT_COMMIT_SHA` identifies the source
revision for runtime events and source-map uploads. CLI deployments must supply
the candidate revision if Git metadata is unavailable.

## Sampling and privacy

Tracing defaults to 10% in both runtimes. Set `SENTRY_TRACES_SAMPLE_RATE` and
`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` to override it. Browser replay defaults to
1% of sessions and 100% of error sessions, controlled by
`NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` and
`NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`. Explicit zero values disable
sampling. Rates must be between zero and one; invalid values use the defaults.
Replay masks all text and inputs and blocks media. Default PII collection is off.

Ordinary local development does not initialize Sentry, even when credentials
are available. A local verification run must explicitly set `SENTRY_ENABLED=true`
and `NEXT_PUBLIC_SENTRY_ENABLED=true`. Without a DSN, no runtime initializes and
the Sentry build wrapper is disabled. Missing upload credentials skip source-map
uploads. Upload failures emit an operator warning without failing the app build.
Uploaded source maps are removed from the build output.

## Verification and release

1. Run `make app-validate-quick` from the workspace, the focused Sentry tests,
   and lint/type checks for changed files. Obtain current-chat approval before
   running the full production build through the repository build wrapper.
2. Deploy Preview with the candidate revision. Generate controlled browser and
   server errors and find both events in the requested Sentry project. Check
   environment, release, original source frames, a sampled trace, and a masked
   replay. Sampling may be overridden for this verification deployment only.
3. Remove temporary triggers, restore the documented sampling defaults, and
   stage a production deployment without assigning production domains. Verify
   that deployment, then promote it. Retain the prior deployment for rollback.
4. Confirm production event delivery and environment/release labels. A successful
   build or upload alone does not prove that runtime reporting works.

The existing React error boundary reports caught rendering errors. The global
Next.js boundary also reports errors in the root layout. Both offer recovery UI.
No backend, database, or Modal deployment is part of this integration.
