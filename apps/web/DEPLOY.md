Vercel Deploy Notes

Root Directory
- Set the project Root Directory to `apps/web` in Vercel.

Build
- Install: `npm install`
- Build: `npm run build`
- Output: `.next`
- Node: 22.x (recommended)

Environment Variables (Preview + Production)
- `DATABASE_URL` (PostgreSQL connection string - REQUIRED for build)
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

Firebase Console
- Auth → enable Email/Password + Google (Apple optional)
- Auth → Authorized domains: add your Vercel preview + production domains

Notes
- Auth pages are marked `force-dynamic` to avoid build-time Firebase init.
- SSR guards check the session cookie and `users/{uid}` before render.
