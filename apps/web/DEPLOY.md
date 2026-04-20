Vercel Deploy Notes

Root Directory
- Set the project Root Directory to `apps/web` in Vercel.

Build
- Install: `pnpm install`
- Build: `pnpm run build`
- Output: `.next`
- Node support: 24.x (primary) and 22.x (compatibility lane)
- Local default: Node 24 (`TRR-APP/.nvmrc`)
- Deploy recommendation: Node 24.x
- Local Vercel CLI: use the repo wrapper instead of a global install:
  - `pnpm run web:vercel:version`
  - `pnpm run web:vercel:build`
  - `pnpm run web:vercel:deploy`
- Run those commands from `TRR-APP/`, not `apps/web/`.
- Why: the linked production project is the repo-root `trr-app` Vercel project, which is configured with `apps/web` as its Vercel Root Directory. Deploying from `apps/web` can accidentally target the separate local `web` project link, which builds from `.` and fails against the repo-root `package.json`.
- Older global Vercel CLIs can also reject `engines.node: "24.x"` even though current Vercel project settings and platform docs support Node 24.

Environment Variables (Preview + Production)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)
- `NEXT_PUBLIC_ENABLE_APPLE` (optional)
- `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`
- `FIREBASE_SERVICE_ACCOUNT` (full JSON)
- `TRR_AUTH_PROVIDER` (`firebase` default; `supabase` is diagnostics-only today and durable login/session paths fail closed)
- `TRR_AUTH_SHADOW_MODE` (`true` to run secondary-provider parity checks)
- `TRR_AUTH_CUTOVER_MIN_SHADOW_CHECKS` (default `50`)
- `TRR_AUTH_CUTOVER_MAX_SHADOW_FAILURES` (default `0`)
- `TRR_AUTH_CUTOVER_MAX_SHADOW_MISMATCH_EVENTS` (default `0`)
- `TRR_AUTH_DIAGNOSTICS_PERSIST` (default `true`; set `false` to disable store-backed snapshots)
- `TRR_AUTH_DIAGNOSTICS_STORE_FILE` (optional file path; default `.cache/auth-diagnostics.json`)

Firebase Console
- Auth → enable Email/Password + Google (Apple optional)
- Auth → Authorized domains: add your Vercel preview + production domains

Notes
- Auth pages are marked `force-dynamic` to avoid build-time Firebase init.
- SSR guards check the session cookie and `users/{uid}` before render.
