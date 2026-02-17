Vercel Deploy Notes

Root Directory
- Set the project Root Directory to `apps/web` in Vercel.

Build
- Install: `pnpm install`
- Build: `pnpm run build`
- Output: `.next`
- Node support: 20.x and 22.x
- Local default: Node 20 (`TRR-APP/.nvmrc`)
- Deploy recommendation: Node 22.x

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
- `TRR_AUTH_PROVIDER` (`firebase` default; `supabase` for migration stages)
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
