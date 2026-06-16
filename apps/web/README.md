This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Recommended Node version: 24.x (primary CI lane). See `../../.nvmrc`.

First, install dependencies and run the development server:

```bash
pnpm install
pnpm run dev
```

For stable local HTTPS routes, start the workspace-level Portless target from
the repo root:

```bash
make dev-portless
```

Then open the public app at `https://trr.localhost` or the admin dashboard at
`https://admin.trr.localhost/admin`. See
`../../docs/workspace/portless-clean-urls.md` for the shared local URL runbook.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local Production Builds

`pnpm run build` uses a local safety wrapper before `next build --webpack`.
Outside CI, the wrapper refuses to start when the Mac is already under memory
pressure, lowers the build priority, and caps Next build workers to avoid
overheating an already busy machine.

Run the lightweight pre-build validation first:

```bash
pnpm run validate:quick
```

Useful overrides:

- `TRR_FORCE_BUILD=1 pnpm run build` starts anyway.
- `TRR_NEXT_BUILD_CPUS=4 pnpm run build` changes the local worker cap.
- `TRR_BUILD_MIN_FREE_GB=4 pnpm run build` requires more free memory before start.

## Firebase Emulator (Auth + Firestore)

- Enable: set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` (see `.env.example`). Optionally set `NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID=demo-trr` so the Emulator UI shows your data.
- Start emulators: from repo root run `pnpm run emulators`. This uses `firebase.json` ports (Auth `9099`, Firestore `8080`) and persists data in `.emulator-data/`.
- Start the app against emulators: from `apps/web/`, run `pnpm run dev:emu`. Alternatively, export the env var inline: `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm run dev`.
- Toggle back to prod: set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false` (or use the default `dev` script) and restart the dev server.

Notes
- The client SDK auto-connects to emulators when the flag is on; no production data is read or written.
- Keeping a distinct emulator project ID (e.g., `demo-trr`) helps the Emulator UI display the same namespace your client uses.

## Admin Host Isolation (Dev)

Use a dedicated local admin origin to mirror production isolation:

- Public app: `https://trr.localhost`
- Admin app: `https://admin.trr.localhost/admin`

Add these values in `.env.local`:

```bash
ADMIN_APP_ORIGIN=https://admin.trr.localhost
ADMIN_APP_HOSTS=admin.trr.localhost,trr.localhost,localhost,127.0.0.1,[::1]
ADMIN_ENFORCE_HOST=true
ADMIN_STRICT_HOST_ROUTING=false
```

The classic portful admin fallback is legacy-only. Re-enable it only for
compatibility work with `TRR_LEGACY_LOCAL_ADMIN_FALLBACK=1` and add the legacy
admin host to `ADMIN_APP_HOSTS` only for that run.

For production, prefer `ADMIN_APP_ORIGIN=https://admin.<domain>`. If the same build needs to derive the admin host from a configured domain, set:

```bash
ADMIN_APP_BASE_DOMAIN=thereality.report
ADMIN_APP_HOST_PREFIX=admin
```

Behavior:

- Requests to `/admin/*` are canonicalized to `ADMIN_APP_ORIGIN` host.
- Requests to `/api/admin/*` use `ADMIN_APP_HOSTS` allowlist (plus `ADMIN_APP_ORIGIN` host).
- `ADMIN_ENFORCE_HOST` defaults to enabled when unset.
- In development, if `ADMIN_APP_HOSTS` is unset, loopback API hosts remain available for direct local tooling; Portless browser work should set the clean hosts above.
- Classic portful admin fallback routing is legacy-only. Set `TRR_LEGACY_LOCAL_ADMIN_FALLBACK=1` only when intentionally testing that old local path.
- With `ADMIN_STRICT_HOST_ROUTING=true`, only non-admin page routes redirect to `/admin`; `/api/*` always passes through.
- This is the same code path used later for `https://admin.<domain>` in production.

## TRR Backend Facebank Seed Proxy

For the admin gallery facebank seed toggle proxy route
`/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed`, set:

- `TRR_CORE_SUPABASE_URL`
- `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY`
- `TRR_INTERNAL_ADMIN_SHARED_SECRET`

`TRR_CORE_SUPABASE_URL` and `TRR_CORE_SUPABASE_SERVICE_ROLE_KEY` are the
canonical server-side Supabase auth inputs for TRR-APP. The app does not use legacy `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` for this surface.
`TRR_INTERNAL_ADMIN_SHARED_SECRET` is the secret used to mint the internal
admin bearer JWT that the proxy forwards to TRR-Backend.

The proxy sends:

- `Authorization: Bearer <TRR_CORE_SUPABASE_SERVICE_ROLE_KEY>`

Backend accepts this service-role path only for the facebank seed toggle endpoint,
and the JWT verifier now tolerates the legacy Supabase `service_role` issuer shape
(`iss="supabase"`) when the signature and project ref still match.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Local Vercel commands should go through the checked-in wrapper from the repo root so we use a current CLI that understands the Node 24 baseline:

```bash
pnpm run web:vercel:version
pnpm run web:vercel:build
pnpm run web:vercel:deploy
```

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
